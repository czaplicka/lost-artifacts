import {
  ApartmentRoomSystem as ApartmentRoomSystemCore
} from './ApartmentRoomSystemCore.js';

import { getApartmentRoomPack } from './ApartmentRoomPacks.js';
import {
  APARTMENT_ROOM_LAYOUTS,
  getApartmentRoomLayout
} from './ApartmentRoomLayouts.js';

import { COLLECTOR_EXTRA_ROOMS } from './ApartmentCollectorExtraRooms.js';
import { RESEARCH_EXTRA_ROOMS } from './ApartmentResearchExtraRooms.js';
import { LUXURY_EXTRA_ROOMS } from './ApartmentLuxuryExtraRooms.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const ROOM_ORDER = ['living_room', 'bedroom', 'kitchen', 'bathroom'];

const IDENTITY_HOSTS = [
  'desk', 'bookshelf', 'nightstand_drawer', 'jewelry_box'
];

const STYLES = {
  collector: {
    extraRooms: COLLECTOR_EXTRA_ROOMS,
    largeStorage: new Set([
      'collector_wardrobe', 'collector_trunk',
      'collector_vanity', 'collector_linen'
    ])
  },
  research: {
    extraRooms: RESEARCH_EXTRA_ROOMS,
    largeStorage: new Set([
      'research_cabinet', 'research_case', 'research_pantry'
    ])
  },
  luxury: {
    extraRooms: LUXURY_EXTRA_ROOMS,
    largeStorage: new Set([
      'luxury_sideboard', 'luxury_lower_cabinet', 'luxury_fridge'
    ])
  }
};

function getTestSelection() {
  if (typeof window === 'undefined') return null;

  const { hostname, search } = window.location;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return null;

  const params = new URLSearchParams(search);
  const style = params.get('apartment');
  if (!Object.hasOwn(STYLES, style)) return null;

  const requested = (params.get('rooms') || '').split(',');
  const pair = ROOM_ORDER.filter(roomId => requested.includes(roomId));

  return requested.length === 2 && pair.length === 2
    ? { style, pair }
    : null;
}

function legacyCapacity(slot, largeStorage) {
  if (largeStorage.has(slot.id)) return ['document', 'small_item', 'artifact'];
  if (slot.discoveryAction === 'search') return ['document', 'small_item'];

  if (slot.discoveryAction === 'move' &&
      (slot.sourceId || slot.id === 'research_paper')) {
    return ['document'];
  }

  return [];
}

function buildPair({ style, pair }) {
  const { extraRooms, largeStorage } = STYLES[style];
  const originalPack = getApartmentRoomPack(style);
  const originalLayout = getApartmentRoomLayout(originalPack?.layoutId);

  if (!originalPack || !originalLayout) {
    throw new Error(`[ApartmentPair] Missing original ${style} pack or layout.`);
  }

  const rooms = {};
  const slots = [];

  for (const roomId of pair) {
    const extra = extraRooms[roomId];
    const room = extra || originalPack.rooms[roomId];

    if (!room?.key || !room?.path) {
      throw new Error(`[ApartmentPair] Missing ${style}/${roomId} background.`);
    }

    rooms[roomId] = { label: room.label, key: room.key, path: room.path };

    const source = extra || originalLayout;
    const sx = WIDTH / source.width;
    const sy = HEIGHT / source.height;

    for (const slot of source.slots.filter(entry => entry.roomId === roomId)) {
      slots.push({
        ...slot,
        sourceId: null,
        x: slot.x * sx,
        y: slot.y * sy,
        w: slot.w * sx,
        h: slot.h * sy,
        accepts: [...(slot.accepts || legacyCapacity(slot, largeStorage))]
      });
    }
  }

  const layoutId = `${style}_pair_${pair.join('__')}`;
  const documents = slots.filter(slot => slot.accepts.includes('document'));
  const movable = documents.find(slot => slot.discoveryAction === 'move');

  if (documents.length < IDENTITY_HOSTS.length + 1) {
    throw new Error(`[ApartmentPair] Not enough document hotspots: ${layoutId}`);
  }

  // If neither room has a movable document hotspot, keep five eligible
  // identity hosts by using a normal searchable one in place of the photo.
  if (movable) movable.sourceId = 'framed_photo';

  const otherDocuments = documents.filter(slot => slot !== movable);

  IDENTITY_HOSTS.forEach((id, index) => {
    otherDocuments[index].sourceId = id;
  });

  for (const slot of slots) {
    if (!slot.sourceId && slot.accepts.length) {
      slot.sourceId = `pair_${slot.id}`;
    }
  }

  return {
    pack: { id: style, layoutId, rooms },
    layout: { width: WIDTH, height: HEIGHT, slots },
    extraKeys: new Set(Object.values(extraRooms).map(room => room.key))
  };
}

