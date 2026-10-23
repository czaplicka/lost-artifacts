// ui/PICrimeBoardUI.js

import { CrimeBoardUI } from './CrimeBoardUI.js';
import { CrimeBoard } from '../CrimeBoard.js';
import { EventBus } from '../EventBus.js';

import {
  registerPICase,
  getPICase,
  getPICases,
  getSelectedPICaseId,
  selectPICase,
  savePIBoard
} from '../managers/PIInvestigationManager.js';

const EDITOR_IDS = {
  formId: 'crime-board-form',
  emptyStateId: 'crime-board-empty-state',
  fieldsWrapId: 'crime-board-fields',
  dynamicFieldsId: 'crime-board-type-fields',
  jsonOutputId: 'board-json-output',
  saveBtnId: 'board-save-btn',
  loadBtnId: 'board-load-btn',
  applyBtnId: 'crime-board-apply-btn',
  deleteBtnId: 'crime-board-delete-btn',
  addPhotoBtnId: 'add-photo-btn',
  addNoteBtnId: 'add-note-btn',
  addEvidenceBtnId: 'add-evidence-btn',
  linksListId: 'crime-board-links-list',
  linksEmptyId: 'crime-board-links-empty',
  verifyMotiveBtnId: 'crime-board-verify-motive-btn'
};

export class PICrimeBoardUI extends CrimeBoardUI {
  constructor(scene, options = {}) {
    super(scene);

    this.piOptions = options;
    this.caseId = null;
    this.mode = 'main';
    this.template = null;
    this.mount = null;
    this.message = null;

    this.overlay.classList.add('pi-crime-board-ui');

    this.boundShutdown = () => this.destroy();

    scene.events.once('shutdown', this.boundShutdown);
  }

  canOpen() {
    return Boolean(
      !this.isDestroyed &&
      this.scene?.sys?.isActive() &&
      this.scene.sys.settings.key === 'DetectiveOfficeScene'
    );
  }

  async open() {
    if (!this.canOpen()) return false;
    if (this.isOpen) return true;

    // Do not mount two crimeboard workspaces simultaneously.
    const otherBoard = document.querySelector(
      '.crime-board-ui-overlay.is-open'
    );

    if (otherBoard && otherBoard !== this.overlay) {
      return false;
    }

    const token = ++this._openToken;

    this.isOpen = true;
    this.overlay.classList.add('is-open');
    this.root.textContent = 'Loading private investigations...';

    this.disableUnderlyingScenesInput();

    document.addEventListener(
      'keydown',
      this.boundEscHandler
    );

    this._hudHidden = true;
    EventBus.emit('hideHUD');

    this.piOptions.onOpen?.();

    try {
      this.template = await this.loadTemplate();

      if (
        this.isDestroyed ||
        !this.isOpen ||
        token !== this._openToken
      ) {
        return false;
      }

      const definitions =
        this.scene.cache.json.get('piCases');

      const mainDefinition = definitions?.cases?.find(
        item => item.id === definitions.mainCaseId
      );

      if (!mainDefinition) {
        throw new Error('The PI main case definition is missing.');
      }

      registerPICase(mainDefinition);

      this.buildWorkspace();

      const selected = getPICase(getSelectedPICaseId());
      const initial = selected || getPICase(mainDefinition.id);

      this.mode = initial.kind;
      this.switchCase(initial.id);

      return true;
    } catch (error) {
      console.error('[PICrimeBoardUI] Open failed:', error);

      if (
        !this.isDestroyed &&
        token === this._openToken
      ) {
        this.close();
      }

      return false;
    }
  }

  buildWorkspace() {
    this.root.replaceChildren();

    const header = document.createElement('div');
    header.className = 'pi-board-header';

    const title = document.createElement('h2');
    title.textContent = 'PRIVATE INVESTIGATIONS';

    const mainButton = document.createElement('button');
    mainButton.type = 'button';
    mainButton.textContent = 'Main Case';
    mainButton.onclick = () => this.switchMode('main');

    const sideButton = document.createElement('button');
    sideButton.type = 'button';
    sideButton.textContent = 'Side Cases';
    sideButton.onclick = () => this.switchMode('side');

    this.caseSelect = document.createElement('select');
    this.caseSelect.setAttribute(
      'aria-label',
      'Select private investigation'
    );

    this.caseSelect.onchange = () => {
      this.switchCase(this.caseSelect.value);
    };

    this.message = document.createElement('p');
    this.message.className = 'pi-board-message';

    this.mount = document.createElement('div');
    this.mount.className = 'pi-board-workspace';

    header.append(
      title,
      mainButton,
      sideButton,
      this.caseSelect
    );

    this.root.append(header, this.message, this.mount);

    this.mainButton = mainButton;
    this.sideButton = sideButton;
  }

