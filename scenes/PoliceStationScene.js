import { PoliceStationScene as ExistingPoliceStationScene } from './PoliceStationBaseScene.js';
import { ColdCaseUI } from '../ui/ColdCaseUI.js';
import { audioManager } from '../managers/AudioManager.js';

export { hasCompletedPolicePIQuest } from './PoliceStationBaseScene.js';

const AMBIENT_KEY = 'sfx_home_police_ambient';

export class PoliceStationScene extends ExistingPoliceStationScene {
  init(data) {
    super.init(data);
    this.coldCaseUI = null;
    this.coldCaseLoading = false;
    this.coldCaseAbort = null;
    this.stationAmbient = null;
  }

  preload() {
    super.preload();
    if (!this.cache.audio.exists(AMBIENT_KEY)) {
      this.load.audio(AMBIENT_KEY, 'assets/audio/police.mp3');
    }
  }

  create() {
    super.create();
    audioManager.init(this);
    this.startStationAudio();
    this.events.on('wake', this.startStationAudio, this);
    this.events.on('resume', this.startStationAudio, this);
    this.events.on('sleep', this.stopStationAudio, this);
    this.events.on('pause', this.stopStationAudio, this);
  }

  startStationAudio() {
    if (this.disposed || this.navigating || !this.sys.isActive()) return;
    audioManager.init(this);
    if (this.stationAmbient?.isPlaying) return;
    this.stationAmbient = audioManager.playAmbient(AMBIENT_KEY, {
      volume: audioManager.getSfxVolume() * 0.28, loop: true
    });
  }

  stopStationAudio() {
    if (this.stationAmbient) audioManager.releaseSound(this.stationAmbient);
    this.stationAmbient = null;
  }

  canInteract() {
    return !this.coldCaseUI && !this.coldCaseLoading && super.canInteract();
  }

  showDialogue(id) {
    super.showDialogue(id);
    if (!['start', 'topics'].includes(id) || !this.panel) return;
    const choices = this.panel.querySelector('.police-choices');
    if (!choices || choices.querySelector('[data-cold-case]')) return;
    if (!choices.textContent.includes('Goodbye.')) return;
    const button = this.makeButton('Any unsolved cases I can look at?',
      () => void this.openColdCase(), this.dialogueVersion);
    button.dataset.coldCase = 'true';
    choices.prepend(button);
  }

  async openColdCase() {
    if (this.disposed || this.navigating || this.coldCaseUI || this.coldCaseLoading) return;
    this.coldCaseLoading = true;
    this.coldCaseAbort = new AbortController();
    const token = this.runToken;
    this.showPanel('Desk officer', 'Finding the file. The filing system is mostly geological.', []);
    try {
      const response = await fetch('assets/data/cold-cases/last-gnome-standing.json', {
        signal: this.coldCaseAbort.signal
      });
      if (!response.ok) throw new Error(`Case file: HTTP ${response.status}`);
      const data = await response.json();
      if (this.disposed || this.runToken !== token) return;
      this.coldCaseLoading = false;
      this.closePanel();
      this.coldCaseUI = new ColdCaseUI(this, data, () => {
        this.coldCaseUI = null;
        if (!this.disposed) {
          this.refreshDebug();
          this.showDialogue('topics');
        }
      });
      this.refreshDebug();
    } catch (error) {
      if (error.name === 'AbortError' || this.disposed || this.runToken !== token) return;
      console.error('[ColdCase]', error);
      this.coldCaseLoading = false;
      this.showPanel('File unavailable', 'The case file could not be loaded.', [
        ['Try again.', () => void this.openColdCase()],
        ['Back.', () => this.showDialogue('topics')]
      ]);
    } finally {
      if (this.runToken === token) this.coldCaseLoading = false;
    }
  }

  onKey(event) {
    if (this.coldCaseUI) {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (!event.repeat) this.coldCaseUI.escape();
      }
      return;
    }
    if (this.coldCaseLoading) return;
    super.onKey(event);
  }

  async leave() {
    if (this.coldCaseUI || this.coldCaseLoading || this.disposed || this.navigating) return false;
    this.stopStationAudio();
    try { return await super.leave(); }
    finally {
      if (!this.disposed && !this.navigating && this.sys.isActive()) this.startStationAudio();
    }
  }

  disposePolice() {
    this.stopStationAudio();
    this.events.off('wake', this.startStationAudio, this);
    this.events.off('resume', this.startStationAudio, this);
    this.events.off('sleep', this.stopStationAudio, this);
    this.events.off('pause', this.stopStationAudio, this);
    this.coldCaseAbort?.abort();
    this.coldCaseUI?.destroy(false);
    this.coldCaseUI = null;
    super.disposePolice();
  }
}
