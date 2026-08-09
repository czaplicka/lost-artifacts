import { EventBus } from '../EventBus.js';
import { getEnergyManager } from '../EnergyManager.js';

// ============================================================
// EnergyHud.js
// UI komponent do wyświetlania energii gracza
// - Pasek energii z kolorami (zielony, pomarańczowy, czerwony)
// - Status tekst (Fresh, Tired, Exhausted)
// - Tooltip z konsumpcją i statusem
// - Log zmian energii
// - Animacja bijącego serca przy niskiej energii
// - Integration z istniejącym HUD system
// ============================================================

export class EnergyHud {
  constructor(scene) {
    this.scene = scene;
    this.energyManager = getEnergyManager();

    // UI Elements
    this.container = null;
    this.calendarIcon = null;
    this.timeText = null;
    this.energyIcon = null;
    this.energyBar = null;
    this.energyBarBg = null;
    this.energyText = null;
    this.statusText = null;
    this.logPanel = null;
    this.logContent = null;

    // Heartbeat animation
    this.heartbeatTween = null;
    this.isHeartbeatActive = false;

    // Tooltip
    this.tooltipText = null;
    this.tooltipVisible = false;

    // Event listeners
    this.boundEnergyChanged = this.onEnergyChanged.bind(this);
    this.boundEnergyWarning = this.onEnergyWarning.bind(this);
    this.boundEnergyZero = this.onEnergyZero.bind(this);
    this.boundTimeChanged = this.onTimeChanged.bind(this);

    this.create();
    this.setupEventListeners();
  }

  /**
   * Tworzy UI komponent
   */
  create() {
    const { width, height } = this.scene.scale;
    const topPadding = 20;
    const leftPadding = 20;

    // Main container
    this.container = this.scene.add.container(leftPadding, topPadding);
    this.container.setDepth(1000);

    // ===== CALENDAR / TIME =====
    this.calendarIcon = this.scene.add.text(0, 0, '📅', {
      fontSize: '24px'
    });
    this.container.add(this.calendarIcon);

    this.timeText = this.scene.add.text(40, 2, 'Day 1, 08:00', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#ffffff'
    });
    this.container.add(this.timeText);

    // ===== ENERGY SECTION =====
    const energySectionY = 50;

    this.energyIcon = this.scene.add.text(0, energySectionY, '⚡', {
      fontSize: '24px'
    });
    this.container.add(this.energyIcon);

    // Energy bar background
    this.energyBarBg = this.scene.add.rectangle(
      50,
      energySectionY + 4,
      200,
      16,
      0x333333,
      1
    );
    this.energyBarBg.setOrigin(0, 0.5);
    this.energyBarBg.setStrokeStyle(2, 0x888888);
    this.container.add(this.energyBarBg);

    // Energy bar fill (animated)
    this.energyBar = this.scene.add.rectangle(
      50,
      energySectionY + 4,
      200,
      16,
      0x4CAF50,
      1
    );
    this.energyBar.setOrigin(0, 0.5);
    this.container.add(this.energyBar);

    // Energy percentage text
    this.energyText = this.scene.add.text(260, energySectionY + 2, '100%', {
      fontFamily: 'PressStart2P',
      fontSize: '11px',
      color: '#ffffff'
    });
    this.container.add(this.energyText);

    // Status text (Fresh, Tired, Exhausted)
    this.statusText = this.scene.add.text(310, energySectionY + 2, 'Fresh', {
      fontFamily: 'PressStart2P',
      fontSize: '11px',
      color: '#4CAF50'
    });
    this.container.add(this.statusText);

    // ===== ENERGY LOG =====
    const logY = 100;

    this.logPanel = this.scene.add.rectangle(0, logY, 550, 70, 0x1a1a1a, 0.8);
    this.logPanel.setOrigin(0, 0);
    this.logPanel.setStrokeStyle(1, 0x666666);
    this.logPanel.setVisible(false);
    this.container.add(this.logPanel);

