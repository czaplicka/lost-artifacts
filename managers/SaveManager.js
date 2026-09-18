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


/**
 * Zamienia dowolny obiekt runtimeowy w dane nadające się do:
 * - structuredClone
 * - JSON.stringify
 * - localStorage
 * - Supabase JSON / JSONB
 *
 * Save powinien zawierać tylko:
 * - string
 * - number
 * - boolean
 * - null
 * - tablice
 * - zwykłe obiekty
 *
 * Pomijamy funkcje, callbacki, EventEmittery, Phaser Scene,
 * DOM nodes, elementy UI, timery oraz referencje cykliczne.
 */
function sanitizeSaveData(value, path = 'root', seen = new WeakSet()) {
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
      `[SaveManager] Non-finite number skipped at "${path}".`,
      value
    );


    return null;
  }


  if (typeof value === 'undefined') {
    return undefined;
  }


  if (typeof value === 'function') {
    console.warn(
      `[SaveManager] Function skipped at "${path}".`,
      value
    );


    return undefined;
  }


  if (typeof value === 'symbol') {
    console.warn(
      `[SaveManager] Symbol skipped at "${path}".`,
      value
    );


    return undefined;
  }


  if (typeof value === 'bigint') {
    console.warn(
      `[SaveManager] BigInt converted to string at "${path}".`,
      value
    );


    return value.toString();
  }


  if (value instanceof Date) {
    return value.toISOString();
  }


  if (typeof value !== 'object') {
    console.warn(
      `[SaveManager] Unsupported value skipped at "${path}".`,
      value
    );


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
    const sanitizedArray = value.map((item, index) => {
      const sanitizedItem = sanitizeSaveData(
        item,
        `${path}[${index}]`,
        seen
      );


      /*
       * undefined nie może istnieć w JSON jako element tablicy.
       * Zachowujemy indeks elementu przez null.
       */
      return typeof sanitizedItem === 'undefined'
        ? null
        : sanitizedItem;
    });


    seen.delete(value);


    return sanitizedArray;
  }


  const sanitizedObject = {};


  for (const [key, item] of Object.entries(value)) {
    const sanitizedItem = sanitizeSaveData(
      item,
      `${path}.${key}`,
      seen
    );


    if (typeof sanitizedItem !== 'undefined') {
      sanitizedObject[key] = sanitizedItem;
    }
  }


  seen.delete(value);


  return sanitizedObject;
}


/**
 * Tworzy niezależny, czysty snapshot danych.
 *
 * Nie używamy tu bezpośrednio structuredClone, bo ten rzuca
 * DataCloneError dla funkcji — np. Math.random — zanim moglibyśmy
 * je odfiltrować.
 */
function cloneData(value) {
  return sanitizeSaveData(value);
}


function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}


function getSavedAtTimestamp(save) {
  return Date.parse(save?.meta?.savedAt ?? '') || 0;
}


