export const BoardItems = {
  isPlayerEditableItem(itemId = this.selectedItemId) {
    const item = this.getItemById(itemId);
    return Boolean(item?.editableByPlayer);
  },

  getItemById(id) {
    return this.state.items.find(item => item.id === id) || null;
  },

  addItem(item) {
    if (!this._isBoardUsable()) return null;


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
  },

  updateItem(id, patch = {}) {
    if (!this._isBoardUsable()) return null;


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
  },

  removeItem(id) {
    if (!this._isBoardUsable()) return false;


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
  },

  nextZ() {
    this.zCounter += 1;
    return this.zCounter;
  },

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
};
