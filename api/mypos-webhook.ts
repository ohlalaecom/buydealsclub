import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', message: 'myPOS Webhook Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('myPOS webhook received:', payload);

    const orderCode = payload.order_id;
    const status = payload.status;

    if (!orderCode) {
      console.error('No order code in webhook');
      return res.status(200).json({ status: 'ok' });
    }

    const { data: order, error: orderFetchError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('transaction_id', orderCode)
      .maybeSingle();

    if (orderFetchError || !order) {
      console.error('Order not found:', orderCode, orderFetchError);
      return res.status(200).json({ status: 'ok' });
    }

    let orderStatus = 'pending';
    if (status === 'success' || status === 'Success') {
      orderStatus = 'completed';
    } else if (status === 'failed' || status === 'Failed') {
      orderStatus = 'failed';
    } else if (status === 'cancelled' || status === 'Cancelled') {
      orderStatus = 'cancelled';
    }

    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: orderStatus,
        payment_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', orderCode);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    if (orderStatus === 'completed') {
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

    console.log(`Order ${order.order_id} updated to ${orderStatus}`);

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ status: 'ok' });
  }
}
