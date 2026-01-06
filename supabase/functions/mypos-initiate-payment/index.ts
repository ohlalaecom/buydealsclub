import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MYPOS_CONFIG = {
  testMode: true,
  url: "https://www.mypos.com/vmp/checkout-test",
  sid: "000000000000010",
  wallet: "61938166610",
  keyIndex: 1,
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCf0TdcTuphb7X+Zwekt1XKEWZDczSGecfo6vQfqvraf5VPzcnJ
2Mc5J72HBm0u98EJHan+nle2WOZMVGItTa/2k1FRWwbt7iQ5dzDh5PEeZASg2UWe
hoR8L8MpNBqH6h7ZITwVTfRS4LsBvlEfT7Pzhm5YJKfM+CdzDM+L9WVEGwIDAQAB
AoGAYfKxwUtEbq8ulVrD3nnWhF+hk1k6KejdUq0dLYN29w8WjbCMKb9IaokmqWiQ
5iZGErYxh7G4BDP8AW/+M9HXM4oqm5SEkaxhbTlgks+E1s9dTpdFQvL76TvodqSy
l2E2BghVgLLgkdhRn9buaFzYta95JKfgyKGonNxsQA39PwECQQDKbG0Kp6KEkNgB
srCq3Cx2od5OfiPDG8g3RYZKx/O9dMy5CM160DwusVJpuywbpRhcWr3gkz0QgRMd
IRVwyxNbAkEAyh3sipmcgN7SD8xBG/MtBYPqWP1vxhSVYPfJzuPU3gS5MRJzQHBz
sVCLhTBY7hHSoqiqlqWYasi81JzBEwEuQQJBAKw9qGcZjyMH8JU5TDSGllr3jybx
FFMPj8TgJs346AB8ozqLL/ThvWPpxHttJbH8QAdNuyWdg6dIfVAa95h7Y+MCQEZg
jRDl1Bz7eWGO2c0Fq9OTz3IVLWpnmGwfW+HyaxizxFhV+FOj1GUVir9hylV7V0DU
QjIajyv/oeDWhFQ9wQECQCydhJ6NaNQOCZh+6QTrH3TC5MeBA1Yeipoe7+BhsLNr
cFG8s9sTxRnltcZl1dXaBSemvpNvBizn0Kzi8G3ZAgc=
-----END RSA PRIVATE KEY-----`,
};

function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const oid = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00
  ]);

  const pkcs8Length = 2 + oid.length + 2 + pkcs1.length;
  const pkcs8 = new Uint8Array(pkcs8Length + 2);

  let offset = 0;
  pkcs8[offset++] = 0x30;
  pkcs8[offset++] = pkcs8Length;
  pkcs8.set(oid, offset);
  offset += oid.length;
  pkcs8[offset++] = 0x04;
  pkcs8[offset++] = pkcs1.length;
  pkcs8.set(pkcs1, offset);

  return pkcs8;
}

async function generateSignature(params: Record<string, string>): Promise<string> {
  try {
    const sortedKeys = Object.keys(params).sort();
    const concatenated = sortedKeys.map(key => params[key]).join('');

    console.log('Data to sign:', concatenated);

    const privateKeyPem = MYPOS_CONFIG.privateKey
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
      .replace(/-----END RSA PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const pkcs1Der = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
    const pkcs8Der = pkcs1ToPkcs8(pkcs1Der);

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Der,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(concatenated);

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      data
    );

    const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
    console.log('Generated signature:', base64Sig);

    return base64Sig;
  } catch (error) {
    console.error('Signature generation error:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, amount, currency, orderItems, customerInfo } = await req.json();

    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mypos-webhook`;
    const cancelUrl = `${customerInfo.returnUrl}?status=cancelled`;
    const okUrl = `${customerInfo.returnUrl}?status=success`;

    const params: Record<string, string> = {
      IPCmethod: 'IPCPurchase',
      IPCVersion: '1.4',
      IPCLanguage: 'en',
      SID: MYPOS_CONFIG.sid,
      WalletNumber: MYPOS_CONFIG.wallet,
      KeyIndex: MYPOS_CONFIG.keyIndex.toString(),
      Amount: amount.toFixed(2),
      Currency: currency,
      OrderID: orderId,
      URL_OK: okUrl,
      URL_Cancel: cancelUrl,
      URL_Notify: notifyUrl,
      CustomerFirstName: customerInfo.firstName,
      CustomerLastName: customerInfo.lastName,
      CustomerEmail: customerInfo.email,
      CustomerPhone: customerInfo.phone,
      CustomerAddress: customerInfo.address,
      CustomerCity: customerInfo.city,
      CustomerZIPCode: customerInfo.zipCode,
      CustomerCountry: customerInfo.country || 'CY',
      Note: `Order #${orderId}`,
      CartItems: orderItems.length.toString(),
    };

    orderItems.forEach((item: any, index: number) => {
      const i = index + 1;
      params[`Article_${i}`] = item.name;
      params[`Quantity_${i}`] = item.quantity.toString();
      params[`Price_${i}`] = item.price.toFixed(2);
      params[`Amount_${i}`] = (item.price * item.quantity).toFixed(2);
      params[`Currency_${i}`] = currency;
    });

    const signature = await generateSignature(params);
    params.Signature = signature;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: orderError } = await supabaseAdmin
      .from('payment_orders')
      .insert({
        order_id: orderId,
        user_id: user.id,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'mypos',
        customer_info: customerInfo,
        order_items: orderItems,
      });

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: MYPOS_CONFIG.url,
        params: params,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});