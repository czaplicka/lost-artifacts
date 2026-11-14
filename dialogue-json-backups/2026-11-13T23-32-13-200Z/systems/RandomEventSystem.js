import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { getClockMinutes, getCaseClockStatus } from '../CaseTimeHelper.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { moneyManager } from '../managers/MoneyManager.js';
import { applyReputationEvent } from '../managers/ReputationManager.js';
import { requestAutosave, saveGameState, clearSavedGame } from '../gameStatePersistence.js';

const OWNER = 'RandomEventSystem';
const HEALTH_ID = 'random_event_health';
const SAFE = new Set(['CityScene', 'CrimeCityScene']);
const HUD = new Set(['UIScene', 'NewsHud', 'PlayerHudScene', 'EnergyHudScene', '__LostArtifactsAudioHost']);
function key() {
    const m = gameState.currentMission || {};
    return JSON.stringify([gameState.currentCaseId ?? null, m.id ?? m.missionId ?? null,
        gameState.investigationStartTime ?? null, gameState.currentThiefId ?? null]);
}
function active() {
    const clock = getCaseClockStatus(gameState);
    return !!gameState.isGameActive && !gameState.caseFailed && !gameState.caseResolved &&
        !clock.totalExpired && !clock.crimeExpired;
}
function settings() { return getDifficultyConfig(gameState.difficulty).randomEvents; }
function read(day = Number(gameState.currentDay) || 1) {
    const s = gameState.randomEventState;
    if (s?.version === 2 && s.caseKey === key()) return structuredClone(s);
    return { version: 2, caseKey: key(), lastRollDay: day, count: 0,
        pending: null, effect: null, history: [] };
}
function write(s) { gameState.updateState({ randomEventState: s }); }

