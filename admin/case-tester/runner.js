import { installIsolation } from './isolation.js';
import { validateOptions } from './presets.js';
const channel = location.hash.slice(1);
let game = null, started = false;
function report(data) { if (parent !== window) parent.postMessage({ channel, ...data }, location.origin); }
function fail(error) {
  const text = error?.message || String(error);
  const element = document.getElementById('test-error');
  element.hidden = false; element.textContent = 'TEST SESSION STOPPED\n\n' + text;
  game?.loop?.sleep(); report({ type: 'error', detail: text });
}
try {
  if (parent === window || !/^[a-f0-9-]{36}$/i.test(channel)) throw new Error('Uruchom tester z panelu administratora.');
  installIsolation(report);
  window.addEventListener('error', event => fail(event.error || event.message));
  window.addEventListener('unhandledrejection', event => fail(event.reason));
  window.addEventListener('message', async event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== channel) return;
    if (event.data.type === 'pause') { game?.loop?.sleep(); return; }
    if (event.data.type === 'resume') { game?.loop?.wake(); return; }
    if (event.data.type !== 'start' || started) return;
    started = true;
    try {
      const options = validateOptions(event.data.options);
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('assets/vendor/phaser/phaser-3.90.0.min.js', document.baseURI).href;
        script.onload = resolve; script.onerror = () => reject(new Error('Nie można wczytać Phasera.'));
        document.head.append(script);
      });
      const { startTestGame } = await import('./runtime.js');
      game = await startTestGame(options, report, fail);
    } catch (error) { fail(error); }
  });
  report({ type: 'ready' });
} catch (error) { fail(error); }