    this.logContent = this.scene.add.text(10, logY + 8, '', {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#cccccc',
      wordWrap: { width: 530 },
      lineSpacing: 4
    });
    this.logContent.setVisible(false);
    this.container.add(this.logContent);

    // ===== TOOLTIP =====
    const tooltipY = 35;

    const tooltipBg = this.scene.add.rectangle(50, tooltipY, 300, 28, 0x2c2c2c, 0.95);
    tooltipBg.setOrigin(0, 0);
    tooltipBg.setStrokeStyle(1, 0x666666);
    tooltipBg.setVisible(false);

    this.tooltipText = this.scene.add.text(55, tooltipY + 4, '', {
      fontFamily: 'SpecialElite',
      fontSize: '10px',
      color: '#e0e0e0',
      wordWrap: { width: 290 }
    });
    this.tooltipText.setVisible(false);

    this.tooltip = { bg: tooltipBg, text: this.tooltipText };
    this.container.add(tooltipBg);
    this.container.add(this.tooltipText);

    // ===== INTERACTIVITY =====
    // Click on energy icon to show/hide log
    this.energyIcon.setInteractive({ useHandCursor: true });
    this.energyIcon.on('pointerdown', () => this.toggleLog());

    // Hover on energy bar to show tooltip
    this.energyBar.setInteractive({ useHandCursor: true });
    this.energyBar.on('pointerover', () => this.showTooltip());
    this.energyBar.on('pointerout', () => this.hideTooltip());

