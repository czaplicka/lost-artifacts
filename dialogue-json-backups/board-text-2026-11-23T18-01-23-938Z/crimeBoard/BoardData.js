import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
const text = key => __dialogueText('crimeBoard/BoardData.js', key);
// Document-relative paths, like the rest of the project; they work in a subfolder host.
const PLACEHOLDER_SUSPECT_IMAGE = 'assets/suspects/unknown.webp';
const PLACEHOLDER_CLUE_IMAGE = 'assets/artifacts/artifact_unknown.webp';
const idOrNull = value => (typeof value === 'string' && value.length > 0) ||
  (typeof value === 'number' && Number.isFinite(value)) ? value : null;
const stringList = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];

export const BoardData = {
  clone(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  },
  createDefaultItem(type) {
    const count = this.state.items.length;
    const base = {
      x: 60 + ((count * 34) % 360), y: 60 + ((count * 28) % 260),
      rotation: this.getInitialRotation(count), pinned: false, type,
      discovered: true, createdByPlayer: true, editableByPlayer: true
    };
    if (type === 'photo') return {
      ...base, label: text('t_7a1cf2ca195a10173fea'), image: PLACEHOLDER_SUSPECT_IMAGE,
      caption: text('t_a2fa12a43290d210779b'), meta: [text('t_645978287991a6f40bca')]
    };
    if (type === 'evidence') return {
      ...base, label: text('t_fe9e2942ed2007b567ac'), tag: text('t_03867aea70acaf4c5dce'),
      body: text('t_aeac22722fd97fe69fce'), fields: [
        { key: 'Case', value: text('t_b764cdc0eab713746721') },
        { key: 'Status', value: text('t_33c8e8de41c3a3512425') }
      ]
    };
    return { ...base, label: text('t_76ea482f843e76e4f8f5'), text: text('t_1a9c8e0d2ece48146d1e'),
      metaText: text('t_9497cec63baa906f6e08'), color: 'yellow' };
  },
  loadBoard(data) {
    if (!this._isBoardUsable()) return this.getBoardData();
    const safe = data && typeof data === 'object' ? data : {};
    this.meta = this.normalizeMeta(safe.meta || {});
    this.state.items = (Array.isArray(safe.items) ? safe.items : []).map((item, index) => this.normalizeItem(item, index));
    this.state.links = (Array.isArray(safe.links) ? safe.links : [])
      .map((link, index) => this.normalizeLink(link, index))
      .filter(link => this.isValidLinkTarget(link.from, link.to));
    this.zCounter = this.state.items.reduce((max, item) => Math.max(max, item.z || 1), 10);
    this.selectedItemId = null;
    this.resetConnectionMode(); this.render(); this.refreshEditor();
    this.renderLinksPanel(); this.syncJsonOutput();
    return this.getBoardData();
  },
  saveBoard() { return JSON.stringify(this.getBoardData(), null, 2); },
  importBoard(jsonString) {
    try { this.loadBoard(JSON.parse(jsonString)); this.syncJsonOutput(); }
    catch { alert(text('t_b888e576bafe3fb054f9')); }
  },
  getBoardData() {
    return { meta: this.clone(this.meta), items: this.clone(this.state.items), links: this.clone(this.state.links) };
  },
  normalizeMeta(meta) {
    return {
      boardId: meta.boardId || '', title: meta.title || '', caseId: meta.caseId || '',
      version: Number.isFinite(meta.version) ? meta.version : 1,
      workspaceKey: typeof meta.workspaceKey === 'string' ? meta.workspaceKey : '',
      campaignId: idOrNull(meta.campaignId)
    };
  },
  normalizeItem(item, index = 0) {
    const safe = item && typeof item === 'object' ? item : {};
    const type = ['photo', 'note', 'evidence'].includes(safe.type) ? safe.type : 'note';
    return {
      id: safe.id || `item-${crypto.randomUUID()}`,
      type,
      x: Number.isFinite(safe.x) ? safe.x : 40 + index * 30,
      y: Number.isFinite(safe.y) ? safe.y : 40 + index * 20,
      z: Number.isFinite(safe.z) ? safe.z : index + 1,
      rotation: Number.isFinite(safe.rotation) ? safe.rotation : this.getInitialRotation(index),
      pinned: Boolean(safe.pinned), label: safe.label || text('t_f59ab8d1331b7b16952f'),
      // Photos without an image use an existing placeholder, so rendering never needs a root path.
      image: safe.image || (type === 'photo' ? PLACEHOLDER_CLUE_IMAGE : ''), caption: safe.caption || '',
      meta: Array.isArray(safe.meta) ? safe.meta.filter(Boolean) : [],
      text: safe.text || '', metaText: safe.metaText || '',
      color: ['yellow', 'blue', 'pink'].includes(safe.color) ? safe.color : 'yellow',
      tag: safe.tag || text('t_03867aea70acaf4c5dce'), body: safe.body || '',
      fields: Array.isArray(safe.fields) ? safe.fields.map(row => ({ key: row?.key || '', value: row?.value || '' })) : [],
      suspectId: idOrNull(safe.suspectId), clueId: idOrNull(safe.clueId),
      heistExplanation: safe.heistExplanation || '', trueExplanation: safe.trueExplanation || '',
      isRedHerring: Boolean(safe.isRedHerring), tags: stringList(safe.tags),
      discovered: safe.discovered !== false, createdByPlayer: Boolean(safe.createdByPlayer),
      editableByPlayer: Boolean(safe.editableByPlayer),
      motiveVerdict: ['correct', 'incorrect'].includes(safe.motiveVerdict) ? safe.motiveVerdict : null,
      caseId: idOrNull(safe.caseId), campaignId: idOrNull(safe.campaignId),
      sourceObjectId: idOrNull(safe.sourceObjectId),
      sourceObjectName: typeof safe.sourceObjectName === 'string' ? safe.sourceObjectName : '',
      sourceItemId: idOrNull(safe.sourceItemId),
      alibiStatus: ['confirmed', 'contradicted'].includes(safe.alibiStatus) ? safe.alibiStatus : null,
      alibiVerified: safe.alibiVerified === true,
      opportunityAnswerIds: stringList(safe.opportunityAnswerIds)
    };
  },
  normalizeLink(link, index = 0) {
    const safe = link && typeof link === 'object' ? link : {};
    return {
      id: safe.id || `link-${index}-${crypto.randomUUID()}`, from: safe.from || '', to: safe.to || '',
      fromAnchor: this.normalizeAnchor(safe.fromAnchor || 'right'),
      toAnchor: this.normalizeAnchor(safe.toAnchor || 'left'), color: safe.color || '#b3131b',
      createdByPlayer: Boolean(safe.createdByPlayer), editableByPlayer: Boolean(safe.editableByPlayer)
    };
  },
  normalizeAnchor(anchor) { return ['top', 'right', 'bottom', 'left'].includes(anchor) ? anchor : 'right'; },
  getInitialRotation(index) {
    const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
    return preset[index % preset.length];
  },
  escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  },
  escapeAttribute(value) { return this.escapeHtml(value); }
};
