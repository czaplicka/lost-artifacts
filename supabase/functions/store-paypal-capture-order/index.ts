import {
  CORS_HEADERS, authenticate, centsToValue, json, paypalApi, paypalEnvironment, paypalToken, readBody, timedFetch,
} from '../_shared/paypalStore.ts';

// Captures an approved PayPal order, verifies it against the saved local order
// and writes the entitlement in one transaction (store_complete_order).
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
    const paypalOrderId = body.orderId;
    if (typeof paypalOrderId !== 'string' || !/^[A-Z0-9]{8,40}$/.test(paypalOrderId)) {
      return json(400, { error: 'INVALID_ORDER_ID' });
    }

    const { data: order, error: orderError } = await admin
      .from('store_sandbox_orders')
      .select('id, user_id, product_id, paypal_order_id, paypal_capture_id, currency, amount_cents, status')
      .eq('paypal_order_id', paypalOrderId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (orderError) throw new Error('Order lookup failed');
    if (!order) return json(404, { error: 'ORDER_NOT_FOUND' });
    if (!['CREATED', 'APPROVED', 'PENDING', 'COMPLETED'].includes(order.status)) {
      return json(409, { error: 'ORDER_NOT_PAYABLE' });
    }
    const expectedValue = centsToValue(order.amount_cents);

    const token = await paypalToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const orderUrl = `${paypalApi()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`;

    const readRemote = async () => {
      const response = await timedFetch(orderUrl, { headers });
      if (!response.ok) throw new Error('PayPal order lookup failed');
      return await response.json();
    };
    // deno-lint-ignore no-explicit-any
    const validate = (remote: any) => {
      const units = remote.purchase_units;
      if (remote.id !== paypalOrderId || remote.intent !== 'CAPTURE' || !Array.isArray(units) || units.length !== 1) {
        throw new Error('Unexpected PayPal order');
      }
      const unit = units[0];
      if (
        unit.reference_id !== order.id || unit.custom_id !== order.id ||
        unit.amount?.currency_code !== order.currency || unit.amount?.value !== expectedValue
      ) {
        throw new Error('PayPal order validation failed');
      }
      return unit;
    };

    let remote = await readRemote();
    validate(remote);
    if (remote.status === 'APPROVED') {
      const captureResponse = await timedFetch(`${orderUrl}/capture`, {
        method: 'POST',
        headers: { ...headers, 'PayPal-Request-Id': `capture-${order.id}`, Prefer: 'return=representation' },
        body: '{}',
      });
      // PayPal may have processed the capture even when the response failed. Read it again.
      if (!captureResponse.ok) {
        console.warn('[store-paypal-capture-order] Capture response', { requestId, status: captureResponse.status });
      }
      remote = await readRemote();
    }

    const unit = validate(remote);
    const captures = unit.payments?.captures;
    if (!Array.isArray(captures) || captures.length === 0) {
      return json(409, { error: 'PAYMENT_NOT_COMPLETED', paypalStatus: remote.status });
    }
    if (captures.length !== 1) throw new Error('Unexpected number of captures');
    const captureId = captures[0]?.id;
    if (typeof captureId !== 'string' || !/^[A-Z0-9]{8,40}$/.test(captureId)) throw new Error('Invalid capture ID');

    const captureDetails = await timedFetch(`${paypalApi()}/v2/payments/captures/${encodeURIComponent(captureId)}`, { headers });
    if (!captureDetails.ok) throw new Error('Capture verification failed');
    const capture = await captureDetails.json();
    if (
      capture.id !== captureId ||
      capture.amount?.currency_code !== order.currency ||
      capture.amount?.value !== expectedValue ||
      capture.final_capture !== true ||
      (order.paypal_capture_id && order.paypal_capture_id !== captureId)
    ) {
      throw new Error('Capture validation failed');
    }
    if (capture.status === 'PENDING') {
      return json(202, { status: 'PENDING', owned: false, message: 'Payment confirmation is pending.' });
    }
    if (remote.status !== 'COMPLETED' || capture.status !== 'COMPLETED') {
      return json(409, { error: 'PAYMENT_NOT_COMPLETED', captureStatus: capture.status });
    }

    const { error: fulfillmentError } = await admin.rpc('store_complete_order', {
      p_order_id: order.id,
      p_user_id: user.id,
      p_paypal_order_id: paypalOrderId,
      p_capture_id: captureId,
    });
    if (fulfillmentError) {
      console.error('[store-paypal-capture-order] Fulfillment failed', { requestId, localOrderId: order.id, code: fulfillmentError.code });
      return json(503, {
        error: 'FULFILLMENT_RETRY_REQUIRED',
        message: 'Payment was verified. Retry confirmation for this same order; do not buy again.',
        requestId,
      });
    }

    return json(200, { environment, status: 'COMPLETED', owned: true, productId: order.product_id, orderId: paypalOrderId });
  } catch (error) {
    console.error('[store-paypal-capture-order] Request failed', {
      requestId, message: error instanceof Error ? error.message : 'Unknown error',
    });
    return json(500, {
      error: 'CONFIRMATION_FAILED',
      message: 'The payment result is not confirmed. Retry confirmation for the same order.',
      requestId,
    });
  }
});
