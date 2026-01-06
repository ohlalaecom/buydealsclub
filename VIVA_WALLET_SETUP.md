# Viva Wallet Payment Integration Setup

The application has been configured to use Viva Wallet as the payment processor. MyPOS has been replaced completely.

## Required Configuration

You need to add the following environment variables to your `.env` file:

```
VIVA_WALLET_MERCHANT_ID=your_merchant_id
VIVA_WALLET_CLIENT_ID=your_client_id
VIVA_WALLET_CLIENT_SECRET=your_client_secret
```

## Where to Find Your Credentials

1. Log in to your Viva Wallet account at https://www.vivawallet.com/
2. Navigate to **Settings** > **API Access**
3. You'll find:
   - **Merchant ID**: Your unique merchant identifier
   - **Client ID**: Your OAuth2 client ID
   - **Client Secret**: Your OAuth2 client secret (keep this secure!)

## Supabase Edge Function Configuration

The Viva Wallet credentials must also be configured in your Supabase project as secrets:

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** > **Edge Functions** > **Secrets**
3. Add these three secrets:
   - `VIVA_WALLET_MERCHANT_ID`
   - `VIVA_WALLET_CLIENT_ID`
   - `VIVA_WALLET_CLIENT_SECRET`

## Webhook Configuration

You need to configure webhooks in your Viva Wallet account:

1. In Viva Wallet, go to **Settings** > **Webhooks**
2. Add a new webhook with the URL:
   ```
   https://YOUR_SUPABASE_URL/functions/v1/viva-wallet-webhook
   ```
3. Select these event types:
   - Transaction Payment Created (for successful payments)
   - Transaction Failed
   - Transaction Cancelled

## Testing

The integration uses Viva Wallet's production environment by default. For testing:

1. Use test card numbers provided by Viva Wallet
2. Monitor the webhook events in your Supabase Edge Functions logs
3. Check the `payment_orders` table in your database to verify order status updates

## What Changed

- Replaced MyPOS edge functions with Viva Wallet edge functions
- Updated CheckoutModal to use Viva Wallet's redirect-based checkout
- Payment flow now redirects users to Viva Wallet's hosted checkout page
- Webhooks handle payment status updates and order processing

## Order Processing Flow

1. User completes checkout form
2. Backend creates a Viva Wallet payment order
3. User is redirected to Viva Wallet checkout page
4. User completes payment on Viva Wallet
5. Viva Wallet sends webhook to our backend
6. Backend processes the order:
   - Creates purchase records
   - Updates inventory
   - Awards loyalty points
   - Clears cart
7. User is redirected back to the success/failure page
