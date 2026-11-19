import { dialogueText } from '../../dialogues/DialogueText.js';
import {
  NEWSSTAND_CONFIG,
  NEWSSTAND_HOTSPOTS,
  LOCAL_DEBUG_ALLOWED,
  isEditableTarget
} from '../../config/newsstandConfig.js';

const SOURCE = 'systems/newsstand/NewsstandHotspots.js';
const t = id => dialogueText(SOURCE, id);
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export class NewsstandHotspots {
  constructor(scene, background) {
    this.scene = scene;
    this.background = background;
    this.configs = NEWSSTAND_HOTSPOTS.map(config => ({ ...config }));
    this.entries = [];
    this.debugMode = false;
    this.selectedIndex = 0;
    this.debugText = null;
    this.copyStatus = '';
    this.destroyed = false;

    this.onDebugKey = this.onDebugKey.bind(this);
    this.onCopyShortcut = this.onCopyShortcut.bind(this);
  }

  create() {
    for (const config of this.configs) this.createHotspot(config);

    if (LOCAL_DEBUG_ALLOWED) {
      this.debugText = this.scene.add.text(16, 16, '', {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '15px',
        color: '#fff1ce',
        backgroundColor: '#191b16',
        padding: { x: 10, y: 8 },
        wordWrap: { width: Math.max(100, this.scene.scale.width - 32) }
      }).setDepth(600).setVisible(false);

      this.scene.input.keyboard?.on('keydown', this.onDebugKey);
      window.addEventListener('keydown', this.onCopyShortcut, true);
    }

    this.updateDebug();
  }

  isBlocked() {
    return (
      this.scene.isOpeningNewspaper ||
      this.scene.comix?.isOpen ||
      this.scene.comix?.isAnimating ||
      this.scene.scene.isActive('NewspaperOverlayScene')
    );
  }

  getScaledHotspot(config) {
    const frame = this.background.getTransform();
    const sx = frame.width / NEWSSTAND_CONFIG.designWidth;
    const sy = frame.height / NEWSSTAND_CONFIG.designHeight;

    return {
      ...config,
      x: frame.x + config.x * sx,
      y: frame.y + config.y * sy,
      width: config.width * sx,
      height: config.height * sy
    };
  }

  createHotspot(config) {
    const scene = this.scene;
    const spot = this.getScaledHotspot(config);
    const index = this.entries.length;

    const zone = scene.add.zone(spot.x, spot.y, spot.width, spot.height)
      .setOrigin(0, 0)
      .setDepth(config.depth)
      .setInteractive({ useHandCursor: true });

    const priceLabel = scene.add.text(
      0,
      0,
      `${config.label}${t('t_72fb6b575698bc470b35')}${config.price}`,
      {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#f6dc8c',
        backgroundColor: '#1a1111',
        padding: { x: 8, y: 6 },
        stroke: t('t_7b2817bf9b80e66d07f2'),
        strokeThickness: 3
      }
    ).setOrigin(0.5, 0).setDepth(config.labelDepth);

    const highlight = LOCAL_DEBUG_ALLOWED
      ? scene.add.graphics().setDepth(40).setVisible(false)
      : null;

    const debugLabel = LOCAL_DEBUG_ALLOWED
      ? scene.add.text(0, 0, config.id, {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#191b16',
          padding: { x: 6, y: 4 }
        }).setOrigin(0, 1).setDepth(41).setVisible(false)
      : null;

    const entry = { config, zone, priceLabel, highlight, debugLabel, index };
    this.entries.push(entry);

    zone.on('pointerdown', () => {
      if (!this.debugMode || this.isBlocked()) return;
      this.selectedIndex = index;
      this.updateDebug();
    });

    zone.on('pointerup', () => {
      if (this.debugMode || this.isBlocked()) return;

      if (config.kind === 'newspaper') {
        void scene.buyAndOpenNewspaper(config);
      } else if (config.kind === 'comix') {
        scene.buyAndOpenComix(config);
      }
    });

    if (LOCAL_DEBUG_ALLOWED) {
      if (this.debugMode) scene.input.setDraggable(zone, true);

      zone.on('drag', (_pointer, x, y) => {
        if (!this.debugMode || this.isBlocked()) return;

        const frame = this.background.getTransform();
        const sx = frame.width / NEWSSTAND_CONFIG.designWidth;
        const sy = frame.height / NEWSSTAND_CONFIG.designHeight;
        if (!sx || !sy) return;

        config.x = Math.round((x - frame.x) / sx);
        config.y = Math.round((y - frame.y) / sy);
        this.selectedIndex = index;
        this.copyStatus = '';
        this.syncHotspot(entry);
        this.updateDebug();
      });
    }

    this.syncHotspot(entry);
  }

  positionPriceLabel(label, spot) {
    const { width, height } = this.scene.scale;
    const margin = 12;
    const available = Math.max(1, width - margin * 2);

    label.setScale(label.width > available ? available / label.width : 1);

    const half = label.displayWidth / 2;
    const x = Phaser.Math.Clamp(
      spot.x + spot.width / 2,
      margin + half,
      width - margin - half
    );
    const y = Phaser.Math.Clamp(
      spot.y + spot.height + 10,
      margin,
      Math.max(margin, height - margin - label.displayHeight)
    );

    label.setPosition(x, y);
  }

  syncHotspot(entry) {
    const spot = this.getScaledHotspot(entry.config);
    entry.zone.setPosition(spot.x, spot.y).setSize(spot.width, spot.height);
    entry.zone.input?.hitArea?.setTo(0, 0, spot.width, spot.height);
    this.positionPriceLabel(entry.priceLabel, spot);
    this.drawDebugHotspot(entry);
  }

  drawDebugHotspot(entry) {
    const { config, highlight, debugLabel, index } = entry;
    if (!highlight) return;

    highlight.clear();
    highlight.setVisible(this.debugMode);
    debugLabel?.setVisible(this.debugMode);
    if (!this.debugMode) return;

    const { x, y, width, height } = this.getScaledHotspot(config);
    highlight.fillStyle(0x00ff88, 0.20);
    highlight.fillRect(x, y, width, height);
    highlight.lineStyle(2, index === this.selectedIndex ? 0xff44ff : 0x00ff88, 1);
    highlight.strokeRect(x, y, width, height);
    debugLabel?.setPosition(x, y - 4).setText(config.id);
  }

  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED || (enabled && this.isBlocked())) return;
    this.debugMode = Boolean(enabled);
    this.copyStatus = '';

    for (const entry of this.entries) {
      this.scene.input.setDraggable(entry.zone, this.debugMode);
    }

    this.updateDebug();
  }

  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;

    for (const entry of this.entries) this.drawDebugHotspot(entry);
    this.debugText?.setVisible(this.debugMode);
    if (!this.debugMode) return;

    const config = this.entries[this.selectedIndex]?.config;
    const lines = [
      `Newsstand hotspot: ${config?.id ?? '—'}`,
      `City: ${this.scene.getActiveCityId()}`,
      config
        ? `x: ${config.x}  y: ${config.y}  w: ${config.width}  h: ${config.height}`
        : 'No hotspot selected',
      'Tab: select · Drag / arrows: move',
      'Shift + arrows: resize · Alt: 1 px step',
      'Ctrl+C / Cmd+C: copy all hotspots · D: exit debug'
    ];

    if (this.copyStatus) lines.push(this.copyStatus);
    this.debugText?.setText(lines.join('\n'));
  }

  onCopyShortcut(event) {
    const isC = event.code === 'KeyC' || event.key?.toLowerCase() === 'c';

    if (!isC || (!event.ctrlKey && !event.metaKey) ||
        event.shiftKey || event.altKey ||
        this.destroyed || !this.debugMode || !this.scene.sys.isActive() ||
        this.isBlocked() || isEditableTarget(event)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!event.repeat) void this.copyHotspots();
  }

  async copyHotspots() {
    const coordinates = this.entries.map(({ config }) => ({
      id: config.id,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height
    }));
    const json = JSON.stringify(coordinates, null, 2);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }

      await navigator.clipboard.writeText(json);
      if (this.destroyed || !this.debugMode) return;
      this.copyStatus = `Copied ${coordinates.length} hotspots.`;
    } catch {
      console.log('[NewsstandHotspots] Hotspot coordinates:\n' + json);
      if (this.destroyed || !this.debugMode) return;
      this.copyStatus = 'Clipboard unavailable. Coordinates printed in console.';
    }

    this.updateDebug();
  }

  onDebugKey(event) {
    if (!LOCAL_DEBUG_ALLOWED || this.destroyed || isEditableTarget(event) ||
        event.ctrlKey || event.metaKey || this.isBlocked()) return;

    if (event.code === 'KeyD') {
      if (!event.repeat) this.setDebugMode(!this.debugMode);
      return;
    }

    if (!this.debugMode || !this.entries.length) return;

    if (event.code === 'Tab') {
      event.preventDefault();
      const count = this.entries.length;
      const delta = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + delta + count) % count;
      this.updateDebug();
      return;
    }

    if (!ARROWS.includes(event.code)) return;

    event.preventDefault();
    const entry = this.entries[this.selectedIndex];
    const config = entry.config;
    const step = event.altKey ? 1 : 5;
    const horizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
    const negative = event.code === 'ArrowLeft' || event.code === 'ArrowUp';
    const key = event.shiftKey
      ? (horizontal ? 'width' : 'height')
      : (horizontal ? 'x' : 'y');

    config[key] += negative ? -step : step;
    config.width = Math.max(10, config.width);
    config.height = Math.max(10, config.height);

    this.copyStatus = '';
    this.syncHotspot(entry);
    this.updateDebug();
  }

  resize() {
    if (this.destroyed) return;
    this.debugText?.setWordWrapWidth(Math.max(100, this.scene.scale.width - 32));

    for (const entry of this.entries) this.syncHotspot(entry);
    this.updateDebug();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (LOCAL_DEBUG_ALLOWED) {
      window.removeEventListener('keydown', this.onCopyShortcut, true);
      this.scene.input.keyboard?.off('keydown', this.onDebugKey);
    }

    for (const entry of this.entries) {
      if (entry.zone.input) this.scene.input.setDraggable(entry.zone, false);
      entry.zone.destroy();
      entry.priceLabel.destroy();
      entry.highlight?.destroy();
      entry.debugLabel?.destroy();
    }

    this.debugText?.destroy();
    this.debugText = null;
    this.debugMode = false;
    this.entries = [];
    this.configs = [];
  }
}