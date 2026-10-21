import { getEnergyManager } from './EnergyManager.js';

export const SAVE_CONSTANTS = {
  CURRENT_SAVE_VERSION: 1,
  SLOT_KEYS: [
    'slot_1',
    'slot_2',
    'slot_3'
  ],
  LOCAL_PREFIX: 'lost-artefacts',
  LOCAL_LAST_USED_SLOT_KEY: 'lost-artefacts:last-used-slot'
};

const SUPPORTED_PREFERENCES = new Set([
  'local',
  'cloud',
  'newest'
]);

function sanitizeSaveData(
  value,
  path = 'root',
  seen = new WeakSet()
) {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }

    console.warn(
      `[SaveManager] Non-finite number replaced with null at "${path}".`
    );

    return null;
  }

  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'function') {
    console.warn(
      `[SaveManager] Function skipped at "${path}".`
    );

    return undefined;
  }

  if (typeof value === 'symbol') {
    console.warn(
      `[SaveManager] Symbol skipped at "${path}".`
    );

    return undefined;
  }

  if (typeof value === 'bigint') {
    console.warn(
      `[SaveManager] BigInt converted to string at "${path}".`
    );

    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  if (seen.has(value)) {
    console.warn(
      `[SaveManager] Circular reference skipped at "${path}".`
    );

    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const result = value.map((item, index) => {
      const sanitized = sanitizeSaveData(
        item,
        `${path}[${index}]`,
        seen
      );

      return sanitized === undefined ? null : sanitized;
    });

    seen.delete(value);
    return result;
  }

  const result = {};

  for (const [key, item] of Object.entries(value)) {
    const sanitized = sanitizeSaveData(
      item,
      `${path}.${key}`,
      seen
    );

    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }

  seen.delete(value);
  return result;
}

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function getSavedAtTimestamp(save) {
  return Date.parse(save?.meta?.savedAt ?? '') || 0;
}

function getCloudTimestamp(cloudRow) {
  return Date.parse(cloudRow?.updated_at ?? '') || 0;
}

function getErrorMessage(error) {
  return typeof error?.message === 'string'
    ? error.message
    : String(error);
}

export class SaveManager {
  constructor({
    supabase,
    getState,
    applyState,
    gameVersion = '0.1.0'
  }) {
    if (!supabase) {
      throw new Error(
        '[SaveManager] Missing required dependency: supabase.'
      );
    }

    if (typeof getState !== 'function') {
      throw new Error(
        '[SaveManager] Missing required dependency: getState.'
      );
    }

    if (typeof applyState !== 'function') {
      throw new Error(
        '[SaveManager] Missing required dependency: applyState.'
      );
    }

    this.supabase = supabase;
    this.getState = getState;
    this.applyState = applyState;
    this.gameVersion = gameVersion;

    this._saveChain = Promise.resolve();
  }

  canSave(context = {}) {
    return (
      context.locationType === 'hotel' ||
      context.locationType === 'office'
    );
  }

  validateSlotKey(slotKey) {
    if (!SAVE_CONSTANTS.SLOT_KEYS.includes(slotKey)) {
      throw new Error(
        `Unsupported slot key: ${slotKey}`
      );
    }
  }

  validatePreference(prefer) {
    if (!SUPPORTED_PREFERENCES.has(prefer)) {
      throw new Error(
        `[SaveManager] Unsupported save preference: "${prefer}". ` +
        'Expected "local", "cloud", or "newest".'
      );
    }
  }

  getLocalKey(slotKey) {
    return `${SAVE_CONSTANTS.LOCAL_PREFIX}:save:${slotKey}`;
  }

  getLocalMetaKey(slotKey) {
    return `${SAVE_CONSTANTS.LOCAL_PREFIX}:meta:${slotKey}`;
  }

  rememberLastUsedSlot(slotKey) {
    try {
      localStorage.setItem(
        SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY,
        slotKey
      );
    } catch (error) {
      console.warn(
        '[SaveManager] Failed to remember last used slot:',
        error
      );
    }
  }

  getLastUsedSlot() {
    try {
      const slotKey = localStorage.getItem(
        SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY
      );

      return SAVE_CONSTANTS.SLOT_KEYS.includes(slotKey)
        ? slotKey
        : 'slot_1';
    } catch (error) {
      console.warn(
        '[SaveManager] Failed to read last used slot:',
        error
      );

      return 'slot_1';
    }
  }

