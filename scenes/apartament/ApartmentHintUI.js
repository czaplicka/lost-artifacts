import { HiddenObjectsUI } from '../../ui/HiddenObjectsUI.js';
import { hintManager } from '../../managers/HintManager.js';
import { EventBus } from '../../EventBus.js';

export class ApartmentHintUI extends HiddenObjectsUI {
  constructor(scene) {
    super(scene);
    this.apartmentLock = null;
    this.markerObject = null;
    this.boundLayout = () => {
      this.hintBtn?.setPosition(20, Math.max(155, scene.scale.height - 135));
      this.clearHintMarker();
      if (this.hintModalOpen && !this.hintBusy) this.closeHintModal();
    };
    this.boundCheckMarker = () => {
      if (this.markerObject && (
        !this.markerObject.container?.active ||
        !this.markerObject.container.visible ||
        !this.markerObject.getPendingItems().length
      )) this.clearHintMarker();
    };
  }

  create() {
    this.destroyed = false;
    this.hintBtn = this.own(this.scene.add.text(20, 0, 'HINT', {
      fontFamily: 'PressStart2P, Arial', fontSize: '12px',
      color: '#fff2c4', backgroundColor: '#604b29',
      padding: { left: 16, right: 16, top: 14, bottom: 14 }
    }).setDepth(160).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    this.hintBtn.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      this.openHintModal();
    });
    this.hintBtn.on('pointerover', () => this.hintBtn?.setBackgroundColor('#806338'));
    this.hintBtn.on('pointerout', () => this.hintBtn?.setBackgroundColor('#604b29'));
    EventBus.on('hints:changed', this.boundRefreshHintButton);
    this.scene.scale.on('resize', this.boundLayout);
    this.scene.events.on('preupdate', this.boundCheckMarker);
    this.scene.events.once('shutdown', this.boundDestroy);
    this.boundLayout();
    this.refreshHintButton();
  }

  canUseHints() {
    return !this.destroyed && !this.scene._cleanupDone &&
      this.scene.sys.isActive() && !this.scene.isTransitioning &&
      !this.scene.generationError;
  }

  openHintModal() {
    if (!this.canUseHints() || this.scene.leaveDialog ||
      this.scene.occupantController?.root || this.scene.debugMode ||
      this.scene.getPlayerHudScene()?.isAnyPanelOpen()) return;
    super.openHintModal();
  }

  getRemainingZones() {
    const objects = (this.scene.apartmentObjects || []).filter(object =>
      object.container?.active && object.getPendingItems().length > 0
    );
    const local = objects.filter(object =>
      object.config.roomId === this.scene.roomSystem?.roomId
    );
    const candidates = local.length ? local : objects;
    return candidates.map(object => ({
      active: true,
      apartmentObject: object,
      getData: key => key === 'id' ? object.config.id : false
    }));
  }

  lockGameplay() {
    if (this.apartmentLock) return;
    const hud = this.scene.getPlayerHudScene();
    hud?.closeAllUIPanels();
    const guard = { apartmentHint: true };
    this.apartmentLock = {
      guard, hud, hudInput: hud?.input?.enabled,
      topOnly: this.scene.input.topOnly
    };
    this.scene.leaveDialog = guard;
    if (hud?.input) hud.input.enabled = false;
    this.scene.input.setTopOnly(true);
  }

  unlockGameplay() {
    const state = this.apartmentLock;
    if (!state) return;
    this.apartmentLock = null;
    if (this.scene.leaveDialog === state.guard) this.scene.leaveDialog = null;
    if (state.hud?.input && typeof state.hudInput === 'boolean') {
      state.hud.input.enabled = state.hudInput;
    }
    if (this.scene.input && typeof state.topOnly === 'boolean') {
      this.scene.input.setTopOnly(state.topOnly);
    }
  }

  applyHint(method) {
    // The inherited payment flow records the same energy, time and reputation costs.
    this.scene.sceneId = 'suspect_apartment';
    super.applyHint(method);
  }

  showMessage(text, color = '#ffd966') {
    if (this.canUseHints()) this.scene.showMessage(text, 3200,
      color === '#ffb3b3' ? '#8b3030' : '#493d30');
  }

  highlightZone(target) {
    this.clearHintMarker();
    const object = target?.apartmentObject;
    if (!this.canUseHints() || !object?.container?.active ||
      !object.getPendingItems().length) return;
    const room = object.config.roomId;
    if (room !== this.scene.roomSystem.roomId &&
      !this.scene.roomSystem.showRoom(room)) {
      this.showMessage('The next place to investigate is in another room.');
      return;
    }
    if (!object.container.visible) return;
    const { w = 80, h = 80 } = object.config.size || {};
    const marker = this.scene.add.rectangle(
      object.container.x, object.container.y, w + 20, h + 20,
      0xffd966, 0.12
    ).setStrokeStyle(3, 0xffd966).setDepth(90);
    marker.itemId = object.config.id;
    this.markerObject = object;
    this.hintMarker = marker;
    this.scene.tweens.add({
      targets: marker, alpha: 0.25, scaleX: 1.08, scaleY: 1.08,
      duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    this.hintMarkerTimer = this.scene.time.delayedCall(3600, () => this.clearHintMarker());
  }

  clearHintMarker() {
    super.clearHintMarker();
    this.markerObject = null;
  }

  removeHintModal() {
    this.hintModal?.destroy(true);
    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintModalOpen = false;
  }

  destroy() {
    if (this.destroyed) return;
    this.scene.scale.off('resize', this.boundLayout);
    this.scene.events.off('preupdate', this.boundCheckMarker);
    this.unlockGameplay();
    super.destroy();
  }
}

export default ApartmentHintUI;
