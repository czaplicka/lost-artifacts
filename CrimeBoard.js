export class CrimeBoard {
  constructor(root, options = {}) {
    this.root = root;
    this.svg = root?.querySelector('.crime-board__strings');
    this.itemsLayer = root?.querySelector('.crime-board__items');

    if (!this.root || !this.svg || !this.itemsLayer) {
      throw new Error('CrimeBoard requires root with .crime-board__strings and .crime-board__items.');
    }

    this.options = {
      confirmLinkDeletion: options.confirmLinkDeletion !== false,
      formId: options.formId || 'crime-board-form',
      emptyStateId: options.emptyStateId || 'crime-board-empty-state',
      fieldsWrapId: options.fieldsWrapId || 'crime-board-fields',
      dynamicFieldsId: options.dynamicFieldsId || 'crime-board-type-fields',
      jsonOutputId: options.jsonOutputId || 'board-json-output',
      saveBtnId: options.saveBtnId || 'board-save-btn',
      loadBtnId: options.loadBtnId || 'board-load-btn',
      applyBtnId: options.applyBtnId || 'crime-board-apply-btn',
      deleteBtnId: options.deleteBtnId || 'crime-board-delete-btn',
      addPhotoBtnId: options.addPhotoBtnId || 'add-photo-btn',
      addNoteBtnId: options.addNoteBtnId || 'add-note-btn',
      addEvidenceBtnId: options.addEvidenceBtnId || 'add-evidence-btn',
      linksListId: options.linksListId || 'crime-board-links-list',
      linksEmptyId: options.linksEmptyId || 'crime-board-links-empty'
    };

    this.app = this.root.closest('.crime-board-app') || document;
    this.meta = {};
    this.state = { items: [], links: [] };
    this.selectedItemId = null;
    this.itemElements = new Map();
    this.linkElements = new Map();

    this.drag = {
      activeId: null,
      offsetX: 0,
      offsetY: 0,
      pointerId: null
    };

    this.connectionMode = {
      active: false,
      fromId: null,
      fromAnchor: null
    };

    this.tempPath = null;
    this.zCounter = 10;
    this.destroyed = false;

    this.editor = {
      form: document.getElementById(this.options.formId),
      emptyState: document.getElementById(this.options.emptyStateId),
      fieldsWrap: document.getElementById(this.options.fieldsWrapId),
      dynamicFields: document.getElementById(this.options.dynamicFieldsId),
      jsonOutput: document.getElementById(this.options.jsonOutputId),
      saveBtn: document.getElementById(this.options.saveBtnId),
      loadBtn: document.getElementById(this.options.loadBtnId),
      applyBtn: document.getElementById(this.options.applyBtnId),
      deleteBtn: document.getElementById(this.options.deleteBtnId),
      addPhotoBtn: document.getElementById(this.options.addPhotoBtnId),
      addNoteBtn: document.getElementById(this.options.addNoteBtnId),
      addEvidenceBtn: document.getElementById(this.options.addEvidenceBtnId),
      linksList: document.getElementById(this.options.linksListId),
      linksEmpty: document.getElementById(this.options.linksEmptyId)
    };

    this.sidebar = this.app.querySelector?.('#crime-board-sidebar') || null;
    this.sidebarToggleBtn = this.app.querySelector?.('#crime-board-sidebar-toggle') || null;
    this.sidebarTabBtn = this.app.querySelector?.('#crime-board-sidebar-tab') || null;

    this.boundResize = this.onResize.bind(this);
    this.boundPointerMove = this.onWindowPointerMove.bind(this);
    this.boundPointerUp = this.onWindowPointerUp.bind(this);
    this.boundRootClick = this.onRootClick.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('resize', this.boundResize);
    this.bindEditor();
    this.bindSidebar();
    this.root.addEventListener('click', this.boundRootClick);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.root.removeEventListener('click', this.boundRootClick);

    this.resetConnectionMode({ keepListeners: false });
    this.clearDragState();
    this.itemElements.clear();
    this.linkElements.clear();
    this.tempPath?.remove();
    this.tempPath = null;
  }

  onResize() {
    this.renderLinks();
  }

  onRootClick(e) {
    if (e.target === this.root || e.target === this.itemsLayer || e.target === this.svg) {
      this.selectedItemId = null;
      this.renderSelectionState();
      this.refreshEditor();
    }
  }

  clone(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  bindSidebar() {
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.addEventListener('click', () => {
        if (this.sidebar?.classList.contains('is-collapsed')) {
          this.expandSidebar();
        } else {
          this.collapseSidebar();
        }
      });
    }

    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.addEventListener('click', () => {
        if (this.sidebar?.classList.contains('is-collapsed')) {
          this.expandSidebar();
        } else {
          this.collapseSidebar();
        }
      });
    }
  }

  collapseSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-open');
    this.sidebar.classList.add('is-collapsed');
    this.app.classList.add('is-sidebar-collapsed');

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.textContent = 'Show';
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
    this.app.classList.remove('is-sidebar-collapsed');

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.textContent = 'Hide';
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
    const link = this.getLinkById(linkId);
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
      this.editor.form.addEventListener('change', e => {
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
  }

  loadBoard(data) {
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

  getBoardData() {
    return {
      meta: this.clone(this.meta),
      items: this.clone(this.state.items),
      links: this.clone(this.state.links)
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

  isValidLinkTarget(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return false;
    return this.state.items.some(item => item.id === fromId) &&
      this.state.items.some(item => item.id === toId);
  }

  hasLinkBetween(aId, bId) {
    return this.state.links.some(link =>
      (link.from === aId && link.to === bId) ||
      (link.from === bId && link.to === aId)
    );
  }

  getItemById(id) {
    return this.state.items.find(item => item.id === id) || null;
  }

  getLinkById(id) {
    return this.state.links.find(link => link.id === id) || null;
  }

  addItem(item) {
    const normalized = this.normalizeItem({
      ...item,
      z: this.nextZ()
    }, this.state.items.length);

    this.state.items.push(normalized);

    const el = this.createItemElement(normalized);
    this.itemsLayer.appendChild(el);
    this.itemElements.set(normalized.id, el);

    this.renderItemPosition(normalized);
    this.renderLinks();
    this.renderLinksPanel();

    return normalized;
  }

  updateItem(id, patch = {}) {
    const index = this.state.items.findIndex(item => item.id === id);
    if (index === -1) return null;

    const current = this.state.items[index];
    const next = this.normalizeItem({
      ...current,
      ...patch,
      id: current.id,
      createdByPlayer: current.createdByPlayer,
      editableByPlayer: current.editableByPlayer
    }, index);

    this.state.items[index] = next;
    const oldEl = this.itemElements.get(id);
    const newEl = this.createItemElement(next);

    if (oldEl?.parentNode) {
      oldEl.parentNode.replaceChild(newEl, oldEl);
    }

    this.itemElements.set(id, newEl);
    this.renderItemPosition(next);
    this.renderLinks();
    this.renderSelectionState();
    this.renderLinksPanel();

    return next;
  }

  removeItem(id) {
    const item = this.getItemById(id);
    if (!item || !item.editableByPlayer) return false;

    this.state.items = this.state.items.filter(entry => entry.id !== id);

    const removedLinks = this.state.links
      .filter(link => link.from === id || link.to === id)
      .map(link => link.id);

    this.state.links = this.state.links.filter(link => link.from !== id && link.to !== id);

    this.itemElements.get(id)?.remove();
    this.itemElements.delete(id);

    removedLinks.forEach(linkId => {
      this.linkElements.get(linkId)?.remove();
      this.linkElements.delete(linkId);
    });

    this.renderLinks();
    this.renderLinksPanel();

    if (this.selectedItemId === id) {
      this.selectedItemId = null;
    }

    return true;
  }

  addLink(link) {
    const normalized = this.normalizeLink(link, this.state.links.length);

    if (!this.isValidLinkTarget(normalized.from, normalized.to)) return null;
    if (this.hasLinkBetween(normalized.from, normalized.to)) return null;

    this.state.links.push(normalized);
    const el = this.createLinkElement(normalized);
    this.svg.appendChild(el);
    this.linkElements.set(normalized.id, el);
    this.renderLinks();
    this.renderLinksPanel();
    return normalized;
  }

  removeLink(id) {
    const link = this.getLinkById(id);
    if (!link) return false;
    if (link.editableByPlayer === false) return false;

    if (this.options.confirmLinkDeletion) {
      const ok = window.confirm('Delete this connection?');
      if (!ok) return false;
    }

    this.state.links = this.state.links.filter(entry => entry.id !== id);
    this.linkElements.get(id)?.remove();
    this.linkElements.delete(id);
    this.renderLinksPanel();
    this.syncJsonOutput();
    return true;
  }

  nextZ() {
    this.zCounter += 1;
    return this.zCounter;
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
    if (!item.discovered) el.classList.add('is-hidden');
    if (item.createdByPlayer) el.classList.add('is-player-item');
    if (item.editableByPlayer) el.classList.add('is-editable');

    el.innerHTML = this.getItemMarkup(item);

    el.addEventListener('pointerdown', event => this.onItemPointerDown(event, item.id));
    el.addEventListener('click', event => {
      event.stopPropagation();
      this.selectItem(item.id);
    });

    el.querySelectorAll('[data-anchor]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        event.stopPropagation();
        const anchorName = anchor.dataset.anchor;
        this.handleAnchorClick(item.id, anchorName);
      });
    });

    return el;
  }

  getItemMarkup(item) {
    if (item.type === 'photo') {
      return `
        <div class="crime-board__card crime-board__card--photo">
          <button class="crime-board__anchor crime-board__anchor--top" data-anchor="top" type="button" aria-label="Connect from top"></button>
          <button class="crime-board__anchor crime-board__anchor--right" data-anchor="right" type="button" aria-label="Connect from right"></button>
          <button class="crime-board__anchor crime-board__anchor--bottom" data-anchor="bottom" type="button" aria-label="Connect from bottom"></button>
          <button class="crime-board__anchor crime-board__anchor--left" data-anchor="left" type="button" aria-label="Connect from left"></button>

          <div class="crime-board__photo-frame">
            <img src="${this.escapeHtml(item.image || '/assets/ui/placeholder-clue.png')}" alt="${this.escapeHtml(item.label)}" draggable="false">
          </div>
          <h3 class="crime-board__label">${this.escapeHtml(item.label)}</h3>
          ${item.caption ? `<p class="crime-board__caption">${this.escapeHtml(item.caption)}</p>` : ''}
          ${item.meta?.length ? `<ul class="crime-board__meta">${item.meta.map(value => `<li>${this.escapeHtml(value)}</li>`).join('')}</ul>` : ''}
        </div>
      `;
    }

    if (item.type === 'evidence') {
      return `
        <div class="crime-board__card crime-board__card--evidence">
          <button class="crime-board__anchor crime-board__anchor--top" data-anchor="top" type="button" aria-label="Connect from top"></button>
          <button class="crime-board__anchor crime-board__anchor--right" data-anchor="right" type="button" aria-label="Connect from right"></button>
          <button class="crime-board__anchor crime-board__anchor--bottom" data-anchor="bottom" type="button" aria-label="Connect from bottom"></button>
          <button class="crime-board__anchor crime-board__anchor--left" data-anchor="left" type="button" aria-label="Connect from left"></button>

          <p class="crime-board__tag">${this.escapeHtml(item.tag || 'Evidence')}</p>
          <h3 class="crime-board__label">${this.escapeHtml(item.label)}</h3>
          ${item.body ? `<p class="crime-board__body">${this.escapeHtml(item.body)}</p>` : ''}
          ${item.fields?.length ? `
            <dl class="crime-board__facts">
              ${item.fields.map(row => `
                <div class="crime-board__fact">
                  <dt>${this.escapeHtml(row.key || '')}</dt>
                  <dd>${this.escapeHtml(row.value || '')}</dd>
                </div>
              `).join('')}
            </dl>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="crime-board__card crime-board__card--note crime-board__card--${this.escapeHtml(item.color || 'yellow')}">
        <button class="crime-board__anchor crime-board__anchor--top" data-anchor="top" type="button" aria-label="Connect from top"></button>
        <button class="crime-board__anchor crime-board__anchor--right" data-anchor="right" type="button" aria-label="Connect from right"></button>
        <button class="crime-board__anchor crime-board__anchor--bottom" data-anchor="bottom" type="button" aria-label="Connect from bottom"></button>
        <button class="crime-board__anchor crime-board__anchor--left" data-anchor="left" type="button" aria-label="Connect from left"></button>

        <h3 class="crime-board__label">${this.escapeHtml(item.label)}</h3>
        ${item.text ? `<p class="crime-board__body">${this.escapeHtml(item.text)}</p>` : ''}
        ${item.metaText ? `<p class="crime-board__meta-text">${this.escapeHtml(item.metaText)}</p>` : ''}
      </div>
    `;
  }

  createLinkElement(link) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('crime-board__link');
    group.dataset.id = link.id;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('crime-board__link-path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', link.color || '#b3131b');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    group.appendChild(path);

    if (link.editableByPlayer) {
      group.addEventListener('click', event => {
        event.stopPropagation();
        this.removeLink(link.id);
      });
    }

    return group;
  }

  renderItemPositions() {
    this.state.items.forEach(item => this.renderItemPosition(item));
  }

  renderItemPosition(item) {
    const el = this.itemElements.get(item.id);
    if (!el) return;

    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.zIndex = String(item.z || 1);
    el.style.transform = `rotate(${item.rotation || 0}deg)`;
  }

  renderLinks() {
    this.state.links.forEach(link => {
      const group = this.linkElements.get(link.id);
      const path = group?.querySelector('path');
      if (!path) return;

      const fromPoint = this.getAnchorPosition(link.from, link.fromAnchor);
      const toPoint = this.getAnchorPosition(link.to, link.toAnchor);
      if (!fromPoint || !toPoint) return;

      path.setAttribute('d', this.buildLinkPath(fromPoint, toPoint));
      path.setAttribute('stroke', link.color || '#b3131b');
    });

    if (this.connectionMode.active && this.tempPath) {
      this.tempPath.setAttribute('stroke', '#b3131b');
    }
  }

  renderSelectionState() {
    this.itemElements.forEach((el, id) => {
      el.classList.toggle('is-selected', id === this.selectedItemId);
    });
  }

  renderLinksPanel() {
    const list = this.editor.linksList;
    const empty = this.editor.linksEmpty;
    if (!list || !empty) return;

    list.innerHTML = '';

    if (!this.state.links.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    this.state.links.forEach(link => {
      const from = this.getItemById(link.from);
      const to = this.getItemById(link.to);

      const li = document.createElement('li');
      li.className = 'crime-board-links-list__item';

      const label = document.createElement('span');
      label.textContent = `${from?.label || link.from} → ${to?.label || link.to}`;
      li.appendChild(label);

      if (link.editableByPlayer) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'crime-board-btn crime-board-btn--ghost crime-board-btn--mini';
        btn.textContent = 'Delete';
        btn.addEventListener('click', () => this.removeLink(link.id));
        li.appendChild(btn);
      }

      list.appendChild(li);
    });
  }

  refreshEditor() {
    const item = this.getItemById(this.selectedItemId);
    const editable = Boolean(item?.editableByPlayer);

    if (this.editor.emptyState) {
      this.editor.emptyState.hidden = editable;
    }

    if (this.editor.form) {
      this.editor.form.hidden = !editable;
    }

    if (!editable || !item) return;

    const form = this.editor.form;
    form.elements.type.value = item.type;
    form.elements.label.value = item.label || '';
    if (form.elements.color) {
      form.elements.color.value = item.color || 'yellow';
    }
    if (form.elements.pinned) {
      form.elements.pinned.checked = Boolean(item.pinned);
    }

    this.renderEditorTypeFields(item.type, item);
  }

  renderEditorTypeFields(type, item = {}) {
    const wrap = this.editor.dynamicFields;
    if (!wrap) return;

    if (type === 'photo') {
      wrap.innerHTML = `
        <label class="crime-board-field">
          <span>Image URL</span>
          <input name="image" type="text" value="${this.escapeAttribute(item.image || '')}">
        </label>
        <label class="crime-board-field">
          <span>Caption</span>
          <textarea name="caption" rows="3">${this.escapeHtml(item.caption || '')}</textarea>
        </label>
        <label class="crime-board-field">
          <span>Meta (comma separated)</span>
          <input name="meta" type="text" value="${this.escapeAttribute((item.meta || []).join(', '))}">
        </label>
      `;
      return;
    }

    if (type === 'evidence') {
      wrap.innerHTML = `
        <label class="crime-board-field">
          <span>Tag</span>
          <input name="tag" type="text" value="${this.escapeAttribute(item.tag || 'Evidence')}">
        </label>
        <label class="crime-board-field">
          <span>Body</span>
          <textarea name="body" rows="5">${this.escapeHtml(item.body || '')}</textarea>
        </label>
        <label class="crime-board-field">
          <span>Fields (one per line: key:value)</span>
          <textarea name="fields" rows="6">${this.escapeHtml((item.fields || []).map(row => `${row.key || ''}:${row.value || ''}`).join('\n'))}</textarea>
        </label>
      `;
      return;
    }

    wrap.innerHTML = `
      <label class="crime-board-field">
        <span>Text</span>
        <textarea name="text" rows="5">${this.escapeHtml(item.text || '')}</textarea>
      </label>
      <label class="crime-board-field">
        <span>Meta text</span>
        <input name="metaText" type="text" value="${this.escapeAttribute(item.metaText || '')}">
      </label>
    `;
  }

  applyEditorChanges() {
    const item = this.getItemById(this.selectedItemId);
    if (!item || !item.editableByPlayer || !this.editor.form) return null;

    const form = this.editor.form;
    const type = form.elements.type.value;
    const patch = {
      type,
      label: form.elements.label.value.trim(),
      pinned: Boolean(form.elements.pinned?.checked),
      color: form.elements.color?.value || 'yellow'
    };

    if (type === 'photo') {
      patch.image = form.elements.image?.value.trim() || '';
      patch.caption = form.elements.caption?.value.trim() || '';
      patch.meta = (form.elements.meta?.value || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      patch.text = '';
      patch.metaText = '';
      patch.tag = '';
      patch.body = '';
      patch.fields = [];
    } else if (type === 'evidence') {
      patch.tag = form.elements.tag?.value.trim() || 'Evidence';
      patch.body = form.elements.body?.value.trim() || '';
      patch.fields = this.parseFieldsTextarea(form.elements.fields?.value || '');
      patch.image = '';
      patch.caption = '';
      patch.meta = [];
      patch.text = '';
      patch.metaText = '';
    } else {
      patch.text = form.elements.text?.value.trim() || '';
      patch.metaText = form.elements.metaText?.value.trim() || '';
      patch.image = '';
      patch.caption = '';
      patch.meta = [];
      patch.tag = '';
      patch.body = '';
      patch.fields = [];
    }

    const updated = this.updateItem(item.id, patch);
    this.selectItem(item.id);
    this.syncJsonOutput();
    return updated;
  }

  parseFieldsTextarea(value) {
    return String(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [key, ...rest] = line.split(':');
        return {
          key: (key || '').trim(),
          value: rest.join(':').trim()
        };
      })
      .filter(row => row.key || row.value);
  }

  syncJsonOutput() {
    if (this.editor.jsonOutput) {
      this.editor.jsonOutput.value = this.saveBoard();
    }
  }

  selectItem(id) {
    this.selectedItemId = id;
    const item = this.getItemById(id);
    if (item) {
      item.z = this.nextZ();
      this.renderItemPosition(item);
    }
    this.renderSelectionState();
    this.refreshEditor();
  }

  onItemPointerDown(event, itemId) {
    if (event.button !== 0) return;

    const item = this.getItemById(itemId);
    const el = this.itemElements.get(itemId);
    if (!item || !el) return;

    const rect = el.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();

    this.drag.activeId = itemId;
    this.drag.pointerId = event.pointerId;
    this.drag.offsetX = event.clientX - rect.left;
    this.drag.offsetY = event.clientY - rect.top;

    item.z = this.nextZ();
    this.renderItemPosition(item);

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);

    el.setPointerCapture?.(event.pointerId);
    event.preventDefault();

    this.drag.rootRect = rootRect;
  }

  onWindowPointerMove(event) {
    if (!this.drag.activeId) return;

    const item = this.getItemById(this.drag.activeId);
    if (!item) return;

    const rootRect = this.root.getBoundingClientRect();
    item.x = event.clientX - rootRect.left - this.drag.offsetX;
    item.y = event.clientY - rootRect.top - this.drag.offsetY;

    this.renderItemPosition(item);
    this.renderLinks();
  }

  onWindowPointerUp() {
    if (!this.drag.activeId) return;
    this.clearDragState();
    this.syncJsonOutput();
  }

  clearDragState() {
    this.drag.activeId = null;
    this.drag.pointerId = null;
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
  }

  handleAnchorClick(itemId, anchor) {
    if (!this.canStartLinkFromItem(itemId)) return;

    if (!this.connectionMode.active) {
      this.startConnectionMode(itemId, anchor);
      return;
    }

    if (this.connectionMode.fromId === itemId) {
      this.resetConnectionMode();
      return;
    }

    const fromItem = this.getItemById(this.connectionMode.fromId);
    const toItem = this.getItemById(itemId);
    if (!fromItem || !toItem) {
      this.resetConnectionMode();
      return;
    }

    const editable = Boolean(fromItem.createdByPlayer || toItem.createdByPlayer);

    const link = this.addLink({
      from: this.connectionMode.fromId,
      to: itemId,
      fromAnchor: this.connectionMode.fromAnchor || 'right',
      toAnchor: anchor || 'left',
      color: editable ? '#b3131b' : '#7e0f15',
      createdByPlayer: editable,
      editableByPlayer: editable
    });

    this.resetConnectionMode();
    if (link) {
      this.syncJsonOutput();
    }
  }

  startConnectionMode(itemId, anchor) {
    this.connectionMode.active = true;
    this.connectionMode.fromId = itemId;
    this.connectionMode.fromAnchor = anchor || 'right';

    this.tempPath?.remove();
    this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempPath.classList.add('crime-board__temp-link');
    this.tempPath.setAttribute('fill', 'none');
    this.tempPath.setAttribute('stroke', '#b3131b');
    this.tempPath.setAttribute('stroke-width', '2');
    this.tempPath.setAttribute('stroke-dasharray', '8 6');
    this.tempPath.setAttribute('stroke-linecap', 'round');
    this.svg.appendChild(this.tempPath);

    const moveHandler = event => {
      if (!this.connectionMode.active || !this.tempPath) return;
      const start = this.getAnchorPosition(itemId, this.connectionMode.fromAnchor);
      if (!start) return;
      const rect = this.root.getBoundingClientRect();
      const end = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      this.tempPath.setAttribute('d', this.buildLinkPath(start, end));
    };

    this.boundTempMove = moveHandler;
    window.addEventListener('pointermove', this.boundTempMove);
  }

  resetConnectionMode({ keepListeners = false } = {}) {
    this.connectionMode.active = false;
    this.connectionMode.fromId = null;
    this.connectionMode.fromAnchor = null;

    if (!keepListeners && this.boundTempMove) {
      window.removeEventListener('pointermove', this.boundTempMove);
      this.boundTempMove = null;
    }

    this.tempPath?.remove();
    this.tempPath = null;
  }

  getAnchorPosition(itemId, anchor = 'right') {
    const el = this.itemElements.get(itemId);
    if (!el) return null;

    const rootRect = this.root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    const positions = {
      top: {
        x: rect.left - rootRect.left + rect.width / 2,
        y: rect.top - rootRect.top
      },
      right: {
        x: rect.right - rootRect.left,
        y: rect.top - rootRect.top + rect.height / 2
      },
      bottom: {
        x: rect.left - rootRect.left + rect.width / 2,
        y: rect.bottom - rootRect.top
      },
      left: {
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top + rect.height / 2
      }
    };

    return positions[anchor] || positions.right;
  }

  buildLinkPath(from, to) {
    const dx = Math.abs(to.x - from.x);
    const curve = Math.max(40, dx * 0.35);

    return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  escapeAttribute(value) {
    return this.escapeHtml(value);
  }
}