import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ui/PIOfficeDestinationsUI.js

import { DestinationsUI } from './DestinationsUI.js';
import { gameState } from '../GameData.js';

export class PIOfficeDestinationsUI extends DestinationsUI {
  constructor(scene, options = {}) {
    super(scene);
    this.piOptions = options;
  }

  // Expedition-style parchment map for the PI office.
  // Called from the base constructor, so it must not use instance state.
  getMapTheme() {
    return 'pi';
  }

  // The map is opened from the computer, not by a global hotkey.
  registerKeyboard() {}

  isAtHQ() {
    // This map belongs to the PI office.
    // A retained HQ city ID does not mean the player is inside HQ.
    return false;
  }

  selectHeadquarters() {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return;
    }

    const state = this.gameState || gameState;

    if (state.currentCityId === 'hq') {
      // Both offices share the retained city ID, but are different locations.
      void this.travelFromPIOfficeToHQ();
      return;
    }

    // From any other city, keep the regular ticket-purchase flow.
    super.selectHeadquarters();
  }

  async travelFromPIOfficeToHQ() {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(__dialogueText("ui/PIOfficeDestinationsUI.js", "t_9ac14acb1c077fbca660"));
      return false;
    }

    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();

    try {
      await this.ensureSceneRegistered('TravelTransitionScene');
      await this.ensureSceneRegistered('OfficeScene');

      if (this.isDestroyed) return false;

      if (
        !source.sys.isActive() ||
        this.getNavigationScene() !== source
      ) {
        throw new Error('The source location changed before HQ travel.');
      }

      const payload = {
        returnToPIOffice: false,
        destinationScene: 'OfficeScene',

        fromCity: __dialogueText("ui/PIOfficeDestinationsUI.js", "t_6114b7873f77428c0e51"),
        fromCityId: 'hq',

        toCity: __dialogueText("ui/PIOfficeDestinationsUI.js", "t_d30a57953b11809a70cf"),
        toCityId: 'hq',
        cityId: 'hq',

        transportType: 'plane',
        transportLabel: __dialogueText("ui/PIOfficeDestinationsUI.js", "t_544977013d58aaafa203"),

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
      console.error(
        '[PIOfficeDestinationsUI] Failed to travel to HQ:',
        error
      );

      if (!this.isDestroyed && this.scene?.sys?.isActive()) {
        this.isTransitioning = false;

        if (!this.isOpen) {
          this.open(this.gameState || gameState);
        }

        this.showTravelError(
          __dialogueText("ui/PIOfficeDestinationsUI.js", "t_0e62280ad633280ecfb4")
        );
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
      }
    }
  }

  close(options = {}) {
    const wasOpen = this.isOpen;

    const {
      restoreHud = true,
      ...rest
    } = options;

    super.close({
      ...rest,
      restoreHud: false
    });

    if (wasOpen && !this.isOpen) {
      this.piOptions?.onClose?.({
        returnToComputer: restoreHud !== false
      });
    }
  }
}