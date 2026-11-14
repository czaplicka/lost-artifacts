import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const ARROW_TEXTURE_KEY = 'office-navigation-arrow-v2';

const FONT_TITLE = 'PressStart2P';
const FONT_BODY = 'SpecialElite';

const DEPTH = 10000;

// Wszystkie "magiczne liczby" układu w jednym miejscu.
// Jeśli coś koliduje z HUD-em, zmieniaj tylko tutaj.
const LAYOUT = {
  arrowInset: 64,
  captionOffsetY: 74,

  railBottomMargin: 62,
  railPlateHeight: 84,
  railPlatePaddingX: 24,
  railSideMargin: 340,

  nodeWidth: 190,
  nodeHeight: 58,
  nodeGap: 30,

  hintBottomOffset: 142,
  introBottomOffset: 192
};

const HOTKEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];

// Domyślne nazwy pokoi. Scena może je nadpisać przez options.getRoomMeta(key).
const DEFAULT_ROOM_META = {
  elevator: { label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_8ec78fd4e0c76ee47e25"), subtitle: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_24d8f84a780c7168cc3f") },
  storage: { label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_5b24b840a76014023657"), subtitle: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_6ac6b00357d9081fdc38") },
  office: { label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_9af0ff0f58a463fe73ff"), subtitle: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_55483976a9e1caae2b56") },
  cabinet: { label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_408d2e9270273051bb20"), subtitle: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_163bcef7b4a7b5a834c6") }
};

const NODE_STYLE = {
  idle: {
    fill: 0x1d1610,
    stroke: 0x6d5a3a,
    strokeAlpha: 0.9,
    width: 2,
    label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_8f591c0c61b3a3b955da"),
    sub: '#8a7c5c',
    icon: 0xb9a877
  },
  hover: {
    fill: 0x2e2314,
    stroke: 0xf0e6b8,
    strokeAlpha: 1,
    width: 2,
    label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_02f546fa4a359199bfb9"),
    sub: '#d7c58f',
    icon: 0xfff4c7
  },
  current: {
    fill: 0x3b2b12,
    stroke: 0xf2d477,
    strokeAlpha: 1,
    width: 3,
    label: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_02f546fa4a359199bfb9"),
    sub: '#f2d477',
    icon: 0xf2d477
  }
};

export class OfficeNavigation {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.roomOrder = options.roomOrder ?? [];
    this.viewPositions = options.viewPositions ?? {};
    this.currentView = options.initialView ?? 'office';

    this.getRoomMeta =
      typeof options.getRoomMeta === 'function'
        ? options.getRoomMeta
        : null;

    this.isLocked = false;
    this.isMoving = false;
    this.isVisible = true;
    this.isDestroyed = false;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;

    this.rail = null;
    this.railPlate = null;
    this.railMarker = null;
    this.railNodes = [];
    this.railMetrics = null;

    this.cameraTween = null;
    this.introTween = null;
    this.introTimer = null;
    this.hintTween = null;
    this.markerTween = null;
    this.markerBobTween = null;

    this.arrowStates = new Map();
    this.hotkeyBindings = [];