  buildSavePayload(slotKey, context = {}) {
    const rawState = this.getState();

    if (!isPlainObject(rawState)) {
      throw new Error(
        '[SaveManager] getState() must return a plain object.'
      );
    }

    const energyManager = getEnergyManager();

    // Jedna sanitizacja = jedna głęboka kopia całego stanu.
    const state = sanitizeSaveData({
      ...rawState,
      energy: energyManager.getCurrentEnergy(),
      maxEnergy: energyManager.maxEnergy,
      energyLog: energyManager.getEnergyLog(),
      difficulty: energyManager.difficulty
    });

    return {
      saveVersion: SAVE_CONSTANTS.CURRENT_SAVE_VERSION,
      gameVersion: this.gameVersion,
      slotKey,

      meta: {
        savedAt: new Date().toISOString(),

        locationCode:
          context.locationCode ??
          state.location?.code ??
          state.currentLocationId ??
          'unknown',

        cityCode:
          context.cityCode ??
          state.location?.cityCode ??
          state.currentCityId ??
          null,

        locationType:
          context.locationType ??
          state.location?.type ??
          'unknown',

        caseId:
          state.campaign?.currentCaseId ??
          state.currentMission?.id ??
          state.currentMissionId ??
          null,

        caseStage:
          state.campaign?.currentStage ??
          state.currentPhase ??
          state.currentStep ??
          null,

        dayNumber:
          state.time?.dayNumber ??
          state.dayNumber ??
          state.gameDay ??
          state.day ??
          1,

        inGameHour:
          state.time?.hour ??
          state.hour ??
          state.gameHour ??
          8,

        playtimeSec:
          state.player?.playtimeSec ??
          state.playtimeSec ??
          0,

        lastSceneKey:
          context.sceneKey ??
          state.scene?.key ??
          'GameScene'
      },

      data: state
    };
  }

  serializeForDatabase(payload, userId) {
    return {
      user_id: userId,
      slot_key: payload.slotKey,

      save_version: payload.saveVersion,
      game_version: payload.gameVersion,

      case_id: payload.meta.caseId,
      case_stage: payload.meta.caseStage,
      location_code: payload.meta.locationCode,
      city_code: payload.meta.cityCode,
      day_number: payload.meta.dayNumber,
      in_game_hour: payload.meta.inGameHour,
      playtime_sec: payload.meta.playtimeSec,
      last_scene_key: payload.meta.lastSceneKey,

      is_valid: true,
      save_data: payload
    };
  }

  normalizeSave(raw) {
    const payload = raw?.save_data ?? raw;

    if (!isPlainObject(payload)) {
      throw new Error(
        'Save payload is invalid.'
      );
    }

    if (
      !Number.isInteger(payload.saveVersion) ||
      payload.saveVersion < 1
    ) {
      throw new Error(
        'Save payload has an invalid saveVersion.'
      );
    }

    if (!isPlainObject(payload.data)) {
      throw new Error(
        'Save payload is missing valid game data.'
      );
    }

    return payload;
  }

  // Dane z JSON.parse / Supabase są już świeżą kopią, więc bez dodatkowego klonowania.
  migrate(payload) {
    const save = this.normalizeSave(payload);

    if (
      save.saveVersion >
      SAVE_CONSTANTS.CURRENT_SAVE_VERSION
    ) {
      throw new Error(
        `Save version ${save.saveVersion} is newer ` +
        'than this game version.'
      );
    }

    if (
      save.saveVersion <
      SAVE_CONSTANTS.CURRENT_SAVE_VERSION
    ) {
      throw new Error(
        `No migration exists for save version ${save.saveVersion}.`
      );
    }

    return save;
  }

  writeLocal(slotKey, payload) {
    try {
      localStorage.setItem(
        this.getLocalKey(slotKey),
        JSON.stringify(payload)
      );

      this.rememberLastUsedSlot(slotKey);
    } catch (error) {
      throw new Error(
        `[SaveManager] Failed to write local save "${slotKey}": ` +
        getErrorMessage(error)
      );
    }

    this.writeLocalMeta(slotKey, payload.meta);
  }

  writeLocalMeta(slotKey, meta) {
    try {
      localStorage.setItem(
        this.getLocalMetaKey(slotKey),
        JSON.stringify(meta)
      );
    } catch (error) {
      console.warn(
        `[SaveManager] Failed to write local meta ${slotKey}:`,
        error
      );
    }
  }

  readLocal(slotKey) {
    try {
      const raw = localStorage.getItem(
        this.getLocalKey(slotKey)
      );

      if (!raw) {
        return null;
      }

      return this.normalizeSave(
        JSON.parse(raw)
      );
    } catch (error) {
      throw new Error(
        `[SaveManager] Failed to read local save "${slotKey}": ` +
        getErrorMessage(error)
      );
    }
  }

