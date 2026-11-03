import { PoliceStationScene as ExistingPoliceStationScene } from './PoliceStationBaseScene.js';
import { ColdCaseUI } from '../ui/ColdCaseUI.js';

export { hasCompletedPolicePIQuest } from './PoliceStationBaseScene.js';

export class PoliceStationScene extends ExistingPoliceStationScene {
  init(data) {
    super.init(data);
    this.coldCaseUI = null;
    this.coldCaseLoading = false;
    this.coldCaseAbort = null;
  }

  canInteract() {
    return !this.coldCaseUI && !this.coldCaseLoading && super.canInteract();
  }

  showDialogue(id) {
    super.showDialogue(id);
    if (!['start', 'topics'].includes(id) || !this.panel) return;
    const choices = this.panel.querySelector('.police-choices');
    if (!choices || choices.querySelector('[data-cold-case]')) return;
    // The existing dialogue gate still decides whether this topic is available.
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
    if (this.coldCaseUI || this.coldCaseLoading) return false;
    return super.leave();
  }

  disposePolice() {
    this.coldCaseAbort?.abort();
    this.coldCaseUI?.destroy(false);
    this.coldCaseUI = null;
    super.disposePolice();
  }
}
