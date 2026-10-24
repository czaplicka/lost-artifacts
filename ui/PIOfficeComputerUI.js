// ui/PIOfficeComputerUI.js
import { ComputerDrawing } from './pi-computer/ComputerDrawing.js';
import { ComputerMonitor } from './pi-computer/ComputerMonitor.js';
import { ComputerDesktop } from './pi-computer/ComputerDesktop.js';
import { ComputerDocuments } from './pi-computer/ComputerDocuments.js';
import { ComputerLedger } from './pi-computer/ComputerLedger.js';

export class PIOfficeComputerUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.isOpen = false;
    this.suspended = false;
    this.destroyed = false;
    this.app = 'desktop';
    this.selectedId = null;
    this.listPage = 0;
    this.bodyPage = 0;
    this.notice = '';
    this.accepting = false;
    this.layout = null;
    this.window = null;
    this.content = null;
    this.viewToken = 0;
    this.root = scene.add.container(0, 0).setDepth(1500).setVisible(false);

    this.drawing = new ComputerDrawing(this);
    this.monitor = new ComputerMonitor(this);
    this.desktop = new ComputerDesktop(this);
    this.documents = new ComputerDocuments(this);
    this.ledger = new ComputerLedger(this);

    this.onKey = event => {
      if (this.destroyed || !this.isOpen || this.suspended) return;
      const target = event.target;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      if (event.code !== 'Escape') return;
      event.preventDefault();
      if (this.app !== 'desktop') this.openApp('desktop');
      else this.close();
    };
    this.onResize = () => {
      if (this.isOpen && !this.suspended && !this.destroyed) this.render();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', this.destroy, this);
  }

  open() {
    if (this.destroyed || this.isOpen) return;
    this.isOpen = true;
    this.suspended = false;
    this.app = 'desktop';
    this.selectedId = null;
    this.listPage = 0;
    this.bodyPage = 0;
    this.notice = '';
    this.viewToken += 1;
    this.root.setVisible(true);
    this.options.onOpen?.();
    this.render();
  }

  close() {
    if (this.destroyed || !this.isOpen || this.suspended) return;
    this.isOpen = false;
    this.suspended = false;
    this.viewToken += 1;
    this.root.setVisible(false);
    this.options.onClose?.();
  }

  suspend() {
    if (this.destroyed || !this.isOpen) return;
    this.suspended = true;
    this.viewToken += 1;
    this.root.setVisible(false);
  }

  resume() {
    if (this.destroyed || !this.isOpen) return;
    this.suspended = false;
    this.app = 'desktop';
    this.notice = '';
    this.viewToken += 1;
    this.root.setVisible(true);
    this.render();
  }

  openApp(app) {
    if (this.destroyed || !this.isOpen || this.suspended) return;
    if (app === 'investigations') {
      this.launchExternal(this.options.onOpenInvestigations, 'The investigation board is currently unavailable.');
      return;
    }
    if (app === 'travel') {
      this.launchExternal(this.options.onOpenWorldTravel, 'World travel is currently unavailable.');
      return;
    }
    if (!['desktop', 'mail', 'ledger', 'classifieds'].includes(app)) return;
    this.app = app;
    this.selectedId = null;
    this.listPage = 0;
    this.bodyPage = 0;
    this.notice = '';
    this.viewToken += 1;
    this.render();
  }

  launchExternal(callback, unavailableMessage) {
    if (typeof callback !== 'function') {
      this.notice = unavailableMessage;
      this.render();
      return;
    }
    try {
      const result = callback();
      if (result?.catch) result.catch(error => this.handleExternalError(error, unavailableMessage));
    } catch (error) {
      this.handleExternalError(error, unavailableMessage);
    }
  }

  handleExternalError(error, message) {
    console.error('[PIOfficeComputerUI] Application failed:', error);
    if (this.destroyed || !this.isOpen) return;
    if (this.suspended) this.resume();
    this.notice = message;
    this.render();
  }

  money(value) {
    if (!Number.isFinite(value)) return 'Unknown';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  render() { this.monitor.render(); }

  // Compatibility with the previous public methods.
  getMail() { return this.documents.getMail(); }
  getClassifieds() { return this.documents.getClassifieds(); }
  getLedger() { return this.ledger.getData(); }
  formatLedgerDate(value) { return this.ledger.formatDate(value); }
  addToContent(object) { return this.drawing.add(object); }
  text(...args) { return this.drawing.text(...args); }
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
    const token = this.viewToken;
    const advertId = advert.id;
    this.accepting = true;
    this.notice = '';
    this.render();
    let message = '';
    try {
      const result = await this.options.onAcceptMission(advert);
      message = result?.ok ? result.message || 'Job accepted.'
        : result?.message || 'This job could not be accepted.';
    } catch (error) {
      console.error('[PIOfficeComputerUI] Accept job failed:', error);
      message = 'Could not accept this job. Please try again.';
    } finally {
      this.accepting = false;
      if (!this.destroyed && this.isOpen && !this.suspended) {
        if (token === this.viewToken && this.app === 'classifieds' && this.selectedId === advertId) this.notice = message;
        this.render();
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.suspended = false;
    this.close();
    this.destroyed = true;
    this.viewToken += 1;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.scale.off('resize', this.onResize);
    this.scene.events.off('shutdown', this.destroy, this);
    this.root?.destroy(true);
    this.root = null;
    this.content = null;
    this.layout = null;
    this.window = null;
  }
}