  switchMode(mode) {
    const cases = getPICases().filter(
      investigation => investigation.kind === mode
    );

    this.mode = mode;

    if (cases.length) {
      this.switchCase(cases[0].id);
      return;
    }

    this.saveToGameState();
    this.disposeBoard();

    this.caseId = null;
    this.mount.replaceChildren();

    this.refreshSelector();

    this.message.textContent =
      'No side investigations require a crime board yet.';
  }

  refreshSelector() {
    const cases = getPICases().filter(
      investigation => investigation.kind === this.mode
    );

    this.caseSelect.replaceChildren();

    for (const investigation of cases) {
      const option = document.createElement('option');

      option.value = investigation.id;
      option.textContent =
        investigation.title +
        (investigation.status === 'completed'
          ? ' — Completed'
          : '');

      this.caseSelect.appendChild(option);
    }

    this.caseSelect.disabled = cases.length === 0;

    if (this.caseId) {
      this.caseSelect.value = this.caseId;
    }

    this.mainButton.setAttribute(
      'aria-pressed',
      String(this.mode === 'main')
    );

    this.sideButton.setAttribute(
      'aria-pressed',
      String(this.mode === 'side')
    );
  }

  switchCase(caseId) {
    const investigation = getPICase(caseId);

    if (!investigation) return;

    this.saveToGameState();
    this.disposeBoard();

    this.caseId = investigation.id;
    this.mode = investigation.kind;

    this.mount.innerHTML = this.template;

    // Unique IDs for controls looked up globally by CrimeBoard.
    const rendererOptions = {};

    for (const [optionName, originalId] of Object.entries(EDITOR_IDS)) {
      const element = this.mount.querySelector(`#${originalId}`);
      const nextId = `pi-${originalId}`;

      if (element) element.id = nextId;

      rendererOptions[optionName] = nextId;
    }

    const boardRoot =
      this.mount.querySelector('#crime-board');

    if (!boardRoot) {
      throw new Error('PI board template is missing its board root.');
    }

    boardRoot.id = 'pi-crime-board';

    // No agency motive verification in the PI workspace.
    this.mount.querySelector(
      '#pi-crime-board-verify-motive-btn'
    )?.remove();

    const heading = this.mount.querySelector(
      '.crime-board-sidebar__title'
    );

    if (heading) {
      heading.textContent = 'PI Crime Board';
    }

    const renderer = new CrimeBoard(
      boardRoot,
      rendererOptions
    );

    this.boardApi = {
      getData: () => renderer.getBoardData(),
      destroy: () => renderer.destroy()
    };

    renderer.loadBoard(investigation.board);

    selectPICase(investigation.id);

    this.refreshSelector();

    this.message.textContent =
      `${investigation.title} — ` +
      'Connections represent your working theory, not confirmed facts.';
  }

  saveToGameState() {
    if (!this.caseId || !this.boardApi) return;

    savePIBoard(
      this.caseId,
      this.boardApi.getData()
    );
  }

  disposeBoard() {
    this.boardApi?.destroy();
    this.boardApi = null;
  }

  disableUnderlyingScenesInput() {
    super.disableUnderlyingScenesInput();

    // Base CrimeBoardUI skips its owner scene.
    // Here the owner is the office, so block it as well.
    if (
      this.disabledScenesInput.some(
        record => record.scene === this.scene
      )
    ) {
      return;
    }

    this.disabledScenesInput.push({
      scene: this.scene,
      inputEnabled: this.scene.input?.enabled ?? null,
      keyboardEnabled:
        this.scene.input?.keyboard?.enabled ?? null
    });

    if (this.scene.input) {
      this.scene.input.enabled = false;
    }

    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = false;
    }
  }

  close() {
    const wasOpen = this.isOpen;

    super.close();

    this.caseId = null;
    this.mount = null;

    if (wasOpen) {
      this.piOptions?.onClose?.();
    }
  }

  destroy() {
    if (this.isDestroyed) return;

    this.scene?.events.off(
      'shutdown',
      this.boundShutdown
    );

    super.destroy();
  }
}