function itemKind(item) {
  if (item.isArtifact || item.type === 'artifact') return 'artifact';

  if (
    item.type === 'document' ||
    item.type === 'photo' ||
    item.isIdentityLead ||
    item.isEscapeFragment ||
    (item.isEscapeClue && !item.type)
  ) {
    return 'document';
  }

  return 'small_item';
}

function hash(value) {
  let result = 2166136261;

  for (const character of value) {
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  }

  return result >>> 0;
}

function distributeItems(originalObjects, layout, seed) {
  const items = new Map();

  for (const object of originalObjects) {
    for (const item of object.unlocks || []) {
      if (item?.id && !items.has(item.id)) items.set(item.id, item);
    }
  }

  const storage = layout.slots
    .filter(slot => slot.sourceId)
    .map(slot => ({
      slot,
      object: {
        id: slot.sourceId,
        state: 'open',
        unlocks: []
      }
    }));

  const orderedItems = [...items.values()].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );

  for (const item of orderedItems) {
    const kind = itemKind(item);
    const compatible = storage.filter(entry => entry.slot.accepts.includes(kind));

    if (!compatible.length) {
      throw new Error(`[ApartmentPair] No ${kind} hotspot for ${item.id}.`);
    }

    const leastUsed = Math.min(
      ...compatible.map(entry => entry.object.unlocks.length)
    );

    const candidates = compatible.filter(
      entry => entry.object.unlocks.length === leastUsed
    );

    candidates[hash(`${seed}:${item.id}`) % candidates.length]
      .object.unlocks.push(item);
  }

  return storage.map(entry => entry.object);
}

export class ApartmentRoomSystem extends ApartmentRoomSystemCore {
  constructor(scene) {
    super(scene);

    this.roomPair = null;
    this.roomPairActive = false;

    const selection = getTestSelection();
    if (!selection) return;

    this.localPackOverride = selection.style;
    this.packId = selection.style;

    try {
      this.roomPair = buildPair(selection);
      this.roomId = selection.pair[0];
    } catch (error) {
      console.error('[ApartmentPair] Opening the original room pack.', error);
    }
  }

  persistSelection() {
    // This override also runs during the core constructor.
    if (!getTestSelection()) super.persistSelection();
  }

  preload() {
    super.preload();
    if (!this.roomPair) return;

    for (const room of Object.values(this.roomPair.pack.rooms)) {
      if (this.roomPair.extraKeys.has(room.key) &&
          !this.scene.textures.exists(room.key)) {
        this.scene.load.image(room.key, room.path);
      }
    }
  }

  create() {
    if (!this.roomPair) {
      super.create();
      return;
    }

    const { pack, layout } = this.roomPair;
    const missing = Object.values(pack.rooms)
      .filter(room => !this.scene.textures.exists(room.key));

    if (missing.length) {
      console.warn(
        '[ApartmentPair] Opening original rooms. Missing textures:',
        missing.map(room => room.path)
      );
      super.create();
      return;
    }

    const config = this.scene.apartmentConfig;

    try {
      config.objects = distributeItems(
        config.objects,
        layout,
        `${this.selectionKey}:${pack.layoutId}`
      );
    } catch (error) {
      console.error('[ApartmentPair] Keeping original rooms and evidence.', error);
      super.create();
      return;
    }

    this.roomPairActive = true;
    APARTMENT_ROOM_LAYOUTS[pack.layoutId] = layout;

    try {
      super.create();
    } finally {
      delete APARTMENT_ROOM_LAYOUTS[pack.layoutId];
    }
  }

  resolveVisualPack() {
    if (!this.roomPairActive) return super.resolveVisualPack();

    this.renderedPackId = this.roomPair.pack.id;
    this.usingFallback = false;
    return this.roomPair.pack;
  }

  geometryStorageKey() {
    if (!this.roomPairActive) return super.geometryStorageKey();

    return `lost-artifacts:apartment-layout:v1:${this.roomPair.pack.layoutId}`;
  }
}