    // Initial update
    this.updateDisplay();
  }

  /**
   * Setupuje event listenery
   */
  setupEventListeners() {
    const OWNER_KEY = 'EnergyHud';

    EventBus.clearScope(OWNER_KEY);
    EventBus.on('energyChanged', this.boundEnergyChanged, this, OWNER_KEY);
    EventBus.on('energyWarning', this.boundEnergyWarning, this, OWNER_KEY);
    EventBus.on('energyZero', this.boundEnergyZero, this, OWNER_KEY);
    EventBus.on('timeChanged', this.boundTimeChanged, this, OWNER_KEY);
  }

  /**
   * Callback: energyChanged event
   */
  onEnergyChanged(data) {
    this.updateDisplay();
    this.logEnergyChange(data.lastChange);

    // Stop heartbeat jeśli energia > 30
    if (data.current > 30 && this.isHeartbeatActive) {
      this.stopHeartbeat();
    }
    // Start heartbeat jeśli energia <= 30
    else if (data.current <= 30 && !this.isHeartbeatActive) {
      this.startHeartbeat();
    }
  }

  /**
   * Callback: energyWarning event (20%)
   */
  onEnergyWarning(data) {
    // Flash animation na pasku
    if (this.energyBar) {
      this.scene.tweens.add({
        targets: this.energyBar,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: 2
      });
    }

    console.warn(
      `⚠️ Energy Warning: ${data.energy}% (${data.status})`
    );
  }

  /**
   * Callback: energyZero event (0%)
   */
  onEnergyZero(data) {
    console.warn(`💤 ${data.message}`);

    // Shake animation na całym HUD
    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        x: '+=5',
        duration: 50,
        yoyo: true,
        repeat: 5
      });
    }

    // Disable interactivity tymczasowo
    if (this.energyIcon) {
      this.energyIcon.disableInteractive();
    }
  }

  /**
   * Callback: timeChanged event
   */
  onTimeChanged(data) {
    const dayText = `Day ${data.day}`;
    const timeText = `${String(data.hour).padStart(2, '0')}:${String(
      data.minute
    ).padStart(2, '0')}`;
    this.timeText.setText(`${dayText}, ${timeText}`);
  }

  /**
   * Aktualizuje wyświetlanie energii
   */
  updateDisplay() {
    const energy = this.energyManager.getCurrentEnergy();
    const percent = Math.round((energy / 100) * 100);
    const status = this.energyManager.getEnergyStatus();
    const color = this.energyManager.getEnergyColor();

    // Update bar width
    if (this.energyBar) {
      const newWidth = (energy / 100) * 200;
      this.energyBar.setDisplaySize(Math.max(0, newWidth), 16);
      this.energyBar.setFillStyle(color, 1);
    }

    // Update percentage text
    if (this.energyText) {
      this.energyText.setText(`${percent}%`);
    }

    // Update status text with color
    if (this.statusText) {
      this.statusText.setText(status);
      this.statusText.setColor(this.colorToHex(color));
    }

    // Update icon color
    if (this.energyIcon) {
      this.energyIcon.setColor(this.colorToHex(color));
    }
  }

  /**
   * Konwertuje kolor (0xRRGGBB) na hex string
   */
  colorToHex(color) {
    const hex = color.toString(16).toUpperCase().padStart(6, '0');
    return `#${hex}`;
  }

  /**
   * Pokazuje tooltip
   */
  showTooltip() {
    if (!this.tooltipText) return;

    const tooltip = this.energyManager.getEnergyTooltip();
    const lastChange = this.energyManager.lastEnergyChange;

    let tooltipContent = tooltip;

    if (lastChange && lastChange.label) {
      tooltipContent += `\n${lastChange.label}`;
    }

    this.tooltipText.setText(tooltipContent);
    this.tooltipText.setVisible(true);
    this.tooltip.bg.setVisible(true);
    this.tooltipVisible = true;
  }

  /**
   * Ukrywa tooltip
   */
  hideTooltip() {
    if (this.tooltipText) {
      this.tooltipText.setVisible(false);
    }
    if (this.tooltip?.bg) {
      this.tooltip.bg.setVisible(false);
    }
    this.tooltipVisible = false;
  }

  /**
   * Przełącza widoczność logu
   */
  toggleLog() {
    if (!this.logPanel) return;

    const shouldShow = !this.logPanel.visible;
    this.logPanel.setVisible(shouldShow);
    if (this.logContent) {
      this.logContent.setVisible(shouldShow);
    }

    if (shouldShow) {
      this.updateLogDisplay();
    }
  }

  /**
   * Loguje zmianę energii
   */
  logEnergyChange(changeData) {
    if (!changeData) return;

    // Pokaż log panel na 4 sekundy
    if (this.logPanel && !this.logPanel.visible) {
      this.logPanel.setVisible(true);
      if (this.logContent) {
        this.logContent.setVisible(true);
      }

      this.updateLogDisplay();

      // Auto-hide po 4 sekundach
      if (this.logHideTimer) {
        this.scene.time.removeEvent(this.logHideTimer);
      }
      this.logHideTimer = this.scene.time.delayedCall(4000, () => {
        if (this.logPanel) {
          this.logPanel.setVisible(false);
        }
        if (this.logContent) {
          this.logContent.setVisible(false);
        }
      });
    }
  }

  /**
   * Aktualizuje display logu
   */
  updateLogDisplay() {
    const log = this.energyManager.getEnergyLog();
    const recent = log.slice(-5).reverse(); // Ostatnie 5, newest first

    const lines = recent.map(entry => {
      const sign = entry.amount > 0 ? '+' : '';
      return `${entry.label}`;
    });

    if (this.logContent) {
      this.logContent.setText(lines.join('\n'));
    }
  }

  /**
   * Startuje animację bijącego serca
   */
  startHeartbeat() {
    if (this.isHeartbeatActive) return;

    this.isHeartbeatActive = true;

    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
    }

    this.heartbeatTween = this.scene.tweens.add({
      targets: this.energyIcon,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut'
    });
  }

  /**
   * Zatrzymuje animację bijącego serca
   */
  stopHeartbeat() {
    if (!this.isHeartbeatActive) return;

    this.isHeartbeatActive = false;

    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
      this.heartbeatTween = null;
    }

    if (this.energyIcon) {
      this.energyIcon.setScale(1);
    }
  }

  /**
   * Czyszczenie
   */
  destroy() {
    EventBus.clearScope('EnergyHud');

    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
    }

    if (this.logHideTimer) {
      this.scene.time.removeEvent(this.logHideTimer);
    }

    if (this.container) {
      this.container.destroy();
    }
  }
}

export default EnergyHud;