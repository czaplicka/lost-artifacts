import { gameState } from '../GameData.js';
import { getCityId, getCityQuip } from './DestinationMeta.js';
import { getTransportOptions } from './DestinationCalculator.js';
import { generateDestinationsForCurrentCity } from '../managers/InvestigationManager.js';

export class DestinationMap {
  getLocationsData() {
    const data = this.scene.cache.json.get('locations') || [];
    return Array.isArray(data) ? data : Array.isArray(data.locations) ? data.locations : [];
  }

  getCurrentCityData() {
    const locations = this.getLocationsData();
    const cityId = this.gameState?.currentCityId || gameState.currentCityId;
    const cityName = this.gameState?.currentCity || gameState.currentCity;
    return locations.find(location => getCityId(location) === cityId) ||
      locations.find(location => location.city === cityName) || null;
  }

  getDestinationsWithMustInclude() {
    const destinations = generateDestinationsForCurrentCity(this.getLocationsData(), {
      preserveCurrent: true
    });
    gameState.currentDestinations = [...destinations];
    // No separate UI lottery and no injection of a different global route target.
    return destinations;
  }

  isMapInteractionBlocked() {
    return Boolean(this.isTransitioning || this.committedTravelPayload || this.isDestroyed);
  }

  clearPins() {
    // The world map owns and destroys the pins, the "you are here" marker,
    // the flight network and the route preview.
    this.worldMap?.clearPins();
    this.activePins = [];
  }

  renderCityPins(cities) {
    const worldMap = this.worldMap;
    if (!worldMap) return;

    const current = this.getCurrentCityData();
    const currentId = getCityId(current);
    // In the PI office the retained "hq" city id does not mean the player
    // is standing in the Mark Agency HQ, so no marker there.
    const hideHere = currentId === 'hq' && this.getMapTheme() === 'pi';
    worldMap.setCurrentCity(current, { hidden: hideHere });

    const headquarters = this.getLocationsData().find(
      location => getCityId(location) === 'hq'
    );

    if (headquarters) {
      worldMap.setHeadquarters(headquarters, {
        onOver: pin => {
          if (this.isMapInteractionBlocked()) return;
          pin.setHover(true);
          worldMap.say(getCityQuip(headquarters));
        },
        onOut: pin => pin.setHover(false),
        onDown: () => {
          if (this.isMapInteractionBlocked() || this.isAtHQ()) return;
          this.selectHeadquarters();
        }
      });
    }

    const list = (cities || []).filter(city => getCityId(city) !== 'hq');
    for (const city of list) {
      const pin = worldMap.addPin(city, {
        onOver: p => {
          if (this.isMapInteractionBlocked()) return;
          p.setHover(true);
          worldMap.say(getCityQuip(city));
        },
        onOut: p => p.setHover(false),
        onDown: p => {
          if (this.isMapInteractionBlocked()) return;
          this.selectCity(city, p);
        }
      });
      if (pin) this.activePins.push(pin);
    }

    worldMap.layoutLabels();
    worldMap.setNetwork(
      worldMap.getCityPosition(current),
      list.map(city => worldMap.getCityPosition(city))
    );
  }

  selectCity(city, pin = null) {
    if (this.isTransitioning || this.committedTravelPayload) return;
    this.clearTravelErrorTimer();

    this.selectedPin?.setSelected?.(false);

    const id = getCityId(city);
    const target = pin ||
      (id === 'hq'
        ? this.worldMap?.hqPin
        : this.activePins.find(candidate => getCityId(candidate.city) === id)) ||
      null;

    this.selectedCity = city;
    this.selectedPin = target;
    target?.setSelected(true);

    const options = getTransportOptions(this.getCurrentCityData(), city) || [];
    this.selectedTransport = options[0] || null;
    this.createTransportButtons(options);
    this.refreshInfoPanel(city);
    this.previewRoute(city);
    this.setConfirmEnabled(Boolean(this.selectedTransport));
    this.worldMap?.say(getCityQuip(city));
  }

  previewRoute(city) {
    const worldMap = this.worldMap;
    if (!worldMap) return;
    const from = worldMap.getCityPosition(this.getCurrentCityData());
    const to = worldMap.getCityPosition(city);
    worldMap.showRoute(from, to);
  }
}