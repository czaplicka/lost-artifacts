import {
    tierOf,
    SCENE_TIERS,
    sceneRegistry as defaultRegistry
} from './sceneRegistry.js';

const MIN_SPINNER_DELAY_MS = 150;
const OVERLAY_KEY = 'LoadingOverlayScene';

export class SceneLoader {
    constructor(game, registry = defaultRegistry) {
        this.game = game;
        this.registry = registry;
        this._pending = new Map();
        this._prefetched = new Set();
    }

    has(key) {
        return Boolean(this.game.scene.keys[key]);
    }

    get(key) {
        if (!this.has(key)) {
            return null;
        }

        return this.game.scene.getScene(key);
    }

    ensure(key) {
        if (this.has(key)) {
            return Promise.resolve(this.get(key));
        }

        if (this._pending.has(key)) {
            return this._pending.get(key);
        }

        const loader = this.registry[key];

        if (!loader) {
            return Promise.reject(
                new Error(
                    `[SceneLoader] Unknown scene key "${key}". ` +
                    'Add it to sceneRegistry.js.'
                )
            );
        }

        const promise = Promise.resolve()
            .then(() => loader())
            .then((SceneClass) => {
                if (!SceneClass) {
                    throw new Error(
                        `[SceneLoader] Loader for "${key}" did not return a scene class.`
                    );
                }

                if (!this.has(key)) {
                    this.game.scene.add(key, SceneClass, false);
                }

                return this.get(key);
            })
            .catch((error) => {
                console.error(
                    `[SceneLoader] Failed to load "${key}".`,
                    error
                );

                throw error;
            })
            .finally(() => {
                this._pending.delete(key);
            });

        this._pending.set(key, promise);

        return promise;
    }

    async goto(fromScene, key, data = {}, { stopFrom = true } = {}) {
        const manager = this.game.scene;
        let overlayShown = false;

        const spinnerTimer = window.setTimeout(() => {
            if (!this.has(OVERLAY_KEY)) {
                return;
            }

            overlayShown = true;

            if (!manager.isActive(OVERLAY_KEY)) {
                manager.run(OVERLAY_KEY);
            }
        }, MIN_SPINNER_DELAY_MS);

        try {
            await this.ensure(key);
        } finally {
            window.clearTimeout(spinnerTimer);

            if (
                overlayShown &&
                this.has(OVERLAY_KEY) &&
                manager.isActive(OVERLAY_KEY)
            ) {
                manager.stop(OVERLAY_KEY);
            }
        }

        if (
            stopFrom &&
            (!fromScene || !fromScene.sys || !fromScene.sys.isActive())
        ) {
            console.warn(
                `[SceneLoader] Navigation cancelled: source scene is inactive.`
            );

            return false;
        }

        if (stopFrom) {
            fromScene.scene.start(key, data);
        } else {
            manager.start(key, data);
        }

        return true;
    }

    async launch(fromScene, key, data = {}) {
        await this.ensure(key);

        if (!fromScene?.sys?.isActive()) {
            console.warn(
                `[SceneLoader] Overlay launch cancelled: source scene is inactive.`
            );

            return false;
        }

        fromScene.scene.launch(key, data);

        return true;
    }

    prefetchTier(tierName) {
        const keys = SCENE_TIERS[tierName];

        if (!keys) {
            console.warn(`[SceneLoader] Unknown tier "${tierName}".`);
            return;
        }

        keys.forEach((key) => this.prefetch(key));
    }

    prefetch(key) {
        if (this._prefetched.has(key) || this.has(key)) {
            return;
        }

        this._prefetched.add(key);

        const run = () => {
            this.ensure(key).catch((error) => {
                console.warn(
                    `[SceneLoader] Prefetch failed for "${key}".`,
                    error
                );

                this._prefetched.delete(key);
            });
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, {
                timeout: 4000
            });
        } else {
            window.setTimeout(run, 300);
        }
    }

    prefetchNextTier(key) {
        const tiers = Object.keys(SCENE_TIERS);
        const currentTier = tierOf(key);
        const index = tiers.indexOf(currentTier);

        if (index === -1 || index + 1 >= tiers.length) {
            return;
        }

        this.prefetchTier(tiers[index + 1]);
    }
}