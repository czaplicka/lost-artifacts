import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { EventBus } from '../../EventBus.js';
import { getCaseTimeRemaining } from '../../CaseTimeHelper.js';

const HUD_EVENT_SCOPE = 'CrimeLabHUD';

export class CrimeLabHUD {
  constructor(scene) {
    this.scene = scene;
    this.topHudContainer = null;
    this.labTimerText = null;
    this.labProgressText = null;
    this.labCaseText = null;

    this.boundTimeChanged = this.handleTimeChanged.bind(this);
  }

  create() {
    const { width } = this.scene.scale;

    this.topHudContainer = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    const bg = this.scene.add
      .rectangle(width / 2, 0, width, 64, 0x07111b, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x39ff14, 0.65);

    const locationText = this.scene.add
      .text(18, 12, __dialogueText("scenes/CSI/CrimeLabHUD.js", "t_d6e4f58b9bc27723bc30"), {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#39ff14'
      })
      .setOrigin(0, 0);

    this.labCaseText = this.scene.add
      .text(width / 2, 11, '', {
        fontFamily: 'SpecialElite',
        fontSize: '21px',
        color: '#fff4c7'
      })
      .setOrigin(0.5, 0);

    this.labProgressText = this.scene.add
      .text(18, 39, '', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#7df9ff'
      })
      .setOrigin(0, 0);

    this.labTimerText = this.scene.add
      .text(width - 18, 25, '', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#ffcc00'
      })
      .setOrigin(1, 0.5);

    this.topHudContainer.add([
      bg,
      locationText,
      this.labCaseText,
      this.labProgressText,
      this.labTimerText
    ]);

    EventBus.clearScope(HUD_EVENT_SCOPE);

    EventBus.on(
      'timeChanged',
      this.boundTimeChanged,
      this,
      HUD_EVENT_SCOPE
    );

    this.refreshFromScene();
  }

  handleTimeChanged(payload = {}) {
    if (!this.scene) {
      return;
    }

    const hasRemaining = Object.prototype.hasOwnProperty.call(
      payload,
      'caseTimeRemaining'
    );

    const remaining = hasRemaining
      ? payload.caseTimeRemaining
      : getCaseTimeRemaining(this.scene.gameState);

    this.refresh(
      Number(this.scene.completedCount) || 0,
      Number(this.scene.totalStations) || 3,
      remaining,
      payload.caseExpired === true
    );
  }

  refreshFromScene() {
    if (!this.scene) {
      return;
    }

    const remaining = getCaseTimeRemaining(this.scene.gameState);

    this.refresh(
      Number(this.scene.completedCount) || 0,
      Number(this.scene.totalStations) || 3,
      remaining
    );
  }

  refresh(
    completedCount,
    totalStations,
    remainingSeconds,
    expired = false
  ) {
    if (!this.scene) {
      return;
    }

    const mission = this.scene.gameState.currentMission || {};

    const artifact =
      mission.artifact ||
      mission.artifactName ||
      __dialogueText("scenes/CSI/CrimeLabHUD.js", "t_8e6714336bad613bfebc");

    this._setText(
      this.labCaseText,
      String(artifact).toUpperCase()
    );

    this._setText(
      this.labProgressText,
      `${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_69846522c8264dde2ffe")}${completedCount}${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_8a5edab282632443219e")}${totalStations}`
    );

    const parsedSeconds = Number(remainingSeconds);

    const hasValidTime =
      remainingSeconds != null &&
      Number.isFinite(parsedSeconds);

    if (!hasValidTime) {
      this._setText(this.labTimerText, __dialogueText("scenes/CSI/CrimeLabHUD.js", "t_a16ab5263f06498ae90c"));
      this._setColor(this.labTimerText, '#ffcc00');
      return;
    }

    const safeSeconds = Math.max(
      0,
      Math.floor(parsedSeconds)
    );

    if (expired || safeSeconds === 0) {
      this._setText(this.labTimerText, __dialogueText("scenes/CSI/CrimeLabHUD.js", "t_4affd94aceb7b8322fd1"));
      this._setColor(this.labTimerText, '#ff2b2b');
      return;
    }

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    const formattedTime = hours > 0
      ? `${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_2711cad3396f8b39fd62")}${String(hours).padStart(2, '0')}${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_e7ac0786668e0ff0f02b")}${paddedMinutes}${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_e7ac0786668e0ff0f02b")}${paddedSeconds}`
      : `${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_2711cad3396f8b39fd62")}${paddedMinutes}${__dialogueText("scenes/CSI/CrimeLabHUD.js", "t_e7ac0786668e0ff0f02b")}${paddedSeconds}`;

    const color = safeSeconds <= 60
      ? '#ff5c5c'
      : safeSeconds <= 15 * 60
        ? '#ff9f43'
        : '#ffcc00';

    this._setText(this.labTimerText, formattedTime);
    this._setColor(this.labTimerText, color);
  }

  _setText(target, value) {
    if (target && target.text !== value) {
      target.setText(value);
    }
  }

  _setColor(target, color) {
    if (target && target.style?.color !== color) {
      target.setColor(color);
    }
  }

  destroy() {
    EventBus.clearScope(HUD_EVENT_SCOPE);

    this.topHudContainer?.destroy(true);
    this.topHudContainer = null;
    this.labTimerText = null;
    this.labProgressText = null;
    this.labCaseText = null;
    this.scene = null;
  }
}