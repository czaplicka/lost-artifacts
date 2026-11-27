// PayPal settings for the Agency Catalog (scenes/ExpansionStoreScene.js).
//
// Going live on the real domain:
//   1. environment: 'live'
//   2. clientId: the LIVE REST app Client ID from developer.paypal.com
//   3. In Supabase secrets set PAYPAL_ENV=live, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
//      and deploy supabase/functions/store-paypal-create-order + store-paypal-capture-order.
//   4. Make sure store_sandbox_products has active rows with the right prices
//      (supabase/migrations/*_store_products.sql).
// The secret never goes into this file. Only the public Client ID belongs here.
export const PAYPAL_CONFIG = Object.freeze({
  enabled: true,
  environment: 'sandbox',
  clientId: 'BAA1ttLiwIaOJXUhNvVraeRaBwqFYcXhto48D_fdR4alVuBljIS6UZ_4AfBOPKUMysnSYHmi2lDcaJ5NLM',
  currency: 'EUR',
  createOrderFunction: 'store-paypal-create-order',
  captureOrderFunction: 'store-paypal-capture-order',
  ordersTable: 'store_sandbox_orders',
  entitlementsTable: 'store_sandbox_entitlements'
});

export function paypalSdkUrl() {
  return PAYPAL_CONFIG.environment === 'live'
    ? 'https://www.paypal.com/web-sdk/v6/core'
    : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
}

export function isPayPalSandbox() {
  return PAYPAL_CONFIG.environment !== 'live';
}
