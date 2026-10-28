import { gameState } from '../GameData.js';
import { ROUTE_LINE_COLOR, ROUTE_SHADOW_COLOR, getCityId } from './DestinationMeta.js';
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

  clearPins() {
    for (const object of this.activePins) object?.destroy?.(true);
    this.activePins = [];
  }

  renderCityPins(cities) {
    for (const city of cities) {
      const x = city.map?.x ?? city.mapX ?? this.scene.scale.width / 2;
      const y = city.map?.y ?? city.mapY ?? this.scene.scale.height / 2;
      const pin = this.scene.add.container(x, y);
      const dot = this.scene.add.circle(0, 0, 15, 0xffcc00)
        .setStrokeStyle(4, 0x8b0000).setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(0, 30, city.city || 'Unknown city', {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffffff',
        backgroundColor: '#000000', padding: { x: 5, y: 5 }
      }).setOrigin(0.5);
      pin.add([dot, label]);
      this.container.add(pin);
      this.activePins.push(pin);
      dot.on('pointerover', () => {
        if (this.isTransitioning || this.committedTravelPayload || this.selectedPin === dot) return;
        dot.setFillStyle(0xffffff);
        label.setColor('#ffcc00');
      });
      dot.on('pointerout', () => {
        if (this.selectedPin === dot) return;
        dot.setFillStyle(0xffcc00);
        label.setColor('#ffffff');
      });
      dot.on('pointerdown', () => {
        if (this.isTransitioning || this.committedTravelPayload) return;
        this.selectCity(city, dot, label);
      });
    }
  }

  selectCity(city, dot = null, label = null) {
    if (this.isTransitioning || this.committedTravelPayload) return;
    this.clearTravelErrorTimer();
    this.selectedPin?.setFillStyle(0xffcc00);
    this.selectedPin?.setScale(1);
    this.selectedLabel?.setColor('#ffffff');
    this.selectedCity = city;
    this.selectedPin = dot;
    this.selectedLabel = label;
    dot?.setFillStyle(0xffffff);
    dot?.setScale(1.15);
    label?.setColor('#ffcc00');
    const options = getTransportOptions(this.getCurrentCityData(), city) || [];
    this.selectedTransport = options[0] || null;
    this.createTransportButtons(options);
    this.refreshInfoPanel(city);
    this.previewRoute(city);
    this.setConfirmEnabled(Boolean(this.selectedTransport));
  }

  previewRoute(city) {
    this.routePreview?.destroy();
    this.routePreview = null;
    const current = this.getCurrentCityData();
    if (!current?.map || !city?.map) return;
    this.routePreview = this.scene.add.graphics();
    for (const [width, color, alpha] of [
      [9, ROUTE_SHADOW_COLOR, 0.55], [4, ROUTE_LINE_COLOR, 0.98]
    ]) {
      this.routePreview.lineStyle(width, color, alpha);
      this.routePreview.beginPath();
      this.routePreview.moveTo(current.map.x, current.map.y);
      this.routePreview.lineTo(city.map.x, city.map.y);
      this.routePreview.strokePath();
    }
    this.container.add(this.routePreview);
    this.container.moveAbove(this.routePreview, this.mapImage);
  }
}