  safeReadLocal(slotKey) {
    try {
      return this.readLocal(slotKey);
    } catch (error) {
      console.warn(
        `[SaveManager] Failed to read local save ${slotKey}:`,
        error
      );

      return null;
    }
  }

  // Czyta tylko małe metadane. Stary zapis bez meta jest czytany raz i meta jest dopisywane.
  readLocalMeta(slotKey) {
    try {
      const rawMeta = localStorage.getItem(
        this.getLocalMetaKey(slotKey)
      );

      if (rawMeta) {
        const meta = JSON.parse(rawMeta);

        if (isPlainObject(meta)) {
          return meta;
        }
      }
    } catch (error) {
      console.warn(
        `[SaveManager] Failed to read local meta ${slotKey}:`,
        error
      );
    }

    const save = this.safeReadLocal(slotKey);

    if (!save) {
      return null;
    }

    const meta = save.meta ?? null;

    if (meta) {
      this.writeLocalMeta(slotKey, meta);
    }

    return meta;
  }

  async getCurrentSession() {
    try {
      const { data, error } =
        await this.supabase.auth.getSession();

      if (error) {
        console.warn(
          '[SaveManager] Session lookup failed:',
          error.message
        );

        return null;
      }

      return data?.session ?? null;
    } catch (error) {
      console.warn(
        '[SaveManager] Session lookup failed:',
        error
      );

      return null;
    }
  }

  // Zapisy idą po kolei, żeby dwa naraz nie nadpisywały się w chmurze.
  save(slotKey, context = {}) {
    const run = this._saveChain.then(() =>
      this._performSave(slotKey, context)
    );

    this._saveChain = run.catch(() => {});

    return run;
  }

  async _performSave(slotKey, context) {
    this.validateSlotKey(slotKey);

    if (!this.canSave(context)) {
      throw new Error(
        'Saving is only available in hotel or office.'
      );
    }

    const payload = this.buildSavePayload(
      slotKey,
      context
    );

    this.writeLocal(slotKey, payload);

    const session = await this.getCurrentSession();
    const user = session?.user ?? null;

    if (!user) {
      return {
        ok: true,
        mode: 'local-only',
        payload
      };
    }

    try {
      const dbRow = this.serializeForDatabase(
        payload,
        user.id
      );

      const { error } = await this.supabase
        .from('player_saves')
        .upsert(dbRow, {
          onConflict: 'user_id,slot_key'
        });

      if (error) {
        throw error;
      }

      return {
        ok: true,
        mode: 'cloud+local',
        payload
      };
    } catch (error) {
      const warning = getErrorMessage(error);

      console.warn(
        '[SaveManager] Cloud save failed. ' +
        'Local save remains valid:',
        warning
      );

      return {
        ok: true,
        mode: 'local-fallback',
        payload,
        warning
      };
    }
  }

  destroy() {}

  async safeReadCloud(slotKey) {
    try {
      const session = await this.getCurrentSession();
      const user = session?.user ?? null;

      if (!user) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('player_saves')
        .select('save_data')
        .eq('user_id', user.id)
        .eq('slot_key', slotKey)
        .maybeSingle();

      if (error) {
        console.warn(
          `[SaveManager] Failed to read cloud save ${slotKey}:`,
          error.message
        );

        return null;
      }

      if (!data) {
        return null;
      }

      return this.normalizeSave(data);
    } catch (error) {
      console.warn(
        `[SaveManager] Failed to read cloud save ${slotKey}:`,
        error
      );

      return null;
    }
  }

  restoreEnergyManager(energyData) {
    const energyManager = getEnergyManager();

    energyManager.restore({
      energy: energyData.energy,
      maxEnergy: energyData.maxEnergy,
      difficulty: energyData.difficulty,

      energyLog: Array.isArray(energyData.energyLog)
        ? energyData.energyLog
        : []
    });
  }

  async load(slotKey, prefer = 'newest') {
    this.validateSlotKey(slotKey);
    this.validatePreference(prefer);

    let localSave = null;
    let cloudSave = null;

    if (prefer !== 'cloud') {
      localSave = this.safeReadLocal(slotKey);
    }

    if (prefer !== 'local') {
      cloudSave = await this.safeReadCloud(slotKey);
    }

    const resolvedSave = this.resolvePreferredSave(
      localSave,
      cloudSave,
      prefer
    );

    if (!resolvedSave) {
      return null;
    }

    const migratedSave = this.migrate(resolvedSave);
    const restoredState = migratedSave.data;

    // Dane energii zapamiętane przed applyState, bo applyState może zmienić obiekt.
    const energyData = {
      energy: restoredState.energy,
      maxEnergy: restoredState.maxEnergy,
      difficulty: restoredState.difficulty,
      energyLog: Array.isArray(restoredState.energyLog)
        ? restoredState.energyLog
        : []
    };

    const applied = this.applyState(restoredState);

    if (applied === false) {
      throw new Error(
        '[SaveManager] Applying the restored state failed.'
      );
    }

    this.restoreEnergyManager(energyData);
    this.rememberLastUsedSlot(slotKey);

    return migratedSave;
  }

