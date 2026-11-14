import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { DestinationNavigation } from './DestinationNavigation.js';
import { DestinationMap } from './DestinationMap.js';
import { DestinationPanel } from './DestinationPanel.js';
import { DestinationTravel } from './DestinationTravel.js';
import { DestinationWorldMap } from './DestinationWorldMap.js';
import { getDestinationTheme } from './DestinationMeta.js';

export class DestinationsUI {
  constructor(scene) {
    this.scene = scene;

    this.isOpen = false;
    this.isTransitioning = false;
    this.isDestroyed = false;
    this.canConfirm = false;

    this.gameState = null;

    this.activePins = [];
    this.transportButtons = [];

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedTransport = null;

    this.travelErrorTimer = null;

    // A committed journey must not be purchased again
    // if opening the transition screen fails.
    this.committedTravelPayload = null;

    this.hqButton = null;
    this.hqButtonBg = null;
    this.hqButtonLabel = null;

    this.officeButton = null;
    this.officeButtonBg = null;
    this.officeButtonLabel = null;

    this.newsVisibility = null;

    this.boundTravelKeyHandler =
      this.onTravelKeyDown.bind(this);

    this.boundShutdownHandler =
      this.destroy.bind(this);

    const { width, height } = scene.scale;

    // "agency" = modern spy grid, "pi" = expedition map.
    // Subclasses choose the look by overriding getMapTheme().
    const themeId = this.getMapTheme();
    this.theme = getDestinationTheme(themeId);

    this.container = scene.add
      .container(0, 0)
      .setDepth(1800)
      .setVisible(false);

    this.overlay = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    this.overlay.on('pointerdown', () => {
      this.close();
    });

    this.container.add(this.overlay);

    // Painted world map (replaces the old 'mapbg' picture).
    this.worldMap = new DestinationWorldMap(scene, this.container, {
      themeId,
      width,
      height
    });

    // The map blocks clicks from reaching the background overlay.
    this.mapImage = this.worldMap.baseImage;

    this.closeBtn = scene.add
      .text(width - 100, 75, __dialogueText("ui/DestinationsUI.js", "t_4b68ab3847feda7d6c62"), {
        fontFamily: 'SpecialElite',
        fontSize: '48px',
        color: this.theme.closeColor
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => {
      this.close();
    });

    this.container.add(this.closeBtn);

    this.createInfoPanel(width, height);
    this.createHQButton();
    this.createOfficeButton();
    this.registerKeyboard();

    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdownHandler
    );
  }

  // Overridden by PIOfficeDestinationsUI. Must not depend on instance state:
  // it is called from the base constructor.
  getMapTheme() {
    return 'agency';
  }

  registerKeyboard() {
    const keyboard = this.scene?.input?.keyboard;

    if (!keyboard) return;

    keyboard.on(
      'keydown-T',
      this.boundTravelKeyHandler
    );
  }

  onTravelKeyDown(event) {
    const active = document.activeElement;

    if (
      active?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName) ||
      this.isTransitioning ||
      this.isDestroyed
    ) {
      return;
    }

