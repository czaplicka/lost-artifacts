// ui/EnterRewardsPanel.js
import { dialogueText } from '../dialogues/DialogueText.js';

const FONT_PIXEL = 'PressStart2P';
const FONT_BODY = 'SpecialElite';
const WIDTH = 460;
const GUEST_HEIGHT = 306;
const ACCOUNT_HEIGHT = 116;
const AUTH_TEXT_SOURCE = 'scenes/EnterScene.js';
const REGISTER_TEXT_KEY = 't_b501885e1f9e699b0093';
const LOGIN_TEXT_KEY = 't_f7df8ca1f6a5b4e55cc0';

export class EnterRewardsPanel {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = false;
    this.registered = null;
    this.panelHeight = GUEST_HEIGHT;
    this.root = scene.add.container(0, 0)
      .setDepth(30).setScrollFactor(0).setVisible(false);
    this.art = scene.add.graphics();
    this.root.add(this.art);
    this.guestContent = scene.add.container(0, 0);
    this.accountContent = scene.add.container(0, 0);
    this.root.add([this.guestContent, this.accountContent]);
    this.buildGuestContent();
    this.buildAccountContent();
    this.onResize = () => this.layout();
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.setUser(scene.currentUser, !scene.isRestoringSession);
  }

  addText(parent, x, y, value, {
    size = 20, color = '#efe5c9', pixel = false,
    width = WIDTH - 48, align = 'left', centered = false
  } = {}) {
    const node = this.scene.add.text(x, y, value, {
      fontFamily: pixel ? FONT_PIXEL : FONT_BODY,
      fontSize: `${size}px`, color, align,
      wordWrap: { width, useAdvancedWrap: true },
      lineSpacing: pixel ? 5 : 3
    }).setScrollFactor(0);
    if (centered) node.setOrigin(0.5, 0);
    parent.add(node);
    return node;
  }

  buildGuestContent() {
    const parent = this.guestContent;
    const centerX = WIDTH / 2;
    this.addText(parent, 24, 17, 'MARK AGENCY // HR', {
      size: 9, color: '#a6bdb5', pixel: true
    });
    this.addText(parent, centerX, 49, 'A LITTLE BRIBERY.', {
      size: 17, color: '#ffe1a0', pixel: true, align: 'center', centered: true
    });
    this.addText(parent, centerX, 79, 'COURTESY OF HR.', {
      size: 12, color: '#d8bc80', pixel: true, align: 'center', centered: true
    });
    this.addText(parent, centerX, 114, 'Register to unlock daily rewards.', {
      size: 22, align: 'center', centered: true
    });
    this.addText(parent, centerX, 150, '$100 cash, coffee, hints & more.', {
      size: 21, color: '#e6c579', align: 'center', centered: true
    });
    this.buildRegisterButton(parent, 24, 190, WIDTH - 48, 48);
    const login = this.addText(parent, centerX, 251, 'Already an agent? Sign in', {
      size: 18, color: '#b7cbc4', align: 'center', centered: true
    });
    login.setInteractive({ useHandCursor: true });
    login.on('pointerover', () => {
      if (this.canUseEntry()) login.setColor('#ffe1a0');
    });
    login.on('pointerout', () => login.setColor('#b7cbc4'));
    login.on('pointerdown', pointer => {
      if (!this.isPrimaryPointer(pointer)) return;
      this.openAuth('login');
    });
    this.addText(parent, centerX, 279, 'Collect in Agency Mail after entering the game.', {
      size: 14, color: '#94afa7', align: 'center', centered: true
    });
  }

  buildRegisterButton(parent, x, y, width, height) {
    const art = this.scene.add.graphics();
    parent.add(art);
    const label = this.addText(parent, x + width / 2, y + height / 2, 'REGISTER & GET REWARDS', {
      size: 11, color: '#251d12', pixel: true, width: width - 20, align: 'center'
    }).setOrigin(0.5);
    const draw = hover => {
      art.clear();
      art.fillStyle(0x000000, 0.25);
      art.fillRoundedRect(x + 3, y + 4, width, height, 4);
      art.fillStyle(hover ? 0xf5d58c : 0xd7b56d, 1);
      art.fillRoundedRect(x, y, width, height, 4);
      art.lineStyle(1, hover ? 0xffefbd : 0xf0d49a, 1);
      art.strokeRoundedRect(x, y, width, height, 4);
    };
    draw(false);
    const hit = this.scene.add.rectangle(x, y, width, height, 0x000000, 0)
      .setOrigin(0).setInteractive({ useHandCursor: true });
    parent.add(hit);
    hit.on('pointerover', () => { if (this.canUseEntry()) draw(true); });
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', pointer => {
      if (!this.isPrimaryPointer(pointer)) return;
      draw(false);
      this.openAuth('register');
    });
    this.registerLabel = label;
  }

  buildAccountContent() {
    const parent = this.accountContent;
    this.addText(parent, 24, 18, 'MARK AGENCY // HR', {
      size: 9, color: '#a6bdb5', pixel: true
    });
    this.addText(parent, 24, 43, 'YOUR HR BENEFITS ARE WAITING.', {
      size: 10, color: '#e6c579', pixel: true
    });
    this.addText(parent, 24, 76, 'Collect daily rewards in Agency Mail.', {
      size: 20, color: '#d9e4d9'
    });
  }

  drawPanel() {
    const height = this.panelHeight;
    this.art.clear();
    this.art.fillStyle(0x000000, 0.32);
    this.art.fillRoundedRect(5, 7, WIDTH, height, 6);
    this.art.fillStyle(0x18343d, 0.96);
    this.art.fillRoundedRect(0, 0, WIDTH, height, 6);
    this.art.lineStyle(1, 0xb99a57, 0.95);
    this.art.strokeRoundedRect(0, 0, WIDTH, height, 6);
    this.art.fillStyle(0xd4af37, 1);
    this.art.fillRect(20, 0, 62, 3);
  }

  isPrimaryPointer(pointer) {
    return pointer?.event?.button === undefined || pointer.event.button === 0;
  }

  canUseEntry() {
    if (this.destroyed || !this.scene || !this.root?.visible) return false;
    return this.scene.canUseEntry?.() === true;
  }

  openAuth(mode) {
    if (!this.canUseEntry()) return;
    const key = mode === 'register' ? REGISTER_TEXT_KEY : LOGIN_TEXT_KEY;
    const url = dialogueText(AUTH_TEXT_SOURCE, key);
    if (typeof url !== 'string' || !url.trim()) return;
    this.scene.openModal(url);
  }

  setUser(user, sessionReady = !this.scene?.isRestoringSession) {
    if (this.destroyed) return;
    if (!sessionReady) {
      this.root.setVisible(false);
      return;
    }
    const registered = Boolean(user?.id && user.is_anonymous === false);
    if (registered !== this.registered) {
      this.registered = registered;
      this.panelHeight = registered ? ACCOUNT_HEIGHT : GUEST_HEIGHT;
      this.guestContent.setVisible(!registered);
      this.accountContent.setVisible(registered);
      this.drawPanel();
      this.layout();
    }
    // Reveal only after the correct variant and dimensions are ready.
    this.root.setVisible(true);
  }

  layout() {
    if (this.destroyed || !this.root) return;
    const { width, height } = this.scene.scale;
    const marginX = Math.max(12, width * 0.035);
    const bottom = height * 0.88;
    const availableWidth = width * 0.43;
    const availableHeight = height * 0.40;
    const scale = Math.max(0.01, Math.min(
      1, availableWidth / (WIDTH + 7), availableHeight / (this.panelHeight + 9)
    ));
    this.root.setScale(scale).setPosition(
      width - marginX - (WIDTH + 7) * scale,
      bottom - (this.panelHeight + 9) * scale
    );
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const scene = this.scene;
    scene?.scale.off('resize', this.onResize);
    scene?.events.off('shutdown', this.destroy, this);
    scene?.events.off('destroy', this.destroy, this);
    this.root?.destroy(true);
    this.root = null;
    this.art = null;
    this.guestContent = null;
    this.accountContent = null;
    this.registerLabel = null;
    this.scene = null;
  }
}
