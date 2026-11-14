import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const INSTALLED = Symbol('notebook-word-bank-toggle');
let nextId = 0;

const CSS = `
.pcn.pcn-bank-hidden .pcn-work{
  grid-template-columns:minmax(0,1fr)!important;
  grid-template-rows:minmax(0,1fr)!important;
}
.pcn.pcn-bank-hidden .pcn-work > .pcn-bank{display:none!important}
.pcn.pcn-bank-hidden .pcn-board{width:100%;min-width:0}
.pcn .pcn-bank-toggle{font-size:.7em;white-space:nowrap}
.pcn .pcn-bank-toggle:focus-visible{outline:2px solid var(--red);outline-offset:2px}
@media(max-width:650px){
  .pcn .pcn-bank-toggle{font-size:.65em;padding:.35em .55em}
}
`;

export function installNotebookWordBankToggle(ui, notebook, previousRoots = new Set()) {
  if (!notebook || notebook[INSTALLED]) return notebook?.[INSTALLED] || null;
  const roots = [...document.querySelectorAll('.pcn')];
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
    const top = root.querySelector('.pcn-top');
    const bank = root.querySelector('.pcn-bank');
    root.classList.toggle('pcn-bank-hidden', hidden);
    if (bank && bank.id !== bankId) bank.id = bankId;
    const label = hidden ? 'SHOW WORD LIST' : 'HIDE WORD LIST';
    if (toggle.textContent !== label) toggle.textContent = label;
    toggle.title = hidden
      ? 'Show the collected-word list beside the keyword clouds'
      : 'Hide the collected-word list and use the full width for keyword clouds';
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
