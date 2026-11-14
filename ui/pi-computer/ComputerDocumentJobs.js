import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  validateDocumentCatalog, getDocumentJobs, getDocumentJob, startDocumentJob,
  answerDocumentJob, deliverDocumentJob, ownsPrinter
} from '../../managers/PIDocumentJobsManager.js';
import { prepareDocumentPrinterAudio, playDocumentPrinterAudio } from './DocumentPrinterAudio.js';

export class ComputerDocumentJobs {
  constructor(shop) {
    this.shop = shop; this.ui = shop.ui;
    this.catalog = null; this.loading = null; this.error = ''; this.selectedId = null;
    this.page = 0; this.message = ''; this.confirmId = null;
    prepareDocumentPrinterAudio(this.ui.scene);
  }
  active() {
    const ui = this.ui;
    return !ui.destroyed && ui.isOpen && !ui.suspended && ui.app === 'office-documents';
  }
  redraw() { if (this.active()) this.ui.render(); }
  async load() {
    if (this.catalog) return;
    if (this.loading) return this.loading;
    this.error = '';
    this.loading = (async () => {
      try {
        const response = await fetch('assets/data/piDocumentJobs.json');
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        this.catalog = validateDocumentCatalog(await response.json());
      } catch (error) {
        this.error = __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_bcbaab87ef086569d9aa");
        console.error('[ComputerDocumentJobs]', error);
      } finally { this.loading = null; this.redraw(); }
    })();
    return this.loading;
  }
  deliver(id) {
    if (!this.active() || !this.ui.scene.sys.isActive()) return;
    const before = getDocumentJob(id);
    const freshPrint = before?.status === 'active' && before.corrected === true && before.timeCharged === true && !before.paid;
    const result = deliverDocumentJob(id);
    this.message = result.message;
    if (result.ok && freshPrint && getDocumentJob(id)?.status === 'completed') playDocumentPrinterAudio(this.ui);
    this.redraw();
  }
  render() {
    const ui = this.ui, d = ui.drawing;
    const box = this.shop.frame(__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_c6e18052920db0f07257"));
    const x = box.x + 22, y = box.y + 58, width = box.w - 44;
    d.button(x, y, 'SHOP', () => ui.openApp('office-shop'));
    d.text(x + 150, y + 8, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_de88a0830357e7779c83"), 20, '#263a47');
    if (!ownsPrinter()) {
      d.text(x, y + 80, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_739a833672c74aac918a"), 20, '#713d32'); return;
    }
    if (!this.catalog) {
      d.text(x, y + 80, this.error || __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_4e5c273b1818e282d128"), 18, '#713d32');
      if (this.error) d.button(x, y + 130, 'RETRY', () => { void this.load(); });
      return;
    }
    if (this.selectedId) {
      const job = getDocumentJob(this.selectedId);
      if (job) return this.renderJob(job, box, x, y, width);
      this.selectedId = null;
    }
    const jobs = getDocumentJobs(this.catalog);
    this.page = Math.max(0, Math.min(this.page, jobs.length - 1));
    const offer = jobs[this.page];
    d.text(x, y + 58,
      `${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_08c05eadf48e4cc48e7e")}${this.catalog.dailyLimit}${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_00a4051fc9285270e118")}${this.catalog.durationMinutes}${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_014f602d3c3122c4078f")}`,
      17, '#315539', width);
    d.text(x, y + 91, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_ab532d47eb9035a193e8"), 16, '#713d32');
    if (!offer) { d.text(x, y + 150, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_2481f1577adaab7cc557"), 20, '#263a47'); return; }
    d.bevel(x, y + 130, width, 230, 0xe9e6d7, true);
    d.text(x + 20, y + 150, offer.title, 25, '#263a47', width - 40);
    d.text(x + 20, y + 202, `${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_90e0569bfcc435494682")}${offer.reward}${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_415f61dbd610c63e0b87")}${offer.durationMinutes}${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_ec00cc07dc47e2189c33")}${offer.day}`, 18, '#315539');
    d.text(x + 20, y + 242, `${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_4889951f61342f41fcf0")}${offer.status}`, 17, '#474b42');
    const canStart = offer.status !== 'completed';
    const armed = this.confirmId === offer.id;
    d.button(x + 20, y + 296, offer.status === 'completed' ? 'PAID' :
      offer.status === 'available' ? (armed ? __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_9cd18851dec429409d56") : __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_d312f070ce8b76fa77c1")) : 'RESUME', () => {
        if (!this.active()) return;
        if (offer.status === 'available' && !armed) { this.confirmId = offer.id; ui.render(); return; }
        const result = startDocumentJob(this.catalog, offer.id);
        this.message = result.message; this.confirmId = null;
        if (result.ok || result.jobId) this.selectedId = result.jobId;
        this.redraw();
      }, canStart);
    if (armed) d.button(x + 270, y + 296, 'CANCEL', () => { this.confirmId = null; ui.render(); });
    d.button(x, y + 382, '<', () => { this.page--; this.confirmId = null; ui.render(); }, this.page > 0);
    d.text(x + 64, y + 390, `${this.page + 1} / ${jobs.length}`, 17, '#263a47');
    d.button(x + 170, y + 382, '>', () => { this.page++; this.confirmId = null; ui.render(); }, this.page + 1 < jobs.length);
    d.text(x, y + 442, this.message, 17, '#713d32', width);
  }
  renderJob(job, box, x, y, width) {
    const ui = this.ui, d = ui.drawing;
    d.text(x, y + 55, job.title, 24, '#263a47', width);
    d.text(x, y + 89, job.description, 16, '#474b42', width);
    const column = (width - 18) / 2, paperY = y + 138;
    ['ORIGINAL', __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_a726b6f44995aac6b819")].forEach((title, index) => {
      const left = x + index * (column + 18);
      d.rectangle(left, paperY, column, 165, index ? 0xe5e3d6 : 0xf7efda);
      d.pixel(left + 15, paperY + 16, title, 11, '#263a47');
      job.fields.forEach((field, row) => {
        d.text(left + 15, paperY + 52 + row * 33,
          `${field.label}: ${index ? field.draft : field.source}`, 18, '#263a47', column - 30);
      });
    });
    const answerY = paperY + 188;
    const act = callback => { if (!this.active()) return; const result = callback(); this.message = result.message; this.redraw(); };
    if (!job.timeCharged) {
      d.button(x, answerY, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_f96f782d8fd4a9d00035"), () => act(() => startDocumentJob(this.catalog, job.id)));
    } else if (job.status === 'completed') {
      d.text(x, answerY, `${__dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_c6c62454085d40977559")}${job.reward}`, 21, '#315539');
    } else if (job.corrected) {
      const button = d.button(x, answerY, job.status === 'paying' ? __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_82658ea6bcf0c2fbe3ad") : __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_005d8fb27faab3504cba"), () => {});
      // This physical action has its own effect, not a generic button click.
      button.removeAllListeners('pointerdown');
      button.on('pointerdown', () => {
        if (button.active === false || !button.scene) return;
        this.deliver(job.id);
      });
    } else {
      const field = job.fields.find(entry => entry.source !== entry.draft);
      const labels = job.fieldChecked ? field.options : job.fields.map(entry => entry.label);
      d.text(x, answerY - 8, job.fieldChecked ? __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_00ad4c30447de6b7f7b4") : __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_669d436ffe208e313315"), 18, '#315539');
      labels.forEach((label, index) => {
        const button = d.button(x + index * (width / 3), answerY + 26,
          label, () => act(() => answerDocumentJob(job.id, job.fieldChecked ? 'value' : 'field', index)));
        if (button.width > width / 3 - 8) button.setScale((width / 3 - 8) / button.width);
      });
    }
    d.text(x, y + 428, this.message, 17, '#713d32', width);
    d.button(x, box.y + box.h - 53, __dialogueText("ui/pi-computer/ComputerDocumentJobs.js", "t_6a7605d3eeb050d39142"), () => { this.selectedId = null; this.confirmId = null; ui.render(); });
  }
}
