import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (key) {
      return new Response(key, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        },
      });
    }

    return new Response('Viva Wallet Webhook Active', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }

  try {
    const payload = await req.json();
    console.log('Viva Wallet webhook received:', payload);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const eventTypeId = payload.EventTypeId;
    const orderCode = payload.OrderCode;
    const transactionId = payload.TransactionId;
    const statusId = payload.StatusId;

    if (!orderCode) {
      console.error('No order code in webhook');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { data: order, error: orderFetchError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('transaction_id', orderCode)
      .maybeSingle();

    if (orderFetchError || !order) {
      console.error('Order not found:', orderCode, orderFetchError);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    let status = 'pending';
    if (statusId === 'F') {
      status = 'completed';
    } else if (statusId === 'C') {
      status = 'cancelled';
    } else if (statusId === 'E') {
      status = 'failed';
    }

    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: status,
        payment_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', orderCode);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    if (status === 'completed') {
      console.log('Processing completed order:', order.order_id);

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
          .maybeSingle();

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

      console.log(`Order ${order.order_id} processed successfully`);
    }

    console.log(`Order ${order.order_id} updated to ${status}`);

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