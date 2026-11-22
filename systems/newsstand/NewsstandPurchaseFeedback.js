import { newsstandPurchaseText as t } from '../../dialogues/NewsstandPurchaseText.js';

const money = value => new Intl.NumberFormat('en-US', {
  style:'currency', currency:'USD', maximumFractionDigits:2
}).format(Math.max(0, Number(value) || 0));

export class NewsstandPurchaseFeedback {
  constructor(scene) {
    this.scene = scene;
    this.element = null;
    this.timer = null;
    this.destroyed = false;
    this.onShutdown = () => this.destroy();
    scene.events.once('shutdown', this.onShutdown);
  }

  show(item, paid, balance, alreadyOwned = false) {
    if (this.destroyed || typeof document === 'undefined' || !document.body) return false;
    this.clear();
    const root = document.createElement('div');
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    root.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:max(24px, env(safe-area-inset-bottom))',
      'transform:translateX(-50%)', 'z-index:2147483000', 'pointer-events:none',
      'box-sizing:border-box', 'max-width:calc(100vw - 32px)', 'width:max-content',
      'padding:16px 24px', 'border:2px solid #d4af37', 'border-radius:12px',
      'background:rgba(24,31,26,0.97)', 'color:#fff2ce',
      'box-shadow:0 8px 28px rgba(0,0,0,0.5)',
      'font-family:SpecialElite,monospace', 'font-size:clamp(15px,2vw,21px)',
      'line-height:1.5', 'text-align:center', 'white-space:pre-line',
      'overflow-wrap:anywhere'
    ].join(';');
    const lines = [
      t(alreadyOwned ? 'owned' : 'bought', {item:String(item)}),
      alreadyOwned ? t('noExtra') : Number(paid) > 0 ? t('paid', {amount:money(paid)}) : t('free'),
      t('balance', {amount:money(balance)})
    ];
    root.textContent = lines.join('\n');
    document.body.appendChild(root);
    this.element = root;
    // A browser timer keeps the toast temporary even while the reader pauses the scene.
    this.timer = setTimeout(() => this.clear(), 4800);
    return true;
  }

  clear() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.element?.remove();
    this.element = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    this.scene.events.off('shutdown', this.onShutdown);
  }
}
