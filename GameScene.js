export class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    
    create() {
        this.cameras.main.setBackgroundColor('#000000');
    }
}