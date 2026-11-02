import { ForensicHelpController } from '../CSI/ForensicHelpController.js';
import { EventBus } from '../../EventBus.js';

// Reuse the existing payment, integrity, purchase-history and receipt logic.
export class TimelineHelpController extends ForensicHelpController {
  create() {
    if (this.destroyed || this.created) return;
    this.created = true;
    this.hintButton = this.scene.button(930, 972, 'HINT', () => this.open(false));
    this.buttons.push(this.hintButton);
    EventBus.on('hints:changed', this.boundRefresh);
    this.scene.events.on('update', this.boundUpdate);
    this.scene.events.once('shutdown', this.boundDestroy);
    this.scene.events.once('destroy', this.boundDestroy);
    this.scene.scale.on('resize', this.handleResize, this);
    this.refresh();
  }

  refresh() {
    if (this.scene.preview) {
      if (this.hintButton?.active) this.hintButton.setText('HINT / TEST');
      return;
    }
    super.refresh();
  }

  receipt(definition) {
    return this.scene.preview ? null : super.receipt(definition);
  }

  open(instructions = false) {
    if (!this.scene.preview) return super.open(instructions);
    if (this.modal || this.busy || this.destroyed || this.scene.finished) return;
    const definition = this.definition();
    if (!definition) return;
    this.pause();
    this.panel('PREVIEW HINT — NO COST', definition.text);
    this.makeButton(0, 215, 'BACK TO TIMELINE', () => {
      this.close();
      this.showEffect(definition, { text: definition.text });
    }, this.modal);
  }

  panel(title, body) {
    const titles = {
      'LAB ASSISTANCE': 'INVESTIGATION ASSISTANCE',
      'LAB HINT': 'TIMELINE HINT'
    };
    if (title === 'LAB ASSISTANCE') {
      body = 'One hint helps with the current reconstruction step.\nPurchased hints can be reviewed for free.';
    }
    return super.panel(titles[title] || title, body);
  }

  makeButton(x, y, label, callback, parent = null, enabled = true) {
    label = label.replace('ASK LAB TECHNICIAN', 'ASK AGENCY ANALYST')
      .replace('BACK TO ANALYSIS', 'BACK TO TIMELINE');
    if (label.startsWith('CUT CORNERS')) label += '\nIntegrity -1';
    if (label.startsWith('ASK AGENCY ANALYST')) label += '\nIntegrity +1';
    return super.makeButton(x, y, label, callback, parent, enabled);
  }

  handleResize() {
    if (this.modal && !this.busy) this.close();
  }

  destroy() {
    if (this.destroyed) return;
    this.scene.scale.off('resize', this.handleResize, this);
    super.destroy();
  }
}
