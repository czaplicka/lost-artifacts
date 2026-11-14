import { getEnergyManager } from './EnergyManager.js';

export const SAVE_CONSTANTS = {
  CURRENT_SAVE_VERSION: 1,
  SLOT_KEYS: ['slot_1', 'slot_2', 'slot_3'],
  LOCAL_PREFIX: 'lost-artefacts',
  LOCAL_LAST_USED_SLOT_KEY: 'lost-artefacts:last-used-slot'
};
const message = error => error?.message || String(error);
const plain = value => value !== null && typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const timestamp = value => Date.parse(value || '') || 0;
function sanitize(value, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return String(value);
  if (['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value !== 'object') return undefined;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return undefined;
  seen.add(value);
  const result = Array.isArray(value)
    ? value.map(item => sanitize(item, seen) ?? null)
    : Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
        const clean = sanitize(item, seen);
        return clean === undefined ? [] : [[key, clean]];
      }));
  seen.delete(value);
  return result;
}
function bounded(operation, milliseconds = 8000) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Cloud connection timed out.')), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}
export class SaveManager {
  constructor({ supabase, getState, applyState, gameVersion = '0.1.0' }) {
    if (!supabase || typeof getState !== 'function' || typeof applyState !== 'function') {
      throw new Error('[SaveManager] Missing dependencies.');
    }
    Object.assign(this, { supabase, getState, applyState, gameVersion });
    this._saveChain = Promise.resolve();
  }
  canSave(context = {}) { return ['office', 'hotel'].includes(context.locationType); }
  validateSlotKey(key) {
    if (!SAVE_CONSTANTS.SLOT_KEYS.includes(key)) throw new Error(`Unsupported slot key: ${key}`);
  }
  validatePreference(prefer) {
    if (!['local', 'cloud', 'newest'].includes(prefer)) throw new Error('Invalid save preference.');
  }
  getLocalKey(key) { return `${SAVE_CONSTANTS.LOCAL_PREFIX}:save:${key}`; }
  getLocalMetaKey(key) { return `${SAVE_CONSTANTS.LOCAL_PREFIX}:meta:${key}`; }
  rememberLastUsedSlot(key) {
    try { localStorage.setItem(SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY, key); }
    catch (error) { console.warn('[SaveManager]', error); }
  }
  getLastUsedSlot() {
    try {
      const key = localStorage.getItem(SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY);
      return SAVE_CONSTANTS.SLOT_KEYS.includes(key) ? key : 'slot_1';
    } catch { return 'slot_1'; }
  }
  buildSavePayload(slotKey, context = {}) {
    const raw = this.getState();
    if (!plain(raw)) throw new Error('Game state is not a plain object.');
    const energy = getEnergyManager();
    const data = sanitize({ ...raw, ...energy.serialize() });
    const state = plain(data.state) ? data.state : data;
    return {
      saveVersion: 1, gameVersion: this.gameVersion, slotKey,
      meta: {
        savedAt: new Date().toISOString(),
        agentName: state.playerName || 'Detective',
        locationCode: context.locationCode ?? state.location?.code ?? state.currentLocationId ?? 'unknown',
        cityCode: context.cityCode ?? state.location?.cityCode ?? state.currentCityId ?? null,
        locationType: context.locationType ?? state.location?.type ?? 'unknown',
        caseId: state.campaign?.currentCaseId ?? state.currentMission?.id ?? state.currentMissionId ?? null,
        caseStage: state.campaign?.currentStage ?? state.currentPhase ?? state.currentStep ?? null,
        dayNumber: state.time?.dayNumber ?? state.dayNumber ?? state.gameDay ?? state.day ?? 1,
        inGameHour: state.time?.hour ?? state.hour ?? state.gameHour ?? 8,
        playtimeSec: state.player?.playtimeSec ?? state.playtimeSec ?? 0,
        lastSceneKey: context.sceneKey ?? state.scene?.key ?? 'GameScene'
      }, data
    };
  }
  serializeForDatabase(payload, userId) {
    const meta = payload.meta;
    return {
      user_id: userId, slot_key: payload.slotKey,
      save_version: payload.saveVersion, game_version: payload.gameVersion,
      case_id: meta.caseId, case_stage: meta.caseStage,
      location_code: meta.locationCode, city_code: meta.cityCode,
      day_number: meta.dayNumber, in_game_hour: meta.inGameHour,
      playtime_sec: meta.playtimeSec, last_scene_key: meta.lastSceneKey,
      is_valid: true, save_data: payload
    };
  }
  normalizeSave(raw) {
    const save = raw?.save_data ?? raw;
    if (!plain(save) || !Number.isInteger(save.saveVersion) || save.saveVersion < 1 || !plain(save.data)) {
      throw new Error('Invalid save data.');
    }
    return save;
  }
  migrate(raw) {
    const save = this.normalizeSave(raw);
    if (save.saveVersion !== 1) throw new Error('Unsupported save version.');
    return save;
  }
  writeLocal(key, payload) {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(this.getLocalKey(key), serialized);
    if (localStorage.getItem(this.getLocalKey(key)) !== serialized) {
      throw new Error('Local save verification failed.');
    }
    this.writeLocalMeta(key, payload.meta);
    this.rememberLastUsedSlot(key);
  }
  writeLocalMeta(key, meta) {
    try { localStorage.setItem(this.getLocalMetaKey(key), JSON.stringify(meta)); }
    catch (error) { console.warn('[SaveManager] Metadata write failed:', error); }
  }
  readLocal(key) {
    const raw = localStorage.getItem(this.getLocalKey(key));
    return raw ? this.normalizeSave(JSON.parse(raw)) : null;
  }
  safeReadLocal(key) {
    try { return this.readLocal(key); }
    catch (error) { console.warn('[SaveManager] Local read failed:', error); return null; }
  }
  readLocalMeta(key) {
    try {
      const raw = localStorage.getItem(this.getLocalMetaKey(key));
      if (raw) {
        const meta = JSON.parse(raw);
        if (plain(meta) && meta.agentName) return meta;
      }
      const save = this.safeReadLocal(key);
      if (!save) return null;
      const state = save.data.state ?? save.data;
      const meta = { ...save.meta, agentName: save.meta?.agentName || state.playerName || 'Detective' };
      this.writeLocalMeta(key, meta);
      return meta;
    } catch (error) { console.warn('[SaveManager]', error); return null; }
  }
  async getCurrentSession() {
    try {
      const { data, error } = await bounded(() => this.supabase.auth.getSession());
      if (error) throw error;
      return data?.session ?? null;
    } catch (error) { console.warn('[SaveManager] Session unavailable:', error); return null; }
  }
  save(key, context = {}) {
    const run = this._saveChain.then(() => this._performSave(key, context));
    this._saveChain = run.catch(() => {});
    return run;
  }
  async _performSave(key, context) {
    this.validateSlotKey(key);
    if (!this.canSave(context)) throw new Error('Saving is only available in hotel or office.');
    const payload = this.buildSavePayload(key, context);
    this.writeLocal(key, payload);
    try { context.onLocalSaved?.(payload); }
    catch (error) { console.warn('[SaveManager] UI callback failed:', error); }
    const session = await this.getCurrentSession();
    if (!session?.user) return { ok: true, mode: 'local-only', payload };
    try {
      const { error } = await bounded(() => this.supabase.from('player_saves')
        .upsert(this.serializeForDatabase(payload, session.user.id), { onConflict: 'user_id,slot_key' }));
      if (error) throw error;
      return { ok: true, mode: 'cloud+local', payload };
    } catch (error) {
      console.warn('[SaveManager] Cloud save not confirmed:', error);
      return { ok: true, mode: 'local-fallback', payload, warning: message(error) };
    }
  }
  async safeReadCloud(key) {
    try {
      const session = await this.getCurrentSession();
      if (!session?.user) return null;
      const { data, error } = await bounded(() => this.supabase.from('player_saves')
        .select('save_data').eq('user_id', session.user.id).eq('slot_key', key).maybeSingle());
      if (error) throw error;
      return data ? this.normalizeSave(data) : null;
    } catch (error) { console.warn('[SaveManager] Cloud read failed:', error); return null; }
  }
  restoreEnergyManager(data) { getEnergyManager().restore(data); }
  async load(key, prefer = 'newest') {
    this.validateSlotKey(key);
    this.validatePreference(prefer);
    const local = prefer === 'cloud' ? null : this.safeReadLocal(key);
    const cloud = prefer === 'local' ? null : await this.safeReadCloud(key);
    const resolved = this.resolvePreferredSave(local, cloud, prefer);
    if (!resolved) return null;
    const save = this.migrate(resolved);
    const state = save.data.state ?? save.data;
    const energyData = {
      energy: save.data.energy ?? state.energy,
      maxEnergy: save.data.maxEnergy ?? state.maxEnergy,
      difficulty: save.data.difficulty ?? state.difficulty,
      energyLog: save.data.energyLog ?? state.energyLog ?? [],
      energyModifiers: save.data.energyModifiers ?? state.energyModifiers ?? []
    };
    if (await this.applyState(save.data) === false) throw new Error('Restoring game state failed.');
    this.restoreEnergyManager(energyData);
    this.rememberLastUsedSlot(key);
    return save;
  }
  loadLastUsed(prefer = 'newest') { return this.load(this.getLastUsedSlot(), prefer); }
  async listSlots() {
    const local = new Map(SAVE_CONSTANTS.SLOT_KEYS.map(key => [key, this.readLocalMeta(key)]));
    const session = await this.getCurrentSession();
    let rows = [];
    if (session?.user) {
      try {
        const { data, error } = await bounded(() => this.supabase.from('player_saves')
          .select('slot_key,updated_at,location_code,city_code,case_id,case_stage,day_number,in_game_hour,playtime_sec,last_scene_key,save_data->meta')
          .eq('user_id', session.user.id).order('updated_at', { ascending: false }));
        if (error) throw error;
        rows = data ?? [];
      } catch (error) { console.warn('[SaveManager] Cloud slots unavailable:', error); }
    }
    return SAVE_CONSTANTS.SLOT_KEYS.map(slotKey => {
      const localMeta = local.get(slotKey);
      const row = rows.find(item => item.slot_key === slotKey);
      const cloudMeta = row ? {
        updatedAt: row.updated_at,
        locationCode: row.location_code, cityCode: row.city_code,
        caseId: row.case_id, caseStage: row.case_stage,
        dayNumber: row.day_number, inGameHour: row.in_game_hour,
        playtimeSec: row.playtime_sec, lastSceneKey: row.last_scene_key,
        ...(plain(row.meta) ? row.meta : {})
      } : null;
      return { slotKey, localMeta, cloudMeta,
        preferredSource: this.pickSource(localMeta ? { meta: localMeta } : null, row) };
    });
  }
  async deleteSlot(key) {
    this.validateSlotKey(key);
    localStorage.removeItem(this.getLocalKey(key));
    localStorage.removeItem(this.getLocalMetaKey(key));
    const session = await this.getCurrentSession();
    if (!session?.user) return { ok: true, mode: 'local-only' };
    const { error } = await bounded(() => this.supabase.from('player_saves')
      .delete().eq('user_id', session.user.id).eq('slot_key', key));
    if (error) throw error;
    return { ok: true, mode: 'cloud+local' };
  }
  pickSource(local, cloud) {
    if (!local && !cloud) return 'none';
    if (!local) return 'cloud';
    if (!cloud) return 'local';
    return timestamp(cloud.meta?.savedAt ?? cloud.updated_at) > timestamp(local.meta?.savedAt) ? 'cloud' : 'local';
  }
  resolvePreferredSave(local, cloud, prefer = 'newest') {
    this.validatePreference(prefer);
    if (!local && !cloud) return null;
    if (prefer === 'local' || prefer === 'cloud') {
      const save = prefer === 'local' ? local : cloud;
      if (!save) throw new Error(`Requested ${prefer} save does not exist.`);
      return save;
    }
    if (!local) return cloud;
    if (!cloud) return local;
    return timestamp(cloud.meta?.savedAt) > timestamp(local.meta?.savedAt) ? cloud : local;
  }
  destroy() {}
}
export function createSaveManager(dependencies) { return new SaveManager(dependencies); }
