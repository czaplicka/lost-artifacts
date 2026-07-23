export class CrimeBoard {
  constructor(root, options = {}) {
    this.root = root;
    this.svg = root.querySelector('.crime-board__strings');
    this.itemsLayer = root.querySelector('.crime-board__items');

    this.meta = {};
    this.state = {
      items: [],
      links: []
    };

    this.selectedItemId = null;

    this.itemElements = new Map();
    this.linkElements = new Map();

    this.drag = {
      activeId: null,
      offsetX: 0,
      offsetY: 0
    };

    this.connectionMode = {
      active: false,
      fromId: null,
      fromAnchor: null
    };

    this.tempPath = null;
    this.boundPointerMove = this.onWindowPointerMove.bind(this);
    this.boundPointerUp = this.onWindowPointerUp.bind(this);
    this.zCounter = 10;

    this.editor = {
      form: document.getElementById(options.formId || 'crime-board-form'),
      emptyState: document.getElementById(options.emptyStateId || 'crime-board-empty-state'),
      fieldsWrap: document.getElementById(options.fieldsWrapId || 'crime-board-fields'),
      dynamicFields: document.getElementById(options.dynamicFieldsId || 'crime-board-type-fields'),
      jsonOutput: document.getElementById(options.jsonOutputId || 'board-json-output'),
      saveBtn: document.getElementById(options.saveBtnId || 'board-save-btn'),
      loadBtn: document.getElementById(options.loadBtnId || 'board-load-btn'),
      applyBtn: document.getElementById(options.applyBtnId || 'crime-board-apply-btn'),
      deleteBtn: document.getElementById(options.deleteBtnId || 'crime-board-delete-btn'),
      addPhotoBtn: document.getElementById(options.addPhotoBtnId || 'add-photo-btn'),
      addNoteBtn: document.getElementById(options.addNoteBtnId || 'add-note-btn'),
      addEvidenceBtn: document.getElementById(options.addEvidenceBtnId || 'add-evidence-btn'),
      linksList: document.getElementById(options.linksListId || 'crime-board-links-list'),
      linksEmpty: document.getElementById(options.linksEmptyId || 'crime-board-links-empty')
    };

    this.sidebar = this.root.parentElement?.querySelector('#crime-board-sidebar') || null;
    this.sidebarToggleBtn = this.root.parentElement?.querySelector('#crime-board-sidebar-toggle') || null;
    this.sidebarTabBtn = this.root.parentElement?.querySelector('#crime-board-sidebar-tab') || null;

    this.init();
  }

  init() {
    window.addEventListener('resize', () => this.renderLinks());
    this.bindEditor();
    this.bindSidebar();

    this.root.addEventListener('click', (e) => {
      if (e.target === this.root || e.target === this.itemsLayer || e.target === this.svg) {
        this.selectedItemId = null;
        this.renderSelectionState();
        this.refreshEditor();
      }
    });
  }

  bindSidebar() {
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.addEventListener('click', () => this.collapseSidebar());
    }

    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.addEventListener('click', () => this.expandSidebar());
    }
  }

  collapseSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-open');
    this.sidebar.classList.add('is-collapsed');

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'false');
    }

    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.setAttribute('aria-expanded', 'false');
    }
  }

  expandSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-collapsed');
    this.sidebar.classList.add('is-open');

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'true');
    }

    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.setAttribute('aria-expanded', 'true');
    }
  }

  isPlayerEditableItem(itemId = this.selectedItemId) {
    const item = this.getItemById(itemId);
    return Boolean(item?.editableByPlayer);
  }

  isPlayerEditableLink(linkId) {
    const link = this.state.links.find(entry => entry.id === linkId);
    return Boolean(link?.editableByPlayer);
  }

  canStartLinkFromItem(itemId) {
    const item = this.getItemById(itemId);
    if (!item) return false;
    return Boolean(item.createdByPlayer || item.discovered);
  }

  bindEditor() {
    if (this.editor.saveBtn) {
      this.editor.saveBtn.addEventListener('click', () => {
        if (this.editor.jsonOutput) {
          this.editor.jsonOutput.value = this.saveBoard();
        }
      });
    }

    if (this.editor.loadBtn) {
      this.editor.loadBtn.addEventListener('click', () => {
        const json = this.editor.jsonOutput?.value || '';
        this.importBoard(json);
      });
    }

    if (this.editor.applyBtn) {
      this.editor.applyBtn.addEventListener('click', () => {
        if (!this.isPlayerEditableItem()) return;
        this.applyEditorChanges();
      });
    }

    if (this.editor.deleteBtn) {
      this.editor.deleteBtn.addEventListener('click', () => {
        if (!this.selectedItemId || !this.isPlayerEditableItem()) return;
        this.removeItem(this.selectedItemId);
        this.selectedItemId = null;
        this.refreshEditor();
        this.syncJsonOutput();
      });
    }

    if (this.editor.addPhotoBtn) {
      this.editor.addPhotoBtn.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem('photo'));
        this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }

    if (this.editor.addNoteBtn) {
      this.editor.addNoteBtn.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem('note'));
        this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }

    if (this.editor.addEvidenceBtn) {
      this.editor.addEvidenceBtn.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem('evidence'));
        this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }

    if (this.editor.form) {
      this.editor.form.addEventListener('change', (e) => {
        if (!this.isPlayerEditableItem()) return;
        if (e.target.name === 'type') {
          this.renderEditorTypeFields(e.target.value, this.getItemById(this.selectedItemId));
        }
      });
    }
  }

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
        image: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=600&q=80',
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
  }

  loadBoard(data) {
    const safeData = data && typeof data === 'object' ? data : {};

    this.meta = this.normalizeMeta(safeData.meta || {});
    this.state.items = (safeData.items || []).map((item, index) => this.normalizeItem(item, index));
    this.state.links = (safeData.links || [])
      .map((link, index) => this.normalizeLink(link, index))
      .filter(link => this.state.items.some(item => item.id === link.from) && this.state.items.some(item => item.id === link.to));

    this.selectedItemId = null;
    this.render();
    this.refreshEditor();
    this.renderLinksPanel();
    this.syncJsonOutput();

    return this.getBoardData();
  }

  saveBoard() {
    return JSON.stringify(this.getBoardData(), null, 2);
  }

  importBoard(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      this.loadBoard(parsed);
      this.syncJsonOutput();
    } catch (error) {
      alert('Invalid JSON. This evidence has been rejected by the board.');
    }
  }

  setItems(items) {
    this.state.items = (Array.isArray(items) ? items : []).map((item, index) => this.normalizeItem(item, index));
    this.render();
    this.refreshEditor();
    this.renderLinksPanel();
    this.syncJsonOutput();
  }

  setLinks(links) {
    const validIds = new Set(this.state.items.map(item => item.id));
    this.state.links = (Array.isArray(links) ? links : [])
      .map((link, index) => this.normalizeLink(link, index))
      .filter(link => validIds.has(link.from) && validIds.has(link.to) && link.from !== link.to);

    this.render();
    this.renderLinksPanel();
    this.refreshEditor();
    this.syncJsonOutput();
  }

  clearBoard() {
    this.meta = {};
    this.state.items = [];
    this.state.links = [];
    this.selectedItemId = null;
    this.render();
    this.refreshEditor();
    this.renderLinksPanel();
    this.syncJsonOutput();
  }

  getBoardData() {
    return {
      meta: structuredClone(this.meta),
      items: structuredClone(this.state.items),
      links: structuredClone(this.state.links)
    };
  }

  normalizeMeta(meta) {
    return {
      boardId: meta.boardId || '',
      title: meta.title || '',
      caseId: meta.caseId || '',
      version: Number.isFinite(meta.version) ? meta.version : 1
    };
  }

  normalizeItem(item, index = 0) {
    const safeItem = item && typeof item === 'object' ? item : {};
    const type = ['photo', 'note', 'evidence'].includes(safeItem.type) ? safeItem.type : 'note';

    return {
      id: safeItem.id || `item-${crypto.randomUUID()}`,
      type,
      x: Number.isFinite(safeItem.x) ? safeItem.x : 40 + (index * 30),
      y: Number.isFinite(safeItem.y) ? safeItem.y : 40 + (index * 20),
      z: Number.isFinite(safeItem.z) ? safeItem.z : 1,
      rotation: Number.isFinite(safeItem.rotation) ? safeItem.rotation : this.getInitialRotation(index),
      pinned: Boolean(safeItem.pinned),

      label: safeItem.label || 'Untitled',
      image: safeItem.image || '',
      caption: safeItem.caption || '',
      meta: Array.isArray(safeItem.meta) ? safeItem.meta : [],

      text: safeItem.text || '',
      metaText: safeItem.metaText || '',
      color: safeItem.color || 'yellow',

      tag: safeItem.tag || 'Evidence',
      body: safeItem.body || '',
      fields: Array.isArray(safeItem.fields)
        ? safeItem.fields.map(row => ({
            key: row?.key || '',
            value: row?.value || ''
          }))
        : [],

      suspectId: safeItem.suspectId || null,
      clueId: safeItem.clueId || null,
      heistExplanation: safeItem.heistExplanation || '',
      trueExplanation: safeItem.trueExplanation || '',
      isRedHerring: Boolean(safeItem.isRedHerring),
      tags: Array.isArray(safeItem.tags) ? safeItem.tags : [],

      discovered: Boolean(safeItem.discovered),
      createdByPlayer: Boolean(safeItem.createdByPlayer),
      editableByPlayer: Boolean(safeItem.editableByPlayer)
    };
  }

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
  }

  normalizeAnchor(anchor) {
    return ['top', 'right', 'bottom', 'left'].includes(anchor) ? anchor : 'right';
  }

  getInitialRotation(index) {
    const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
    return preset[index % preset.length];
  }

  render() {
    this.itemsLayer.innerHTML = '';
    this.svg.innerHTML = '';
    this.itemElements.clear();
    this.linkElements.clear();

    this.state.items.forEach(item => {
      const el = this.createItemElement(item);
      this.itemsLayer.appendChild(el);
      this.itemElements.set(item.id, el);
    });

    this.state.links.forEach(link => {
      const group = this.createLinkElement(link);
      this.svg.appendChild(group);
      this.linkElements.set(link.id, group);
    });

    this.renderItemPositions();
    this.renderLinks();
    this.renderSelectionState();
    this.renderLinksPanel();
  }

  createItemElement(item) {
    const el = document.createElement('article');
    el.className = `crime-board__item crime-board__item--${item.type}`;
    el.dataset.id = item.id;

    if (item.pinned) el.classList.add('is-pinned');
    if (!item.discovered && !item.createdByPlayer) el.classList.add('is-hidden-evidence');

    el.innerHTML = `
      <div class="crime-board__item-shell">
        <div class="crime-board__pin-dot"></div>

        <div class="crime-board__toolbar">
          <div class="crime-board__label">${this.escapeHtml(item.label)}</div>

          <div class="crime-board__actions">
            <button type="button" class="crime-board__btn" data-action="connect">Link</button>
            <button type="button" class="crime-board__btn" data-action="pin">
              ${item.pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        </div>

        <div class="crime-board__content">
          ${this.renderItemContent(item)}
        </div>

        <div class="crime-board__anchor" data-anchor="top"></div>
        <div class="crime-board__anchor" data-anchor="right"></div>
        <div class="crime-board__anchor" data-anchor="bottom"></div>
        <div class="crime-board__anchor" data-anchor="left"></div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      if (e.target.closest('.crime-board__btn')) return;
      if (e.target.closest('.crime-board__anchor')) return;
      this.selectItem(item.id);
    });

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.crime-board__btn')) return;
      if (e.target.closest('.crime-board__anchor')) return;
      this.onItemPointerDown(e, item.id);
    });

    const pinBtn = el.querySelector('[data-action="pin"]');
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePin(item.id);
      });
    }

    const connectBtn = el.querySelector('[data-action="connect"]');
    if (connectBtn) {
      connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startConnection(item.id, 'right');
      });
    }

    el.querySelectorAll('.crime-board__anchor').forEach(anchorEl => {
      anchorEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startConnection(item.id, anchorEl.dataset.anchor);
      });
    });

    return el;
  }

  renderItemContent(item) {
    if (!item.discovered && !item.createdByPlayer) {
      return `
        <div class="crime-board__locked">
          <div class="crime-board__locked-title">Unknown lead</div>
          <div class="crime-board__locked-body">This evidence has not been discovered yet.</div>
        </div>
      `;
    }

    switch (item.type) {
      case 'photo':
        return this.renderPhotoItem(item);
      case 'evidence':
        return this.renderEvidenceItem(item);
      case 'note':
      default:
        return this.renderNoteItem(item);
    }
  }

  renderPhotoItem(item) {
    const meta = Array.isArray(item.meta) ? item.meta : [];

    return `
      <div class="crime-board__photo-frame">
        <img
          class="crime-board__photo-image"
          src="${this.escapeAttr(item.image || '')}"
          alt="${this.escapeAttr(item.label || 'Photo evidence')}"
          draggable="false"
        >
      </div>
      ${item.caption ? `<div class="crime-board__photo-caption">${this.escapeHtml(item.caption)}</div>` : ''}
      ${meta.length ? `
        <div class="crime-board__meta-list">
          ${meta.map(entry => `<span class="crime-board__meta-pill">${this.escapeHtml(entry)}</span>`).join('')}
        </div>
      ` : ''}
    `;
  }

  renderNoteItem(item) {
    const style = this.getNoteInlineStyle(item.color);

    return `
      <div class="crime-board__note-sheet"${style}>
        <div class="crime-board__note-text">${this.escapeHtml(item.text)}</div>
        <div class="crime-board__note-line"></div>
        ${item.metaText ? `<div class="crime-board__photo-caption">${this.escapeHtml(item.metaText)}</div>` : ''}
      </div>
    `;
  }

  renderEvidenceItem(item) {
    const rows = Array.isArray(item.fields) ? item.fields : [];

    return `
      <div class="crime-board__evidence-header">
        <div class="crime-board__evidence-tag">${this.escapeHtml(item.tag || 'Evidence')}</div>
      </div>
      ${item.body ? `<div class="crime-board__evidence-body">${this.escapeHtml(item.body)}</div>` : ''}
      ${rows.length ? `
        <div class="crime-board__evidence-grid">
          ${rows.map(row => `
            <div class="crime-board__evidence-row">
              <div class="crime-board__evidence-key">${this.escapeHtml(row.key)}</div>
              <div class="crime-board__evidence-value">${this.escapeHtml(row.value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  getNoteInlineStyle(color) {
    if (color === 'blue') {
      return ' style="background: linear-gradient(180deg, #cfe2f3 0%, #b7d0e7 100%);"';
    }

    if (color === 'pink') {
      return ' style="background: linear-gradient(180deg, #f1c9d6 0%, #e9b7c9 100%);"';
    }

    return '';
  }

  createLinkElement(link) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.id = link.id;

    const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visiblePath.setAttribute('class', 'crime-board__string');

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('class', 'crime-board__string-hit');
    hitPath.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeLink(link.id);
    });

    group.appendChild(visiblePath);
    group.appendChild(hitPath);

    return group;
  }

  selectItem(itemId) {
    this.selectedItemId = itemId;
    this.renderSelectionState();
    this.refreshEditor();
  }

  renderSelectionState() {
    this.itemElements.forEach((el, id) => {
      el.classList.toggle('is-selected', id === this.selectedItemId);
    });
  }

  refreshEditor() {
    const item = this.getItemById(this.selectedItemId);

    if (!item) {
      if (this.editor.emptyState) {
        this.editor.emptyState.style.display = 'block';
        this.editor.emptyState.textContent = 'Select a player-created item to edit or delete it.';
      }

      if (this.editor.fieldsWrap) this.editor.fieldsWrap.style.display = 'none';
      if (this.editor.applyBtn) this.editor.applyBtn.disabled = true;
      if (this.editor.deleteBtn) this.editor.deleteBtn.disabled = true;
      return;
    }

    if (!item.editableByPlayer) {
      if (this.editor.emptyState) {
        this.editor.emptyState.style.display = 'block';
        this.editor.emptyState.textContent = 'This board item is locked by the investigation and cannot be edited.';
      }

      if (this.editor.fieldsWrap) this.editor.fieldsWrap.style.display = 'none';
      if (this.editor.applyBtn) this.editor.applyBtn.disabled = true;
      if (this.editor.deleteBtn) this.editor.deleteBtn.disabled = true;
      return;
    }

    if (this.editor.emptyState) this.editor.emptyState.style.display = 'none';
    if (this.editor.fieldsWrap) this.editor.fieldsWrap.style.display = 'block';
    if (this.editor.applyBtn) this.editor.applyBtn.disabled = false;
    if (this.editor.deleteBtn) this.editor.deleteBtn.disabled = false;

    this.setFormValue('id', item.id);
    this.setFormValue('type', item.type);
    this.setFormValue('label', item.label);
    this.setFormValue('x', item.x);
    this.setFormValue('y', item.y);
    this.setFormValue('rotation', item.rotation);
    this.setFormValue('pinned', String(item.pinned));

    this.renderEditorTypeFields(item.type, item);
  }

  renderEditorTypeFields(type, item = {}) {
    if (!this.editor.dynamicFields) return;

    if (type === 'photo') {
      this.editor.dynamicFields.innerHTML = `
        <label class="crime-board-sidebar__label">
          Image URL
          <input type="text" name="image" value="${this.escapeAttr(item.image || '')}">
        </label>
        <label class="crime-board-sidebar__label">
          Caption
          <textarea name="caption">${this.escapeHtml(item.caption || '')}</textarea>
        </label>
        <label class="crime-board-sidebar__label">
          Meta pills (comma separated)
          <input type="text" name="meta" value="${this.escapeAttr((item.meta || []).join(', '))}">
        </label>
      `;
      return;
    }

    if (type === 'evidence') {
      this.editor.dynamicFields.innerHTML = `
        <label class="crime-board-sidebar__label">
          Tag
          <input type="text" name="tag" value="${this.escapeAttr(item.tag || '')}">
        </label>
        <label class="crime-board-sidebar__label">
          Body
          <textarea name="body">${this.escapeHtml(item.body || '')}</textarea>
        </label>
        <label class="crime-board-sidebar__label">
          Fields (one per line: key:value)
          <textarea name="fields">${this.escapeHtml(this.stringifyFields(item.fields || []))}</textarea>
        </label>
      `;
      return;
    }

    this.editor.dynamicFields.innerHTML = `
      <label class="crime-board-sidebar__label">
        Text
        <textarea name="text">${this.escapeHtml(item.text || '')}</textarea>
      </label>
      <label class="crime-board-sidebar__label">
        Meta text
        <input type="text" name="metaText" value="${this.escapeAttr(item.metaText || '')}">
      </label>
      <label class="crime-board-sidebar__label">
        Color
        <select name="color">
          <option value="yellow" ${item.color === 'yellow' ? 'selected' : ''}>yellow</option>
          <option value="blue" ${item.color === 'blue' ? 'selected' : ''}>blue</option>
          <option value="pink" ${item.color === 'pink' ? 'selected' : ''}>pink</option>
        </select>
      </label>
    `;
  }

  renderLinksPanel() {
    if (!this.editor.linksList) return;

    this.editor.linksList.innerHTML = '';

    if (!this.state.links.length) {
      if (this.editor.linksEmpty) this.editor.linksEmpty.style.display = 'block';
      return;
    }

    if (this.editor.linksEmpty) this.editor.linksEmpty.style.display = 'none';

    this.state.links.forEach(link => {
      const fromItem = this.getItemById(link.from);
      const toItem = this.getItemById(link.to);
      const canDelete = Boolean(link.editableByPlayer);

      const card = document.createElement('div');
      card.className = 'crime-board-link-card';

      card.innerHTML = `
        <div class="crime-board-link-card__row">
          <div class="crime-board-link-card__title">
            ${this.escapeHtml(fromItem?.label || link.from)} → ${this.escapeHtml(toItem?.label || link.to)}
          </div>
          ${canDelete ? `
            <button type="button" class="crime-board-link-card__delete" data-link-id="${this.escapeAttr(link.id)}">
              Delete
            </button>
          ` : ''}
        </div>
        <div class="crime-board-link-card__meta">
          ${this.escapeHtml(link.fromAnchor)} → ${this.escapeHtml(link.toAnchor)}
        </div>
      `;

      const deleteBtn = card.querySelector('[data-link-id]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.removeLink(link.id);
        });
      }

      this.editor.linksList.appendChild(card);
    });
  }

  stringifyFields(fields) {
    return (fields || []).map(row => `${row.key || ''}:${row.value || ''}`).join('\n');
  }

  parseFields(text) {
    return String(text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [key, ...rest] = line.split(':');
        return {
          key: (key || '').trim(),
          value: rest.join(':').trim()
        };
      });
  }

  applyEditorChanges() {
    if (!this.selectedItemId || !this.editor.form) return;
    if (!this.isPlayerEditableItem()) return;

    const current = this.getItemById(this.selectedItemId);
    if (!current) return;

    const formData = new FormData(this.editor.form);
    const type = formData.get('type') || 'note';

    const patch = {
      type,
      label: formData.get('label') || '',
      x: Number(formData.get('x')) || 0,
      y: Number(formData.get('y')) || 0,
      rotation: Number(formData.get('rotation')) || 0,
      pinned: formData.get('pinned') === 'true',
      discovered: current.discovered,
      createdByPlayer: current.createdByPlayer,
      editableByPlayer: current.editableByPlayer
    };

    if (type === 'photo') {
      patch.image = formData.get('image') || '';
      patch.caption = formData.get('caption') || '';
      patch.meta = String(formData.get('meta') || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
      patch.text = '';
      patch.metaText = '';
      patch.tag = 'Evidence';
      patch.body = '';
      patch.fields = [];
      patch.color = 'yellow';
    }

    if (type === 'note') {
      patch.text = formData.get('text') || '';
      patch.metaText = formData.get('metaText') || '';
      patch.color = formData.get('color') || 'yellow';
      patch.image = '';
      patch.caption = '';
      patch.meta = [];
      patch.tag = 'Evidence';
      patch.body = '';
      patch.fields = [];
    }

    if (type === 'evidence') {
      patch.tag = formData.get('tag') || 'Evidence';
      patch.body = formData.get('body') || '';
      patch.fields = this.parseFields(formData.get('fields') || '');
      patch.image = '';
      patch.caption = '';
      patch.meta = [];
      patch.text = '';
      patch.metaText = '';
      patch.color = 'yellow';
    }

    this.updateItem(this.selectedItemId, patch);
    this.syncJsonOutput();
  }

  setFormValue(name, value) {
    if (!this.editor.form) return;
    const field = this.editor.form.elements[name];
    if (field) field.value = value;
  }

  onItemPointerDown(e, itemId) {
    const item = this.getItemById(itemId);
    const el = this.itemElements.get(itemId);
    if (!item || !el || item.pinned) return;

    const rect = el.getBoundingClientRect();

    this.drag.activeId = itemId;
    this.drag.offsetX = e.clientX - rect.left;
    this.drag.offsetY = e.clientY - rect.top;

    item.z = ++this.zCounter;
    this.selectItem(itemId);

    el.classList.add('is-dragging');
    el.style.zIndex = String(item.z);
    el.setPointerCapture(e.pointerId);

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  onWindowPointerMove(e) {
    if (this.drag.activeId) {
      this.handleDragMove(e);
      return;
    }

    if (this.connectionMode.active) {
      this.updateTempConnection(e);
    }
  }

  handleDragMove(e) {
    const item = this.getItemById(this.drag.activeId);
    const el = this.itemElements.get(this.drag.activeId);
    if (!item || !el) return;

    const boardRect = this.root.getBoundingClientRect();

    let newX = e.clientX - boardRect.left - this.drag.offsetX;
    let newY = e.clientY - boardRect.top - this.drag.offsetY;

    const maxX = boardRect.width - el.offsetWidth;
    const maxY = boardRect.height - el.offsetHeight;

    item.x = Math.max(0, Math.min(newX, maxX));
    item.y = Math.max(0, Math.min(newY, maxY));

    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;

    this.renderLinks();
    this.refreshEditorCoords(item);
  }

  refreshEditorCoords(item) {
    this.setFormValue('x', item.x);
    this.setFormValue('y', item.y);
  }

  onWindowPointerUp(e) {
    if (this.drag.activeId) {
      const el = this.itemElements.get(this.drag.activeId);
      if (el) el.classList.remove('is-dragging');

      this.drag.activeId = null;
      this.syncJsonOutput();

      window.removeEventListener('pointermove', this.boundPointerMove);
      window.removeEventListener('pointerup', this.boundPointerUp);
      return;
    }

    if (this.connectionMode.active) {
      const anchor = e.target.closest('.crime-board__anchor');
      const itemEl = e.target.closest('.crime-board__item');

      if (anchor && itemEl) {
        this.finishConnection(itemEl.dataset.id, anchor.dataset.anchor);
      } else if (itemEl) {
        this.finishConnection(itemEl.dataset.id, 'left');
      } else {
        this.resetConnectionMode();
      }
    }

    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
  }

  startConnection(fromId, fromAnchor = 'right') {
    if (!this.canStartLinkFromItem(fromId)) return;

    this.resetConnectionMode();

    this.connectionMode.active = true;
    this.connectionMode.fromId = fromId;
    this.connectionMode.fromAnchor = fromAnchor;

    const itemEl = this.itemElements.get(fromId);
    if (itemEl) itemEl.classList.add('is-connecting');

    this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempPath.setAttribute('class', 'crime-board__string crime-board__string--temp');
    this.svg.appendChild(this.tempPath);

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  updateTempConnection(e) {
    if (!this.tempPath || !this.connectionMode.fromId) return;

    const boardRect = this.root.getBoundingClientRect();
    const from = this.getAnchorPoint(this.connectionMode.fromId, this.connectionMode.fromAnchor);
    const to = {
      x: e.clientX - boardRect.left,
      y: e.clientY - boardRect.top
    };

    this.tempPath.setAttribute('d', this.buildCurvePath(from, to));
  }

  finishConnection(toId, toAnchor = 'left') {
    const fromId = this.connectionMode.fromId;
    const fromAnchor = this.connectionMode.fromAnchor;

    if (!fromId || fromId === toId) {
      this.resetConnectionMode();
      return;
    }

    if (!this.canStartLinkFromItem(fromId)) {
      this.resetConnectionMode();
      return;
    }

    const exists = this.state.links.some(link =>
      (link.from === fromId && link.to === toId) ||
      (link.from === toId && link.to === fromId)
    );

    if (!exists) {
      this.state.links.push(this.normalizeLink({
        from: fromId,
        to: toId,
        fromAnchor,
        toAnchor,
        color: '#b3131b',
        createdByPlayer: true,
        editableByPlayer: true
      }, this.state.links.length));
    }

    this.resetConnectionMode();
    this.render();
    this.syncJsonOutput();
  }

  resetConnectionMode() {
    if (this.connectionMode.fromId) {
      const oldEl = this.itemElements.get(this.connectionMode.fromId);
      if (oldEl) oldEl.classList.remove('is-connecting');
    }

    this.connectionMode.active = false;
    this.connectionMode.fromId = null;
    this.connectionMode.fromAnchor = null;

    if (this.tempPath) {
      this.tempPath.remove();
      this.tempPath = null;
    }
  }

  renderItemPositions() {
    this.state.items.forEach(item => {
      const el = this.itemElements.get(item.id);
      if (!el) return;

      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.transform = `rotate(${item.rotation}deg)`;
      el.style.zIndex = String(item.z);
    });
  }

  renderLinks() {
    this.state.links.forEach(link => {
      const group = this.linkElements.get(link.id);
      if (!group) return;

      const visiblePath = group.children[0];
      const hitPath = group.children[1];

      const from = this.getAnchorPoint(link.from, link.fromAnchor);
      const to = this.getAnchorPoint(link.to, link.toAnchor);
      const d = this.buildCurvePath(from, to);

      visiblePath.setAttribute('d', d);
      visiblePath.setAttribute('stroke', link.color);
      hitPath.setAttribute('d', d);
    });
  }

  buildCurvePath(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const curveStrength = Math.max(40, Math.min(140, Math.abs(dx) * 0.35 + Math.abs(dy) * 0.15));

    const c1 = {
      x: from.x + (dx >= 0 ? curveStrength : -curveStrength),
      y: from.y
    };

    const c2 = {
      x: to.x - (dx >= 0 ? curveStrength : -curveStrength),
      y: to.y
    };

    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  }

  getAnchorPoint(itemId, anchorName = 'right') {
    const el = this.itemElements.get(itemId);
    if (!el) return { x: 0, y: 0 };

    const x = el.offsetLeft;
    const y = el.offsetTop;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    switch (anchorName) {
      case 'top':
        return { x: x + w / 2, y };
      case 'right':
        return { x: x + w, y: y + h / 2 };
      case 'bottom':
        return { x: x + w / 2, y: y + h };
      case 'left':
      default:
        return { x, y: y + h / 2 };
    }
  }

  addItem(item) {
    const normalized = this.normalizeItem(item, this.state.items.length);
    normalized.z = ++this.zCounter;
    this.state.items.push(normalized);
    this.render();
    return normalized;
  }

  updateItem(itemId, patch = {}) {
    const item = this.getItemById(itemId);
    if (!item) return null;
    if (!item.editableByPlayer) return null;

    const merged = {
      ...item,
      ...patch,
      id: item.id,
      z: item.z,
      discovered: item.discovered,
      createdByPlayer: item.createdByPlayer,
      editableByPlayer: item.editableByPlayer
    };

    const updated = this.normalizeItem(merged, 0);
    const index = this.state.items.findIndex(entry => entry.id === itemId);

    this.state.items[index] = updated;
    this.render();
    this.selectItem(itemId);

    return structuredClone(updated);
  }

  removeItem(itemId) {
    const item = this.getItemById(itemId);
    if (!item?.editableByPlayer) return;

    this.state.items = this.state.items.filter(entry => entry.id !== itemId);
    this.state.links = this.state.links.filter(link => link.from !== itemId && link.to !== itemId);

    if (this.selectedItemId === itemId) {
      this.selectedItemId = null;
    }

    this.render();
    this.refreshEditor();
    this.syncJsonOutput();
  }

  addLink(fromId, toId, fromAnchor = 'right', toAnchor = 'left', color = '#b3131b') {
    if (!this.canStartLinkFromItem(fromId)) return null;

    const link = this.normalizeLink(
      {
        from: fromId,
        to: toId,
        fromAnchor,
        toAnchor,
        color,
        createdByPlayer: true,
        editableByPlayer: true
      },
      this.state.links.length
    );

    this.state.links.push(link);
    this.render();
    this.syncJsonOutput();

    return structuredClone(link);
  }

  removeLink(linkId) {
    const link = this.state.links.find(entry => entry.id === linkId);
    if (!link?.editableByPlayer) return;

    this.state.links = this.state.links.filter(entry => entry.id !== linkId);

    const group = this.linkElements.get(linkId);
    if (group) group.remove();

    this.linkElements.delete(linkId);
    this.renderLinksPanel();
    this.syncJsonOutput();
  }

  togglePin(itemId) {
    const item = this.getItemById(itemId);
    if (!item) return null;

    item.pinned = !item.pinned;

    const el = this.itemElements.get(itemId);
    if (el) {
      el.classList.toggle('is-pinned', item.pinned);
      const btn = el.querySelector('[data-action="pin"]');
      if (btn) btn.textContent = item.pinned ? 'Unpin' : 'Pin';
    }

    this.refreshEditor();
    this.syncJsonOutput();

    return item.pinned;
  }

  syncJsonOutput() {
    if (this.editor.jsonOutput) {
      this.editor.jsonOutput.value = this.saveBoard();
    }
  }

  getItemById(itemId) {
    return this.state.items.find(item => item.id === itemId) || null;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  escapeAttr(value) {
    return this.escapeHtml(value);
  }
}