import { installPIComputerApps } from './pi-computer/PIComputerApps.js';
import { installDeadMenWebUI } from '../managers/DeadMenWebIntegration.js';
import { ComputerDrawing } from './pi-computer/ComputerDrawing.js';
import { ComputerMonitor } from './pi-computer/ComputerMonitor.js';
import { ComputerDesktop } from './pi-computer/ComputerDesktop.js';
import { ComputerDocuments } from './pi-computer/ComputerDocuments.js';
import { ComputerLedger } from './pi-computer/ComputerLedger.js';
import { ComputerSearch } from './pi-computer/ComputerSearch.js';
import { PhotoPIQuest } from './pi-computer/PhotoPIQuest.js';
import { installComputerNotebook, ComputerMailNotifications } from './pi-computer/ComputerReedIntegration.js';
import { installOfficeShop } from './pi-computer/ComputerOfficeShop.js';
import { installBusinessPages } from './pi-computer/BusinessPageTemplate.js';
import { installCommonRoomPages } from './pi-computer/CommonRoomTemplate.js';
import { installNotebookContactActions } from './pi-computer/NotebookContactActions.js';
import { ComputerChat } from './pi-computer/ComputerChat.js';
import { ComputerThiefdoku } from './pi-computer/ComputerThiefdoku.js';