    event.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open(gameState);
    }
  }

  open(gameStateData = gameState) {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.isOpen
    ) {
      return false;
    }

    this.getNavigationScene();
    this.gameState = gameStateData || gameState;

    this.resetSelectionState();
    this.clearPins();
    this.refreshInfoPanel();

    this.isOpen = true;
    this.container.setVisible(true);
    this.worldMap?.activate();

    EventBus.emit('hideHUD');

    this.acquireDestinationNewsLock();

    this.updateHQButton();
    this.updateOfficeButton();

    const destinations =
      this.getDestinationsWithMustInclude();

    this.renderCityPins(destinations);

    for (const object of [
      this.infoPanel,
      this.hqButton,
      this.officeButton,
      this.closeBtn
    ]) {
      if (object) {
        this.container.bringToTop(object);
      }
    }

    this.setConfirmEnabled(false);

    if (this.committedTravelPayload) {
      this.transportPrompt
        .setColor(__dialogueText("ui/DestinationsUI.js", "t_e5ce4dbdca8ab29e7605"))
        .setText(
          __dialogueText("ui/DestinationsUI.js", "t_f9b4bfc5ab1e5f15fcf7")
        );

      this.confirmLabel.setText(__dialogueText("ui/DestinationsUI.js", "t_bdcb4e18897d4795bb1b"));
      this.confirmButton.setFillStyle(0xb57928, 1);
      this.confirmButton.setAlpha(1);
      this.confirmLabel.setAlpha(1);
    }

    return true;
  }

  close({ restoreHud = true } = {}) {
    if (!this.isOpen || this.isDestroyed) {
      return false;
    }

    // Do not interrupt an in-flight action with a normal close.
    if (this.isTransitioning && restoreHud) {
      return false;
    }

    this.isOpen = false;
    this.container.setVisible(false);
    this.worldMap?.deactivate();

    this.clearPins();
    this.resetSelectionState();
    this.refreshInfoPanel();
    this.setConfirmEnabled(false);

    if (restoreHud) {
      EventBus.emit('showHUD');

      const news = this.getRegisteredScene('NewsHud');

      if (news && this.newsVisibility) {
        news.events?.emit(
          'setNewspaperVisible',
          this.newsVisibility.newspaper
        );

        news.events?.emit(
          'setTvVisible',
          this.newsVisibility.tv
        );
      }
    }

    this.releaseDestinationNewsLock();
    this.newsVisibility = null;

    return true;
  }

  acquireDestinationNewsLock() {
    this.releaseDestinationNewsLock();
    const news = this.getRegisteredScene('NewsHud');
    if (!news) return;
    news.destinationMapLocks ??= new Set();
    news.destinationMapLocks.add(this);
    this.lockedDestinationNewsScene = news;
    news.syncLocationVisibility?.();
  }

  releaseDestinationNewsLock() {
    const news = this.lockedDestinationNewsScene;
    this.lockedDestinationNewsScene = null;
    if (!news) return;
    news.destinationMapLocks?.delete(this);
    news.syncLocationVisibility?.();
  }

  resetSelectionState() {
    this.clearTravelErrorTimer();

    this.selectedPin?.setSelected?.(false);

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedTransport = null;
    this.canConfirm = false;

    this.clearTransportButtons();

    this.worldMap?.clearRoute();
  }

  destroy() {
    if (this.isDestroyed) return;
    this.releaseDestinationNewsLock();

    this.isDestroyed = true;

    this.clearTravelErrorTimer();

    this.scene?.input?.keyboard?.off(
      'keydown-T',
      this.boundTravelKeyHandler
    );

    this.scene?.events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdownHandler
    );

    this.clearPins();
    this.clearTransportButtons();

    this.worldMap?.destroy();
    this.worldMap = null;
    this.mapImage = null;

    this.container?.destroy(true);
    this.container = null;

    this.hqButton = null;
    this.hqButtonBg = null;
    this.hqButtonLabel = null;

    this.officeButton = null;
    this.officeButtonBg = null;
    this.officeButtonLabel = null;

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedTransport = null;

    this.gameState = null;
    this.newsVisibility = null;
    this.committedTravelPayload = null;

    this.isOpen = false;
    this.isTransitioning = false;
    this.canConfirm = false;
  }
}

// Keep the existing DestinationsUI API and shared instance state.
for (const module of [DestinationNavigation, DestinationMap, DestinationPanel, DestinationTravel]) {
  for (const name of Object.getOwnPropertyNames(module.prototype)) {
    if (name === 'constructor') continue;
    Object.defineProperty(
      DestinationsUI.prototype,
      name,
      Object.getOwnPropertyDescriptor(module.prototype, name)
    );
  }
}