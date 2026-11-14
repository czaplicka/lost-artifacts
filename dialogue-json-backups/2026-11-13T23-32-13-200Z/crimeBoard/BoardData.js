export const BoardData = {
  clone(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  },

  createDefaultItem(type) {
    const count = this.state.items.length;
    const base = {
      x: 60 + ((count * 34) % 360),
      y: 60 + ((count * 28) % 260),
      rotation: this.getInitialRotation(count),
      pinned: false,
      type,
      discovered: true,
      createdByPlayer: true,
      editableByPlayer: true
    };


    if (type === 'photo') {
      return {
        ...base,
        label: 'New photo',
        image: '/assets/ui/placeholder-suspect.png',
        caption: 'Add your caption here.',
        meta: ['Lead']
      };
    }


    if (type === 'evidence') {
      return {
        ...base,
        label: 'New evidence',
        tag: 'Evidence',
        body: 'Describe the object here.',
        fields: [
          { key: 'Case', value: 'Unknown' },
          { key: 'Status', value: 'Unverified' }
        ]
      };
    }


    return {
      ...base,
      label: 'New note',
      text: 'Write your note here.',
      metaText: 'Witness statement',
      color: 'yellow'
    };
  },

  loadBoard(data) {
    if (!this._isBoardUsable()) return this.getBoardData();


    const safeData = data && typeof data === 'object' ? data : {};
    this.meta = this.normalizeMeta(safeData.meta || {});
    this.state.items = (safeData.items || []).map((item, index) => this.normalizeItem(item, index));
    this.state.links = (safeData.links || [])
      .map((link, index) => this.normalizeLink(link, index))
      .filter(link => this.isValidLinkTarget(link.from, link.to));


    this.zCounter = this.state.items.reduce((max, item) => Math.max(max, item.z || 1), 10);
    this.selectedItemId = null;
    this.resetConnectionMode();
    this.render();
    this.refreshEditor();
    this.renderLinksPanel();
    this.syncJsonOutput();
    return this.getBoardData();
  },

  saveBoard() {
    return JSON.stringify(this.getBoardData(), null, 2);
  },

  importBoard(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      this.loadBoard(parsed);
      this.syncJsonOutput();
    } catch (error) {
      alert('Invalid JSON. This evidence has been rejected by the board.');
    }
  },

  getBoardData() {
    return {
      meta: this.clone(this.meta),
      items: this.clone(this.state.items),
      links: this.clone(this.state.links)
    };
  },

  normalizeMeta(meta) {
    return {
      boardId: meta.boardId || '',
      title: meta.title || '',
      caseId: meta.caseId || '',
      version: Number.isFinite(meta.version) ? meta.version : 1
    };
  },

  normalizeItem(item, index = 0) {
    const safeItem = item && typeof item === 'object' ? item : {};
    const type = ['photo', 'note', 'evidence'].includes(safeItem.type) ? safeItem.type : 'note';


    return {
      id: safeItem.id || `item-${crypto.randomUUID()}`,
      type,
      x: Number.isFinite(safeItem.x) ? safeItem.x : 40 + (index * 30),
      y: Number.isFinite(safeItem.y) ? safeItem.y : 40 + (index * 20),
      z: Number.isFinite(safeItem.z) ? safeItem.z : index + 1,
      rotation: Number.isFinite(safeItem.rotation) ? safeItem.rotation : this.getInitialRotation(index),
      pinned: Boolean(safeItem.pinned),


      label: safeItem.label || 'Untitled',
      image: safeItem.image || '',
      caption: safeItem.caption || '',
      meta: Array.isArray(safeItem.meta) ? safeItem.meta.filter(Boolean) : [],


      text: safeItem.text || '',
      metaText: safeItem.metaText || '',
      color: ['yellow', 'blue', 'pink'].includes(safeItem.color) ? safeItem.color : 'yellow',


      tag: safeItem.tag || 'Evidence',
      body: safeItem.body || '',
      fields: Array.isArray(safeItem.fields)
        ? safeItem.fields.map(row => ({ key: row?.key || '', value: row?.value || '' }))
        : [],


      suspectId: safeItem.suspectId || null,
      clueId: safeItem.clueId || null,
      heistExplanation: safeItem.heistExplanation || '',
      trueExplanation: safeItem.trueExplanation || '',
      isRedHerring: Boolean(safeItem.isRedHerring),
      tags: Array.isArray(safeItem.tags) ? safeItem.tags.filter(Boolean) : [],
      discovered: safeItem.discovered !== false,
      createdByPlayer: Boolean(safeItem.createdByPlayer),
      editableByPlayer: Boolean(safeItem.editableByPlayer),


      // NEW: motive verification result, set only by verifyMotiveGuess().
      // Not editable by player, purely a rendering/state marker so a
      // reload / saveBoard cycle preserves the last verdict.
      motiveVerdict: safeItem.motiveVerdict === 'correct' || safeItem.motiveVerdict === 'incorrect'
        ? safeItem.motiveVerdict
        : null
    };
  },

  normalizeLink(link, index = 0) {
    const safeLink = link && typeof link === 'object' ? link : {};
    return {
      id: safeLink.id || `link-${index}-${crypto.randomUUID()}`,
      from: safeLink.from || '',
      to: safeLink.to || '',
      fromAnchor: this.normalizeAnchor(safeLink.fromAnchor || 'right'),
      toAnchor: this.normalizeAnchor(safeLink.toAnchor || 'left'),
      color: safeLink.color || '#b3131b',
      createdByPlayer: Boolean(safeLink.createdByPlayer),
      editableByPlayer: Boolean(safeLink.editableByPlayer)
    };
  },

  normalizeAnchor(anchor) {
    return ['top', 'right', 'bottom', 'left'].includes(anchor) ? anchor : 'right';
  },

  getInitialRotation(index) {
    const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
    return preset[index % preset.length];
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  escapeAttribute(value) {
    return this.escapeHtml(value);
  }
};