    this.onResize = () => this.layout();
  }

  // ---------------------------------------------------------------------------
  // Tworzenie
  // ---------------------------------------------------------------------------

  create() {
    this.createArrowTexture();

    this.leftArrow = this.createArrowButton('left');
    this.rightArrow = this.createArrowButton('right');

    this.createRail();
    this.createHints();

    this.bindArrow(
      this.leftArrow,
      () => this.moveLeft()
    );

    this.bindArrow(
      this.rightArrow,
      () => this.moveRight()
    );

    this.bindHotkeys();

    this.scene.scale?.on('resize', this.onResize);

    this.layout();
    this.refreshRoomMeta();
  }

  createArrowTexture() {
    if (this.scene.textures.exists(ARROW_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.scene.make.graphics({
      x: 0,
      y: 0,
      add: false
    });

    // Cień
    graphics.fillStyle(0x000000, 0.35);
    graphics.fillRoundedRect(5, 7, 80, 106, 14);

    // Płyta
    graphics.fillStyle(0x17110e, 0.94);
    graphics.fillRoundedRect(2, 2, 80, 106, 14);

    graphics.lineStyle(3, 0xf2d477, 0.95);
    graphics.strokeRoundedRect(2, 2, 80, 106, 14);

    graphics.lineStyle(1, 0x7d6a3d, 0.9);
    graphics.strokeRoundedRect(8, 8, 68, 94, 9);

    // Podwójny szewron (wskazuje w lewo)
    graphics.lineStyle(7, 0xa48a45, 1);
    graphics.beginPath();
    graphics.moveTo(42, 33);
    graphics.lineTo(26, 55);
    graphics.lineTo(42, 77);
    graphics.strokePath();

    graphics.lineStyle(7, 0xf2d477, 1);
    graphics.beginPath();
    graphics.moveTo(60, 33);
    graphics.lineTo(44, 55);
    graphics.lineTo(60, 77);
    graphics.strokePath();

    graphics.generateTexture(ARROW_TEXTURE_KEY, 88, 116);
    graphics.destroy();
  }

  createArrowButton(direction) {
    const arrow = this.scene.add
      .image(0, 0, ARROW_TEXTURE_KEY)
      .setName(`office-navigation-${direction}`)
      .setDepth(DEPTH)
      .setScrollFactor(0)
      .setAlpha(0.95)
      .setFlipX(direction === 'right')
      .setInteractive({
        useHandCursor: true,
        cursor: 'pointer'
      });

    const caption = this.scene.add
      .text(0, 0, '', {
        fontFamily: FONT_TITLE,
        fontSize: '9px',
        color: '#f0e6b8',
        stroke: __dialogueText("scenes/office/OfficeNavigationBase.js", "t_7b2817bf9b80e66d07f2"),
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    const tween = this.scene.tweens.add({
      targets: arrow,
      alpha: {
        from: 0.72,
        to: 1
      },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true
    });

    this.arrowStates.set(arrow, {
      direction,
      tween,
      caption,
      canMove: false,
      hovered: false
    });

    // Obsługuje również bezpośrednie arrow.setVisible(false)
    // wywoływane z zewnątrz (np. przez tutorial).
    const originalSetVisible = arrow.setVisible;

    arrow.setVisible = (visible) => {
      originalSetVisible.call(arrow, visible);

      const state = this.arrowStates.get(arrow);

      if (state && !visible) {
        state.hovered = false;
        arrow.setScale(1);
      }

      this.refreshArrow(arrow);

      return arrow;
    };

    return arrow;
  }

  bindArrow(arrow, move) {
    arrow
      .on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        pointer?.event?.stopPropagation?.();

        if (!this.canUseArrow(arrow)) {
          return;
        }

        move();
      })
      .on('pointerover', () => {
        if (!this.canUseArrow(arrow)) {
          return;
        }

        const state = this.arrowStates.get(arrow);
        state.hovered = true;

        this.refreshArrow(arrow);
      })
      .on('pointerout', () => {
        const state = this.arrowStates.get(arrow);

        if (!state) {
          return;
        }

        state.hovered = false;

        this.refreshArrow(arrow);
      });
  }

  createHints() {
    this.navHint = this.scene.add
      .text(0, 0, '', {
        fontFamily: FONT_BODY,
        fontSize: '20px',
        color: '#f0e6b8',
        backgroundColor: '#17110e',
        padding: {
          left: 12,
          right: 12,
          top: 8,
          bottom: 8
        }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    const hotkeyCount = Math.min(
      this.roomOrder.length,
      HOTKEY_NAMES.length
    );

    const keysText = hotkeyCount > 1
      ? `${__dialogueText("scenes/office/OfficeNavigationBase.js", "t_eeaa9f06e26c7fee312e")}${hotkeyCount}`
      : '';

    this.introHint = this.scene.add
      .text(
        0,
        0,
        `${__dialogueText("scenes/office/OfficeNavigationBase.js", "t_6a92c78056aa5ae92ec3")}${keysText}${__dialogueText("scenes/office/OfficeNavigationBase.js", "t_cdb4ee2aea69cc6a8333")}`,
        {
          fontFamily: FONT_BODY,
          fontSize: '18px',
          color: '#fff4c7',
          backgroundColor: '#17110e',
          padding: {
            left: 12,
            right: 12,
            top: 8,
            bottom: 8
          }
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setAlpha(0);
  }

  // ---------------------------------------------------------------------------
  // Pasek pokoi (room rail)
  // ---------------------------------------------------------------------------

  getRailMetrics() {
    const count = this.roomOrder.length;
    const { nodeWidth, nodeGap, railPlatePaddingX, railPlateHeight } = LAYOUT;

    const nodesWidth =
      count * nodeWidth + Math.max(0, count - 1) * nodeGap;

    return {
      count,
      nodesWidth,
      plateWidth: nodesWidth + railPlatePaddingX * 2,
      plateHeight: railPlateHeight
    };
  }

  getNodeCenterX(index) {
    const { nodeWidth, nodeGap } = LAYOUT;
    const { nodesWidth } = this.railMetrics;

    return -nodesWidth / 2 + nodeWidth / 2 + index * (nodeWidth + nodeGap);
  }

  createRail() {
    if (!this.roomOrder.length) {
      return;
    }

    const scene = this.scene;

    this.railMetrics = this.getRailMetrics();

    this.rail = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.railPlate = scene.add
      .graphics()
      .setScrollFactor(0);

    this.rail.add(this.railPlate);
    this.drawRailPlate();

    this.roomOrder.forEach((key, index) => {
      const node = this.createRailNode(key, index);

      this.railNodes.push(node);
      this.rail.add(node.container);
    });

    // Znacznik "jesteś tutaj" nad aktualnym pokojem.
    const markerBaseY = -this.railMetrics.plateHeight / 2 - 13;

    this.railMarker = scene.add
      .graphics()
      .setScrollFactor(0)
      .setPosition(0, markerBaseY);

    this.railMarker.fillStyle(0x000000, 0.45);
    this.railMarker.fillTriangle(-9, 2, 9, 2, 0, 13);
    this.railMarker.fillStyle(0xf2d477, 1);
    this.railMarker.fillTriangle(-9, 0, 9, 0, 0, 11);

    this.rail.add(this.railMarker);

    this.markerBobTween = scene.tweens.add({
      targets: this.railMarker,
      y: {
        from: markerBaseY,
        to: markerBaseY - 4
      },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.moveMarkerTo(
      Math.max(0, this.roomOrder.indexOf(this.currentView)),
      false
    );
  }

  drawRailPlate() {
    const g = this.railPlate;
    const { plateWidth, plateHeight, count } = this.railMetrics;
    const { nodeWidth } = LAYOUT;

    const x = -plateWidth / 2;
    const y = -plateHeight / 2;

    g.clear();

    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x + 4, y + 6, plateWidth, plateHeight, 14);

    g.fillStyle(0x120f0b, 0.9);
    g.fillRoundedRect(x, y, plateWidth, plateHeight, 14);

    g.lineStyle(3, 0xf2d477, 0.9);
    g.strokeRoundedRect(x, y, plateWidth, plateHeight, 14);

    g.lineStyle(1, 0x7d6a3d, 0.8);
    g.strokeRoundedRect(x + 6, y + 6, plateWidth - 12, plateHeight - 12, 10);

    // Korytarze łączące pokoje.
    for (let i = 0; i < count - 1; i++) {
      const x1 = this.getNodeCenterX(i) + nodeWidth / 2;
      const x2 = this.getNodeCenterX(i + 1) - nodeWidth / 2;
      const mid = (x1 + x2) / 2;

      g.lineStyle(3, 0x4a3d26, 1);
      g.lineBetween(x1, 0, x2, 0);

      g.fillStyle(0x7d6a3d, 1);
      g.fillCircle(mid, 0, 3);
    }

    // Nity.
    g.fillStyle(0x7d6a3d, 1);

    [
      [x + 14, y + 14],
      [x + plateWidth - 14, y + 14],
      [x + 14, y + plateHeight - 14],
      [x + plateWidth - 14, y + plateHeight - 14]
    ].forEach(([px, py]) => g.fillCircle(px, py, 2));
  }

  createRailNode(key, index) {
    const scene = this.scene;
    const { nodeWidth: w, nodeHeight: h } = LAYOUT;

    const container = scene.add
      .container(this.getNodeCenterX(index), 0)
      .setScrollFactor(0);

    const bg = scene.add.graphics().setScrollFactor(0);

    const icon = scene.add
      .graphics()
      .setScrollFactor(0)
      .setPosition(-w / 2 + 36, 2);

    const number = scene.add
      .text(-w / 2 + 8, -h / 2 + 6, String(index + 1), {
        fontFamily: FONT_TITLE,
        fontSize: '8px',
        color: '#7d6a3d'
      })
      .setScrollFactor(0);

    const label = scene.add
      .text(-w / 2 + 62, -h / 2 + 11, '', {
        fontFamily: FONT_TITLE,
        fontSize: '10px',
        color: NODE_STYLE.idle.label
      })
      .setScrollFactor(0);

    const sub = scene.add
      .text(-w / 2 + 62, h / 2 - 22, '', {
        fontFamily: FONT_BODY,
        fontSize: '14px',
        color: NODE_STYLE.idle.sub
      })
      .setScrollFactor(0);

    const hit = scene.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setScrollFactor(0)
      .setInteractive({
        useHandCursor: true,
        cursor: 'pointer'
      });

    container.add([bg, icon, number, label, sub, hit]);

    const node = {
      key,
      index,
      container,
      bg,
      icon,
      number,
      label,
      sub,
      hit,
      hovered: false
    };

    hit.on('pointerover', () => {
      if (!this.canNavigate() || key === this.currentView) {
        return;
      }

      node.hovered = true;
      this.refreshRail();
    });

    hit.on('pointerout', () => {
      node.hovered = false;
      this.refreshRail();
    });

    hit.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();

      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (!this.canNavigate() || key === this.currentView) {
        return;
      }

      this.goTo(key);
    });

    return node;
  }

  paintNode(node, state) {
    const style = NODE_STYLE[state] ?? NODE_STYLE.idle;
    const { nodeWidth: w, nodeHeight: h } = LAYOUT;

    node.bg.clear();

    node.bg.fillStyle(style.fill, 1);
    node.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    node.bg.lineStyle(style.width, style.stroke, style.strokeAlpha);
    node.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    if (state === 'current') {
      node.bg.lineStyle(1, 0xfff4c7, 0.35);
      node.bg.strokeRoundedRect(
        -w / 2 + 4,
        -h / 2 + 4,
        w - 8,
        h - 8,
        5
      );
    }

    node.label.setColor(style.label);
    node.sub.setColor(style.sub);

    this.drawRoomIcon(node.icon, node.key, style.icon);
  }

  drawRoomIcon(g, key, color) {
    g.clear();
    g.lineStyle(2, color, 1);
    g.fillStyle(color, 1);

    switch (key) {
      case 'elevator':
        g.strokeRect(-9, -11, 18, 24);
        g.lineBetween(0, -11, 0, 13);
        g.fillTriangle(-4, -15, 4, -15, 0, -21);
        break;

      case 'storage':
        g.strokeCircle(0, 0, 11);
        g.strokeEllipse(0, 0, 10, 22);
        g.lineBetween(-11, 0, 11, 0);
        break;

      case 'office':
        g.fillRect(-13, 2, 26, 4);
        g.lineBetween(-10, 6, -10, 14);
        g.lineBetween(10, 6, 10, 14);
        g.lineBetween(-8, 2, -8, -6);
        g.lineBetween(-8, -6, 0, -10);
        break;

      case 'cabinet':
        g.strokeRect(-9, -13, 18, 26);
        g.lineBetween(-9, -4, 9, -4);
        g.lineBetween(-9, 5, 9, 5);
        g.fillRect(-3, -10, 6, 2);
        g.fillRect(-3, -1, 6, 2);
        g.fillRect(-3, 8, 6, 2);
        break;

      default:
        g.strokeCircle(0, 0, 8);
        break;
    }
  }

  moveMarkerTo(index, animate, duration = 550) {
    if (!this.railMarker?.scene || index < 0) {
      return;
    }

    const x = this.getNodeCenterX(index);

    this.markerTween?.remove();
    this.markerTween = null;

    if (!animate) {
      this.railMarker.x = x;
      return;
    }

    this.markerTween = this.scene.tweens.add({
      targets: this.railMarker,
      x,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.markerTween = null;
      }
    });
  }

  refreshRail() {
    if (this.isDestroyed || !this.rail?.scene) {
      return;
    }

    const interactive = this.canNavigate();

    this.rail.setVisible(this.isVisible);
    this.rail.setAlpha(this.isLocked ? 0.55 : 1);

    this.railNodes.forEach(node => {
      const current = node.key === this.currentView;

      if (!interactive || current) {
        node.hovered = false;
      }

      const state = current
        ? 'current'
        : node.hovered
          ? 'hover'
          : 'idle';

      this.paintNode(node, state);

      if (node.hit.input) {
        node.hit.input.enabled = interactive && !current;
      }
    });
  }

  refreshRoomMeta() {
    if (this.isDestroyed) {
      return;
    }

    this.railNodes.forEach(node => {
      const meta = this.getMeta(node.key);

      node.label.setText(meta.label);
      node.sub.setText(meta.subtitle ?? '');

      this.fitText(node.label, 112);
      this.fitText(node.sub, 116);
    });

    this.updateVisibility();
  }

  getMeta(roomKey) {
    const fallback = DEFAULT_ROOM_META[roomKey] ?? {
      label: String(roomKey).toUpperCase(),
      subtitle: ''
    };

    let custom = null;

    try {
      custom = this.getRoomMeta?.(roomKey) ?? null;
    } catch (error) {
      console.warn(
        '[OfficeNavigation] getRoomMeta failed:',
        error
      );
    }

    return {
      ...fallback,
      ...(custom ?? {})
    };
  }

  fitText(text, maxWidth) {
    if (!text?.scene) {
      return;
    }

    text.setScale(1);

    if (text.width > maxWidth) {
      text.setScale(maxWidth / text.width);
    }
  }

  // ---------------------------------------------------------------------------
  // Układ
  // ---------------------------------------------------------------------------

  layout() {
    if (this.isDestroyed) {
      return;
    }

    const { width, height } = this.scene.scale;

    this.leftArrow?.setPosition(LAYOUT.arrowInset, height / 2);
    this.rightArrow?.setPosition(width - LAYOUT.arrowInset, height / 2);

    [this.leftArrow, this.rightArrow].forEach(arrow => {
      const state = this.arrowStates.get(arrow);

      if (arrow && state?.caption) {
        state.caption.setPosition(
          arrow.x,
          arrow.y + LAYOUT.captionOffsetY
        );
      }
    });

    if (this.rail && this.railMetrics) {
      const maxWidth = Math.max(
        200,
        width - LAYOUT.railSideMargin
      );

      const scale = Math.min(
        1,
        maxWidth / this.railMetrics.plateWidth
      );

      this.rail
        .setScale(scale)
        .setPosition(
          width / 2,
          height - LAYOUT.railBottomMargin
        );
    }

    this.navHint?.setPosition(
      width / 2,
      height - LAYOUT.hintBottomOffset
    );

    this.introHint?.setPosition(
      width / 2,
      height - LAYOUT.introBottomOffset
    );
  }

  // ---------------------------------------------------------------------------
  // Strzałki
  // ---------------------------------------------------------------------------

  canNavigate() {
    return Boolean(
      this.isVisible &&
      !this.isLocked &&
      !this.isMoving &&
      !this.isDestroyed
    );
  }

  canUseArrow(arrow) {
    const state = this.arrowStates.get(arrow);

    return Boolean(
      state &&
      state.canMove &&
      arrow.visible &&
      this.canNavigate()
    );
  }

  refreshArrow(arrow) {
    const state = this.arrowStates.get(arrow);

    if (!state || this.isDestroyed) {
      return;
    }

    const enabled = this.canUseArrow(arrow);

    if (arrow.input) {
      arrow.input.enabled = enabled;
    }

    state.caption
      .setVisible(Boolean(arrow.visible && this.isVisible))
      .setAlpha(enabled ? 1 : 0.45);

    if (!enabled) {
      state.hovered = false;
      state.tween.pause();

      arrow.setScale(1);
      arrow.setAlpha(0.35);

      return;
    }

    if (state.hovered) {
      state.tween.pause();

      arrow.setScale(1.1);
      arrow.setAlpha(1);

      return;
    }

    arrow.setScale(1);
    state.tween.resume();
  }

  updateArrow(arrow, hasDestination, destinationKey) {
    const state = this.arrowStates.get(arrow);

    if (!arrow || !state) {
      return;
    }

    state.canMove = hasDestination;

    state.caption.setText(
      hasDestination
        ? this.getMeta(destinationKey).label
        : ''
    );

    arrow.setVisible(this.isVisible && hasDestination);
  }

  updateVisibility() {
    if (this.isDestroyed) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    this.updateArrow(
      this.leftArrow,
      currentIndex > 0,
      this.roomOrder[currentIndex - 1]
    );

    this.updateArrow(
      this.rightArrow,
      currentIndex >= 0 &&
        currentIndex < this.roomOrder.length - 1,
      this.roomOrder[currentIndex + 1]
    );

    this.refreshRail();
  }

  // ---------------------------------------------------------------------------
  // Klawisze 1-N
  // ---------------------------------------------------------------------------

  bindHotkeys() {
    const keyboard = this.scene.input?.keyboard;

    if (!keyboard) {
      return;
    }

    HOTKEY_NAMES
      .slice(0, this.roomOrder.length)
      .forEach((name, index) => {
        const event = `keydown-${name}`;
        const handler = domEvent => this.onHotkey(index, domEvent);

        keyboard.on(event, handler);
        this.hotkeyBindings.push({ keyboard, event, handler });
      });
  }

  unbindHotkeys() {
    this.hotkeyBindings.forEach(({ keyboard, event, handler }) => {
      keyboard?.off?.(event, handler);
    });

    this.hotkeyBindings = [];
  }

  isEditingText(event) {
    const target = event?.target;
    const active = document.activeElement;

    return [target, active].some(element => (
      element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
    ));
  }

  onHotkey(index, event) {
    if (
      this.isDestroyed ||
      !this.scene?.sys?.isActive?.() ||
      this.scene.DEBUG_HOTSPOTS ||
      event?.repeat ||
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey ||
      this.isEditingText(event) ||
      !this.canNavigate()
    ) {
      return;
    }

    const target = this.roomOrder[index];

    if (!target || target === this.currentView) {
      return;
    }

    this.goTo(target);
  }

  // ---------------------------------------------------------------------------
  // Ruch kamery
  // ---------------------------------------------------------------------------

  moveLeft() {
    if (!this.canNavigate()) {
      return false;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return false;
    }

    return this.goTo(this.roomOrder[currentIndex - 1]);
  }

  moveRight() {
    if (!this.canNavigate()) {
      return false;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1 ||
      currentIndex >= this.roomOrder.length - 1
    ) {
      return false;
    }

    return this.goTo(this.roomOrder[currentIndex + 1]);
  }

  goTo(viewName, animate = true) {
    if (this.isLocked || this.isMoving || this.isDestroyed) {
      return false;
    }

    const targetX = this.viewPositions[viewName];

    if (!Number.isFinite(targetX)) {
      console.error(
        '[OfficeNavigation] Invalid or missing room position:',
        { viewName, targetX }
      );

      return false;
    }

    const camera = this.scene.cameras?.main;

    if (!camera) {
      console.error(
        '[OfficeNavigation] Main camera is unavailable.'
      );

      return false;
    }

    const fromIndex = this.roomOrder.indexOf(this.currentView);
    const toIndex = this.roomOrder.indexOf(viewName);

    if (animate && fromIndex === toIndex) {
      return false;
    }

    const steps =
      fromIndex < 0 || toIndex < 0
        ? 1
        : Math.abs(toIndex - fromIndex);

    // 1 pokój = 550 ms jak dawniej; dalsze skoki trwają dłużej, max 1 s.
    const duration = Math.min(1000, 380 + 170 * steps);

    this.removeCameraTween();

    this.currentView = viewName;
    this.scene.currentView = viewName;
    this.hideHint();

    this.moveMarkerTo(toIndex, animate, duration);

    const onComplete = () => {
      if (this.isDestroyed) {
        return;
      }

      camera.setScroll(targetX, 0);

      this.isMoving = false;
      this.cameraTween = null;

      this.scene.events.emit('officeRoomChanged', {
        room: viewName,
        x: targetX
      });

      if (this.isDestroyed) {
        return;
      }

      if (viewName === 'office') {
        this.scene.notifyTutorialOfficeReached?.();
      }

      this.updateVisibility();
    };

    if (!animate) {
      onComplete();
      return true;
    }

    this.isMoving = true;
    this.updateVisibility();

    this.cameraTween = this.scene.tweens.add({
      targets: camera,
      scrollX: targetX,
      duration,
      ease: 'Sine.easeInOut',
      onComplete
    });

    return true;
  }

  removeCameraTween() {
    if (!this.cameraTween) {
      return;
    }

    this.cameraTween.remove();
    this.cameraTween = null;
  }

  setLocked(locked) {
    this.isLocked = Boolean(locked);

    if (this.isLocked) {
      this.hideHint();
    }

    this.updateVisibility();

    return this;
  }

  setVisible(visible) {
    this.isVisible = Boolean(visible);

    if (!this.isVisible) {
      this.hideHint();
    }

    this.introHint?.setVisible(this.isVisible);

    if (this.introTween) {
      if (this.isVisible) {
        this.introTween.resume();
      } else {
        this.introTween.pause();
      }
    }

    this.updateVisibility();

    return this;
  }

  // ---------------------------------------------------------------------------
  // Podpowiedzi (używane też przez OfficeHotspotManager)
  // ---------------------------------------------------------------------------

  showHint(text) {
    if (
      !text ||
      !this.navHint ||
      !this.isVisible ||
      this.isLocked ||
      this.isMoving ||
      this.isDestroyed
    ) {
      return;
    }

    this.removeHintTween();

    this.navHint
      .setText(text)
      .setAlpha(0)
      .setVisible(true);

    this.hintTween = this.scene.tweens.add({
      targets: this.navHint,
      alpha: 1,
      duration: 120,
      ease: 'Power1',
      onComplete: () => {
        this.hintTween = null;
      }
    });
  }

  hideHint() {
    this.removeHintTween();

    this.navHint?.setVisible(false);
  }

  removeHintTween() {
    if (!this.hintTween) {
      return;
    }

    this.hintTween.remove();
    this.hintTween = null;
  }

  getLeftRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return '';
    }

    return `${__dialogueText("scenes/office/OfficeNavigationBase.js", "t_631ca27fe21439d3a857")}${this.getRoomLabel(
      this.roomOrder[currentIndex - 1]
    )}`;
  }

  getRightRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1 ||
      currentIndex >= this.roomOrder.length - 1
    ) {
      return '';
    }

    return `${__dialogueText("scenes/office/OfficeNavigationBase.js", "t_631ca27fe21439d3a857")}${this.getRoomLabel(
      this.roomOrder[currentIndex + 1]
    )}`;
  }

  getRoomLabel(roomKey) {
    return this.getMeta(roomKey).label.toLowerCase();
  }

  clearIntroAnimation() {
    if (this.introTimer) {
      this.introTimer.remove(false);
      this.introTimer = null;
    }

    if (this.introTween) {
      this.introTween.remove();
      this.introTween = null;
    }
  }

  showIntroHint() {
    if (!this.introHint || this.isDestroyed) {
      return;
    }

    this.clearIntroAnimation();

    this.introHint
      .setAlpha(0)
      .setVisible(this.isVisible);

    this.introTween = this.scene.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
      paused: !this.isVisible,
      onComplete: () => {
        this.introTween = null;
      }
    });

    this.introTimer = this.scene.time.delayedCall(3200, () => {
      this.introTimer = null;

      if (this.isDestroyed || !this.introHint?.scene) {
        return;
      }

      if (this.introTween) {
        this.introTween.remove();
        this.introTween = null;
      }

      if (!this.isVisible) {
        this.introHint.setAlpha(0);
        return;
      }

      this.introTween = this.scene.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.introTween = null;
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Sprzątanie
  // ---------------------------------------------------------------------------

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.scene?.scale?.off('resize', this.onResize);

    this.unbindHotkeys();

    this.removeCameraTween();
    this.clearIntroAnimation();
    this.removeHintTween();

    this.markerTween?.remove();
    this.markerTween = null;

    this.markerBobTween?.remove();
    this.markerBobTween = null;

    for (const state of this.arrowStates.values()) {
      state.tween.remove();
      state.caption?.destroy();
    }

    this.arrowStates.clear();

    this.railNodes.forEach(node => {
      node.hit?.removeAllListeners();
    });

    this.railNodes = [];

    this.rail?.destroy(true);

    [
      this.leftArrow,
      this.rightArrow,
      this.navHint,
      this.introHint
    ].forEach((element) => {
      element?.removeAllListeners();
      element?.destroy();
    });

    this.rail = null;
    this.railPlate = null;
    this.railMarker = null;
    this.railMetrics = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;
  }
}