function getCloudTimestamp(cloudRow) {
  return Date.parse(cloudRow?.updated_at ?? '') || 0;
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
  }


  canSave(context = {}) {
    return (
      context.locationType === 'hotel' ||
      context.locationType === 'office'
    );
  }


  validateSlotKey(slotKey) {
    if (!SAVE_CONSTANTS.SLOT_KEYS.includes(slotKey)) {
      throw new Error(`Unsupported slot key: ${slotKey}`);
    }
  }


  getLocalKey(slotKey) {
    return `${SAVE_CONSTANTS.LOCAL_PREFIX}:save:${slotKey}`;
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
    /*
     * getState() może zwrócić obiekt zawierający dane runtimeowe.
     * cloneData() filtruje funkcje i obiekty niezgodne z JSON.
     */
    const rawState = this.getState();
    const state = cloneData(rawState);


    if (!isPlainObject(state)) {
      throw new Error(
        '[SaveManager] getState() must return a plain object.'
      );
    }


    const energyManager = getEnergyManager();


    state.energy = energyManager.getCurrentEnergy();
    state.maxEnergy = energyManager.maxEnergy;
    state.energyLog = cloneData(energyManager.getEnergyLog());
    state.difficulty = energyManager.difficulty;


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


    if (!payload || typeof payload !== 'object') {
      throw new Error('Save payload is invalid.');
    }


    if (!payload.saveVersion) {
      throw new Error('Save payload is missing saveVersion.');
    }


    if (!payload.data || typeof payload.data !== 'object') {
      throw new Error('Save payload is missing game data.');
    }


    return payload;
  }


  migrate(payload) {
    const save = cloneData(payload);


    if (!save || typeof save !== 'object') {
      throw new Error(
        '[SaveManager] Unable to migrate invalid save payload.'
      );
    }


    if (save.saveVersion > SAVE_CONSTANTS.CURRENT_SAVE_VERSION) {
      throw new Error(
        `Save version ${save.saveVersion} is newer than this game version.`
      );
    }


    while (save.saveVersion < SAVE_CONSTANTS.CURRENT_SAVE_VERSION) {
      throw new Error(
        `No migration exists for save version ${save.saveVersion}.`
      );
    }


    return save;
  }


  writeLocal(slotKey, payload) {
    try {
      const serializedPayload = JSON.stringify(payload);


      localStorage.setItem(
        this.getLocalKey(slotKey),
        serializedPayload
      );


      this.rememberLastUsedSlot(slotKey);
    } catch (error) {
      throw new Error(
        `[SaveManager] Failed to write local save "${slotKey}": ${error.message}`
      );
    }
  }


  readLocal(slotKey) {
    try {
      const raw = localStorage.getItem(this.getLocalKey(slotKey));


      if (!raw) {
        return null;
      }


      return this.normalizeSave(JSON.parse(raw));
    } catch (error) {
      throw new Error(
        `[SaveManager] Failed to parse local save "${slotKey}": ${error.message}`
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


  async getCurrentSession() {
    try {
      const { data, error } = await this.supabase.auth.getSession();


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


  async save(slotKey, context = {}) {
    this.validateSlotKey(slotKey);


    if (!this.canSave(context)) {
      throw new Error(
        'Saving is only available in hotel or office.'
      );
    }


    console.log('[SaveManager] Save requested:', {
      slotKey,
      context
    });


    const payload = this.buildSavePayload(slotKey, context);


    try {
      this.writeLocal(slotKey, payload);


      console.log(
        '[SaveManager] Local save written:',
        this.getLocalKey(slotKey)
      );
    } catch (error) {
      console.error(
        '[SaveManager] Local save failed:',
        error
      );


      throw error;
    }


    const session = await this.getCurrentSession();
    const user = session?.user ?? null;


    if (!user) {
      return {
        ok: true,
        mode: 'local-only',
        payload
      };
    }


    const dbRow = this.serializeForDatabase(payload, user.id);


    const { error: cloudError } = await this.supabase
      .from('player_saves')
      .upsert(dbRow, {
        onConflict: 'user_id,slot_key'
      });


    if (cloudError) {
      console.warn(
        '[SaveManager] Cloud save failed. Local save remains valid:',
        cloudError.message
      );


      return {
        ok: true,
        mode: 'local-fallback',
        payload,
        warning: cloudError.message
      };
    }


    console.log(
      '[SaveManager] Cloud save written:',
      slotKey
    );


    return {
      ok: true,
      mode: 'cloud+local',
      payload
    };
  }


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


  restoreEnergyManager(state) {
    const energyManager = getEnergyManager();


    energyManager.restore({
      energy: state.energy,
      maxEnergy: state.maxEnergy,
      difficulty: state.difficulty,
      energyLog: Array.isArray(state.energyLog)
        ? state.energyLog
        : []
    });


    console.log('[SaveManager] Energy restored from save.', {
      energy: energyManager.getCurrentEnergy(),
      maxEnergy: energyManager.maxEnergy,
      difficulty: energyManager.difficulty
    });
  }


  async load(slotKey, prefer = 'newest') {
    this.validateSlotKey(slotKey);


    const localSave = this.safeReadLocal(slotKey);
    const cloudSave = await this.safeReadCloud(slotKey);


    const resolvedSave = this.resolvePreferredSave(
      localSave,
      cloudSave,
      prefer
    );


    /*
     * Pusty slot: nie wywołujemy applyState(), więc aktualny
     * stan gry nie zostanie ani wyczyszczony, ani nadpisany.
     */
    if (!resolvedSave) {
      return null;
    }


    const migratedSave = this.migrate(resolvedSave);
    const restoredState = cloneData(migratedSave.data);


    if (!isPlainObject(restoredState)) {
      throw new Error(
        '[SaveManager] Restored save state is invalid.'
      );
    }


    this.applyState(restoredState);
    this.restoreEnergyManager(restoredState);


    this.rememberLastUsedSlot(slotKey);


    console.log('[SaveManager] Save loaded:', {
      slotKey,
      requestedPreference: prefer,
      savedAt: migratedSave.meta?.savedAt ?? null
    });


    return migratedSave;
  }


  async loadLastUsed(prefer = 'newest') {
    const slotKey = this.getLastUsedSlot();


    return this.load(slotKey, prefer);
  }


  async listSlots() {
    const localSlots = SAVE_CONSTANTS.SLOT_KEYS.map((slotKey) => ({
      slotKey,
      local: this.safeReadLocal(slotKey)
    }));


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


    return SAVE_CONSTANTS.SLOT_KEYS.map((slotKey) => {
      const localSave = localSlots.find(
        (item) => item.slotKey === slotKey
      )?.local ?? null;


      const cloudRow = cloudRows.find(
        (row) => row.slot_key === slotKey
      ) ?? null;


      return {
        slotKey,


        localMeta: localSave?.meta ?? null,


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
          localSave,
          cloudRow
        )
      };
    });
  }


  async deleteSlot(slotKey) {
    this.validateSlotKey(slotKey);


    try {
      localStorage.removeItem(this.getLocalKey(slotKey));
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


    const localTimestamp = getSavedAtTimestamp(localSave);
    const cloudTimestamp = getCloudTimestamp(cloudRow);


    return cloudTimestamp > localTimestamp
      ? 'cloud'
      : 'local';
  }


  resolvePreferredSave(localSave, cloudSave, prefer = 'newest') {
    const supportedPreferences = ['local', 'cloud', 'newest'];


    if (!supportedPreferences.includes(prefer)) {
      throw new Error(
        `[SaveManager] Unsupported save preference: "${prefer}". ` +
        'Expected "local", "cloud", or "newest".'
      );
    }


    /*
     * Pusty slot jest normalną sytuacją.
     * Zwracamy null, a load() kończy się przed applyState().
     */
    if (!localSave && !cloudSave) {
      console.warn(
        '[SaveManager] No save found in either source.',
        {
          prefer,
          hasLocalSave: false,
          hasCloudSave: false
        }
      );


      return null;
    }


    /*
     * Local został wybrany celowo:
     * nie zastępujemy go automatycznie cloud save'em.
     */
    if (prefer === 'local') {
      if (!localSave) {
        throw new Error(
          '[SaveManager] Local save was requested, but it does not exist.'
        );
      }


      return localSave;
    }


    /*
     * Cloud został wybrany celowo:
     * nie zastępujemy go automatycznie local save'em.
     */
    if (prefer === 'cloud') {
      if (!cloudSave) {
        throw new Error(
          '[SaveManager] Cloud save was requested, but it does not exist.'
        );
      }


      return cloudSave;
    }


    /*
     * newest: gdy istnieje tylko jeden save,
     * używamy jedynego dostępnego źródła.
     */
    if (!localSave) {
      console.warn(
        '[SaveManager] Local save unavailable; using cloud save.'
      );


      return cloudSave;
    }


    if (!cloudSave) {
      console.warn(
        '[SaveManager] Cloud save unavailable; using local save.'
      );


      return localSave;
    }


    /*
     * Gdy istnieją oba zapisy, wybieramy nowszy.
     * Przy identycznych datach wybieramy local.
     */
    const localTimestamp = getSavedAtTimestamp(localSave);
    const cloudTimestamp = getSavedAtTimestamp(cloudSave);


    return cloudTimestamp > localTimestamp
      ? cloudSave
      : localSave;
  }
}


export function createSaveManager(dependencies) {
  return new SaveManager(dependencies);
}