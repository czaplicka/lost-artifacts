export const BoardLinks = {
  isPlayerEditableLink(linkId) {
    const link = this.getLinkById(linkId);
    return Boolean(link?.editableByPlayer);
  },

  canStartLinkFromItem(itemId) {
    const item = this.getItemById(itemId);
    if (!item) return false;
    return Boolean(item.createdByPlayer || item.discovered);
  },

  isValidLinkTarget(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return false;
    return this.state.items.some(item => item.id === fromId) &&
      this.state.items.some(item => item.id === toId);
  },

  hasLinkBetween(aId, bId) {
    return this.state.links.some(link =>
      (link.from === aId && link.to === bId) ||
      (link.from === bId && link.to === aId)
    );
  },

  getLinkById(id) {
    return this.state.links.find(link => link.id === id) || null;
  },

  addLink(link) {
    if (!this._isBoardUsable()) return null;


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
  },

  removeLink(id) {
    if (!this._isBoardUsable()) return false;


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
  },

  handleAnchorClick(itemId, anchor) {
    if (!this._isBoardUsable()) return;
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
  },

  startConnectionMode(itemId, anchor) {
    if (!this._isBoardUsable()) return;


    this.connectionMode.active = true;
    this.connectionMode.fromId = itemId;
    this.connectionMode.fromAnchor = anchor || 'right';


    this.tempPath?.remove();
    this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempPath.classList.add('crime-board__temp-link');
    this._setSvgAttr(this.tempPath, 'fill', 'none');
    this._setSvgAttr(this.tempPath, 'stroke', '#b3131b');
    this._setSvgAttr(this.tempPath, 'stroke-width', '2');
    this._setSvgAttr(this.tempPath, 'stroke-dasharray', '8 6');
    this._setSvgAttr(this.tempPath, 'stroke-linecap', 'round');
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
      this._setSvgAttr(this.tempPath, 'd', this.buildLinkPath(start, end));
    };


    this.boundTempMove = moveHandler;
    window.addEventListener('pointermove', this.boundTempMove);
  },

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
  },

  getAnchorPosition(itemId, anchor = 'right') {
    const el = this.itemElements.get(itemId);
    if (!el || !this.root) return null;


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
  },

  buildLinkPath(from, to) {
    const dx = Math.abs(to.x - from.x);
    const curve = Math.max(40, dx * 0.35);


    return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
  }
};
