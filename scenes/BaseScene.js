import { EventBus } from '../EventBus.js';

export class BaseScene extends Phaser.Scene {
    create() {
        EventBus.bindScene(this);
    }
}