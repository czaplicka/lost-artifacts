import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const BoardEditor = {
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
        if (item) this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }


    if (this.editor.addNoteBtn) {
      this.editor.addNoteBtn.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem('note'));
        if (item) this.selectItem(item.id);
        this.syncJsonOutput();
      });
    }


    if (this.editor.addEvidenceBtn) {
      this.editor.addEvidenceBtn.addEventListener('click', () => {
        const item = this.addItem(this.createDefaultItem('evidence'));
        if (item) this.selectItem(item.id);
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


    // Motive verification button - compares the currently selected
    // item's clueId (used here as the player's motive guess) against
    // gameState.caseData.correctMotiveAnswerId via motiveService.
    if (this.editor.verifyMotiveBtn) {
      this.editor.verifyMotiveBtn.addEventListener('click', () => {
        if (!this.selectedItemId) return;
        this.verifyMotiveGuess(this.selectedItemId);
      });
    }
  },

  refreshEditor() {
    this.refreshDeductionPanel();
    const item = this.getItemById(this.selectedItemId);
    const editable = Boolean(item?.editableByPlayer);


    if (this.editor.emptyState) {
      this.editor.emptyState.hidden = editable;
    }


    if (this.editor.form) {
      this.editor.form.hidden = !editable;
    }


    if (this.editor.verifyMotiveBtn) {
      this.editor.verifyMotiveBtn.hidden = !item;
      this.editor.verifyMotiveBtn.disabled = !item;
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
  },

  renderEditorTypeFields(type, item = {}) {
    const wrap = this.editor.dynamicFields;
    if (!wrap) return;


    if (type === 'photo') {
      wrap.innerHTML = `${"\n        <label class=\"crime-board-field\">\n          <span>Image URL</span>\n          <input name=\"image\" type=\"text\" value=\""}${this.escapeAttribute(item.image || '')}${"\">\n        </label>\n        <label class=\"crime-board-field\">\n          <span>Caption</span>\n          <textarea name=\"caption\" rows=\"3\">"}${this.escapeHtml(item.caption || '')}${"</textarea>\n        </label>\n        <label class=\"crime-board-field\">\n          <span>Meta (comma separated)</span>\n          <input name=\"meta\" type=\"text\" value=\""}${this.escapeAttribute((item.meta || []).join(', '))}${"\">\n        </label>\n      "}`;
      return;
    }


    if (type === 'evidence') {
      wrap.innerHTML = `${"\n        <label class=\"crime-board-field\">\n          <span>Tag</span>\n          <input name=\"tag\" type=\"text\" value=\""}${this.escapeAttribute(item.tag || "Evidence")}${"\">\n        </label>\n        <label class=\"crime-board-field\">\n          <span>Body</span>\n          <textarea name=\"body\" rows=\"5\">"}${this.escapeHtml(item.body || '')}${"</textarea>\n        </label>\n        <label class=\"crime-board-field\">\n          <span>Fields (one per line: key:value)</span>\n          <textarea name=\"fields\" rows=\"6\">"}${this.escapeHtml((item.fields || []).map(row => `${row.key || ''}:${row.value || ''}`).join('\n'))}${"</textarea>\n        </label>\n        <label class=\"crime-board-field\">\n          <span>Motive guess ID (clueId)</span>\n          <input name=\"clueId\" type=\"text\" value=\""}${this.escapeAttribute(item.clueId || '')}${"\" placeholder=\"e.g. gambling_debt\">\n        </label>\n      "}`;
      return;
    }


    wrap.innerHTML = `${"\n      <label class=\"crime-board-field\">\n        <span>Text</span>\n        <textarea name=\"text\" rows=\"5\">"}${this.escapeHtml(item.text || '')}${"</textarea>\n      </label>\n      <label class=\"crime-board-field\">\n        <span>Meta text</span>\n        <input name=\"metaText\" type=\"text\" value=\""}${this.escapeAttribute(item.metaText || '')}${"\">\n      </label>\n      <label class=\"crime-board-field\">\n        <span>Motive guess ID (clueId)</span>\n        <input name=\"clueId\" type=\"text\" value=\""}${this.escapeAttribute(item.clueId || '')}${"\" placeholder=\"e.g. gambling_debt\">\n      </label>\n    "}`;
  },

  applyEditorChanges() {
    const item = this.getItemById(this.selectedItemId);
    if (!item || !item.editableByPlayer || !this.editor.form) return null;


    const form = this.editor.form;
    const type = form.elements.type.value;
    const patch = {
      type,
      label: form.elements.label.value.trim(),
      pinned: Boolean(form.elements.pinned?.checked),
      color: form.elements.color?.value || 'yellow',
      clueId: form.elements.clueId?.value.trim() || null,
      // Editing the item resets any previous verdict; the player must
      // press "Verify motive" again after changing their guess.
      motiveVerdict: null
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
      patch.tag = form.elements.tag?.value.trim() || __dialogueText("crimeBoard/BoardEditor.js", "t_03867aea70acaf4c5dce");
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
  },

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
  },

  syncJsonOutput() {
    if (this.editor.jsonOutput) {
      this.editor.jsonOutput.value = this.saveBoard();
    }
  }
};
