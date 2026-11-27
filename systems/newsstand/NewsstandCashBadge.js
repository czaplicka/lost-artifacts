import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';

// Odległość licznika od prawej krawędzi ekranu (px). Zwiększ, żeby przesunąć w lewo.
const CASH_RIGHT_PX = 260;
const CASH_TOP_PX = 16;

const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2
}).format(Math.max(0, Number(value) || 0));

export class NewsstandCashBadge {
  constructor(scene) {
    this.scene = scene;
    this.element = null;
    this.timer = null;
    this.destroyed = false;
    this.lastValue = null;
    this.onShutdown = () => this.destroy();
    scene.events.once('shutdown', this.onShutdown);
    this.create();
  }

  create() {
    if (typeof document === 'undefined' || !document.body) return;
    const root = document.createElement('div');
    root.setAttribute('role', 'status');
    root.style.cssText = [
      'position:fixed', `top:max(${CASH_TOP_PX}px, env(safe-area-inset-top))`,
      `right:${CASH_RIGHT_PX}px`,
      'z-index:2147483646', 'pointer-events:none', 'box-sizing:border-box',
      'padding:10px 18px', 'border:2px solid #d4af37', 'border-radius:10px',
      'background:rgba(24,31,26,0.97)', 'color:#fff2ce',
      'box-shadow:0 6px 20px rgba(0,0,0,0.5)',
      'font-family:SpecialElite,monospace', 'font-size:clamp(15px,1.8vw,20px)',
      'line-height:1.3', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(root);
    this.element = root;
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 300);
  }

  refresh() {
    if (this.destroyed || !this.element) return;
    const value = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (value === this.lastValue) return;
    this.lastValue = value;
    this.element.textContent = `CASH ${money(value)}`;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.element?.remove();
    this.element = null;
    this.scene.events.off('shutdown', this.onShutdown);
  }
}