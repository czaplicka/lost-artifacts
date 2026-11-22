import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
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

function sanitize(value, seen = new WeakSet(), path = '$') {
  if (value == null) return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return String(value);
  if (['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value !== 'object') return undefined;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError(`Invalid Date at ${path}.`);
    return value.toISOString();
  }
  if (!Array.isArray(value) && !plain(value)) {
    const type = Object.prototype.toString.call(value).slice(8, -1);
    throw new TypeError(`Cannot save ${type} at ${path}. Convert it to explicit save data first.`);
  }
  if (seen.has(value)) throw new TypeError(`Circular save data at ${path}.`);
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item, index) => sanitize(item, seen, `${path}[${index}]`) ?? null);
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
      const clean = sanitize(item, seen, `${path}[${JSON.stringify(key)}]`);
      return clean === undefined ? [] : [[key, clean]];
    }));
  } finally { seen.delete(value); }
}
function timeoutError() {
  const error = new Error(__dialogueText('managers/SaveManager.js', 't_240881d5a9151c71b16b'));
  error.code = 'SAVE_REQUEST_TIMEOUT'; error.outcome = 'unknown'; return error;
}
function bounded(operation, milliseconds, controller) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = timeoutError(); reject(error); controller.abort(error);
    }, milliseconds);
  });
  const task = Promise.resolve().then(() => operation(controller.signal));
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}
function operationId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
function cloudPausedError(record) {
  const error = new Error('Cloud outcome is still unknown for this slot. Local saving remains available; cloud writes are paused to avoid a late overwrite.');
  error.code = 'CLOUD_SLOT_UNCONFIRMED'; error.outcome = 'unknown'; error.operation = record;
  return error;
}
function metadataCaseId(state) {
  const candidates = [state.currentCaseId, state.campaign?.currentCaseId,
    state.currentMission?.caseId, state.currentMission?.id,
    state.currentMission?.missionId, state.currentMissionId];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }
  return null;
}

