import { EventBus } from '../EventBus.js';
import { formatPIClock, advancePITime, describePIWait } from '../managers/PIClockManager.js';

export function attachPIClockUI(scene) {
  let disposed = false;
  const root = document.createElement('div');
  root.dataset.piClock = 'true';
  Object.assign(root.style, { position: 'fixed', zIndex: '10010', display: 'flex', gap: '8px',
    alignItems: 'center', padding: '8px', color: '#ffe19b', background: '#222a24',
    border: '2px solid #b89a58', borderRadius: '5px', fontFamily: 'SpecialElite, monospace',
    fontSize: '16px', pointerEvents: 'auto', boxSizing: 'border-box', flexWrap: 'wrap' });
  const label = document.createElement('span');
  root.appendChild(label);
  function button(text, fn, parent = root) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    Object.assign(b.style, { color: '#ffe19b', background: '#303c32', border: '1px solid #b89a58',
      padding: '8px', fontFamily: 'SpecialElite, monospace', cursor: 'pointer', minHeight: '38px' });
    b.addEventListener('click', e => { e.stopPropagation(); if (!disposed) fn(); });
    parent.appendChild(b); return b;
  }
  const advance = minutes => {
    if (scene.piTimeModalOpen) return;
    scene.cancelWalking?.(); scene.heldArrows?.clear();
    advancePITime(minutes, 'wait');
  };
  const half = button('+30 min', () => advance(30));
  const hour = button('+1 hour', () => advance(60));
  for (const name of ['pointerdown', 'pointerup', 'click', 'wheel']) root.addEventListener(name, e => e.stopPropagation());
  document.body.appendChild(root);
  let modal = null, previousFocus = null;
  function closeModal() {
    modal?.remove(); modal = null; scene.piTimeModalOpen = false;
    previousFocus?.focus?.(); previousFocus = null;
  }
  function layout() {
    if (disposed) return;
    const box = scene.game.canvas.getBoundingClientRect();
    const active = scene.sys.isActive() && scene.sys.isVisible();
    root.style.display = active ? 'flex' : 'none';
    const compact = box.width < 700;
    root.style.left = `${box.left + 8}px`;
    root.style.top = `${box.bottom - (compact ? 94 : 58)}px`;
    root.style.maxWidth = `${Math.max(100, box.width - 16)}px`;
    const blocked = Boolean(scene.navigating || scene.disposed || scene.piTimeModalOpen || scene.panel || scene.debugMode || scene.path?.length);
    half.disabled = hour.disabled = blocked;
    half.style.opacity = hour.style.opacity = blocked ? '0.4' : '1';
    if (!active && modal) closeModal();
  }
  function refresh() { if (!disposed) { label.textContent = formatPIClock(); layout(); } }
  function offerWait({ title, status, onReady, onLeave }) {
    if (disposed || modal || scene.navigating || scene.disposed) return false;
    previousFocus = document.activeElement;
    scene.cancelWalking?.(); scene.heldArrows?.clear(); scene.piTimeModalOpen = true;
    const overlay = document.createElement('div'); modal = overlay;
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '20000', background: '#000a',
      display: 'grid', placeItems: 'center', padding: '20px' });
    const panel = document.createElement('div'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    Object.assign(panel.style, { width: '420px', maxWidth: '100%', background: '#242d27', color: '#ffe7b4',
      border: '3px solid #b89a58', padding: '24px', fontFamily: 'SpecialElite, monospace', fontSize: '22px', boxSizing: 'border-box' });
    const text = document.createElement('p');
    text.textContent = `${title} ${status.next ? `Available at ${describePIWait(status)}.` : 'No scheduled opening.'}`;
    panel.appendChild(text);
    let first;
    if (status.waitMinutes > 0) first = button('Wait until available', () => {
      closeModal(); advancePITime(status.waitMinutes, 'wait_for_availability'); onReady?.();
    }, panel);
    const leave = button('Leave', () => { closeModal(); onLeave?.(); }, panel); first ??= leave;
    overlay.appendChild(panel);
    overlay.addEventListener('pointerdown', e => e.stopPropagation());
    overlay.addEventListener('keydown', e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closeModal(); onLeave?.(); }
      if (e.code === 'Tab') {
        const buttons = [...panel.querySelectorAll('button')];
        const i = buttons.indexOf(document.activeElement);
        e.preventDefault(); buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    });
    document.body.appendChild(overlay); first.focus(); layout(); return true;
  }
  function cleanup() {
    if (disposed) return; disposed = true; closeModal(); root.remove();
    EventBus.off('pi:timeChanged', refresh);
    scene.events.off('postupdate', layout); scene.events.off('wake', refresh); scene.events.off('resume', refresh);
    window.removeEventListener('resize', layout); window.removeEventListener('scroll', layout);
    scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
  }
  EventBus.on('pi:timeChanged', refresh);
  scene.events.on('postupdate', layout); scene.events.on('wake', refresh); scene.events.on('resume', refresh);
  window.addEventListener('resize', layout); window.addEventListener('scroll', layout, { passive: true });
  scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
  refresh(); return { offerWait, refresh, destroy: cleanup };
}
