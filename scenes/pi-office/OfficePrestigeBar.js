import {
  getPrestigeStatus,
  getOfficeCaseSlots,
  getOfficePayoutMultiplier,
  ownsNewPIOffice,
  needsOfficeMoveIn
} from '../../managers/PIOfficeShopManager.js';
import { getActivePIQuestCount } from '../../managers/PIQuestManager.js';

const mounted = new WeakSet();

const BAR_W = 300;
const BAR_H = 14;
const PAD = 12;
const BOX_W = BAR_W + PAD * 2;
const BOX_H = 82;

export function mountPrestigeBar(scene) {
  if (mounted.has(scene)) return;
  mounted.add(scene);

  const box = scene.add.graphics().setDepth(90);
  const title = scene.add.text(0, 0, 'PRESTIGE', {
    fontFamily: 'PressStart2P, monospace', fontSize: '10px', color: '#d4af37'
  }).setDepth(91);
  const points = scene.add.text(0, 0, '', {
    fontFamily: 'PressStart2P, monospace', fontSize: '10px', color: '#fff1ce'
  }).setOrigin(1, 0).setDepth(91);
  const level = scene.add.text(0, 0, '', {
    fontFamily: 'SpecialElite, monospace', fontSize: '15px', color: '#fff1ce'
  }).setDepth(91);
  const perks = scene.add.text(0, 0, '', {
    fontFamily: 'SpecialElite, monospace', fontSize: '13px', color: '#c8c5b9'
  }).setDepth(91);

  const parts = [box, title, points, level, perks];
  let elapsed = 500;
  let last = '';

  const setVisible = visible => parts.forEach(part => part.setVisible(visible));

  const redraw = () => {
    const catalog = scene.cache.json.get('piOfficeShop');

    if (!catalog || !ownsNewPIOffice() || needsOfficeMoveIn()) {
      setVisible(false);
      return;
    }

    const status = getPrestigeStatus(catalog);
    const slots = getOfficeCaseSlots(catalog);
    const active = getActivePIQuestCount();
    const bonus = Math.round((getOfficePayoutMultiplier(catalog) - 1) * 100);

    const signature = JSON.stringify([status, slots, active, bonus, scene.scale.width]);
    if (signature === last) { setVisible(true); return; }
    last = signature;

    const x = scene.scale.width - BOX_W - 16;
    const y = 16;

    box.clear();
    box.fillStyle(0x191b16, 0.92);
    box.fillRect(x, y, BOX_W, BOX_H);
    box.lineStyle(2, 0xd4af37, 1);
    box.strokeRect(x, y, BOX_W, BOX_H);
    box.fillStyle(0x0e1822, 1);
    box.fillRect(x + PAD, y + 26, BAR_W, BAR_H);

    if (status.ratio > 0) {
      box.fillStyle(0xd4af37, 1);
      box.fillRect(x + PAD + 2, y + 28, Math.max(2, Math.round((BAR_W - 4) * status.ratio)), BAR_H - 4);
    }

    title.setPosition(x + PAD, y + 8);
    points.setPosition(x + BOX_W - PAD, y + 8);
    points.setText(status.maxed ? `${status.points} MAX` : `${status.points}/${status.nextAt}`);
    level.setPosition(x + PAD, y + 46);
    level.setText(`${status.name}`);
    perks.setPosition(x + PAD, y + 64);
    perks.setText(`Cases ${active}/${slots}  ·  Pay ${bonus >= 0 ? '+' : ''}${bonus}%`);

    setVisible(true);
  };

  const onUpdate = (_time, delta) => {
    elapsed += delta || 0;
    if (elapsed < 400) return;
    elapsed = 0;
    redraw();
  };

  const onResize = () => { last = ''; redraw(); };

  scene.events.on('update', onUpdate);
  scene.scale.on('resize', onResize);

  scene.events.once('shutdown', () => {
    scene.events.off('update', onUpdate);
    scene.scale.off('resize', onResize);
    parts.forEach(part => part.destroy());
    mounted.delete(scene);
  });

  redraw();
}