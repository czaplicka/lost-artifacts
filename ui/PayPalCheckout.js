import { supabase } from '../supabase-client.js';
import { PAYPAL_CONFIG, paypalSdkUrl, isPayPalSandbox } from '../config/storeConfig.js';
import { refreshStoreEntitlements } from '../systems/StoreEntitlements.js';

// PayPal checkout for one store product (STORE_PRODUCTS in systems/StoreEntitlements.js).
// The server creates and captures the order, checks the price and writes the entitlement.
// The game only reads the entitlement back. Settings: config/storeConfig.js.
let sdkPromise = null;
let current = null;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      if (!window.paypal?.createInstance) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = paypalSdkUrl();
          script.async = true;
          const timer = setTimeout(() => {
            script.remove();
            reject(new Error('PayPal loading timed out.'));
          }, 30000);
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error('Could not load PayPal.'));
          };
          document.head.appendChild(script);
        });
      }
      if (!window.paypal?.createInstance) throw new Error('PayPal could not start. Refresh the page.');
      return await window.paypal.createInstance({
        clientId: PAYPAL_CONFIG.clientId,
        components: ['paypal-payments'],
        pageType: 'checkout',
        locale: 'en-US'
      });
    })().catch(error => { sdkPromise = null; throw error; });
  }
  return sdkPromise;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * @param {Phaser.Scene} scene
 * @param {{id:string,name:string,priceEur:number,paypalProductId:string}} product
 * @param {{onOwned?:()=>void}} [options]
 */
