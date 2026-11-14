import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { inventoryManager } from '../../managers/InventoryManager.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import {
  getEvidenceCaseKey,
  readApartmentEvidence,
  evidenceMatchesCase
} from '../../managers/ApartmentEvidenceModel.js';

function hash(value) {
  let h = 2166136261;

  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(36);
}

function shorten(raw) {
  return raw.length <= 42
    ? raw
    : `${raw.slice(0, 32)}_${hash(raw)}`;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveItemIcon(item = {}) {
  const type = normalizeText(item.type);
  const id = normalizeText(item.id);
  const name = normalizeText(item.label || item.name);
  const metadata = item.metadata || {};

  const identity = `${id} ${name}`
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  const explicitIcon =
    typeof item.icon === 'string'
      ? item.icon.trim()
      : '';

  const isKey =
    type === 'key' ||
    type === 'keys' ||
    item.isApartmentKey === true ||
    metadata.isApartmentKey === true;

  const isAccessCard =
    /\b(?:key card|keycard|access card|hotel card)\b/.test(
      identity
    );

  if (isKey || isAccessCard) {
    const genericIcons = new Set([
      '',
      '📄',
      '📃',
      '📝',
      '📦',
      '🎫'
    ]);

    if (!genericIcons.has(explicitIcon)) {
      return explicitIcon;
    }

    return isAccessCard ? '💳' : '🔑';
  }

  if (explicitIcon) {
    return explicitIcon;
  }

  if (
    item.isArtifact === true ||
    metadata.isArtifact === true ||
    type === 'artifact' ||
    type === 'artefact'
  ) {
    return '🏺';
  }

  if (/\b(?:passport|visa)\b/.test(identity)) {
    return '🛂';
  }

  if (/\b(?:fake id|forged id|id card|identification)\b/.test(identity)) {
    return '🪪';
  }

  if (
    type === 'photo' ||
    type === 'photograph' ||
    /\b(?:photo|photograph)\b/.test(identity)
  ) {
    return '🖼️';
  }

  if (/\b(?:map|atlas)\b/.test(identity)) {
    return '🗺️';
  }

  if (/\b(?:ticket|booking|boarding pass)\b/.test(identity)) {
    return '🎫';
  }

  if (/\b(?:letter|envelope|correspondence)\b/.test(identity)) {
    return '✉️';
  }

  if (/\b(?:diary|notebook|journal)\b/.test(identity)) {
    return '📓';
  }

  if (/\b(?:book|guide|catalog|catalogue)\b/.test(identity)) {
    return '📖';
  }

  if (/\b(?:cash|money|fund|banknote|banknotes)\b/.test(identity)) {
    return '💵';
  }

  if (/\b(?:medication|medications|pills|medicine)\b/.test(identity)) {
    return '💊';
  }

  if (/\b(?:usb|flash drive)\b/.test(identity)) {
    return '💾';
  }

  if (/\b(?:memory card|sd card)\b/.test(identity)) {
    return '💾';
  }

  if (/\b(?:lockpick|lockpicks|lock picking|burglary tools)\b/.test(identity)) {
    return '🛠️';
  }

  if (/\b(?:rope|cord)\b/.test(identity)) {
    return '🪢';
  }

  if (/\b(?:ring|necklace|jewelry|jewellery|diamond)\b/.test(identity)) {
    return '💍';
  }

  if (
    type === 'document' ||
    type === 'documents' ||
    type === 'letter' ||
    type === 'note'
  ) {
    return '📄';
  }

  if (
    item.isEscapeClue === true ||
    item.isEscapeFragment === true ||
    metadata.isEscapeClue === true ||
    metadata.isEscapeFragment === true
  ) {
    return '🧳';
  }

  if (
    item.isClue === true ||
    metadata.isClue === true ||
    type === 'clue' ||
    type === 'evidence'
  ) {
    return '🔎';
  }

  return '📦';
}

export class ApartmentInventoryUI {
  constructor(scene) {
    this.scene = scene;
    this.missionId = String(scene.missionId);
    this.caseKey = getEvidenceCaseKey(gameState);
  }

  key(id) {
    return (
      `apt_${hash(`${this.missionId}|${this.caseKey}`)}_` +
      shorten(String(id))
    );
  }

  legacyKey(id) {
    return (
      `apt_${hash(this.missionId)}_` +
      shorten(String(id))
    );
  }

  isCurrent() {
    return this.caseKey === getEvidenceCaseKey(gameState);
  }

  toInventoryItem(item) {
    const label =
      item.label ||
      item.name ||
      __dialogueText("scenes/apartament/ApartmentInventoryUI.js", "t_289784b45146fdf97176");

    const original = JSON.parse(JSON.stringify(item));
    const metadata = { ...(original.metadata || {}) };

    for (const flag of [
      'isArtifact',
      'isClue',
      'isEscapeClue',
      'isEscapeFragment',
      'isRedHerring',
      'isIdentityLead'
    ]) {
      metadata[flag] =
        original[flag] === true ||
        metadata[flag] === true;
    }

    const icon = resolveItemIcon(original);

    original.icon = icon;

    metadata.apartment = {
      missionId: this.missionId,
      caseKey: this.caseKey,
      originalId: String(item.id),
      item: original
    };

    return {
      id: this.key(item.id),
      name: label,
      description: item.description || item.hint || '',
      icon,
      type: item.type || 'evidence',
      quantity: Math.max(1, Number(item.quantity) || 1),
      stackable: false,
      metadata
    };
  }

  getItem(id) {
    if (!this.isCurrent()) return null;

    for (const key of [
      this.key(id),
      this.legacyKey(id)
    ]) {
      const item = inventoryManager.getItem(key);

      if (
        item &&
        evidenceMatchesCase(item, gameState) &&
        String(item.metadata?.apartment?.missionId) ===
          this.missionId
      ) {
        return item;
      }
    }

    const shared = inventoryManager.getItem(id);

    return shared?.metadata?.apartment
      ? null
      : shared;
  }

  addItem(item) {
    if (!item?.id || !this.isCurrent()) return false;

    const existing = [
      this.key(item.id),
      this.legacyKey(item.id)
    ]
      .map(key => inventoryManager.getItem(key))
      .find(entry => {
        return (
          entry &&
          evidenceMatchesCase(entry, gameState)
        );
      });

    if (existing) return true;

    const added = inventoryManager.addItem(
      this.toInventoryItem(item)
    );

    if (added) this.save();

    return added;
  }

  hasItem(id) {
    return Boolean(this.getItem(id));
  }

  removeItem(id, quantity = 1) {
    const item = this.getItem(id);

    if (
      !item ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      item.quantity < quantity
    ) {
      return false;
    }

    const removed = inventoryManager.removeQuantity(
      item.id,
      quantity
    );

    if (removed) this.save();

    return removed;
  }

  getItems() {
    if (!this.isCurrent()) return [];

    return inventoryManager.getAllItems()
      .filter(item => {
        return (
          String(item.metadata?.apartment?.missionId) ===
            this.missionId &&
          evidenceMatchesCase(item, gameState)
        );
      })
      .map(item => {
        const evidence = readApartmentEvidence(item);

        return {
          ...evidence,
          id: evidence.originalId,
          label: item.name,
          description: item.description,
          quantity: item.quantity
        };
      });
  }

  save() {
    gameState.updateState({
      inventory: inventoryManager.exportState()
    });

    requestAutosave();
  }

  get isOpen() {
    return inventoryManager.isOpen;
  }

  open() {
    return this.scene?.openSharedInventory();
  }

  close() {
    inventoryManager.close();
  }

  toggle() {
    if (inventoryManager.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  destroy() {
    this.scene = null;
  }
}

export default ApartmentInventoryUI;