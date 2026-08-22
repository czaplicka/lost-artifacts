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
      .text(18, 12, 'MARK AGENCY // CRIME LAB', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#39ff14'
      })
      .setOrigin(0, 0);

    this.labCaseText = this.scene.add
      .text(width / 2, 11, '', {
        fontFamily: 'Special Elite',
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

    // GameTimeManager.handleAdvanceTime() emits 'timeChanged' (NOT
    // 'caseTimeChanged') with the remaining case time under
    // payload.caseTimeRemaining. This listener now matches that
    // real contract instead of an event name that was never fired.
    EventBus.clearScope(HUD_EVENT_SCOPE);
    EventBus.on(
      'timeChanged',
      this.boundTimeChanged,
      this,
      HUD_EVENT_SCOPE
    );

    this.refresh(
      this.scene.completedCount || 0,
      this.scene.totalStations || 3,
      getCaseTimeRemaining(this.scene.gameState)
    );
  }

  handleTimeChanged(payload = {}) {
    const parsed = Number(payload.caseTimeRemaining);

    const remaining = Number.isFinite(parsed)
      ? Math.max(0, Math.floor(parsed))
      : getCaseTimeRemaining(this.scene.gameState);

    this.refresh(
      this.scene.completedCount || 0,
      this.scene.totalStations || 3,
      remaining
    );

    if (payload.caseExpired) {
      this.labTimerText?.setColor('#ff2b2b');
      this.labTimerText?.setText('TIME: EXPIRED');
    }
  }

  refresh(completedCount, totalStations, remainingSeconds) {
    const mission = this.scene.gameState.currentMission || {};
    const artifact = mission.artifact || mission.artifactName || 'Active Case';

    this.labCaseText?.setText(String(artifact).toUpperCase());
    this.labProgressText?.setText(`ANALYSES: ${completedCount}/${totalStations}`);

    // Loose check on purpose: catches both null AND undefined, plus
    // guards against non-numeric garbage before formatting.
    const parsedSeconds = Number(remainingSeconds);
    const hasValidTime =
      remainingSeconds != null && Number.isFinite(parsedSeconds);

    if (hasValidTime) {
      const safeSeconds = Math.max(0, Math.floor(parsedSeconds));
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const seconds = safeSeconds % 60;

      const formattedTime = hours > 0
        ? `TIME: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `TIME: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.labTimerText?.setText(formattedTime);

      if (safeSeconds <= 60) {
        this.labTimerText?.setColor('#ff5c5c');
      } else if (safeSeconds <= 15 * 60) {
        this.labTimerText?.setColor('#ff9f43');
      } else {
        this.labTimerText?.setColor('#ffcc00');
      }

      return;
    }

    this.labTimerText?.setText('TIME: --:--');
    this.labTimerText?.setColor('#ffcc00');
  }

  destroy() {
    EventBus.clearScope(HUD_EVENT_SCOPE);

    this.topHudContainer?.destroy(true);
    this.topHudContainer = null;
    this.labTimerText = null;
    this.labProgressText = null;
    this.labCaseText = null;
  }
}