export function openPayPalCheckout(scene, product, { onOwned } = {}) {
  if (current) { current.focus(); return; }
  const sandbox = isPayPalSandbox();
  const amount = product.priceEur.toFixed(2);
  const productId = product.paypalProductId;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#000b;display:grid;place-items:center;padding:16px;box-sizing:border-box;pointer-events:auto';
  host.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="paypal-checkout-title" tabindex="-1"
      style="box-sizing:border-box;width:min(540px,100%);max-height:90dvh;overflow:auto;background:#dac69d;color:#30271e;padding:28px;border:4px solid #59442e;box-shadow:0 12px 70px #000;font-family:SpecialElite,monospace">
      <h2 id="paypal-checkout-title" style="margin:0 0 16px">PAYPAL CHECKOUT</h2>
      <p style="font-size:22px;margin:0 0 6px">${escapeHtml(product.name)}</p>
      <p style="font-size:25px;margin:0 0 12px">${amount} ${PAYPAL_CONFIG.currency}</p>
      ${sandbox ? '<p style="color:#893f32;margin:0 0 12px">SANDBOX — test funds only. Use a PayPal Sandbox buyer account.</p>' : ''}
      <p data-status role="status" aria-live="polite" style="white-space:pre-wrap;min-height:65px">Checking your account…</p>
      <div data-pay hidden><paypal-button></paypal-button></div>
      <button data-retry hidden type="button">Retry confirmation — same order</button>
      <button data-refresh type="button">Refresh status</button>
      <button data-close type="button">Back to store</button>
    </section>`;
  for (const b of host.querySelectorAll('button')) {
    b.style.cssText = 'font:inherit;padding:12px;margin:8px 8px 0 0;cursor:pointer';
  }
  document.body.appendChild(host);
  const panel = host.querySelector('section');
  const status = host.querySelector('[data-status]');
  const payArea = host.querySelector('[data-pay]');
  const payButton = host.querySelector('paypal-button');
  const retry = host.querySelector('[data-retry]');
  const refresh = host.querySelector('[data-refresh]');
  const close = host.querySelector('[data-close]');
  const previousFocus = document.activeElement;
  const keyboard = scene.input.keyboard;
  const keyboardWasEnabled = keyboard?.enabled;
  if (keyboard) keyboard.enabled = false;
  let disposed = false;
  let busy = false;
  let userId = null;
  let orderId = null;
  let owned = false;
  let ownedReported = false;
  let paymentSession = null;
  let authSubscription = null;
  let confirming = null;

  const say = message => { if (!disposed) status.textContent = message; };
  const sync = () => {
    if (disposed) return;
    close.disabled = busy;
    refresh.disabled = busy;
    retry.disabled = busy;
    retry.hidden = !orderId || owned;
    payArea.hidden = busy || owned || !paymentSession;
    payButton.style.pointerEvents = busy ? 'none' : 'auto';
  };
  const setBusy = value => { busy = value; sync(); };
  const fail = error => {
    console.error('[PayPal]', error);
    say(`${error.message || 'Unexpected error.'}\n` +
      (orderId ? 'Use Retry confirmation or resume PayPal. Do not create another purchase.' : 'No payment has been confirmed.'));
  };
  const dispose = (force = false) => {
    if (disposed || (busy && !force)) return;
    disposed = true;
    authSubscription?.unsubscribe();
    document.removeEventListener('keydown', onKey, true);
    scene.events.off('shutdown', onShutdown);
    host.remove();
    if (keyboard && keyboardWasEnabled !== undefined) keyboard.enabled = keyboardWasEnabled;
    if (previousFocus?.isConnected) previousFocus.focus?.();
    current = null;
  };
  const onShutdown = () => dispose(true);
  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      dispose();
    }
    if (event.key === 'Tab') {
      const nodes = [...panel.querySelectorAll('button:not([hidden]):not(:disabled), paypal-button')]
        .filter(node => node.getClientRects().length);
      if (!nodes.length) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === panel)) {
        event.preventDefault(); nodes.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
        event.preventDefault(); nodes[0].focus();
      }
    }
  }
  document.addEventListener('keydown', onKey, true);
  scene.events.once('shutdown', onShutdown);
  close.onclick = () => dispose();
  current = { focus: () => panel.focus() };
  panel.focus();

  async function ensureUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || (userId && data.user.id !== userId)) {
      throw new Error('Please sign in to the game first. Purchases are saved to your game account.');
    }
    if (disposed) throw new Error('Checkout was closed.');
    return data.user;
  }

  async function invoke(name, body) {
    await ensureUser();
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      let details = null;
      try { details = await error.context?.json(); } catch { /* Network error. */ }
      throw new Error(details?.message || details?.error || error.message || 'Backend request failed.');
    }
    if (!data || data.error) throw new Error(data?.message || data?.error || 'Empty backend response.');
    return data;
  }

  async function markOwned() {
    owned = true;
    say('PURCHASED — thank you!\nThe item is now on your game account.');
    sync();
    await refreshStoreEntitlements();
    if (!ownedReported) { ownedReported = true; try { onOwned?.(); } catch (error) { console.error(error); } }
  }

  async function readState() {
    await ensureUser();
    const result = await supabase.from(PAYPAL_CONFIG.entitlementsTable)
      .select('product_id').eq('user_id', userId)
      .eq('product_id', productId).is('revoked_at', null).maybeSingle();
    if (result.error) throw new Error(`Ownership lookup failed: ${result.error.message}`);
    if (result.data) { await markOwned(); return; }
    owned = false;
    const orders = await supabase.from(PAYPAL_CONFIG.ordersTable)
      .select('paypal_order_id,status').eq('user_id', userId)
      .eq('product_id', productId)
      .in('status', ['CREATED', 'APPROVED', 'PENDING', 'COMPLETED'])
      .not('paypal_order_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1);
    if (orders.error) throw new Error(`Order lookup failed: ${orders.error.message}`);
    orderId = orders.data?.[0]?.paypal_order_id || null;
    say(orderId
      ? 'An earlier order was found.\nRetry confirmation, or use PayPal to resume that same order.'
      : 'Ready. Pay with PayPal below.');
    sync();
  }

  async function confirm(id) {
    if (confirming) return confirming;
    confirming = (async () => {
      if (!orderId || id !== orderId) throw new Error('Order mismatch. Refresh status.');
      say('Verifying the payment…');
      const data = await invoke(PAYPAL_CONFIG.captureOrderFunction, { orderId: id });
      if (data.status === 'PENDING') {
        say('PayPal confirmation is pending. Nothing has been unlocked yet.\nRetry confirmation later for this same order.');
        return;
      }
      if (data.status !== 'COMPLETED' || data.owned !== true) {
        throw new Error('Payment is not confirmed.');
      }
      await readState();
      if (!owned) throw new Error('Payment confirmed, but the purchase needs another refresh.');
    })();
    try { return await confirming; } finally { confirming = null; }
  }

  async function createOrResumeOrder() {
    await ensureUser();
    if (owned) throw new Error('You already own this.');
    if (orderId) return { orderId };
    const data = await invoke(PAYPAL_CONFIG.createOrderFunction, { productId });
    if (data.environment !== PAYPAL_CONFIG.environment || typeof data.orderId !== 'string') {
      throw new Error('Unexpected create-order response.');
    }
    orderId = data.orderId;
    return { orderId };
  }

  retry.onclick = async () => {
    if (busy || !orderId) return;
    setBusy(true);
    try { await confirm(orderId); } catch (error) { fail(error); }
    finally { setBusy(false); }
  };
  refresh.onclick = async () => {
    if (busy) return;
    setBusy(true);
    try { await readState(); } catch (error) { fail(error); }
    finally { setBusy(false); }
  };

  (async () => {
    setBusy(true);
    try {
      if (!PAYPAL_CONFIG.enabled) throw new Error('PayPal checkout is not available yet. Medals work now.');
      userId = (await ensureUser()).id;
      const auth = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user || session.user.id !== userId) dispose(true);
      });
      authSubscription = auth.data.subscription;
      await readState();
      if (owned || disposed) return;
      const sdk = await loadSdk();
      if (disposed) return;
      const methods = await sdk.findEligibleMethods({ currencyCode: PAYPAL_CONFIG.currency, amount });
      if (disposed) return;
      if (!methods.isEligible('paypal')) throw new Error('PayPal is not available right now. Check the Client ID and merchant settings.');
      paymentSession = sdk.createPayPalOneTimePaymentSession({
        onApprove: async data => {
          try { await confirm(data.orderId); } catch (error) { fail(error); }
        },
        onCancel: () => say('Checkout closed. Nothing was charged.\nThe same order can be resumed or checked.'),
        onError: error => fail(new Error(error?.message || 'PayPal checkout error.'))
      });
      payButton.addEventListener('click', async () => {
        if (busy || owned || disposed) return;
        setBusy(true);
        say('Opening PayPal…');
        try {
          await paymentSession.start({ presentationMode: 'popup' }, createOrResumeOrder());
        } catch (error) { fail(error); }
        finally { setBusy(false); }
      });
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  })();
}
