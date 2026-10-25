import { EnterScene as OriginalEnterScene } from './EnterScene.js';
import { currentChase, restoreLocalChaseCheckpoint, terminalData, latestLocalChaseCheckpoint, restoreExplicitChaseCheckpoint } from '../systems/chasePersistence.js';
export class EnterScene extends OriginalEnterScene {
  async create() {
    await super.create();
    if (!this.isCurrentRun()) return;
    const checkpoint = latestLocalChaseCheckpoint();
    if (!checkpoint) return;
    const button = this.add.text(this.scale.width * 0.65, this.scale.height * 0.82,
      'RESUME LOCAL PURSUIT', {
        fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffe2a3',
        backgroundColor: '#322414', padding: { x: 22, y: 18 }, align: 'center'
      }).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });
    this.entryButtons.push(button);
    button.on('pointerdown', async () => {
      if (!this.canUseEntry()) return;
      this.isEnteringGame = true;
      this.updateEntryButtons();
      try {
        if (!restoreExplicitChaseCheckpoint(checkpoint)) throw new Error('Invalid pursuit checkpoint.');
        this.chaseLoadSource = 'checkpoint';
        const opened = await this.goto('OfficeScene', {
          fromSave: true, saveSlotKey: checkpoint.data.chaseState.slotKey,
          authMode: this.currentUser ? 'account' : 'guest', playerId: this.currentUser?.id ?? null
        });
        if (!opened && this.isCurrentRun()) throw new Error('Could not open pursuit.');
      } catch (error) {
        if (!this.isCurrentRun()) return;
        console.error('[EnterScene] Pursuit resume failed:', error);
        this.isEnteringGame = false;
        this.updateEntryButtons();
        this._showNotice('Unable to resume pursuit. Your checkpoint has not been deleted.');
      }
    });
  }
  async loadSelectedSlot(slotKey, authMode, source, root) {
    this.chaseLoadSource = source;
    return super.loadSelectedSlot(slotKey, authMode, source, root);
  }
  async goto(key, data = {}) {
    if (data.fromSave) {
      if (this.chaseLoadSource === 'local') restoreLocalChaseCheckpoint(data.saveSlotKey);
      const record = currentChase();
      if (record) {
        if (record.phase === 'escaped') return super.goto('GameOverScene', terminalData(record));
        if (record.phase === 'settled' && record.terminalScene) {
          return super.goto(record.terminalScene, record.terminalScene === 'GameOverScene'
            ? { caseId: record.caseId, suspectId: record.suspectId }
            : { caseId: record.caseId });
        }
        if (['caught','review'].includes(record.phase)) {
          return super.goto('ArrestSelectionScene', { ...data, resumeCapturedChase: true });
        }
        return super.goto('ChaseScene', { ...data, sourceKey: null, resumeChase: true });
      }
    }
    return super.goto(key, data);
  }
}
