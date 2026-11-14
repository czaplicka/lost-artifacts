import { BoardData } from './crimeBoard/BoardData.js';
import { BoardItems } from './crimeBoard/BoardItems.js';
import { BoardLinks } from './crimeBoard/BoardLinks.js';
import { BoardRendering } from './crimeBoard/BoardRendering.js';
import { BoardEditor } from './crimeBoard/BoardEditor.js';
import { BoardInteraction } from './crimeBoard/BoardInteraction.js';
import { BoardDeduction } from './crimeBoard/BoardDeduction.js';

export class CrimeBoard {
  constructor(root, options = {}) {
    this.root = root;
    this.svg = root?.querySelector('.crime-board__strings');
    this.itemsLayer = root?.querySelector('.crime-board__items');


    if (!this.root || !this.svg || !this.itemsLayer) {
      throw new Error('CrimeBoard requires root with .crime-board__strings and .crime-board__items.');
    }


    this.options = {
      confirmLinkDeletion: options.confirmLinkDeletion !== false,
      formId: options.formId || 'crime-board-form',
      emptyStateId: options.emptyStateId || 'crime-board-empty-state',
      fieldsWrapId: options.fieldsWrapId || 'crime-board-fields',
      dynamicFieldsId: options.dynamicFieldsId || 'crime-board-type-fields',
      jsonOutputId: options.jsonOutputId || 'board-json-output',
      saveBtnId: options.saveBtnId || 'board-save-btn',
      loadBtnId: options.loadBtnId || 'board-load-btn',
      applyBtnId: options.applyBtnId || 'crime-board-apply-btn',
      deleteBtnId: options.deleteBtnId || 'crime-board-delete-btn',
      addPhotoBtnId: options.addPhotoBtnId || 'add-photo-btn',
      addNoteBtnId: options.addNoteBtnId || 'add-note-btn',
      addEvidenceBtnId: options.addEvidenceBtnId || 'add-evidence-btn',
      linksListId: options.linksListId || 'crime-board-links-list',
      linksEmptyId: options.linksEmptyId || 'crime-board-links-empty',
      verifyMotiveBtnId: options.verifyMotiveBtnId || 'crime-board-verify-motive-btn'
    };


    this.app = this.root.closest('.crime-board-app') || document;
    this.meta = {};
    this.state = { items: [], links: [] };
    this.selectedItemId = null;
    this.itemElements = new Map();
    this.linkElements = new Map();


    this.drag = {
      activeId: null,
      offsetX: 0,
      offsetY: 0,
      pointerId: null
    };


    this.connectionMode = {
      active: false,
      fromId: null,
      fromAnchor: null
    };


    this.tempPath = null;
    this.zCounter = 10;
    this.destroyed = false;


    this.editor = {
      form: document.getElementById(this.options.formId),
      emptyState: document.getElementById(this.options.emptyStateId),
      fieldsWrap: document.getElementById(this.options.fieldsWrapId),
      dynamicFields: document.getElementById(this.options.dynamicFieldsId),
      jsonOutput: document.getElementById(this.options.jsonOutputId),
      saveBtn: document.getElementById(this.options.saveBtnId),
      loadBtn: document.getElementById(this.options.loadBtnId),
      applyBtn: document.getElementById(this.options.applyBtnId),
      deleteBtn: document.getElementById(this.options.deleteBtnId),
      addPhotoBtn: document.getElementById(this.options.addPhotoBtnId),
      addNoteBtn: document.getElementById(this.options.addNoteBtnId),
      addEvidenceBtn: document.getElementById(this.options.addEvidenceBtnId),
      linksList: document.getElementById(this.options.linksListId),
      linksEmpty: document.getElementById(this.options.linksEmptyId),
      verifyMotiveBtn: document.getElementById(this.options.verifyMotiveBtnId)
    };


    this.sidebar = this.app.querySelector?.('#crime-board-sidebar') || null;
    this.sidebarToggleBtn = this.app.querySelector?.('#crime-board-sidebar-toggle') || null;
    this.sidebarTabBtn = this.app.querySelector?.('#crime-board-sidebar-tab') || null;


    this.boundResize = this.onResize.bind(this);
    this.boundPointerMove = this.onWindowPointerMove.bind(this);
    this.boundPointerUp = this.onWindowPointerUp.bind(this);
    this.boundRootClick = this.onRootClick.bind(this);


    this.init();
  }

  init() {
    window.addEventListener('resize', this.boundResize);
    this.createDeductionPanel();
    this.bindEditor();
    this.bindSidebar();
    this.root.addEventListener('click', this.boundRootClick);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyDeductionPanel();
    this.destroyed = true;


    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.root.removeEventListener('click', this.boundRootClick);


    this.resetConnectionMode({ keepListeners: false });
    this.clearDragState();
    this.itemElements.clear();
    this.linkElements.clear();
    this.tempPath?.remove();
    this.tempPath = null;
  }

  _isBoardUsable() {
    return !this.destroyed && !!this.svg && !!this.itemsLayer && !!this.root;
  }

  _setSvgAttr(node, name, value, namespace = null) {
    if (!node || typeof node.setAttribute !== 'function') return;
    try {
      if (namespace) {
        if (typeof node.setAttributeNS === 'function') {
          node.setAttributeNS(namespace, name, value);
        }
      } else {
        node.setAttribute(name, value);
      }
    } catch {
      // Defensive no-op: a detached/invalid SVG node should never crash the app.
    }
  }

  onResize() {
    if (!this._isBoardUsable()) return;
    this.renderLinks();
  }

  onRootClick(e) {
    if (!this._isBoardUsable()) return;
    if (e.target === this.root || e.target === this.itemsLayer || e.target === this.svg) {
      this.selectedItemId = null;
      this.renderSelectionState();
      this.refreshEditor();
    }
  }
}

Object.assign(CrimeBoard.prototype,
  BoardData,
  BoardItems,
  BoardLinks,
  BoardRendering,
  BoardEditor,
  BoardInteraction,
  BoardDeduction
);
