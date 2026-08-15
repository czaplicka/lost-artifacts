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

function cloneData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export class SaveManager {
  constructor({
    supabase,
    getState,
    applyState,
    gameVersion = '0.1.0'
  }) {
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
      return (
        localStorage.getItem(
          SAVE_CONSTANTS.LOCAL_LAST_USED_SLOT_KEY
        ) || 'slot_1'
      );
    } catch {
      return 'slot_1';
    }
  }

  buildSavePayload(slotKey, context = {}) {
    const state = cloneData(this.getState());
    const energyManager = getEnergyManager();

    /*
     * Save the source of truth from the singleton manager.
     * gameState is also updated so the plain save object stays complete.
     */
    state.energy = energyManager.getCurrentEnergy();
    state.maxEnergy = energyManager.maxEnergy;
    state.energyLog = energyManager.getEnergyLog();
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

    if (!payload?.saveVersion) {
      throw new Error('Save payload is missing saveVersion.');
    }

    if (!payload?.data || typeof payload.data !== 'object') {
      throw new Error('Save payload is missing game data.');
    }

    return payload;
  }

  migrate(payload) {
    const save = cloneData(payload);

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
    localStorage.setItem(
      this.getLocalKey(slotKey),
      JSON.stringify(payload)
    );

    this.rememberLastUsedSlot(slotKey);
  }

  readLocal(slotKey) {
    const raw = localStorage.getItem(this.getLocalKey(slotKey));

    if (!raw) {
      return null;
    }

    return this.normalizeSave(JSON.parse(raw));
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

      throw new Error(
        `Unable to write local save: ${error.message}`
      );
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

      if (error || !data) {
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
      energyLog: state.energyLog
    });

    console.log('[SaveManager] Energy restored from save.', {
      energy: energyManager.getCurrentEnergy(),
      maxEnergy: energyManager.maxEnergy,
      difficulty: energyManager.difficulty
    });
  }

restoreUIScene(scene) {
  if (!scene?.scene) {
    console.warn(
      '[SaveManager] PlayerHudScene was not restored because load() received no Phaser scene.'
    );
    return;
  }

  const sceneManager = scene.scene;
  const hudKey = 'PlayerHudScene';

  if (sceneManager.isActive(hudKey)) {
    sceneManager.bringToTop(hudKey);
    return;
  }

  if (sceneManager.isSleeping(hudKey)) {
    sceneManager.wake(hudKey);
    sceneManager.bringToTop(hudKey);
    return;
  }

  sceneManager.launch(hudKey);
  sceneManager.bringToTop(hudKey);
}

  async load(slotKey, prefer = 'local', scene = null) {
    this.validateSlotKey(slotKey);

    const localSave = this.safeReadLocal(slotKey);
    const cloudSave = await this.safeReadCloud(slotKey);

    const resolvedSave = this.resolvePreferredSave(
      localSave,
      cloudSave,
      prefer
    );

    if (!resolvedSave) {
      return null;
    }

    const migratedSave = this.migrate(resolvedSave);
    const restoredState = cloneData(migratedSave.data);

    /*
     * First restore plain game state,
     * then restore singleton state used by gameplay and UI.
     */
    this.applyState(restoredState);
    this.restoreEnergyManager(restoredState);
    this.restoreUIScene(scene);

    this.rememberLastUsedSlot(slotKey);

    return migratedSave;
  }

  async loadLastUsed(prefer = 'local', scene = null) {
    const slotKey = this.getLastUsedSlot();

    return this.load(slotKey, prefer, scene);
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
        .from('player_save_slots')
        .select('*')
        .order('updated_at', {
          ascending: false
        });

      if (!error) {
        cloudRows = data ?? [];
      } else {
        console.warn(
          '[SaveManager] Failed to list cloud save slots:',
          error.message
        );
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
              playtimeSec: cloudRow.playtime_sec
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

    localStorage.removeItem(this.getLocalKey(slotKey));

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
      throw error;
    }

    return {
      ok: true,
      mode: 'cloud+local'
    };
  }

  pickSource(localSave, cloudRow) {
    const localTimestamp = Date.parse(
      localSave?.meta?.savedAt ?? ''
    ) || 0;

    const cloudTimestamp = Date.parse(
      cloudRow?.updated_at ?? ''
    ) || 0;

    if (!localSave && !cloudRow) {
      return 'none';
    }

    return cloudTimestamp > localTimestamp
      ? 'cloud'
      : 'local';
  }

  resolvePreferredSave(localSave, cloudSave, prefer = 'newest') {
    if (!localSave && !cloudSave) {
      return null;
    }

    if (!localSave) {
      return cloudSave;
    }

    if (!cloudSave) {
      return localSave;
    }

    if (prefer === 'local') {
      return localSave;
    }

    if (prefer === 'cloud') {
      return cloudSave;
    }

    const localTimestamp = Date.parse(
      localSave?.meta?.savedAt ?? ''
    ) || 0;

    const cloudTimestamp = Date.parse(
      cloudSave?.meta?.savedAt ?? ''
    ) || 0;

    return cloudTimestamp > localTimestamp
      ? cloudSave
      : localSave;
  }
}

export function createSaveManager(dependencies) {
  return new SaveManager(dependencies);
}