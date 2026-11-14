import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';

const MARKER = Symbol.for(__dialogueText("ui/pi-computer/AlibiSharedFaceSpace.js", "t_308aa4de1054f3f6db67"));
const linkedDefinitions = new WeakMap();
const NORA_PAGE = 'nora_social';
const OLD_NORA_PAGE = 'social_nora_bell';

export const ALIBI_FACE_AVATARS = {
  arthur_finch: {
    avatarKey: 'artur_finch_avatar',
    avatarUrl: 'assets/side_quests/Alibi/web/FaceSpace/artur_finch_avatar.webp'
  },
  nora_bell: {
    avatarKey: 'nora_bell_avatar',
    avatarUrl: 'assets/side_quests/Reed/web/FaceSpace/nora_bell_avatar.webp'
  },
  simon_pike: {
    avatarKey: 'simon_pike_avatar',
    avatarUrl: 'assets/side_quests/Alibi/web/FaceSpace/simon_pike_avatar.webp'
  },
  evelyn_shaw: {
    avatarKey: 'evelyn_shaw_avatar',
    avatarUrl: 'assets/side_quests/Alibi/web/FaceSpace/evelyn_shaw_avatar.webp'
  }
};

export function attachAlibiAvatars(definition = ALIBI_SEARCH_CASE) {
  if (definition?.id !== 'borrowed_alibi') return;
  for (const [person, avatar] of Object.entries(ALIBI_FACE_AVATARS)) {
    const page = definition.pages?.find(item => item.id === `social_${person}`);
    if (page?.socialProfile) Object.assign(page.socialProfile, avatar);
  }
}
attachAlibiAvatars();

function reachablePages(source, startId) {
  const pages = new Map((source.pages || []).map(page => [page.id, page]));
  const found = new Map();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift();
    if (found.has(id) || !pages.has(id)) continue;
    const page = pages.get(id);
    found.set(id, page);
    for (const link of page.links || []) if (link.pageId) queue.push(link.pageId);
    for (const post of page.socialPosts || []) if (post.galleryPageId) queue.push(post.galleryPageId);
  }
  return found;
}

function remapPage(value, pageIds, sourceKeywords) {
  if (Array.isArray(value)) return value.map(item => remapPage(item, pageIds, sourceKeywords));
  if (!value || typeof value !== 'object') return value;
  if (typeof value.keywordId === 'string') {
    if (value.keywordId === 'nora' || value.keywordId === 'nora_bell') {
      return { ...value, keywordId: 'nora_bell' };
    }
    // Other Reed case keywords remain readable public text, not Alibi clues.
    return value.text ?? sourceKeywords.get(value.keywordId)?.label ?? '';
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (['pageId', 'galleryPageId', 'commonRoomPhotoOwner'].includes(key) && typeof item === 'string') {
      result[key] = pageIds.get(item) || item;
    } else {
      result[key] = remapPage(item, pageIds, sourceKeywords);
    }
  }
  return result;
}

export function syncAlibiSharedProfiles(search) {
  const cases = search?.data?.cases || [];
  const definition = cases.find(item => item.id === 'borrowed_alibi');
  if (!definition) return false;
  attachAlibiAvatars(definition);
  const source = cases.find(item => item.id !== 'borrowed_alibi' &&
    item.pages?.some(page => page.id === NORA_PAGE));
  if (!source) return false;
  const original = source.pages.find(page => page.id === NORA_PAGE);
  if (linkedDefinitions.get(definition) === original) return true;

  const reachable = reachablePages(source, NORA_PAGE);
  const ids = new Map([...reachable.keys()].map(id => [
    id, id === NORA_PAGE ? NORA_PAGE : `alibi_shared_reed_${id}`
  ]));
  const sourceKeywords = new Map((source.keywords || []).map(keyword => [keyword.id, keyword]));
  const copies = [...reachable.values()].map(page => {
    const copy = remapPage(page, ids, sourceKeywords);
    copy.id = ids.get(page.id);
    copy.links = (copy.links || []).filter(link =>
      [...ids.values()].includes(link.pageId) || definition.pages.some(item => item.id === link.pageId));
    return copy;
  });
  const nora = copies.find(page => page.id === NORA_PAGE);
  delete nora.socialProfile;
  nora.profile = { ...(nora.profile || {}), name: __dialogueText("ui/pi-computer/AlibiSharedFaceSpace.js", "t_4cca0264ed42816c466a"), ...ALIBI_FACE_AVATARS.nora_bell };

  const replaced = new Set([OLD_NORA_PAGE, ...copies.map(page => page.id)]);
  definition.pages = [...definition.pages.filter(page => !replaced.has(page.id)), ...copies];
  for (const recipe of definition.recipes || []) {
    if (recipe.pageId === OLD_NORA_PAGE) recipe.pageId = NORA_PAGE;
    if (Array.isArray(recipe.pageIds)) {
      recipe.pageIds = [...new Set(recipe.pageIds.map(id => id === OLD_NORA_PAGE ? NORA_PAGE : id))];
    }
  }
  for (const page of definition.pages) {
    for (const link of page.links || []) if (link.pageId === OLD_NORA_PAGE) link.pageId = NORA_PAGE;
  }
  if (search.definition?.id === 'borrowed_alibi' && search.pageId === OLD_NORA_PAGE) {
    search.pageId = NORA_PAGE;
    search.bodyPage = 0;
  }
  linkedDefinitions.set(definition, original);
  return true;
}

export function installAlibiSharedFaceSpace(ui) {
  if (ui[MARKER]) return ui[MARKER];
  let dead = false;
  const hooked = new WeakSet();
  const restorers = [];
  const wrap = (target, name, factory) => {
    if (typeof target?.[name] !== 'function') return;
    const original = target[name];
    const wrapped = factory(original);
    target[name] = wrapped;
    restorers.push(() => { if (target[name] === wrapped) target[name] = original; });
  };
  function ensureSearch() {
    if (dead || ui.destroyed || !ui.search) return;
    const search = ui.search;
    if (hooked.has(search)) return;
    hooked.add(search);
    wrap(search, 'load', original => async function (...args) {
      const result = await original.apply(this, args);
      if (!dead && !ui.destroyed) syncAlibiSharedProfiles(this);
      return result;
    });
    wrap(search, 'render', original => function (...args) {
      if (!dead && !ui.destroyed) syncAlibiSharedProfiles(this);
      return original.apply(this, args);
    });
    // Initial results and profile clicks must already see the shared page IDs.
    wrap(search, 'openPage', original => function (id, ...args) {
      if (!dead && !ui.destroyed) syncAlibiSharedProfiles(this);
      const target = this.definition?.id === 'borrowed_alibi' && id === OLD_NORA_PAGE &&
        this.definition.pages.some(page => page.id === NORA_PAGE) ? NORA_PAGE : id;
      return original.call(this, target, ...args);
    });
    syncAlibiSharedProfiles(search);
  }
  const destroy = () => {
    if (dead) return;
    dead = true;
    ui.scene.events.off('update', ensureSearch);
    ui.scene.events.off('shutdown', destroy);
    for (const restore of restorers.reverse()) restore();
    if (ui[MARKER] === api) delete ui[MARKER];
  };
  const api = { destroy };
  ui[MARKER] = api;
  ui.scene.events.on('update', ensureSearch);
  ui.scene.events.once('shutdown', destroy);
  ensureSearch();
  queueMicrotask(ensureSearch);
  return api;
}
