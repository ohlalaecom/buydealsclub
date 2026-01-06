import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VIVA_WALLET_CONFIG = {
  baseUrl: "https://api.vivapayments.com",
  accountsUrl: "https://accounts.vivapayments.com",
  merchantId: Deno.env.get('VIVA_WALLET_MERCHANT_ID')!,
  clientId: Deno.env.get('VIVA_WALLET_CLIENT_ID')!,
  clientSecret: Deno.env.get('VIVA_WALLET_CLIENT_SECRET')!,
};

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${VIVA_WALLET_CONFIG.clientId}:${VIVA_WALLET_CONFIG.clientSecret}`);
  
  const response = await fetch(`${VIVA_WALLET_CONFIG.accountsUrl}/connect/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token error:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
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

    const accessToken = await getAccessToken();

    const successUrl = `${customerInfo.returnUrl}?status=success`;
    const failureUrl = `${customerInfo.returnUrl}?status=failed`;

    const orderPayload = {
      amount: Math.round(amount * 100),
      customerTrns: `Order #${orderId}`,
      customer: {
        email: customerInfo.email,
        fullName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        phone: customerInfo.phone,
        countryCode: customerInfo.country || 'CY',
        requestLang: 'en-GB',
      },
      paymentTimeout: 1800,
      preauth: false,
      allowRecurring: false,
      maxInstallments: 0,
      paymentNotification: true,
      tipAmount: 0,
      disableExactAmount: false,
      disableCash: true,
      disableWallet: false,
      sourceCode: '8339',
      merchantTrns: orderId,
      tags: [`orderId:${orderId}`, `userId:${user.id}`],
      successUrl: successUrl,
      failureUrl: failureUrl,
    };

    console.log('Creating Viva Wallet order:', orderPayload);

    const orderResponse = await fetch(`${VIVA_WALLET_CONFIG.baseUrl}/checkout/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error('Order creation error:', error);
      throw new Error(`Failed to create order: ${orderResponse.status} - ${error}`);
    }

    const orderData = await orderResponse.json();
    console.log('Viva Wallet order created:', orderData);

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
        payment_method: 'viva_wallet',
        transaction_id: orderData.orderCode,
        customer_info: customerInfo,
        order_items: orderItems,
      });

    if (orderError) {
      console.error('Error creating order in database:', orderError);
      throw orderError;
    }

    const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${orderData.orderCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkoutUrl,
        orderCode: orderData.orderCode,
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