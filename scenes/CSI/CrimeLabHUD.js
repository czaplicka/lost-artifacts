// CrimeLabHUD.js
export class CrimeLabHUD {
  constructor(scene) {
    this.scene = scene;
    this.topHudContainer = null;
    this.labTimerText = null;
    this.labProgressText = null;
    this.labCaseText = null;
  }

  create() {
    const { width } = this.scene.scale;
    this.topHudContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const bg = this.scene.add
      .rectangle(width / 2, 0, width, 64, 0x07111b, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x39ff14, 0.65);

    const locationText = this.scene.add
      .text(18, 12, 'MARK AGENCY // CRIME LAB', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#39ff14'
      })
      .setOrigin(0, 0);

    this.labCaseText = this.scene.add
      .text(width / 2, 11, '', {
        fontFamily: 'Special Elite',
        fontSize: '21px',
        color: '#fff4c7'
      })
      .setOrigin(0.5, 0);

    this.labProgressText = this.scene.add
      .text(18, 39, '', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#7df9ff'
      })
      .setOrigin(0, 0);

    this.labTimerText = this.scene.add
      .text(width - 18, 25, '', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#ffcc00'
      })
      .setOrigin(1, 0.5);

    this.topHudContainer.add([
      bg,
      locationText,
      this.labCaseText,
      this.labProgressText,
      this.labTimerText
    ]);
  }

  refresh(completedCount, totalStations, remainingSeconds) {
    const mission = this.scene.gameState.currentMission || {};
    const artifact = mission.artifact || mission.artifactName || 'Active Case';

    this.labCaseText?.setText(String(artifact).toUpperCase());
    this.labProgressText?.setText(`ANALYSES: ${completedCount}/${totalStations}`);
    
    if (remainingSeconds !== null) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const formattedTime = `TIME: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      this.labTimerText?.setText(formattedTime);
      this.labTimerText?.setColor(remainingSeconds <= 60 ? '#ff5c5c' : '#ffcc00');
    } else {
      this.labTimerText?.setText('TIME: --:--');
    }
  }

  destroy() {
    this.topHudContainer?.destroy(true);
  }
}