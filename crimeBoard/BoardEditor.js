import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";

export const BoardEditor = {
  bindEditor() {
    if (this.editor.saveBtn) this.editor.saveBtn.addEventListener('click', () => {
      if (this.editor.jsonOutput) this.editor.jsonOutput.value = this.saveBoard();
    });
    if (this.editor.loadBtn) this.editor.loadBtn.addEventListener('click', () => {
      this.importBoard(this.editor.jsonOutput?.value || '');
    });
    if (this.editor.applyBtn) this.editor.applyBtn.addEventListener('click', () => {
      if (this.isPlayerEditableItem()) this.applyEditorChanges();
    });
    if (this.editor.deleteBtn) this.editor.deleteBtn.addEventListener('click', () => {
      if (this.selectedItemId == null || !this.isPlayerEditableItem()) return;
      this.removeItem(this.selectedItemId);
      this.selectedItemId = null;
      this.refreshEditor();
      this.syncJsonOutput();
    });
    for (const [button, type] of [
      [this.editor.addPhotoBtn, 'photo'], [this.editor.addNoteBtn, 'note'],
      [this.editor.addEvidenceBtn, 'evidence']
    ]) {
      if (button) button.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem(type));
        if (item) this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }
    if (this.editor.form) this.editor.form.addEventListener('change', event => {
      if (!this.isPlayerEditableItem()) return;
      if (event.target.name === 'type') {
        this.renderEditorTypeFields(event.target.value, this.getItemById(this.selectedItemId));
      }
    });
    if (this.editor.verifyMotiveBtn) this.editor.verifyMotiveBtn.addEventListener('click', () => {
      if (this.selectedItemId != null) this.verifyMotiveGuess(this.selectedItemId);
    });
  },

  refreshEditor() {
    this.refreshDeductionPanel();
    const item = this.getItemById(this.selectedItemId);
    const editable = Boolean(item?.editableByPlayer);
    if (this.editor.emptyState) this.editor.emptyState.hidden = editable;
    if (this.editor.form) this.editor.form.hidden = !editable;
    if (this.editor.verifyMotiveBtn) {
      this.editor.verifyMotiveBtn.hidden = !item;
      this.editor.verifyMotiveBtn.disabled = !item;
    }
    if (!editable || !item || !this.editor.form) return;
    const form = this.editor.form;
    form.elements.type.value = item.type;
    form.elements.label.value = item.label || '';
    if (form.elements.color) form.elements.color.value = item.color || 'yellow';
    if (form.elements.pinned) form.elements.pinned.checked = Boolean(item.pinned);
    this.renderEditorTypeFields(item.type, item);
  },

  renderEditorTypeFields(type, item = {}) {
    item ||= {};
    const wrap = this.editor.dynamicFields;
    if (!wrap) return;
    this._editorEvidenceRows = null;
    if (type === 'photo') {
      wrap.innerHTML = `
        <label class="crime-board-field"><span>Image path (game assets only)</span>
          <input name="image" type="text" value="${this.escapeAttribute(item.image || '')}"></label>
        <label class="crime-board-field"><span>Caption</span>
          <textarea name="caption" rows="3">${this.escapeHtml(item.caption || '')}</textarea></label>
        <label class="crime-board-field"><span>Meta (comma separated)</span>
          <input name="meta" type="text" value="${this.escapeAttribute((item.meta || []).join(', '))}"></label>`;
      return;
    }
    if (type === 'evidence') {
      wrap.innerHTML = `
        <label class="crime-board-field"><span>Tag</span>
          <input name="tag" type="text" value="${this.escapeAttribute(item.tag || 'Evidence')}"></label>
        <label class="crime-board-field"><span>Body</span>
          <textarea name="body" rows="5">${this.escapeHtml(item.body || '')}</textarea></label>`;
      const container = document.createElement('div');
      container.className = 'crime-board-fields';
      const title = document.createElement('span');
      title.textContent = 'Fields';
      container.appendChild(title);
      this._editorEvidenceRows = [];
      const addRow = original => {
        const row = document.createElement('div');
        row.className = 'crime-board-field';
        const keyLabel = document.createElement('label');
        const keyTitle = document.createElement('span');
        keyTitle.textContent = 'Name';
        const key = document.createElement('input');
        key.type = 'text'; key.value = String(original?.key ?? '');
        keyLabel.append(keyTitle, key);
        const valueLabel = document.createElement('label');
        const valueTitle = document.createElement('span');
        valueTitle.textContent = 'Value';
        const value = document.createElement('textarea');
        value.rows = 2; value.value = String(original?.value ?? '');
        valueLabel.append(valueTitle, value);
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'crime-board-btn crime-board-btn--ghost crime-board-btn--mini';
        remove.textContent = 'Remove field';
        const entry = { row, key, value, original: { ...original }, removed: false };
        remove.addEventListener('click', () => { entry.removed = true; row.remove(); });
        row.append(keyLabel, valueLabel, remove);
        container.insertBefore(row, add);
        this._editorEvidenceRows.push(entry);
      };
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'crime-board-btn crime-board-btn--mini';
      add.textContent = 'Add field';
      add.addEventListener('click', () => addRow({}));
      container.appendChild(add);
      wrap.appendChild(container);
      for (const field of Array.isArray(item.fields) ? item.fields : []) addRow(field);
      return;
    }
    wrap.innerHTML = `
      <label class="crime-board-field"><span>Text</span>
        <textarea name="text" rows="5">${this.escapeHtml(item.text || '')}</textarea></label>
      <label class="crime-board-field"><span>Meta text</span>
        <input name="metaText" type="text" value="${this.escapeAttribute(item.metaText || '')}"></label>`;
  },

  applyEditorChanges() {
    const item = this.getItemById(this.selectedItemId);
    if (!item || !item.editableByPlayer || !this.editor.form) return null;
    const form = this.editor.form;
    const type = form.elements.type.value;
    const patch = {
      type, label: form.elements.label.value.trim(),
      pinned: Boolean(form.elements.pinned?.checked),
      color: form.elements.color?.value || 'yellow'
    };
    // clueId is evidence identity, not editable form content. Never infer it from an absent control.
    // No verdict reset: editing cosmetic text does not change the motive answer.
    if (type === 'photo') {
      patch.image = form.elements.image?.value.trim() || '';
      patch.caption = form.elements.caption?.value.trim() || '';
      patch.meta = (form.elements.meta?.value || '').split(',').map(value => value.trim()).filter(Boolean);
      patch.text = ''; patch.metaText = ''; patch.tag = ''; patch.body = ''; patch.fields = [];
    } else if (type === 'evidence') {
      patch.tag = form.elements.tag?.value.trim() || __dialogueText("crimeBoard/BoardEditor.js", "t_03867aea70acaf4c5dce");
      patch.body = form.elements.body?.value.trim() || '';
      // Separate controls mean colons and newlines are plain text, not delimiters.
      patch.fields = Array.isArray(this._editorEvidenceRows)
        ? this._editorEvidenceRows.filter(entry => !entry.removed)
          .map(entry => ({ ...entry.original, key: entry.key.value.trim(), value: entry.value.value.trim() }))
          .filter(entry => entry.key || entry.value)
        : item.fields || [];
      patch.image = ''; patch.caption = ''; patch.meta = []; patch.text = ''; patch.metaText = '';
    } else {
      patch.text = form.elements.text?.value.trim() || '';
      patch.metaText = form.elements.metaText?.value.trim() || '';
      patch.image = ''; patch.caption = ''; patch.meta = []; patch.tag = ''; patch.body = ''; patch.fields = [];
    }
    const updated = this.updateItem(item.id, patch);
    this.selectItem(item.id);
    this.syncJsonOutput();
    return updated;
  },

  // Compatibility API for legacy tools. The interactive editor no longer uses delimited text.
  // JSON arrays provide an unambiguous format for keys containing colons.
  parseFieldsTextarea(value) {
    const input = String(value || '').trim();
    if (!input) return [];
    if (input.startsWith('[')) {
      const rows = JSON.parse(input);
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw new Error('Fields must be an array of records.');
      }
      return rows.map(row => ({ ...row, key: String(row.key ?? '').trim(), value: String(row.value ?? '').trim() }))
        .filter(row => row.key || row.value);
    }
    return input.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      // Explicit arrow permits both key and value to contain colons.
      const arrow = line.indexOf(' => ');
      const at = arrow >= 0 ? arrow : line.indexOf(':');
      const width = arrow >= 0 ? 4 : 1;
      return at < 0 ? { key: line, value: '' }
        : { key: line.slice(0, at).trim(), value: line.slice(at + width).trim() };
    }).filter(row => row.key || row.value);
  },

  syncJsonOutput() {
    if (this.editor.jsonOutput) this.editor.jsonOutput.value = this.saveBoard();
  }
};
