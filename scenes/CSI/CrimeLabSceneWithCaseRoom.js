import { CrimeLabScene as BaseCrimeLabScene } from './CrimeLabSceneWithAnimations.js';
import { caseRoomContext } from '../../systems/CaseRoomFlow.js';
import { advanceCrimeTutorial } from '../../tutorials/CrimeCityTutorial.js';

// Top-left corner, same convention as LAB_LAYOUT in CrimeLabScene.js.
const DOOR = { x: 40, y: 180, width: 200, height: 60 };

export class CrimeLabScene extends BaseCrimeLabScene {
  init(data = {}) {
    super.init(data);
    this.caseRoomZone = null;
    this.caseRoomButton = null;
  }

  createHotspots() {
    super.createHotspots();
    this.createCaseRoomDoor();
    this.updateRoomHotspots();
  }

  updateRoomHotspots() {
    super.updateRoomHotspots();
    this.refreshCaseRoomDoor();
  }

  caseRoomReady() {
    return this.isLabComplete();
  }

  caseRoomHint() {
    return this.caseRoomReady()
      ? 'Case Room - reconstruct the theft'
      : 'Case Room - finish all three analyses first';
  }

  createCaseRoomDoor() {
    if (this.caseRoomZone?.scene) return;

    const data = {
      id: 'case_room',
      room: 'lab_intro',
      ...DOOR,
      label: 'Case Room',
      alwaysVisible: true,
      action: () => this.openCaseRoom()
    };

    const zone = this.add.zone(data.x, data.y, data.width, data.height)
      .setOrigin(0, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    zone.hotspotData = data;

    const button = this.add.text(
      data.x + data.width / 2,
      data.y + data.height / 2,
      'CASE ROOM',
      {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#ffd86b',
        backgroundColor: '#171b1bd9',
        padding: { x: 14, y: 12 }
      }
    )
      .setOrigin(0.5)
      .setDepth(55)
      .setInteractive({ useHandCursor: true });

    zone.exitBtn = button;
    this.caseRoomZone = zone;
    this.caseRoomButton = button;

    const over = () => {
      if (this.debugMode || this.uiLocked || this.isExitingLab) return;
      button.setScale(1.08);
      this.showNavHint(this.caseRoomHint());
    };
    const out = () => {
      button.setScale(1);
      this.hideNavHint();
    };
    const click = pointer => {
      pointer?.event?.stopPropagation?.();
      if (this.debugMode || this.uiLocked || this.isExitingLab) return;
      this.openCaseRoom();
    };

    for (const target of [zone, button]) {
      target.on('pointerover', over);
      target.on('pointerout', out);
      target.on('pointerdown', click);
    }

    this.hotspots.push(zone);
    this.prepareDebugZone?.(zone);
  }

  refreshCaseRoomDoor() {
    const button = this.caseRoomButton;
    if (!button?.scene) return;
    const ready = this.caseRoomReady();
    button.setAlpha(ready ? 1 : 0.55);
    button.setColor(ready ? '#ffd86b' : '#9a9a8a');
  }

  openCaseRoom() {
    if (this.debugMode || this.uiLocked || this.isExitingLab || !this.sys.isActive()) return;

    if (!this.caseRoomReady()) {
      this.showToast('Finish all three analyses first. The corkboard can wait.', 3600);
      return;
    }

    const token = this.labRunToken;
    this.completedCount = this.getCompletedStationCount();
    this.isExitingLab = true;
    this.clearIdleQuip();
    this.applyLock(true);

    const fail = error => {
      console.error('[CrimeLab] Case Room failed:', error);
      if (this.labRunToken !== token || !this.sys.isActive()) return;
      this.isExitingLab = false;
      this.applyLock(false);
      this.cameras.main.fadeIn(350, 0, 0, 0);
      this.showToast('The Case Room door is stuck. Please try again.', 3600);
      this.scheduleIdleQuip();
    };

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
      try {
        await this.game.sceneLoader.ensure('CaseRoomScene');
        if (this.labRunToken !== token || !this.sys.isActive()) return;

        // Same bookkeeping as exitLab(): the Case Room depends on it.
        this.labManager.markCrimeLabCompleted();
        advanceCrimeTutorial(this.gameState, 'crimelab');

        const context = caseRoomContext(this.cityId, this.labManager.getCaseKey());
        if (!context.ready) throw new Error('Case Room is not ready.');

        const moved = await this.goto('CaseRoomScene', {
          cityId: this.cityId,
          caseKey: context.caseKey
        });
        if (!moved) throw new Error('Scene transition rejected.');
      } catch (error) {
        fail(error);
      }
    });

    this.cameras.main.fadeOut(350, 0, 0, 0);
  }
}