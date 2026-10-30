import { supabase } from '../supabase-client.js';

const CLIENT_ID = 'BAA1ttLiwIaOJXUhNvVraeRaBwqFYcXhto48D_fdR4alVuBljIS6UZ_4AfBOPKUMysnSYHmi2lDcaJ5NLM';
const PRODUCT_ID = 'sandbox_test_expansion';
const SDK_URL = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
let sdkPromise = null;
let current = null;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      if (!window.paypal?.createInstance) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = SDK_URL;
          script.async = true;
          const timer = setTimeout(() => {
            script.remove();
            reject(new Error('PayPal SDK loading timed out.'));
          }, 30000);
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error('Could not load PayPal SDK.'));
          };
          document.head.appendChild(script);
        });
      }
      if (!window.paypal?.createInstance) throw new Error('PayPal SDK conflict. Refresh the page.');
      return await window.paypal.createInstance({
        clientId: CLIENT_ID,
        components: ['paypal-payments'],
        pageType: 'checkout',
        locale: 'en-US'
      });
    })().catch(error => { sdkPromise = null; throw error; });
  }
  return sdkPromise;
}

export function openPayPalSandbox(scene) {
  if (current) { current.focus(); return; }
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#000b;display:grid;place-items:center;padding:16px;box-sizing:border-box;pointer-events:auto';
  host.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="paypal-test-title" tabindex="-1"
      style="box-sizing:border-box;width:min(540px,100%);max-height:90dvh;overflow:auto;background:#dac69d;color:#30271e;padding:28px;border:4px solid #59442e;box-shadow:0 12px 70px #000;font-family:SpecialElite,monospace">
      <h2 id="paypal-test-title" style="margin:0 0 16px">PAYPAL SANDBOX TEST</h2>
      <p>Test Expansion — Sandbox Only</p>
      <p style="font-size:25px">1.00 EUR — test funds only</p>
      <p>No mission is included. This test does not unlock Dead Mail.</p>
      <p data-status role="status" aria-live="polite" style="white-space:pre-wrap;min-height:65px">Checking your account…</p>
      <div data-pay hidden><paypal-button></paypal-button></div>
      <button data-retry hidden type="button">Retry confirmation — same order</button>
      <button data-refresh type="button">Refresh status</button>
      <button data-close type="button">Back to store</button>
    </section>`;
  for (const b of host.querySelectorAll('button')) {
    b.style.cssText='font:inherit;padding:12px;margin:8px 8px 0 0;cursor:pointer';
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
  let paymentSession = null;
  let authSubscription = null;
  let confirming = null;

  const say = message => { if (!disposed) status.textContent = message; };
  const key = () => `lost-artifacts:paypal-sandbox:${userId}`;
  const remember = id => {
    orderId = id;
    try { localStorage.setItem(key(), id); } catch { /* Server orders also support recovery. */ }
  };
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
    console.error('[PayPal Sandbox]', error);
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
      throw new Error('Please sign in to the game with the original account.');
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
      throw new Error(details?.error || error.message || 'Backend request failed.');
    }
    if (!data || data.error) throw new Error(data?.error || 'Empty backend response.');
    return data;
  }

  async function readState() {
    await ensureUser();
    const result = await supabase.from('store_sandbox_entitlements')
      .select('product_id').eq('user_id', userId)
      .eq('product_id', PRODUCT_ID).is('revoked_at', null).maybeSingle();
    if (result.error) throw new Error(`Ownership lookup failed: ${result.error.message}`);
    owned = Boolean(result.data);
    if (owned) {
      try { localStorage.removeItem(key()); } catch { /* Optional cache. */ }
      say('OWNED — SANDBOX ONLY\nTest entitlement found on your game account. No real mission was unlocked.');
      sync(); return;
    }
    const orders = await supabase.from('store_sandbox_orders')
      .select('paypal_order_id,status').eq('user_id', userId)
      .eq('product_id', PRODUCT_ID)
      .in('status', ['CREATED','APPROVED','PENDING','COMPLETED'])
      .not('paypal_order_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1);
    if (orders.error) throw new Error(`Order lookup failed: ${orders.error.message}`);
    orderId = orders.data?.[0]?.paypal_order_id || null;
    if (orderId) {
      say('An existing test order was found.\nRetry confirmation, or use PayPal to resume that same order.');
    } else {
      say('Ready for a Sandbox payment using test funds.\nSign in to PayPal with a Sandbox Personal buyer account.');
    }
    sync();
  }

  async function confirm(id) {
    if (confirming) return confirming;
    confirming = (async () => {
      if (!orderId || id !== orderId) throw new Error('Order mismatch. Refresh status.');
      say('Verifying the test payment…');
      const data = await invoke('paypal-sandbox-capture-order', { orderId: id });
      if (data.status === 'PENDING') {
        say('PayPal confirmation is pending. No access has been granted.\nRetry confirmation later for this same order.');
        return;
      }
      if (data.status !== 'COMPLETED' || data.owned !== true) {
        throw new Error('Payment is not confirmed.');
      }
      await readState();
      if (!owned) throw new Error('Payment confirmed, but entitlement lookup needs another refresh.');
    })();
    try { return await confirming; } finally { confirming = null; }
  }

  async function createOrResumeOrder() {
    await ensureUser();
    if (owned) throw new Error('This test product is already owned.');
    if (orderId) return { orderId };
    const data = await invoke('paypal-sandbox-create-order', { productId: PRODUCT_ID });
    if (data.environment !== 'sandbox' || typeof data.orderId !== 'string') {
      throw new Error('Unexpected create-order response.');
    }
    remember(data.orderId);
    return { orderId: data.orderId };
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
      userId = (await ensureUser()).id;
      const auth = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user || session.user.id !== userId) dispose(true);
      });
      authSubscription = auth.data.subscription;
      await readState();
      if (owned || disposed) return;
      const sdk = await loadSdk();
      if (disposed) return;
      const methods = await sdk.findEligibleMethods({ currencyCode: 'EUR', amount: '1.00' });
      if (disposed) return;
      if (!methods.isEligible('paypal')) throw new Error('PayPal is not available for this test. Check Sandbox Client ID and merchant settings.');
      paymentSession = sdk.createPayPalOneTimePaymentSession({
        onApprove: async data => {
          try {
            await confirm(data.orderId);
          } catch (error) { fail(error); }
        },
        onCancel: () => say('Checkout closed. No new purchase will be created.\nThe same test order can be resumed or checked.'),
        onError: error => fail(new Error(error.message || 'PayPal checkout error.'))
      });
      payButton.addEventListener('click', async () => {
        if (busy || owned || disposed) return;
        setBusy(true);
        say('Opening PayPal Sandbox…');
        try {
          await paymentSession.start({ presentationMode: 'popup' }, createOrResumeOrder());
        } catch (error) { fail(error); }
        finally { setBusy(false); }
      });
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  })();
}