export class PIOfficeComputerUI {
 constructor(scene, options = {}) {
  Object.assign(this, {
   scene, options, isOpen: false, suspended: false, destroyed: false,
   app: 'desktop', selectedId: null, listPage: 0, bodyPage: 0,
   notice: '', accepting: false, layout: null, window: null, content: null,
   viewToken: 0, menuOpen: false, booting: false, bootStep: 0,
   bootLines: null, hasBooted: false, powerOn: false, jokeIndex: 0,
   fontsChecked: false, fontPromise: null, openGeneration: 0, pendingBootFrame: null
  });
  this.root = scene.add.container(0, 0).setDepth(1500).setVisible(false);
  this.drawing = new ComputerDrawing(this);
  this.monitor = new ComputerMonitor(this);
  this.desktop = new ComputerDesktop(this);
  this.documents = new ComputerDocuments(this);
  this.ledger = new ComputerLedger(this);
  this.search = new ComputerSearch(this);
  installCommonRoomPages(this);
  installBusinessPages(this);
  this.photoQuest = new PhotoPIQuest(this);
  installDeadMenWebUI(this);
  installComputerNotebook(this);
  this.mailNotifications = new ComputerMailNotifications(this);
  this.officeShop = installOfficeShop(this);
  this.notebookContactActions = installNotebookContactActions(this);
  this.audioApp = null;
  this.chatApp = new ComputerChat(this);
  this.thiefdoku = new ComputerThiefdoku(this);
  installPIComputerApps(this);
  this.onKey = event => {
   if (this.destroyed || !this.isOpen || this.suspended) return;
   const target = event.target;
   if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
   if (this.photoQuest.debugEditor.handleKey(event)) return;
   if (event.code !== 'Escape') return;
   event.preventDefault();
   if (this.booting) { this.cancelPendingBootStart(); this.monitor.finishBoot(); return; }
   if (this.menuOpen) { this.menuOpen = false; this.render(); return; }
   if (this.photoQuest.galleryViewer.active) { this.photoQuest.galleryViewer.close(); return; }
   if (this.photoQuest.contactMail.composing) { this.photoQuest.contactMail.closeComposer(); return; }
   if (this.app === 'photo') { this.photoQuest.returnToMail(); return; }
   if (this.notice && this.app === 'desktop') { this.notice = ''; this.render(); return; }
   if (this.app !== 'desktop') this.openApp('desktop'); else this.close();
  };
  this.onResize = () => { if (this.isOpen && !this.suspended && !this.destroyed) this.render(); };
  scene.input.keyboard?.on('keydown', this.onKey);
  scene.scale.on('resize', this.onResize);
  scene.events.once('shutdown', this.destroy, this);
  void this.photoQuest.load();
 }
 open() {
  if (this.destroyed || this.isOpen) return;
  this.cancelPendingBootStart();
  const boot = !this.options.skipBoot;
  const generation = ++this.openGeneration;
  Object.assign(this, {
   isOpen: true, suspended: false, app: 'desktop', selectedId: null,
   listPage: 0, bodyPage: 0, notice: '', menuOpen: false, booting: boot, powerOn: true
  });
  this.shell.reset();
  this.photoQuest.galleryViewer.active = false;
  this.photoQuest.contactMail.composing = false;
  this.viewToken++;
  if (boot) {
   this.monitor.startBoot(); this.monitor.stopBoot(); this.bootStep = 1;
  } else this.monitor.stopBoot();
  this.render(); this.root.setVisible(true); this.options.onOpen?.();
  const fonts = this.ensureFonts();
  if (boot) Promise.resolve(fonts).then(() => {
   if (!this.isBootSession(generation)) return;
   this.render(); this.startBootAfterPaint(generation);
  });
  void this.photoQuest.load();
 }
 isBootSession(generation) {
  return !this.destroyed && this.isOpen && !this.suspended && this.booting && this.openGeneration === generation;
 }
 cancelPendingBootStart() {
  const pending = this.pendingBootFrame;
  if (!pending) return;
  this.pendingBootFrame = null;
  pending.emitter?.off('postrender', pending.callback);
  pending.timer?.remove?.(false);
 }
 startBootAfterPaint(generation) {
  this.cancelPendingBootStart();
  if (!this.isBootSession(generation)) return;
  const emitter = this.scene.game?.events;
  const pending = { emitter, callback: null, timer: null };
  const begin = () => {
   if (this.pendingBootFrame !== pending) return;
   this.cancelPendingBootStart();
   if (!this.isBootSession(generation)) return;
   this.monitor.startBoot(); this.bootStep = 1; this.render();
  };
  pending.callback = begin; this.pendingBootFrame = pending;
  if (emitter?.once) emitter.once('postrender', begin);
  if (this.scene.time?.delayedCall) pending.timer = this.scene.time.delayedCall(250, begin);
  else if (!emitter?.once) begin();
 }
 close() {
  if (this.destroyed || !this.isOpen || this.suspended) return;
  this.cancelPendingBootStart(); this.openGeneration++;
  Object.assign(this, { isOpen: false, suspended: false, menuOpen: false, booting: false });
  this.photoQuest.debugEditor.enabled = false;
  this.photoQuest.galleryViewer.active = false;
  this.photoQuest.contactMail.composing = false;
  this.monitor.stopBoot(); this.monitor.clearFx(); this.viewToken++;
  this.root.setVisible(false); this.options.onClose?.();
 }
 suspend() {
  if (this.destroyed || !this.isOpen) return;
  this.cancelPendingBootStart(); this.openGeneration++;
  Object.assign(this, { suspended: true, menuOpen: false, booting: false });
  this.photoQuest.debugEditor.enabled = false;
  this.monitor.stopBoot(); this.monitor.clearFx(); this.viewToken++;
  this.root.setVisible(false);
 }
 resume() {
  if (this.destroyed || !this.isOpen) return;
  this.cancelPendingBootStart(); this.openGeneration++;
  Object.assign(this, { suspended: false, notice: '', menuOpen: false, booting: false, powerOn: false });
  this.viewToken++; this.root.setVisible(true); this.render();
 }
 openApp(app) {
  if (this.destroyed || !this.isOpen || this.suspended || this.booting) return;
  this.menuOpen = false;
  if (app === 'investigations') {
   this.launchExternal(this.options.onOpenInvestigations, 'The investigation board is currently unavailable.'); return;
  }
  if (app === 'travel') {
   this.launchExternal(this.options.onOpenWorldTravel, 'World travel is currently unavailable.'); return;
  }
  if (app === 'desktop') {
   this.shell.closeFocused(); this.viewToken++; this.render(); return;
  }
  if (!['mail', 'ledger', 'classifieds', 'search', 'audio', 'chat', 'thiefdoku'].includes(app)) return;
  this.photoQuest.galleryViewer.active = false;
  this.photoQuest.contactMail.composing = false;
  this.shell.open(app); this.viewToken++; this.render();
  if (app === 'search') void this.search.load();
  if (app === 'mail' || app === 'classifieds') void this.photoQuest.load();
 }
 launchExternal(callback, message) {
  if (typeof callback !== 'function') { this.notice = message; this.render(); return; }
  try {
   const result = callback();
   if (result?.catch) result.catch(error => this.handleExternalError(error, message));
  } catch (error) { this.handleExternalError(error, message); }
 }
 handleExternalError(error, message) {
  console.error('[PIOfficeComputerUI] Application failed:', error);
  if (this.destroyed || !this.isOpen) return;
  if (this.suspended) this.resume();
  this.notice = message; this.render();
 }
 ensureFonts() {
  if (this.fontPromise) return this.fontPromise;
  this.fontsChecked = true;
  if (typeof document === 'undefined' || !document.fonts) {
   this.fontPromise = Promise.resolve(); return this.fontPromise;
  }
  const specs = ['16px "Special Elite"', '10px "Press Start 2P"'];
  try {
   if (specs.every(spec => document.fonts.check(spec))) {
    this.fontPromise = Promise.resolve(); return this.fontPromise;
   }
  } catch (_) { this.fontPromise = Promise.resolve(); return this.fontPromise; }
  let loading;
  try { loading = Promise.all(specs.map(spec => document.fonts.load(spec))).catch(() => {}); }
  catch (_) { loading = Promise.resolve(); }
  loading.then(() => { if (!this.destroyed && this.isOpen && !this.suspended) this.render(); });
  this.fontPromise = new Promise(resolve => {
   let done = false;
   const finish = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
   const timer = setTimeout(finish, 2000); loading.then(finish);
  });
  return this.fontPromise;
 }
 money(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : 'Unknown';
 }
 render() { this.monitor.render(); }
 getMail() { return this.documents.getMail(); }
 getClassifieds() { return this.documents.getClassifieds(); }
 getLedger() { return this.ledger.getData(); }
 formatLedgerDate(value) { return this.ledger.formatDate(value); }
 addToContent(object) { return this.drawing.add(object); }
 text(...args) { return this.drawing.text(...args); }
 pixel(...args) { return this.drawing.pixel(...args); }
 rectangle(...args) { return this.drawing.rectangle(...args); }
 bevel(...args) { return this.drawing.bevel(...args); }
 button(...args) { return this.drawing.button(...args); }
 drawMonitorDetails() { return this.monitor.drawMonitorDetails(); }
 drawWallpaper() { return this.monitor.drawWallpaper(); }
 drawTaskbar() { return this.monitor.drawTaskbar(); }
 renderDesktop() { return this.desktop.render(); }
 createDesktopIcon(...args) { return this.desktop.createIcon(...args); }
 renderApplication() { return this.monitor.renderApplication(); }
 renderDocuments() { return this.documents.render(); }
 changeListPage(...args) { return this.documents.changeListPage(...args); }
 renderPagedText(...args) { return this.documents.renderPagedText(...args); }
 renderLedger() { return this.ledger.render(); }
 async acceptMission(advert) {
  if (this.accepting || this.destroyed || !this.isOpen || this.suspended ||
   this.app !== 'classifieds' || typeof this.options.onAcceptMission !== 'function' || !advert?.missionId) return;
  const token = this.viewToken, id = advert.id;
  this.accepting = true; this.notice = ''; this.render();
  let message = '', accepted = false;
  try {
   const result = await this.options.onAcceptMission(advert);
   accepted = result?.ok === true;
   message = accepted ? result.message || 'Case accepted.' : result?.message || 'This case could not be accepted.';
   message = String(message).replace(/\bJob\b/g, 'Case').replace(/\bjob\b/g, 'case');
   if (accepted && !this.destroyed) {
    try { this.documents.alibiAdvertEmailFlow?.onAccepted?.(advert); }
    catch (error) { console.error('[PIOfficeComputerUI] Contact preservation failed:', error); }
   }
  } catch (error) {
   console.error('[PIOfficeComputerUI] Accept case failed:', error);
   message = 'Could not accept this case. Please try again.';
  } finally {
   this.accepting = false;
   if (!this.destroyed && this.isOpen && !this.suspended) {
    if (token === this.viewToken && this.app === 'classifieds') {
     if (accepted) {
      if (this.selectedId === id) {
       this.documents.artworkUI.zoom = null; this.selectedId = null; this.bodyPage = 0;
      }
      this.notice = message;
     } else if (this.selectedId === id) this.notice = message;
    }
    this.render();
   }
  }
 }
 destroy() {
  if (this.destroyed) return;
  this.cancelPendingBootStart(); this.openGeneration++;
  this.notebookContactActions?.destroy();
  this.suspended = false; this.close(); this.destroyed = true;
  this.mailNotifications.destroy(); this.photoQuest.destroy(); this.search.destroy(); this.shell?.destroy();
  this.viewToken++; this.monitor.stopBoot(); this.monitor.clearFx();
  this.scene.input.keyboard?.off('keydown', this.onKey);
  this.scene.scale.off('resize', this.onResize);
  this.scene.events.off('shutdown', this.destroy, this);
  this.chatApp?.destroy(); this.thiefdoku?.destroy();
  this.root?.destroy(true); this.root = null; this.content = null; this.layout = null; this.window = null;
 }
}