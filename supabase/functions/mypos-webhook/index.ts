import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MYPOS_PUBLIC_CERT = `-----BEGIN CERTIFICATE-----
MIIBsTCCARoCCQCCPjNttGNQWDANBgkqhkiG9w0BAQsFADAdMQswCQYDVQQGEwJC
RzEOMAwGA1UECgwFbXlQT1MwHhcNMTgxMDEyMDcwOTEzWhcNMjgxMDA5MDcwOTEz
WjAdMQswCQYDVQQGEwJCRzEOMAwGA1UECgwFbXlQT1MwgZ8wDQYJKoZIhvcNAQEB
BQADgY0AMIGJAoGBAML+VTmiY4yChoOTMZTXAIG/mk+xf/9mjwHxWzxtBJbNncNK
0OLI0VXYKW2GgVklGHHQjvew1hTFkEGjnCJ7f5CDnbgxevtyASDGst92a6xcAedE
adP0nFXhUz+cYYIgIcgfDcX3ZWeNEF5kscqy52kpD2O7nFNCV+85vS4duJBNAgMB
AAEwDQYJKoZIhvcNAQELBQADgYEACj0xb+tNYERJkL+p+zDcBsBK4RvknPlpk+YP
ephunG2dBGOmg/WKgoD1PLWD2bEfGgJxYBIg9r1wLYpDC1txhxV+2OBQS86KULh0
NEcr0qEY05mI4FlE+D/BpT/+WFyKkZug92rK0Flz71Xy/9mBXbQfm+YK6l9roRYd
J4sHeQc=
-----END CERTIFICATE-----`;

async function verifySignature(params: Record<string, string>, signature: string): Promise<boolean> {
  try {
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 'Signature')
      .sort();
    const concatenated = sortedKeys.map(key => params[key]).join('');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(concatenated);
    const hash = await crypto.subtle.digest('SHA-256', data);
    
    const pemContents = MYPOS_PUBLIC_CERT
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      hash
    );
    
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type');
    let params: Record<string, string> = {};

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        params[key] = value.toString();
      }
    } else {
      params = await req.json();
    }

    console.log('Webhook received:', params);

    const signature = params.Signature;
    if (!signature) {
      throw new Error('No signature provided');
    }

    const isValid = await verifySignature(params, signature);
    if (!isValid) {
      console.error('Invalid signature');
      throw new Error('Invalid signature');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const orderId = params.OrderID;
    const status = params.IPCmethod === 'IPCPurchaseOK' ? 'completed' : 'failed';
    const transactionId = params.IPC_Trnref;

    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: status,
        transaction_id: transactionId,
        payment_response: params,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    if (status === 'completed') {
      const { data: order } = await supabase
        .from('payment_orders')
        .select('user_id, order_items, amount, id')
        .eq('order_id', orderId)
        .single();

      if (order) {
        for (const item of order.order_items) {
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              user_id: order.user_id,
              deal_id: item.dealId,
              quantity: item.quantity,
              purchase_price: item.price,
              status: 'confirmed',
              payment_order_id: order.id,
            });

          if (purchaseError) {
            console.error('Error creating purchase:', purchaseError);
          }

          const { data: currentDeal } = await supabase
            .from('deals')
            .select('sold_quantity, stock_quantity')
            .eq('id', item.dealId)
            .single();

          if (currentDeal) {
            await supabase
              .from('deals')
              .update({
                sold_quantity: currentDeal.sold_quantity + item.quantity,
                stock_quantity: currentDeal.stock_quantity - item.quantity,
              })
              .eq('id', item.dealId);
          }
        }

        await supabase.from('cart_items').delete().eq('user_id', order.user_id);
      }
    }

    console.log(`Order ${orderId} updated to ${status}`);

    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  }
});