import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../MonologueManager.js';

export class BaseScene extends Phaser.Scene {
  create() {
    EventBus.bindScene(this);

    const monologues = this.cache.json.get('monologues') ?? {};

    this.monologue = new MonologueManager(this, {
      dialogues: monologues,
    });
  }
}