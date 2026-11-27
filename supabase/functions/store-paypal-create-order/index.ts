import {
  CORS_HEADERS, authenticate, centsToValue, json, paypalApi, paypalEnvironment, paypalToken, readBody, timedFetch,
} from '../_shared/paypalStore.ts';

// Creates a PayPal order for one active product from store_sandbox_products.
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
  const requestId = crypto.randomUUID();

  try {
    const environment = paypalEnvironment();
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const { admin, user } = auth;

    const body = await readBody(request);
    if (!body) return json(400, { error: 'INVALID_JSON' });
    const productId = body.productId;
    if (typeof productId !== 'string' || !/^[a-z0-9_]{1,64}$/.test(productId)) {
      return json(400, { error: 'INVALID_PRODUCT' });
    }

    const { data: product, error: productError } = await admin
      .from('store_sandbox_products')
      .select('id, title, currency, amount_cents, active')
      .eq('id', productId)
      .eq('active', true)
      .maybeSingle();
    if (productError) throw new Error('Product lookup failed');
    if (!product) return json(404, { error: 'PRODUCT_UNAVAILABLE', message: 'This item is not for sale right now.' });
    if (!Number.isInteger(product.amount_cents) || product.amount_cents <= 0 || !/^[A-Z]{3}$/.test(product.currency)) {
      throw new Error('Invalid product price');
    }

    const { data: entitlement, error: entitlementError } = await admin
      .from('store_sandbox_entitlements')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .is('revoked_at', null)
      .maybeSingle();
    if (entitlementError) throw new Error('Entitlement lookup failed');
    if (entitlement) return json(409, { error: 'ALREADY_OWNED', message: 'You already own this.' });

    const token = await paypalToken();
    const localOrderId = crypto.randomUUID();
    const { error: insertError } = await admin.from('store_sandbox_orders').insert({
      id: localOrderId,
      user_id: user.id,
      product_id: product.id,
      currency: product.currency,
      amount_cents: product.amount_cents,
      status: 'CREATED',
    });
    if (insertError) throw new Error('Could not save local order');

    const value = centsToValue(product.amount_cents);
    const orderResponse = await timedFetch(`${paypalApi()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': localOrderId,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: localOrderId,
          custom_id: localOrderId,
          description: product.title,
          amount: { currency_code: product.currency, value },
        }],
        application_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
      }),
    });
    if (!orderResponse.ok) {
      console.error('[store-paypal-create-order] PayPal order failed', { requestId, localOrderId, status: orderResponse.status });
      return json(502, { error: 'PAYPAL_CREATE_FAILED', requestId });
    }
    const paypalOrder = await orderResponse.json();
    if (typeof paypalOrder.id !== 'string' || !paypalOrder.id) throw new Error('Missing PayPal order ID');

    const { data: saved, error: saveError } = await admin
      .from('store_sandbox_orders')
      .update({ paypal_order_id: paypalOrder.id })
      .eq('id', localOrderId)
      .eq('user_id', user.id)
      .select('id')
      .single();
    if (saveError || !saved) throw new Error('Could not link PayPal order');

    return json(200, {
      environment,
      orderId: paypalOrder.id,
      localOrderId,
      productId: product.id,
      currency: product.currency,
      amount: value,
    });
  } catch (error) {
    console.error('[store-paypal-create-order] Request failed', {
      requestId, message: error instanceof Error ? error.message : 'Unknown error',
    });
    return json(500, { error: 'SERVER_ERROR', requestId });
  }
});
