import { FiberAnalysisScene } from './FiberAnalysisScene.js';
import { TERM } from './LabTerminal.js';
import { getMaterialProfiles } from '../../suspects/MaterialEvidence.js';

// Reuses Simon Says and its lifecycle protections without replacing the local FiberAnalysisScene.
export class MaterialAnalysisScene extends FiberAnalysisScene {
  constructor() {
    super();
    this.sys.settings.key = 'MaterialAnalysisScene';
  }
  init(data = {}) {
    super.init(data);
    const config = data.evidenceConfig || {};
    const value = data.correctValue ?? config.correctValue ?? config.thief_value;
    if (value == null) { this.materialConfig = null; return; }
    const profile = getMaterialProfiles().find(p => p.id === value);
    if (!profile) throw new Error(`MaterialAnalysisScene: unsupported profile ${value}`);
    this.correctValue = value;
    this.evidenceType = 'material_profile';
    this.stationId = data.stationId || config.stationId || 'trace_1';
    this.caseKey = data.caseKey ?? null;
    this.cityId = data.cityId ?? null;
    this.materialReport = profile;
    this.materialConfig = {
      ...config, attribute: 'material_profile', evidenceType: 'material_profile',
      correctValue: value, thief_value: value, minigame: 'MaterialAnalysisScene',
      label: 'Material Analysis', clueType: 'trace',
      clueText: config.clueText || profile.labText, isRedHerring: false
    };
    this.clue = {
      id: config.id || `trace_${value}`, type: 'trace', text: this.materialConfig.clueText,
      facts: {material: profile.material, ...(value === 'wool_lanolin' ? {lanolinDetected: true} : {})}
    };
  }
  create() {
    if (!this.materialConfig) throw new Error('MaterialAnalysisScene needs material evidence configuration.');
    super.create();
  }
  async finishAnalysis() {
    const terminal = this.term, session = this._fiberSession;
    if (this.finished || !this.isCurrentSession(session, terminal)) return;
    this.finished = true; this.accepting = false;
    this.settlePlayback(false);
    this.cancelCall(this.nextRoundEvent); this.nextRoundEvent = null;
    const timeBonus = this.getTimeBonus();
    this.score = Math.min(120, this.score + timeBonus);
    this.disablePads();
    const analyzed = await this.terminalAction(session, terminal,
      () => terminal.progress('MATERIAL ANALYSIS', 1800));
    if (!analyzed) return;
    const lines = [
      [`> RESULT: ${this.materialReport.label.toUpperCase()}.`],
      [`> ${this.materialReport.labText}`],
      ...(this.materialConfig.sourceText ? [[`> ${this.materialConfig.sourceText}`]] : []),
      ['> THE MACHINE HAS IDENTIFIED THE MATERIAL. DETECTIVE WORK SOLD SEPARATELY.', {color: TERM.amber}]
    ];
    if (timeBonus > 0) lines.push([`> SPEED BONUS: +${timeBonus} PTS.`, {color: TERM.amber}]);
    lines.push(['> CLUE READY FOR CASE FILE.', {color: TERM.amber}]);
    if (!await this.printLines(session, terminal, lines)) return;
    terminal.button('ADD TO CASE FILE', TERM.green, () => {
      if (this.isCurrentSession(session, terminal)) this.returnResultToCrimeLab();
    });
  }
  returnResultToCrimeLab() {
    if (this.returningToLab || this._fiberDisposed || !this.finished) return;
    this.returningToLab = true;
    const payload = {
      aborted: false, completed: true, stationId: this.stationId,
      caseKey: this.caseKey, cityId: this.cityId,
      evidenceType: 'material_profile', evidenceConfig: this.materialConfig,
      correctValue: this.correctValue, value: this.correctValue,
      result: this.correctValue, selectedValue: this.correctValue,
      clueType: 'trace', clueText: this.clue.text, label: 'Material Analysis',
      isValuable: false, score: this.score, mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(), clue: this.clue,
      sourceConfirmed: this.materialConfig.sourceConfirmed === true,
      sourceText: this.materialConfig.sourceText || ''
    };
    this.events.emit('minigame-complete', payload);
    this.events.emit('minigame-closed', {aborted: false, payload});
    this.scene.stop();
  }
}
