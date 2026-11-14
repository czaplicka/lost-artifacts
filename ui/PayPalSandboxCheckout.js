import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
            reject(new Error(__dialogueText("ui/PayPalSandboxCheckout.js", "t_eccf8346cdd8ab0cea12")));
          }, 30000);
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error(__dialogueText("ui/PayPalSandboxCheckout.js", "t_187c4583bd9a00004871")));
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
  host.innerHTML = `${__dialogueText("ui/PayPalSandboxCheckout.js", "t_2dcaad9d74d3aebba2d0")}`;
  for (const b of host.querySelectorAll('button')) {
    b.style.cssText=__dialogueText("ui/PayPalSandboxCheckout.js", "t_1fe39d44946650479d1b");
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
    say(`${error.message || __dialogueText("ui/PayPalSandboxCheckout.js", "t_f1178eb9fb3d63cff0fa")}${__dialogueText("ui/PayPalSandboxCheckout.js", "t_01ba4719c80b6fe911b0")}` +
      (orderId ? __dialogueText("ui/PayPalSandboxCheckout.js", "t_9f1f495913b5e99bcd01") : __dialogueText("ui/PayPalSandboxCheckout.js", "t_a1ca90e442fd3668c6a7")));
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
    if (event.key === __dialogueText("ui/PayPalSandboxCheckout.js", "t_037c968467aa3fd7c059")) {
      event.preventDefault(); event.stopImmediatePropagation();
      dispose();
    }
    if (event.key === __dialogueText("ui/PayPalSandboxCheckout.js", "t_90ddf1963abb36c9921c")) {
      const nodes = [...panel.querySelectorAll(__dialogueText("ui/PayPalSandboxCheckout.js", "t_bc3b62f3e3ca296201b1"))]
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
      say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_29edc5475becaf78b0f6"));
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
      say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_82e72b461c4e68e80313"));
    } else {
      say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_6d1a35a39f5c8e20063b"));
    }
    sync();
  }

  async function confirm(id) {
    if (confirming) return confirming;
    confirming = (async () => {
      if (!orderId || id !== orderId) throw new Error('Order mismatch. Refresh status.');
      say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_445d50f9b5406efa6da6"));
      const data = await invoke('paypal-sandbox-capture-order', { orderId: id });
      if (data.status === 'PENDING') {
        say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_85aa44731f8fa18955dc"));
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
        onCancel: () => say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_5ed853b1c44e92d5b74b")),
        onError: error => fail(new Error(error.message || __dialogueText("ui/PayPalSandboxCheckout.js", "t_b17899918cf00e540027")))
      });
      payButton.addEventListener('click', async () => {
        if (busy || owned || disposed) return;
        setBusy(true);
        say(__dialogueText("ui/PayPalSandboxCheckout.js", "t_aab545b20e7c355ab442"));
        try {
          await paymentSession.start({ presentationMode: 'popup' }, createOrResumeOrder());
        } catch (error) { fail(error); }
        finally { setBusy(false); }
      });
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  })();
}
