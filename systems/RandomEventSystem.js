export const RandomEventSystem = {
    CHANCE: 0.06, // niska szansa przy każdym upływie czasu

    maybeTrigger(scene, gameState) {
        if (!this.events) return false;
        if (Math.random() >= this.CHANCE) return false;

        const fired = gameState.firedEvents || (gameState.firedEvents = {});
        const pool = this.events.filter(e =>
            (!e.once || !fired[e.id]) &&
            (!e.requiresActiveCase || !!gameState.activeCase)
        );
        if (!pool.length) return false;

        const total = pool.reduce((s, e) => s + e.weight, 0);
        let r = Math.random() * total;
        let event = pool[0];
        for (const e of pool) { r -= e.weight; if (r <= 0) { event = e; break; } }

        fired[event.id] = true;
        scene.scene.launch('RandomEventScene', { event, gameState });
        scene.scene.pause();
        return true;
    },

    async load(scene) {
        if (!this.events) this.events = await (await fetch('data/events.json')).json();
    }
};