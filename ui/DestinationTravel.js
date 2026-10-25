import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { travelToCity as performTravel } from '../managers/TravelManager.js';
import { getCityId, normalizeCityId } from './DestinationMeta.js';

export class DestinationTravel {
  cleanupBeforeTravel() {
    // Do not close all panels here: on some owners this would
    // close this map and trigger computer callbacks prematurely.
    const hud = this.getRegisteredScene('PlayerHudScene');

    hud?.closeAllUIPanels?.();
  }

  async travelToCity(selectedCity, selectedTransport) {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.committedTravelPayload ||
      !selectedCity ||
      !selectedTransport
    ) {
      return false;
    }

    const locations = this.getLocationsData();

    const destination = locations.find(
      location =>
        getCityId(location) === getCityId(selectedCity)
    );

    if (!destination) {
      this.showTravelError('Destination data is missing.');
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    const fromCityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const fromCity =
      this.gameState?.currentCity ||
      gameState.currentCity ||
      null;

    const transportId = selectedTransport.id;

    this.clearTravelErrorTimer();
    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();

    let committed = false;

    try {
      // Catch missing transition registration before charging.
      await this.ensureSceneRegistered(
        'TravelTransitionScene'
      );

      if (this.isDestroyed) return false;

      if (!source.sys.isActive() || this.getNavigationScene() !== source) {
        throw new Error('The source location changed before ticket purchase.');
      }

      const result = performTravel(
        destination.city,
        locations,
        transportId
      );

      if (!result) {
        throw new Error(
          'performTravel returned no result.'
        );
      }

      if (result.blocked) {
        this.isTransitioning = false;
        this.refreshInfoPanel(this.selectedCity);

        this.showTravelError(
          result.blockReason === 'insufficient_energy'
            ? 'Too exhausted to travel. Get some sleep first.'
            : 'Travel is currently blocked.'
        );

        return false;
      }

      if (result.status === 'ALREADY_HERE') {
        this.isTransitioning = false;
        this.refreshInfoPanel(this.selectedCity);

        this.showTravelError(
          'You are already in this city.'
        );

        return false;
      }

      committed = true;

      const toCityId = getCityId(destination);

      const travelHours =
        Number(result.travelHours) || 0;

      const baseTravelHours =
        Number(result.baseTravelHours) || travelHours;

      const energyChange =
        Number(result.energyChange) || 0;

      const moneySpent =
        Number(result.moneySpent) || 0;

      const agencyDebtAdded =
        Number(result.agencyDebtAdded) || 0;

      const transportLabel =
        result.transportLabel ||
        selectedTransport.label;

      const mission = gameState.currentMission || {};

      const missionCityId = normalizeCityId(
        gameState.crimeCityId ||
        mission.cityId ||
        mission.city ||
        null
      );

      const isMissionCrimeCity = Boolean(
        (
          destination.isCrimeCity ||
          destination.crimeCity
        ) &&
        normalizeCityId(toCityId) === missionCityId
      );

      const isCrimeSceneArrival =
        Boolean(result.isCrimeSceneArrival) ||
        isMissionCrimeCity;

      const payload = {
        fromCity: result.fromCity || fromCity,
        toCity: result.toCity || destination.city,
        toCityId,
        cityId: toCityId,

        destinationScene: isCrimeSceneArrival
          ? 'CrimeCityScene'
          : 'CityScene',

        isCrimeSceneArrival,
        transportType: transportId,
        transportLabel,
        travelHours,
        baseTravelHours,
        moneySpent,
        agencyDebtAdded,
        energyChange,

        travelEncounter:
          result.travelEncounter || null,

        wasCorrect: Boolean(result.wasCorrect),
        status: result.status,

        pendingPhoneCall:
          Boolean(gameState.pendingPhoneCall),

        pendingPhoneCallCityId:
          gameState.pendingPhoneCallCityId ||
          toCityId
      };

      // Save before any subsequent UI operations.
      this.committedTravelPayload = payload;

      gameState.lastTravel = {
        ...(gameState.lastTravel || {}),
        fromCityId,
        fromCity,
        toCityId,
        toCity: destination.city,
        transportType: transportId,
        transportLabel,
        travelHours,
        baseTravelHours,
        moneySpent,
        agencyDebtAdded,
        energyChange,
        travelEncounter: payload.travelEncounter,
        wasCorrect: payload.wasCorrect
      };

      advanceCrimeTutorial(gameState, 'pursuit');

      if (!gameState.caseFailed) {
        requestAutosave();
      }

      EventBus.emit('travelTicketPurchased', {
        cityId: toCityId,
        city: destination.city,
        transportType: transportId,
        cost: moneySpent,
        agencyDebtAdded
      });

      EventBus.emit('firstCaseTravelStarted', {
        fromCityId,
        toCityId,
        city: destination.city,
        transportType: transportId,
        isCrimeSceneArrival
      });

      return await this.startTravelTransition(
        source,
        payload
      );
    } catch (error) {
      console.error('[DestinationsUI] Travel failed:', error, {
        committed,
        fromCityId,
        toCityId: getCityId(destination),
        transportType: transportId
      });

      if (
        this.isDestroyed ||
        !this.scene?.sys?.isActive()
      ) {
        return false;
      }

      this.isTransitioning = false;

      if (!this.isOpen) {
        this.open(this.gameState || gameState);
      }

      if (this.committedTravelPayload) {
        this.showCommittedTravelRecovery();
      } else {
        this.refreshInfoPanel(this.selectedCity);

        this.showTravelError(
          committed
            ? 'Travel was processed, but its transition data could not be prepared. Check the console before trying again.'
            : 'Travel failed. Check the console for details.'
        );

        if (committed) {
          this.setConfirmEnabled(false);
        }
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

  async startTravelTransition(source, payload) {
    this.close({ restoreHud: false });

    const opened = await this.navigateFrom(
      source,
      'TravelTransitionScene',
      payload
    );

    if (opened === false) {
      throw new Error(
        'TravelTransitionScene could not be started.'
      );
    }

    if (!this.isDestroyed) {
      this.committedTravelPayload = null;
    }

    return true;
  }

  showCommittedTravelRecovery() {
    this.clearTravelErrorTimer();

    this.setConfirmEnabled(false);

    this.transportPrompt
      .setColor('#ff9d6b')
      .setText(
        'Travel was processed. Retry opening the travel screen without paying again.'
      );

    this.confirmLabel.setText('Retry travel screen');
    this.confirmButton.setFillStyle(0xb57928, 1);
    this.confirmButton.setAlpha(1);
    this.confirmLabel.setAlpha(1);

    this.updateHQButton();
    this.updateOfficeButton();
  }

  async retryCommittedTravel() {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      !this.committedTravelPayload
    ) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    this.isTransitioning = true;

    try {
      await this.ensureSceneRegistered(
        'TravelTransitionScene'
      );

      if (this.isDestroyed) return false;

      return await this.startTravelTransition(
        source,
        this.committedTravelPayload
      );
    } catch (error) {
      console.error(
        '[DestinationsUI] Travel transition retry failed:',
        error
      );

      if (
        !this.isDestroyed &&
        this.scene?.sys?.isActive()
      ) {
        this.isTransitioning = false;

        if (!this.isOpen) {
          this.open(this.gameState || gameState);
        }

        this.showCommittedTravelRecovery();
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
      }
    }
  }
}
