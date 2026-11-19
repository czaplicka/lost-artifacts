import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { DestinationsUI } from './DestinationsUI.js';
import { PI_RETURN_CITY_KEY } from './DestinationNavigation.js';
import { gameState } from '../GameData.js';

const FILE = 'ui/PIOfficeDestinationsUI.js';

export class PIOfficeDestinationsUI extends DestinationsUI {
  constructor(scene, options = {}) {
    super(scene);
    this.piOptions = options;

    this.returnCityButton = scene.add
      .text(scene.scale.width / 2, 75, '', {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#f4e7c1',
        backgroundColor: '#382718',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.returnCityButton.on('pointerdown', () => {
      void this.returnToDepartureCity();
    });

    this.container.add(this.returnCityButton);
  }

  getMapTheme() {
    return 'pi';
  }

  registerKeyboard() {}

  isAtHQ() {
    return false;
  }

  open(gameStateData = gameState) {
    const opened = super.open(gameStateData);
    if (opened) this.updateReturnCityButton();
    return opened;
  }

  getReturnCity() {
    const target = this.scene?.registry?.get(PI_RETURN_CITY_KEY);
    return target?.cityId && target?.cityName ? target : null;
  }

  updateReturnCityButton() {
    const button = this.returnCityButton;
    if (!button || this.isDestroyed) return;

    const target = this.getReturnCity();
    const visible = Boolean(this.isOpen && target);
    const enabled = visible && !this.isTransitioning &&
      !this.committedTravelPayload;

    button.setVisible(visible);
    button.setAlpha(enabled ? 1 : 0.55);

    if (visible) {
      button.setText(`Return to ${target.cityName}`);
      this.container.bringToTop(button);
    }

    if (enabled) {
      button.setInteractive({ useHandCursor: true });
    } else {
      button.disableInteractive();
    }
  }

  async returnToDepartureCity() {
    if (
      !this.isOpen ||
      this.isDestroyed ||
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return false;
    }

    const target = this.getReturnCity();
    if (!target) return false;

    const source = this.getNavigationScene();

    if (source?.sys?.settings?.key !== 'DetectiveOfficeScene') {
      this.showTravelError(__dialogueText(FILE, 't_9ac14acb1c077fbca660'));
      return false;
    }

    const registry = source.registry;
    const state = this.gameState || gameState;
    const previousCityId = state.currentCityId;
    const previousCityName = state.currentCity;
    let returnCommitted = false;

    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();
    this.updateReturnCityButton();

    try {
      await this.ensureSceneRegistered(target.sceneKey);

      if (this.isDestroyed) return false;

      if (
        !source.sys.isActive() ||
        this.getNavigationScene() !== source ||
        this.getReturnCity() !== target
      ) {
        throw new Error('The return destination changed before departure.');
      }

      state.currentCityId = target.cityId;
      state.currentCity = target.cityName;
      registry.set(PI_RETURN_CITY_KEY, null);
      returnCommitted = true;

      this.close({ restoreHud: false });

      const opened = await this.navigateFrom(source, target.sceneKey, {
        cityId: target.cityId,
        fromScene: 'DetectiveOfficeScene',
        fromTravel: false
      });

      if (opened === false) {
        throw new Error('The return city scene did not open.');
      }

      return true;
    } catch (error) {
      if (returnCommitted) {
        state.currentCityId = previousCityId;
        state.currentCity = previousCityName;
        registry.set(PI_RETURN_CITY_KEY, target);
      }

      console.error('[PIOfficeDestinationsUI] City return failed:', error);

      if (!this.isDestroyed && this.scene?.sys?.isActive()) {
        this.isTransitioning = false;
        if (!this.isOpen) this.open(state);
        this.showTravelError(`Could not return to ${target.cityName}. Try again.`);
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
        this.updateReturnCityButton();
      }
    }
  }

  selectHeadquarters() {
    if (this.isDestroyed || this.isTransitioning || this.committedTravelPayload) {
      return;
    }

    const state = this.gameState || gameState;

    if (state.currentCityId === 'hq') {
      void this.travelFromPIOfficeToHQ();
      return;
    }

    super.selectHeadquarters();
  }

  async travelFromPIOfficeToHQ() {
    if (this.isDestroyed || this.isTransitioning || this.committedTravelPayload) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(__dialogueText(FILE, 't_9ac14acb1c077fbca660'));
      return false;
    }

    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();
    this.updateReturnCityButton();

    try {
      await this.ensureSceneRegistered('TravelTransitionScene');
      await this.ensureSceneRegistered('OfficeScene');

      if (this.isDestroyed) return false;

      if (!source.sys.isActive() || this.getNavigationScene() !== source) {
        throw new Error('The source location changed before HQ travel.');
      }

      const payload = {
        returnToPIOffice: false,
        destinationScene: 'OfficeScene',
        fromCity: __dialogueText(FILE, 't_6114b7873f77428c0e51'),
        fromCityId: 'hq',
        toCity: __dialogueText(FILE, 't_d30a57953b11809a70cf'),
        toCityId: 'hq',
        cityId: 'hq',
        transportType: 'plane',
        transportLabel: __dialogueText(FILE, 't_544977013d58aaafa203'),
        travelHours: 0,
        baseTravelHours: 0,
        moneySpent: 0,
        energyChange: 0,
        isCrimeSceneArrival: false,
        entrySource: 'destinations',
        fromDestinations: true,
        fromScene: source.sys.settings.key
      };

      this.close({ restoreHud: false });

      const opened = await this.navigateFrom(
        source,
        'TravelTransitionScene',
        payload
      );

      if (opened === false) {
        throw new Error('HQ travel transition returned false.');
      }

      return true;
    } catch (error) {
      console.error('[PIOfficeDestinationsUI] Failed to travel to HQ:', error);

      if (!this.isDestroyed && this.scene?.sys?.isActive()) {
        this.isTransitioning = false;
        if (!this.isOpen) this.open(this.gameState || gameState);
        this.showTravelError(__dialogueText(FILE, 't_0e62280ad633280ecfb4'));
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
        this.updateReturnCityButton();
      }
    }
  }

  close(options = {}) {
    const wasOpen = this.isOpen;
    const { restoreHud = true, ...rest } = options;

    if (this.isTransitioning && restoreHud) return false;

    const closed = super.close({
      ...rest,
      restoreHud: false
    });

    if (wasOpen && !this.isOpen) {
      this.updateReturnCityButton();

      this.piOptions?.onClose?.({
        returnToComputer: restoreHud !== false
      });
    }

    return closed;
  }

  destroy() {
    super.destroy();
    this.returnCityButton = null;
  }
}