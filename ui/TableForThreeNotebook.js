import { readTableForThreeNotebook, saveTableForThreeNotes } from '../managers/TableForThreeNotebookService.js';

export class TableForThreeNotebook {
  constructor(panel) { this.panel = panel; this.session = null; }
  addButton() {
    if (!readTableForThreeNotebook()) return;
    const p = this.panel, revision = p.revision;
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'CASE NOTES';
    Object.assign(button.style, { marginTop: '20px', padding: '10px 18px', fontFamily: '"Special Elite", SpecialElite, monospace', fontSize: '18px', background: '#2a2012', color: '#f0c75e', border: '1px solid #b58a42', cursor: 'pointer' });
    button.onclick = () => {
      if (p.destroyed || p.pendingAction || p.notebookOpen || p.revision !== revision) return;
      this.open();
    };
    p.root.append(button);
  }
  open() {
    const p = this.panel;
    if (this.session || p.destroyed || p.pendingAction) return;
    const view = readTableForThreeNotebook(); if (!view) return;
    this.session = { nodes: Array.from(p.root.children), scroll: p.root.scrollTop, revision: p.revision };
    const session = this.session;
    p.notebookOpen = true; p.root.replaceChildren(); p.root.scrollTop = 0;
    const content = document.createElement('div');
    Object.assign(content.style, { maxWidth: '1000px', margin: '0 auto', fontFamily: '"Special Elite", SpecialElite, monospace', lineHeight: '1.6' });
    p.root.append(content);
    const add = (tag, text) => { const node = document.createElement(tag); node.textContent = text; content.append(node); return node; };
    add('h1', 'TABLE FOR THREE — CASE NOTES');
    add('h2', 'Current objective'); add('p', view.objective);
    add('h2', 'Recorded leads');
    if (!view.leads.length) add('p', 'Read the client’s briefing to begin.');
    for (const lead of view.leads) add('p', '• ' + lead);
    add('h2', 'Photographs');
    if (!view.photographs.length) add('p', 'No photographs recorded.');
    for (const photo of view.photographs) add('p', photo.label + (photo.available ? ' — crop record present.' : ' — crop record missing; check your evidence.'));
    add('p', 'View the actual crops through EVIDENCE in the restaurant. This notebook does not create or repair photographs.');
    add('h2', 'My notes');
    const label = add('label', 'Private notes — up to ' + view.noteLimit + ' characters.');
    const textarea = document.createElement('textarea');
    label.append(textarea); textarea.value = view.note; textarea.maxLength = view.noteLimit; textarea.rows = 7; textarea.disabled = !view.noteEditable;
    textarea.setAttribute('aria-label', 'My case notes');
    Object.assign(textarea.style, { display: 'block', width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: '12px', background: '#201c17', color: '#eee3cd', border: '1px solid #b58a42', fontFamily: 'inherit', fontSize: '18px' });
    const status = add('p', view.noteEditable ? 'Use SAVE NOTES or SAVE AND BACK to keep your edits.' : 'Unsupported note version: read-only.');
    status.setAttribute('role', 'status');
    const row = document.createElement('div'); Object.assign(row.style, { display: 'flex', flexWrap: 'wrap', gap: '12px' }); content.append(row);
    const button = (text, action, disabled = false) => {
      const node = document.createElement('button'); node.type = 'button'; node.textContent = text; node.disabled = disabled;
      Object.assign(node.style, { padding: '12px 18px', fontFamily: 'inherit', fontSize: '18px', background: '#263729', color: '#e3f0d7', border: '1px solid #88b589', cursor: 'pointer' });
      node.onclick = () => { if (node.disabled || this.session !== session || p.destroyed) return; try { action(); } catch (error) { status.textContent = error.message || 'Could not update notes.'; } };
      row.append(node);
    };
    const save = () => {
      const result = saveTableForThreeNotes(textarea.value); status.textContent = result.message;
      return result.ok && !result.warning;
    };
    button('SAVE NOTES', save, !view.noteEditable);
    button(view.noteEditable ? 'SAVE AND BACK' : 'BACK', () => { if (!view.noteEditable || save()) this.close(); });
    // Explicit discard avoids losing text through an ambiguous Back control.
    button('BACK WITHOUT SAVING', () => this.close());
  }
  close() {
    const session = this.session, p = this.panel; this.session = null; p.notebookOpen = false;
    if (!session || p.destroyed || p.revision !== session.revision) return;
    p.root.replaceChildren(...session.nodes); p.root.scrollTop = session.scroll;
  }
  abandon() { this.session = null; this.panel.notebookOpen = false; }
}
