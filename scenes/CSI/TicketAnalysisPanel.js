// Compatibility filename/class: this is now a dialogue extension, not a screen button.
import { EventBus } from '../../EventBus.js';
import { analyseCaseTicket, findCaseTicket, getTicketAnalysis } from '../../managers/TicketAnalysisService.js';
import { hasVisitedApartment } from '../../managers/ApartmentVisitRegistry.js';

export class TicketAnalysisPanel {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = false;
    this.terminal = null;
    this.handleInventoryChanged = () => this.refresh();
  }

  get isOpen() {
    const dialog = this.scene?.assistantDialog;
    return Boolean(dialog?.isOpen() && String(dialog.currentNodeId || '').startsWith('__ticket_'));
  }

  isAvailable() {
    if (this.destroyed || !this.scene || !hasVisitedApartment(this.scene.gameState)) return false;
    return getTicketAnalysis(this.scene.gameState)?.completed === true || Boolean(findCaseTicket(this.scene.gameState));
  }

  create() {
    if (this.destroyed) return;
    if (this.scene.assistantDialog) this.scene.assistantDialog.extension = this;
    EventBus.on('inventoryUpdated', this.handleInventoryChanged, this);
    this.refresh();
  }

  augmentChoices(dialog, choices) {
    if (!this.isAvailable()) return choices;
    const root = dialog.dialogue?.defaultNodeId;
    if (dialog.currentNodeId !== root && dialog.currentNodeId !== 'greeting') return choices;
    const done = getTicketAnalysis(this.scene.gameState)?.completed === true;
    return [{
      text: done ? 'What was the code on that ticket again?' : 'I found a damaged ticket in the apartment. Can you examine it?',
      action: 'analyse_apartment_ticket'
    }, ...choices];
  }

  handleChoice(choice, dialog) {
    if (choice.action !== 'analyse_apartment_ticket') return false;
    // Recheck eligibility at selection time, not only when drawing choices.
    if (!this.isAvailable()) { dialog.renderCurrentNode(); return true; }
    const response = analyseCaseTicket(this.scene.cache.json.get('locations'), { state: this.scene.gameState });
    this.scene.hud?.refreshFromScene();
    const returnNode = dialog.currentNodeId;
    const speaker = this.scene.labOnboarding?.assistantPresent ? 'LAB ASSISTANT' : 'DOCUMENT TERMINAL';
    const text = response.ok
      ? `The destination code is ${response.result.airportCode}.\n\n` +
        'The ink survived. The passenger\'s travel plans did not.\n' +
        'I have recorded the code in your notebook. You can follow the trail when you are ready.'
      : response.message;
    dialog.dialogue.nodes.__ticket_result = {
      speaker, text, choices: [
        { text: 'Back to my other questions.', next: returnNode },
        { text: 'Thanks. I will take it from here.', action: 'close' }
      ]
    };
    dialog.currentNodeId = '__ticket_result';
    dialog.choicePage = 0;
    dialog.renderCurrentNode();
    return true;
  }

  createTerminal() {
    if (this.terminal || this.destroyed) return;
    // When the assistant has disappeared, the same interaction area opens a
    // document-terminal dialogue. No new visible button, NPC or artwork is added.
    this.terminal = this.scene.add.zone(220, 340, 230, 410).setOrigin(0, 0)
      .setDepth(50).setInteractive({ useHandCursor: true });
    this.terminal.on('pointerover', () => {
      if (!this.scene.uiLocked) this.scene.showNavHint('Use document terminal');
    });
    this.terminal.on('pointerout', () => this.scene.hideNavHint());
    this.terminal.on('pointerdown', () => this.openTerminalDialogue());
  }

  openTerminalDialogue() {
    const scene = this.scene;
    if (!this.isAvailable() || scene.uiLocked || scene.isExitingLab || scene.assistantDialog?.isOpen() || !scene.sys.isActive()) return;
    const opened = scene.assistantDialog.open({
      dialogue: {
        id: 'document_terminal', defaultNodeId: 'greeting', nodes: {
          greeting: {
            speaker: 'DOCUMENT TERMINAL', text: 'Document examination terminal. Coffee stains are not a valid security clearance.',
            choices: [{ text: 'Leave the terminal.', action: 'close' }]
          }
        }
      },
      onClose: () => { if (!scene.isExitingLab) scene.applyLock(false); }
    });
    if (opened) scene.applyLock(true);
  }

  refresh() {
    if (this.destroyed) return;
    if (this.scene.assistantDialog) this.scene.assistantDialog.extension = this;
    const needsTerminal = !this.scene.labOnboarding?.assistantPresent && this.isAvailable();
    if (needsTerminal) this.createTerminal();
    if (this.terminal) {
      const visible = needsTerminal && this.scene.currentView === 'lab_intro';
      this.terminal.setVisible(visible);
      if (this.terminal.input) this.terminal.input.enabled = visible && !this.scene.uiLocked && !this.scene.isExitingLab;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    EventBus.off('inventoryUpdated', this.handleInventoryChanged, this);
    if (this.scene?.assistantDialog?.extension === this) this.scene.assistantDialog.extension = null;
    this.terminal?.removeAllListeners(); this.terminal?.destroy();
    this.terminal = null; this.scene = null;
  }
}