  async loadLastUsed(prefer = 'newest') {
    return this.load(
      this.getLastUsedSlot(),
      prefer
    );
  }

  async listSlots() {
    const localMetas = new Map(
      SAVE_CONSTANTS.SLOT_KEYS.map((slotKey) => [
        slotKey,
        this.readLocalMeta(slotKey)
      ])
    );

    const session = await this.getCurrentSession();
    const user = session?.user ?? null;

    let cloudRows = [];

    if (user) {
      const { data, error } = await this.supabase
        .from('player_saves')
        .select(`
          slot_key,
          updated_at,
          location_code,
          city_code,
          case_id,
          case_stage,
          day_number,
          in_game_hour,
          playtime_sec,
          last_scene_key
        `)
        .eq('user_id', user.id)
        .order('updated_at', {
          ascending: false
        });

      if (error) {
        console.warn(
          '[SaveManager] Failed to list cloud save slots:',
          error.message
        );
      } else {
        cloudRows = data ?? [];
      }
    }

    const cloudSaves = new Map(
      cloudRows.map((row) => [
        row.slot_key,
        row
      ])
    );

    return SAVE_CONSTANTS.SLOT_KEYS.map((slotKey) => {
      const localMeta = localMetas.get(slotKey) ?? null;
      const cloudRow = cloudSaves.get(slotKey) ?? null;

      return {
        slotKey,

        localMeta,

        cloudMeta: cloudRow
          ? {
              updatedAt: cloudRow.updated_at,
              locationCode: cloudRow.location_code,
              cityCode: cloudRow.city_code,
              caseId: cloudRow.case_id,
              caseStage: cloudRow.case_stage,
              dayNumber: cloudRow.day_number,
              inGameHour: cloudRow.in_game_hour,
              playtimeSec: cloudRow.playtime_sec,
              lastSceneKey: cloudRow.last_scene_key
            }
          : null,

        preferredSource: this.pickSource(
          localMeta ? { meta: localMeta } : null,
          cloudRow
        )
      };
    });
  }

  async deleteSlot(slotKey) {
    this.validateSlotKey(slotKey);

    try {
      localStorage.removeItem(
        this.getLocalKey(slotKey)
      );

      localStorage.removeItem(
        this.getLocalMetaKey(slotKey)
      );
    } catch (error) {
      console.warn(
        `[SaveManager] Failed to delete local save ${slotKey}:`,
        error
      );
    }

    const session = await this.getCurrentSession();
    const user = session?.user ?? null;

    if (!user) {
      return {
        ok: true,
        mode: 'local-only'
      };
    }

    const { error } = await this.supabase
      .from('player_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_key', slotKey);

    if (error) {
      throw new Error(
        `[SaveManager] Cloud delete failed: ${error.message}`
      );
    }

    return {
      ok: true,
      mode: 'cloud+local'
    };
  }

  pickSource(localSave, cloudRow) {
    if (!localSave && !cloudRow) {
      return 'none';
    }

    if (!localSave) {
      return 'cloud';
    }

    if (!cloudRow) {
      return 'local';
    }

    return getCloudTimestamp(cloudRow) >
      getSavedAtTimestamp(localSave)
      ? 'cloud'
      : 'local';
  }

  resolvePreferredSave(
    localSave,
    cloudSave,
    prefer = 'newest'
  ) {
    this.validatePreference(prefer);

    if (!localSave && !cloudSave) {
      return null;
    }

    if (prefer === 'local') {
      if (!localSave) {
        throw new Error(
          '[SaveManager] Local save was requested, ' +
          'but it does not exist.'
        );
      }

      return localSave;
    }

    if (prefer === 'cloud') {
      if (!cloudSave) {
        throw new Error(
          '[SaveManager] Cloud save was requested, ' +
          'but it does not exist.'
        );
      }

      return cloudSave;
    }

    if (!localSave) {
      return cloudSave;
    }

    if (!cloudSave) {
      return localSave;
    }

    return getSavedAtTimestamp(cloudSave) >
      getSavedAtTimestamp(localSave)
      ? cloudSave
      : localSave;
  }
}

export function createSaveManager(dependencies) {
  return new SaveManager(dependencies);
}