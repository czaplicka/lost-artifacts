const FONT_PIXEL = 'PressStart2P';
const FONT_BODY = 'SpecialElite';
const W = 650, H = 624;

export class EnterRewardsPanel {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = false;
    this.root = scene.add.container(0, 0).setDepth(30).setScrollFactor(0);
    const art = scene.add.graphics();
    art.fillStyle(0x000000, 0.4).fillRoundedRect(8, 10, W, H, 8);
    art.fillStyle(0x18343d, 0.97).fillRoundedRect(0, 0, W, H, 8);
    art.lineStyle(2, 0xb99a57, 1).strokeRoundedRect(0, 0, W, H, 8);
    art.fillStyle(0x284b53, 1).fillRect(2, 2, W - 4, 72);
    art.fillStyle(0xd4af37, 1).fillRect(0, 74, W, 3);
    this.root.add(art);
    const text = (x, y, value, size, color = '#efe5c9', pixel = false, width = W - 60) => {
      const node = scene.add.text(x, y, value, {
        fontFamily: pixel ? FONT_PIXEL : FONT_BODY,
        fontSize: `${size}px`, color, wordWrap: { width, useAdvancedWrap: true },
        lineSpacing: pixel ? 6 : 4
      }).setScrollFactor(0);
      this.root.add(node);
      return node;
    };
    text(28, 18, 'MARK AGENCY // HR', 10, '#b9cbc5', true);
    text(28, 43, 'DAILY REWARDS', 19, '#ffe1a0', true);
    this.accountLabel = text(30, 96, 'ACCOUNT REQUIRED', 11, '#e5bd80', true);
    this.instructions = text(30, 125,
      'Sign in, enter the game, then collect your reward in Agency Mail.', 21);
    const rows = [
      ['01', '$100 cash', 'Not a raise. HR insists.'],
      ['02', '1 Coffee', 'For legally awake detectives.'],
      ['03', '1 Rest Voucher', 'Permission to do less.'],
      ['04', '1 Hint', 'A useful thought. Outsourced.'],
      ['05', '1 Free Transfer', 'Go somewhere. Keep the receipt.']
    ];
    rows.forEach(([number, label, joke], index) => {
      const y = 199 + index * 58;
      art.fillStyle(index % 2 ? 0x24454c : 0x203f47, 1).fillRect(24, y, W - 48, 52);
      art.lineStyle(1, 0x78908b, 0.24).lineBetween(24, y + 52, W - 24, y + 52);
      text(38, y + 18, number, 11, '#d4af37', true, 40);
      text(87, y + 6, label, 21, '#fff0c7', false, W - 120);
      text(87, y + 30, joke, 15, '#adc3bd', false, W - 120);
    });
    text(30, 505, 'ONE CLAIM PER REAL DAY', 11, '#e6c579', true);
    text(30, 533, 'Resets at 00:00 UTC. The rotation repeats after 5 claims.', 18, '#d1ddd1');
    text(30, 586, 'Missed a day? Your place in line is safe.', 17, '#b6cbc2');
    this.onResize = () => this.layout();
    scene.scale.on('resize', this.onResize);
    scene.events.once('destroy', this.destroy, this);
    this.layout();
  }
  layout() {
    if (this.destroyed) return;
    const { width, height } = this.scene.scale;
    const area = { x: width * 0.51, y: height * 0.19, w: width * 0.45, h: height * 0.67 };
    const scale = Math.max(0.01, Math.min(area.w / (W + 10), area.h / (H + 12)));
    this.root.setPosition(area.x + (area.w - W * scale) / 2,
      area.y + (area.h - H * scale) / 2).setScale(scale);
  }
  setUser(user) {
    if (this.destroyed) return;
    const registered = Boolean(user?.id && user.is_anonymous === false);
    this.accountLabel.setText(registered ? 'ACCOUNT CONNECTED' : 'ACCOUNT REQUIRED');
    this.accountLabel.setColor(registered ? '#a8d8b0' : '#e5bd80');
    this.instructions.setText(registered
      ? 'Enter the game, then collect your daily reward in Agency Mail.'
      : 'Sign in, enter the game, then collect your reward in Agency Mail.');
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.scale.off('resize', this.onResize);
    this.scene.events.off('destroy', this.destroy, this);
    this.root.destroy(true);
    this.root = null;
  }
}
