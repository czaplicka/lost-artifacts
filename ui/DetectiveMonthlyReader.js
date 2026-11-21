import { monthlyIssue, monthlySession, hasMonthly, currentMonthlyRecord,
  markMonthlyRead, prepareMonthlyDiscussion, completeMonthlyDiscussion } from '../managers/DetectiveMonthlyService.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { EventBus } from '../EventBus.js';
import { LiveDialogUI } from './LiveDialogUI.js';
import { storageRoomDialogues } from '../storageRoomDialogueService.js';

let active = null;
export function resolveMonthlyScene(owner) {
  const game = owner?.game, key = game?.registry?.get('currentSceneKey');
  const scene = game?.scene?.keys?.[key];
  return scene?.sys?.isActive() ? scene : null;
}
export function alexMonthlyAccess(scene) {
  if (scene?.sys?.settings?.key !== 'AgencyStorageScene') return 'Visit Alex in the Mark Agency Storage Room to discuss this issue.';
  if (!scene.isCurrent?.() || scene.isLeaving || scene._conversationOpen || scene._preparing || scene._finishing || scene._timelineOpen || scene.storageDialog?.isOpen || !scene.storageHud?.isHudReady || !scene.manualTemplate || !scene.hasInventoryItem?.(scene.manualTemplate.id)) return 'Let Alex finish his current business first.';
  return null;
}
export function startAlexMonthlyDiscussion(scene, articleId) {
  const blocked = alexMonthlyAccess(scene);
  if (blocked) throw Error(blocked);
  const plan = prepareMonthlyDiscussion(articleId), session = monthlySession(), token = scene._storageRunToken;
  const nodes = [scene.backButton, scene.retryButton, scene.timelineButton, scene.statusText].filter(Boolean).map(node => [node, node.visible]);
  const sources = [...new Set([scene, scene.storageHud])];
  const events = ['shutdown', 'sleep', 'pause', 'destroy'];
  let dialog = null, ended = false;
  const current = () => scene.isCurrent?.(token) && monthlySession() === session;
  const finish = completed => {
    if (ended) return;
    ended = true;
    for (const source of sources) for (const event of events) source.events.off(event, abort);
    EventBus.off('gameState:restored', abort); EventBus.off('mainStory:reset', abort);
    let message = '';
    if (completed && current()) {
      try {
        const result = completeMonthlyDiscussion(plan.articleId);
        message = result.changed ? result.delta ? 'Alex appreciates that you noticed his work.' : 'Alex will remember your conversation.' : 'Alex remembers your last conversation.';
      } catch (error) { message = error.message; }
    }
    dialog?.destroy();
    if (scene._storageRunToken === token) {
      scene._conversationOpen = false;
      if (!scene._storageDisposed) for (const [node, visible] of nodes) if (node.active) node.setVisible(visible);
    }
    if (current()) { scene.refreshTimelineButton?.(); if (message) scene.showStatus?.(message); }
  };
  const abort = () => finish(false);
  scene._conversationOpen = true;
  for (const [node] of nodes) node.setVisible(false);
  for (const source of sources) for (const event of events) source.events.on(event, abort);
  EventBus.on('gameState:restored', abort); EventBus.on('mainStory:reset', abort);
  try {
    scene.showStorageHud?.();
    dialog = new LiveDialogUI(scene.storageHud);
    if (dialog.open({ speaker: storageRoomDialogues.speaker, portraitKey: 'portrait_magazine', lines: plan.lines }, { onClose: () => finish(true) }) === false) throw Error('Alex cannot talk right now.');
  } catch (error) { finish(false); throw error; }
}
export function openDetectiveMonthly(owner) {
  if (!hasMonthly()) throw Error('You no longer have Detective Monthly.');
  if (!owner?.game) throw Error('Open the magazine from your inventory.');
  if (active) { active.focus(); return; }
  const session = monthlySession(), scene = resolveMonthlyScene(owner), game = owner.game;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Detective Monthly'); dialog.tabIndex = -1;
  dialog.style.cssText = 'box-sizing:border-box;width:min(880px,94vw);max-height:90vh;overflow:auto;padding:24px;border:3px solid #ad8847;background:#eee1bd;color:#30271e;box-shadow:8px 12px 0 #0007;font:19px/1.5 SpecialElite,serif;';
  const previousInput = game.input.enabled, sources = [...new Set([owner, scene].filter(Boolean))];
  const events = ['shutdown', 'sleep', 'pause', 'destroy'];
  let closed = false, selectedId = monthlyIssue.articles[0].id;
  const element = (tag, text, parent) => { const node = document.createElement(tag); if (text != null) node.textContent = text; parent?.appendChild(node); return node; };
  const button = (text, parent, action) => {
    const node = element('button', text, parent); node.type = 'button';
    node.style.cssText = 'font:16px SpecialElite,serif;padding:10px 14px;background:#234851;color:#fff1ca;border:2px solid #94723b;cursor:pointer;';
    node.addEventListener('click', action); return node;
  };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', keys, true); document.removeEventListener('keyup', keys, true);
    for (const source of sources) for (const event of events) source.events.off(event, close);
    EventBus.off('gameState:restored', close); EventBus.off('mainStory:reset', close); game.events.off('destroy', close);
    if (game.input) game.input.enabled = previousInput;
    if (active === dialog) active = null;
    if (dialog.open) dialog.close(); dialog.remove();
  }
  function assertCurrent() {
    if (closed || monthlySession() !== session || resolveMonthlyScene(owner) !== scene) { close(); throw Error('Your active game changed. Reopen the magazine.'); }
    if (!hasMonthly()) throw Error('You no longer have the magazine.');
  }
  function keys(event) {
    if (closed) return;
    event.stopImmediatePropagation();
    if (event.type === 'keydown' && event.key === 'Escape') { event.preventDefault(); close(); }
  }
  const header = element('header', null, dialog);
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid #8e744b;padding-bottom:12px;';
  const title = element('h1', monthlyIssue.title, header); title.style.cssText = 'font:clamp(14px,3vw,24px)/1.7 PressStart2P,monospace;color:#612d25;';
  button('CLOSE', header, close); element('p', monthlyIssue.subtitle, dialog);
  const nav = element('nav', null, dialog); nav.setAttribute('aria-label', 'Articles');
  nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
  const body = element('article', null, dialog);
  const notice = element('p', '', dialog); notice.setAttribute('role', 'status'); notice.style.color = '#703725';
  const footer = element('footer', null, dialog); footer.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid #8e744b;padding-top:15px;';
  const read = button('MARK AS READ', footer, () => {
    try { assertCurrent(); markMonthlyRead(selectedId); render(); notice.textContent = 'Read. You can discuss this article with Alex in Storage.'; }
    catch (error) { notice.textContent = error.message; }
  });
  const talk = button('DISCUSS WITH ALEX', footer, () => {
    try {
      assertCurrent();
      const blocked = alexMonthlyAccess(scene); if (blocked) throw Error(blocked);
      const record = currentMonthlyRecord(), id = record.alex?.articleId || selectedId;
      prepareMonthlyDiscussion(id); close(); startAlexMonthlyDiscussion(scene, id);
    } catch (error) { if (!closed) notice.textContent = error.message; else if (scene?.isCurrent?.()) scene.showStatus?.(error.message); }
  });
  const hint = element('p', '', dialog);
  function render() {
    assertCurrent();
    const article = monthlyIssue.articles.find(a => a.id === selectedId), record = currentMonthlyRecord();
    body.replaceChildren(); element('h2', article.title, body);
    element('p', article.deck, body).style.fontStyle = 'italic';
    for (const text of article.paragraphs) element('p', text, body);
    nav.querySelectorAll('button').forEach(node => {
      if (node.dataset.article === selectedId) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
    });
    read.disabled = record.read.includes(selectedId); read.textContent = read.disabled ? 'READ' : 'MARK AS READ';
    const blocked = alexMonthlyAccess(scene);
    talk.disabled = Boolean(blocked) || (!record.alex && !record.read.includes(selectedId));
    for (const node of [read, talk]) { node.style.opacity = node.disabled ? '.5' : '1'; node.style.cursor = node.disabled ? 'default' : 'pointer'; }
    talk.textContent = record.alex ? 'RECALL YOUR CHAT WITH ALEX' : article.prompt;
    hint.textContent = blocked || (record.alex ? 'Alex remembers your chosen topic. Repeating it gives no extra trust.' : 'Choose your topic: one conversation with Alex per issue. Reading alone changes no relationship. The magazine stays with you.');
    notice.textContent = '';
  }
  try {
    for (const article of monthlyIssue.articles) {
      const node = button(article.title, nav, () => { try { selectedId = article.id; render(); } catch (error) { notice.textContent = error.message; } });
      node.dataset.article = article.id;
    }
    render(); document.body.appendChild(dialog); active = dialog;
    inventoryManager.close(); game.input.enabled = false;
    for (const source of sources) for (const event of events) source.events.on(event, close);
    EventBus.on('gameState:restored', close); EventBus.on('mainStory:reset', close); game.events.on('destroy', close);
    document.addEventListener('keydown', keys, true); document.addEventListener('keyup', keys, true);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }); dialog.addEventListener('close', close);
    dialog.showModal(); dialog.focus();
  } catch (error) { close(); throw error; }
}