export const RandomEventSystem = {
    game: null, opening: false, stableScene: null, stableAt: 0, lastTick: 0,
    install(game, SceneClass) {
        if (this.game === game) return;
        this.dispose();
        this.game = game;
        if (!game.scene.keys.RandomEventScene) game.scene.add('RandomEventScene', SceneClass, false);
        EventBus.on('gameTime:advanced', this.onTimeAdvanced, this, OWNER);
        this.tickBound = this.tick.bind(this);
        this.destroyBound = () => this.dispose();
        game.events.on('poststep', this.tickBound);
        game.events.once('destroy', this.destroyBound);
        const local = typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (local) game.randomEvents = {
            force: type => this.force(type), inspect: () => structuredClone(gameState.randomEventState ?? null)
        };
    },
    dispose() {
        EventBus.clearScope(OWNER);
        if (this.game) {
            this.game.events.off('poststep', this.tickBound);
            this.game.events.off('destroy', this.destroyBound);
            delete this.game.randomEvents;
        }
        this.game = null;
        this.opening = false;
        this.stableScene = null;
        this.stableAt = 0;
        this.lastTick = 0;
    },
    onTimeAdvanced({ fromDay, toDay, addedMinutes }) {
        if (!addedMinutes || !active()) return;
        const s = read(fromDay);
        const cfg = settings();
        for (let day = Math.max(fromDay, Number(s.lastRollDay) || fromDay) + 1; day <= toDay; day++) {
            s.lastRollDay = day;
            if (!cfg.enabled || s.pending || s.count >= cfg.maxEventsPerCase) continue;
            if (Math.random() >= cfg.dailyChance) continue;
            const type = Math.random() < 0.5 ? 'illness' : 'bribe';
            s.pending = { id: `${s.caseKey}:${day}:${type}`, type, day };
            s.count += 1;
        }
        if (s.effect && getClockMinutes(gameState) >= s.effect.expiresAt) s.effect = null;
        write(s);
        this.syncEffect();
        requestAutosave();
    },
    syncEffect() {
        const energy = getEnergyManager();
        const s = gameState.randomEventState;
        const effect = s?.version === 2 && s.caseKey === key() ? s.effect : null;
        const remaining = effect ? (effect.expiresAt - getClockMinutes(gameState)) / 60 : 0;
        const existing = energy.getEnergyModifiers().find(e => e.id === HEALTH_ID);
        if (!effect || !Number.isFinite(remaining) || remaining <= 0) {
            if (existing) energy.removeEnergyModifier(HEALTH_ID);
            return;
        }
        if (!existing || existing.multiplier !== effect.multiplier ||
            Math.abs(existing.remainingHours - remaining) > 0.000001) {
            energy.addEnergyModifier({ id: HEALTH_ID, group: 'random_event_health',
                label: effect.label, multiplier: effect.multiplier, durationHours: remaining });
        }
    },
    eligibleScene() {
        if (!this.game || !active() || !settings().enabled) return null;
        const energy = getEnergyManager();
        if (energy.isForcedSleepActive() || energy.isManualSleepActive()) return null;
        const scenes = this.game.scene.getScenes(true);
        const host = scenes.find(s => SAFE.has(s.sys.settings.key));
        if (!host || !host.input?.enabled || host._cleanupDone || host._sceneLoaderNavInFlight ||
            host.isTransitioning || host.isSettingUpUi || host.isVisitingApartment ||
            host._overlayLoadsInFlight?.size || host.crimeTutorial?.isActive?.() || gameState.pendingPhoneCall) return null;
        if (scenes.some(s => s !== host && !HUD.has(s.sys.settings.key))) return null;
        return host;
    },
    tick() {
        const now = performance.now();
        if (now - this.lastTick < 150) return;
        this.lastTick = now;
        this.syncEffect();
        if (this.opening || this.game.scene.isActive('RandomEventScene')) return;
        const host = this.eligibleScene();
        const pending = read().pending;
        if (!host || !pending) { this.stableScene = null; return; }
        if (this.stableScene !== host) { this.stableScene = host; this.stableAt = now; return; }
        if (now - this.stableAt < 900) return;
        this.maybeTrigger(host);
    },
    maybeTrigger(scene) {
        if (this.opening || scene !== this.eligibleScene()) return false;
        const pending = read().pending;
        if (!pending) return false;
        this.opening = true;
        const paused = [];
        try {
            scene.getPlayerHudScene?.()?.closeAllUIPanels?.();
            for (const s of this.game.scene.getScenes(true)) {
                const k = s.sys.settings.key;
                if (k === '__LostArtifactsAudioHost') continue;
                paused.push(k);
                this.game.scene.pause(k);
            }
            this.game.scene.start('RandomEventScene', {
                pendingId: pending.id, caseKey: key(), paused, sourceScene: scene.sys.settings.key
            });
            this.stableScene = null;
            return true;
        } catch (error) {
            for (const k of paused) if (this.game.scene.isPaused(k)) this.game.scene.resume(k);
            console.error('[RandomEvents] Could not show event.', error);
            return false;
        } finally { this.opening = false; }
    },
    current(pendingId, caseId) {
        const s = read();
        return active() && caseId === key() && s.pending?.id === pendingId ? s.pending : null;
    },
    choose(pendingId, caseId, choice) {
        const pending = this.current(pendingId, caseId);
        if (!pending) return { ok: false, reason: 'stale_event' };
        const allowed = pending.type === 'illness' ? ['work', 'rest'] : ['refuse', 'accept'];
        if (!allowed.includes(choice)) return { ok: false, reason: 'invalid_choice' };
        const s = read();
        s.pending = null;
        s.history = [...s.history, { id: pendingId, type: pending.type, choice, at: getClockMinutes(gameState) }].slice(-20);
        write(s);
        if (pending.type === 'illness') {
            const cfg = settings().illness;
            if (choice === 'rest') {
                s.effect = null;
                write(s);
                this.syncEffect();
                EventBus.emit('advanceTime', cfg.restHours, 0);
                if (!active()) return { ok: true, failed: true };
                const after = read();
                after.effect = { label: 'Recovered and rested', multiplier: cfg.recoveryEnergyMultiplier,
                    expiresAt: getClockMinutes(gameState) + cfg.recoveryDurationHours * 60 };
                write(after);
                const energy = getEnergyManager();
                energy.recoverCustom(energy.getMaxEnergy(), 'Medical rest: energy restored',
                    { recoveryType: 'sleep', recoverySubtype: 'medical_rest' });
            } else {
                s.effect = { label: 'Working while sick', multiplier: cfg.workEnergyMultiplier,
                    expiresAt: getClockMinutes(gameState) + cfg.workDurationHours * 60 };
                write(s);
            }
            this.syncEffect();
            saveGameState();
            return { ok: true };
        }
        if (choice === 'refuse') { saveGameState(); return { ok: true }; }
        moneyManager.addCash(settings().bribe.amount, {
            category: 'bribe', description: 'Anonymous payment for closing the case',
            metadata: { randomEventId: pendingId }
        });
        applyReputationEvent('bribe_accepted', { eventId: `random:${pendingId}:bribe`, headline: null,
            context: { amount: settings().bribe.amount } });
        gameState.updateState({ caseFailed: true, isGameActive: false,
            finalArrestResult: 'FAILURE', gameOverReason: 'bribe_accepted' });
        clearSavedGame();
        return { ok: true, failed: true, gameOver: {
            reason: 'bribe_accepted', title: 'A VERY AFFORDABLE DETECTIVE',
            message: `You closed the case for $${settings().bribe.amount}. The money reached your personal account.\n` +
                'Your boss: "You sold the investigation for less than our printer toner."\n' +
                'Formal reprimand issued. Integrity damaged. Case lost.'
        } };
    },
    force(type) {
        const local = typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (!local) throw new Error('Test tools require localhost.');
        if (!active()) throw new Error('Start an active case first.');
        if (!['illness', 'bribe'].includes(type)) throw new Error('Use illness or bribe.');
        const s = read();
        if (s.pending) throw new Error('Resolve the pending event first.');
        s.pending = { id: `${key()}:test:${Date.now()}`, type, day: Number(gameState.currentDay) || 1 };
        s.count += 1;
        write(s);
        requestAutosave();
        return 'Event queued. Return to an idle city map after finishing the tutorial.';
    },
    async load() { return true; }
};
