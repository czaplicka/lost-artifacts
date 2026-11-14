import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const INSTALLED = Symbol('notebook-word-bank-toggle');
let nextId = 0;

const CSS = `${__dialogueText("ui/NotebookWordBankToggle.js", "t_13447fd3d47046648852")}`;

export function installNotebookWordBankToggle(ui, notebook, previousRoots = new Set()) {
  if (!notebook || notebook[INSTALLED]) return notebook?.[INSTALLED] || null;
  const roots = [...document.querySelectorAll(__dialogueText("ui/NotebookWordBankToggle.js", "t_ac41b924aa2755fb032c"))];
  const root = roots.find(node => !previousRoots.has(node)) ||
    (roots.length === 1 ? roots[0] : null);
  if (!root) return null;

  const state = ui.state || gameState;
  let hidden = state.playerCloudViewV1?.wordBankHidden === true;
  let dead = false;
  const bankId = `pcn-word-bank-${++nextId}`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pcn-bank-toggle';
  toggle.setAttribute('aria-controls', bankId);

  function sync() {
    if (dead) return;
    const top = root.querySelector(__dialogueText("ui/NotebookWordBankToggle.js", "t_9ee8898a5a3f008070a5"));
    const bank = root.querySelector(__dialogueText("ui/NotebookWordBankToggle.js", "t_49bd80dd3ae04b3cf345"));
    root.classList.toggle('pcn-bank-hidden', hidden);
    if (bank && bank.id !== bankId) bank.id = bankId;
    const label = hidden ? __dialogueText("ui/NotebookWordBankToggle.js", "t_d531b1ee18e36f2b0885") : __dialogueText("ui/NotebookWordBankToggle.js", "t_a8e5b2188d477b018f37");
    if (toggle.textContent !== label) toggle.textContent = label;
    toggle.title = hidden
      ? __dialogueText("ui/NotebookWordBankToggle.js", "t_54ca4f030eda26462824")
      : __dialogueText("ui/NotebookWordBankToggle.js", "t_99bbc6320150bcde46ac");
    toggle.setAttribute('aria-expanded', String(!hidden));
    toggle.hidden = !bank;
    if (top && toggle.parentNode !== top) top.append(toggle);
  }

  function setHidden(value) {
    if (dead || ui.destroyed) return;
    hidden = Boolean(value);
    state.playerCloudViewV1 = {
      ...(state.playerCloudViewV1 || {}),
      wordBankHidden: hidden
    };
    sync();
    requestAutosave();
  }

  function onClick(event) {
    event.stopPropagation();
    setHidden(!hidden);
  }
  toggle.addEventListener('click', onClick);

  // The notebook rebuilds its header on draw; reattach the same button.
  const observer = new MutationObserver(sync);
  observer.observe(root, {childList:true, subtree:true});
  const originalDestroy = notebook.destroy;
  function cleanup() {
    if (dead) return;
    dead = true;
    observer.disconnect();
    toggle.removeEventListener('click', onClick);
    toggle.remove();
    style.remove();
    root.classList.remove('pcn-bank-hidden');
    if (notebook.destroy === wrappedDestroy) notebook.destroy = originalDestroy;
    if (notebook[INSTALLED] === api) delete notebook[INSTALLED];
    ui.scene?.events?.off('shutdown', cleanup);
    ui.scene?.events?.off('destroy', cleanup);
  }
  function wrappedDestroy(...args) {
    cleanup();
    return originalDestroy?.apply(this, args);
  }
  const api = {setHidden, get hidden(){return hidden;}, destroy:cleanup};
  notebook[INSTALLED] = api;
  if (typeof originalDestroy === 'function') notebook.destroy = wrappedDestroy;
  ui.scene?.events?.once('shutdown', cleanup);
  ui.scene?.events?.once('destroy', cleanup);
  sync();
  return api;
}