export class SaveManager {
  constructor({ supabase, getState, applyState, gameVersion = '0.1.0', requestTimeoutMs = 8000 }) {
    if (!supabase || typeof getState !== 'function' || typeof applyState !== 'function') {
      throw new Error('[SaveManager] Missing dependencies.');
    }
    // applyState restores the complete save, including energy, in one transaction.
    Object.assign(this, { supabase, getState, applyState, gameVersion });
    this.requestTimeoutMs = Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 8000;
    this._saveChain = Promise.resolve(); this._controllers = new Set(); this._destroyed = false;
  }
  canSave(context = {}) { return ['office', 'hotel'].includes(context.locationType); }
  validateSlotKey(key) {
    if (!SAVE_CONSTANTS.SLOT_KEYS.includes(key)) throw new Error(`Unsupported slot key: ${key}`);
  }
  validatePreference(prefer) {
    if (!['local', 'cloud', 'newest'].includes(prefer)) throw new Error('Invalid save preference.');
  }
  _enqueue(operation) {
    const run = this._saveChain.then(() => {
      if (this._destroyed) throw new Error('SaveManager has been destroyed.');
      return operation();
    });
    this._saveChain = run.catch(() => {}); return run;
  }
  async _bounded(operation, controller = new AbortController()) {
    if (this._destroyed) throw new Error('SaveManager has been destroyed.');
    this._controllers.add(controller);
    try { return await bounded(operation, this.requestTimeoutMs, controller); }
    finally { this._controllers.delete(controller); }
  }
  _withSignal(query, signal, required = false) {
    if (typeof query?.abortSignal === 'function') return query.abortSignal(signal);
    if (required) {
      const error = new Error('Supabase query does not support abortSignal; cloud mutation was not started.');
      error.code = 'CLOUD_ABORT_UNAVAILABLE'; error.outcome = 'not-started'; throw error;
    }
    return query;
  }
  getLocalKey(key) { return `${SAVE_CONSTANTS.LOCAL_PREFIX}:save:${key}`; }
  getLocalMetaKey(key) { return `${SAVE_CONSTANTS.LOCAL_PREFIX}:meta:${key}`; }
  getCloudMutationKey(key, userId) {
    return `${SAVE_CONSTANTS.LOCAL_PREFIX}:cloud-pending:${encodeURIComponent(String(userId))}:${key}`;
  }
  getCloudMutationStatus(key, userId) {
    this.validateSlotKey(key);
    const raw = localStorage.getItem(this.getCloudMutationKey(key, userId));
    if (!raw) return null;
    try {
      const record = JSON.parse(raw);
      return plain(record) ? record : { outcome: 'unknown', invalidRecord: true };
    } catch { return { outcome: 'unknown', invalidRecord: true }; }
  }
  _clearCloudMutation(key, userId, token) {
    const storageKey = this.getCloudMutationKey(key, userId);
    try {
      const raw = localStorage.getItem(storageKey); if (!raw) return true;
      const record = JSON.parse(raw); if (record?.token !== token) return false;
      localStorage.removeItem(storageKey); return localStorage.getItem(storageKey) === null;
    } catch (error) { console.warn('[SaveManager] Could not clear confirmed cloud operation:', error); return false; }
  }
  async _cloudMutation(key, userId, kind, buildQuery) {
    const pending = this.getCloudMutationStatus(key, userId);
    if (pending) throw cloudPausedError(pending);
    const controller = new AbortController();
    const query = this._withSignal(buildQuery(), controller.signal, true);
    const record = { version: 1, token: operationId(), slotKey: key, kind,
      startedAt: new Date().toISOString(), outcome: 'unknown' };
    const storageKey = this.getCloudMutationKey(key, userId), serialized = JSON.stringify(record);
    localStorage.setItem(storageKey, serialized);
    if (localStorage.getItem(storageKey) !== serialized) throw new Error('Could not record pending cloud operation; request not started.');
    const task = Promise.resolve(query);
    const observation = task.then(response => {
      if (response && typeof response === 'object' && !response.error) {
        this._clearCloudMutation(key, userId, record.token);
      } else if (!controller.signal.aborted && response?.error && response.status >= 400 && response.status < 500 &&
        /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(String(response.error.code || ''))) {
        this._clearCloudMutation(key, userId, record.token);
      }
    }, () => {});
    observation.catch(error => console.warn('[SaveManager] Cloud observation failed:', error));
    try {
      const response = await this._bounded(() => task, controller);
      if (!response || typeof response !== 'object') throw new Error('Invalid cloud response.');
      if (response.error) throw response.error; return response;
    } catch (cause) {
      const error = new Error(message(cause)); error.code = cause?.code || 'CLOUD_OPERATION_UNCONFIRMED';
      error.cause = cause; error.outcome = this.getCloudMutationStatus(key, userId) ? 'unknown' : 'failed'; throw error;
    }
  }
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
    const data = sanitize({ ...raw, ...getEnergyManager().serialize() });
    const state = plain(data.state) ? data.state : data;
    return {
      saveVersion: SAVE_CONSTANTS.CURRENT_SAVE_VERSION, gameVersion: this.gameVersion, slotKey,
      meta: {
        savedAt: new Date().toISOString(),
        agentName: state.playerName || __dialogueText('managers/SaveManager.js', 't_2653ceeec1fd951707a3'),
        locationCode: context.locationCode ?? state.location?.code ?? state.currentLocationId ?? 'unknown',
        cityCode: context.cityCode ?? state.location?.cityCode ?? state.currentCityId ?? null,
        locationType: context.locationType ?? state.location?.type ?? 'unknown',
        caseId: metadataCaseId(state),
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
    return { user_id: userId, slot_key: payload.slotKey,
      save_version: payload.saveVersion, game_version: payload.gameVersion,
      case_id: meta.caseId, case_stage: meta.caseStage, location_code: meta.locationCode, city_code: meta.cityCode,
      day_number: meta.dayNumber, in_game_hour: meta.inGameHour, playtime_sec: meta.playtimeSec,
      last_scene_key: meta.lastSceneKey, is_valid: true, save_data: payload };
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
    if (save.saveVersion !== SAVE_CONSTANTS.CURRENT_SAVE_VERSION) throw new Error('Unsupported save version.');
    return save;
  }
  writeLocal(key, payload) {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(this.getLocalKey(key), serialized);
    if (localStorage.getItem(this.getLocalKey(key)) !== serialized) throw new Error('Local save verification failed.');
    this.writeLocalMeta(key, payload.meta); this.rememberLastUsedSlot(key);
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
      if (raw) { const meta = JSON.parse(raw); if (plain(meta) && meta.agentName) return meta; }
      const save = this.safeReadLocal(key); if (!save) return null;
      const state = save.data.state ?? save.data;
      const meta = { ...save.meta, agentName: save.meta?.agentName || state.playerName ||
        __dialogueText('managers/SaveManager.js', 't_2653ceeec1fd951707a3') };
      this.writeLocalMeta(key, meta); return meta;
    } catch (error) { console.warn('[SaveManager]', error); return null; }
  }
  async getCurrentSession({ strict = false } = {}) {
    try {
      const response = await this._bounded(() => this.supabase.auth.getSession());
      if (!response || typeof response !== 'object') throw new Error('Invalid authentication response.');
      if (response.error) throw response.error; return response.data?.session ?? null;
    } catch (error) { console.warn('[SaveManager] Session unavailable:', error); if (strict) throw error; return null; }
  }
  save(key, context = {}) { return this._enqueue(() => this._performSave(key, context)); }
  async _performSave(key, context) {
    this.validateSlotKey(key);
    if (!this.canSave(context)) throw new Error('Saving is only available in hotel or office.');
    const payload = this.buildSavePayload(key, context); this.writeLocal(key, payload);
    try { context.onLocalSaved?.(payload); } catch (error) { console.warn('[SaveManager] UI callback failed:', error); }
    try {
      const session = await this.getCurrentSession({ strict: true });
      if (!session?.user) return { ok: true, mode: 'local-only', payload, cloudStatus: 'signed-out' };
      await this._cloudMutation(key, session.user.id, 'save', () => this.supabase.from('player_saves')
        .upsert(this.serializeForDatabase(payload, session.user.id), { onConflict: 'user_id,slot_key' }));
      return { ok: true, mode: 'cloud+local', payload, cloudStatus: 'confirmed' };
    } catch (error) {
      console.warn('[SaveManager] Cloud save not confirmed; local save retained:', error);
      return { ok: true, mode: 'local-fallback', payload, warning: message(error),
        cloudStatus: error.outcome === 'unknown' ? 'unknown' : 'unavailable', warningCode: error.code || null };
    }
  }
  async safeReadCloud(key) {
    try {
      const session = await this.getCurrentSession({ strict: true }); if (!session?.user) return null;
      const { data, error } = await this._bounded(signal => this._withSignal(this.supabase.from('player_saves')
        .select('save_data').eq('user_id', session.user.id).eq('slot_key', key).maybeSingle(), signal));
      if (error) throw error; return data ? this.normalizeSave(data) : null;
    } catch (error) { console.warn('[SaveManager] Cloud read failed:', error); return null; }
  }
  // Retained for API compatibility. Normal slot loading must not call this twice.
  restoreEnergyManager(data) { getEnergyManager().restore(data); }
  load(key, prefer = 'newest') { return this._enqueue(() => this._performLoad(key, prefer)); }
  async _performLoad(key, prefer) {
    this.validateSlotKey(key); this.validatePreference(prefer);
    const local = prefer === 'cloud' ? null : this.safeReadLocal(key);
    const cloud = prefer === 'local' ? null : await this.safeReadCloud(key);
    const resolved = this.resolvePreferredSave(local, cloud, prefer); if (!resolved) return null;
    const save = this.migrate(resolved);
    // The injected applyState (saveGameService) already restores energy transactionally.
    if (await this.applyState(save.data) === false) throw new Error('Restoring game state failed.');
    this.rememberLastUsedSlot(key); return save;
  }
  loadLastUsed(prefer = 'newest') { return this.load(this.getLastUsedSlot(), prefer); }
  async listSlots() {
    const local = new Map(SAVE_CONSTANTS.SLOT_KEYS.map(key => [key, this.readLocalMeta(key)]));
    const session = await this.getCurrentSession(); let rows = [];
    if (session?.user) {
      try {
        const { data, error } = await this._bounded(signal => this._withSignal(this.supabase.from('player_saves')
          .select('slot_key,updated_at,location_code,city_code,case_id,case_stage,day_number,in_game_hour,playtime_sec,last_scene_key,save_data->meta')
          .eq('user_id', session.user.id).order('updated_at', { ascending: false }), signal));
        if (error) throw error; rows = data ?? [];
      } catch (error) { console.warn('[SaveManager] Cloud slots unavailable:', error); }
    }
    return SAVE_CONSTANTS.SLOT_KEYS.map(slotKey => {
      const localMeta = local.get(slotKey), row = rows.find(item => item.slot_key === slotKey);
      const cloudMeta = row ? { updatedAt: row.updated_at, locationCode: row.location_code, cityCode: row.city_code,
        caseId: row.case_id, caseStage: row.case_stage, dayNumber: row.day_number, inGameHour: row.in_game_hour,
        playtimeSec: row.playtime_sec, lastSceneKey: row.last_scene_key, ...(plain(row.meta) ? row.meta : {}) } : null;
      return { slotKey, localMeta, cloudMeta,
        preferredSource: this.pickSource(localMeta ? { meta: localMeta } : null, row) };
    });
  }
  _localDeletionSnapshot(key) {
    return new Map([this.getLocalKey(key), this.getLocalMetaKey(key), SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY]
      .map(storageKey => [storageKey, localStorage.getItem(storageKey)]));
  }
  _removeLocalSlot(key, snapshot) {
    const saveKey = this.getLocalKey(key), metaKey = this.getLocalMetaKey(key), lastKey = SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY;
    if (localStorage.getItem(saveKey) !== snapshot.get(saveKey) || localStorage.getItem(metaKey) !== snapshot.get(metaKey)) {
      throw new Error('Local slot changed while cloud deletion was pending. Local copy was retained.');
    }
    const removals = [saveKey, metaKey]; if (localStorage.getItem(lastKey) === key) removals.push(lastKey);
    const previous = new Map(removals.map(storageKey => [storageKey, localStorage.getItem(storageKey)])), touched = [];
    try {
      for (const storageKey of removals) {
        touched.push(storageKey); localStorage.removeItem(storageKey);
        if (localStorage.getItem(storageKey) !== null) throw new Error('Local slot deletion could not be verified.');
      }
    } catch (cause) {
      const rollbackErrors = [];
      for (const storageKey of touched.reverse()) {
        try {
          const value = previous.get(storageKey);
          if (value === null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, value);
        } catch (error) { rollbackErrors.push(message(error)); }
      }
      const error = new Error('Local deletion failed; restoration attempted. ' + message(cause));
      error.cause = cause; error.rollbackErrors = rollbackErrors; throw error;
    }
  }
  deleteSlot(key) { return this._enqueue(() => this._performDeleteSlot(key)); }
  async _performDeleteSlot(key) {
    this.validateSlotKey(key); const snapshot = this._localDeletionSnapshot(key);
    const session = await this.getCurrentSession({ strict: true }); let cloudDeleted = false;
    if (session?.user) {
      await this._cloudMutation(key, session.user.id, 'delete', () => this.supabase.from('player_saves')
        .delete().eq('user_id', session.user.id).eq('slot_key', key)); cloudDeleted = true;
    }
    try { this._removeLocalSlot(key, snapshot); }
    catch (cause) {
      const error = new Error((cloudDeleted ? 'Cloud deletion confirmed, but local cleanup failed. ' : '') + message(cause));
      error.code = 'LOCAL_SLOT_DELETE_FAILED'; error.cloudDeleted = cloudDeleted; error.partial = cloudDeleted;
      error.cause = cause; error.rollbackErrors = cause.rollbackErrors || []; throw error;
    }
    return { ok: true, mode: cloudDeleted ? 'cloud+local' : 'local-only',
      cloudStatus: cloudDeleted ? 'confirmed' : 'signed-out' };
  }
  pickSource(local, cloud) {
    if (!local && !cloud) return 'none'; if (!local) return 'cloud'; if (!cloud) return 'local';
    return timestamp(cloud.meta?.savedAt ?? cloud.updated_at) > timestamp(local.meta?.savedAt) ? 'cloud' : 'local';
  }
  resolvePreferredSave(local, cloud, prefer = 'newest') {
    this.validatePreference(prefer); if (!local && !cloud) return null;
    if (prefer === 'local' || prefer === 'cloud') {
      const save = prefer === 'local' ? local : cloud;
      if (!save) throw new Error(`Requested ${prefer} save does not exist.`); return save;
    }
    if (!local) return cloud; if (!cloud) return local;
    return timestamp(cloud.meta?.savedAt) > timestamp(local.meta?.savedAt) ? cloud : local;
  }
  destroy() {
    this._destroyed = true; for (const controller of this._controllers) controller.abort(); this._controllers.clear();
  }
}
export function createSaveManager(dependencies) { return new SaveManager(dependencies); }