import { gameState } from '../GameData.js';
import { ROUTE_LINE_COLOR, ROUTE_SHADOW_COLOR, getCityId } from './DestinationMeta.js';
import { getTransportOptions } from './DestinationCalculator.js';

export class DestinationMap {
  getLocationsData() {
    const data =
      this.scene.cache.json.get('locations') || [];

    if (Array.isArray(data)) return data;

    return Array.isArray(data.locations)
      ? data.locations
      : [];
  }

  getCurrentCityData() {
    const locations = this.getLocationsData();

    const cityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId;

    const cityName =
      this.gameState?.currentCity ||
      gameState.currentCity;

    return (
      locations.find(
        location => getCityId(location) === cityId
      ) ||
      locations.find(
        location => location.city === cityName
      ) ||
      null
    );
  }

  getDestinationsWithMustInclude() {
    const locations = this.getLocationsData();

    const currentId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const maxDestinations = 5;

    let result = Array.isArray(
      this.gameState?.currentDestinations
    )
      ? [...this.gameState.currentDestinations]
      : [];

    // Resolve entries against canonical location data.
    result = result
      .map(city => {
        const id = getCityId(city);

        return locations.find(
          location => getCityId(location) === id
        );
      })
      .filter(city => {
        const id = city ? getCityId(city) : null;
        return id && id !== currentId && id !== 'hq';
      });

    const requiredId =
      this.gameState?.mustIncludeCityId || null;

    if (requiredId && requiredId !== currentId) {
      const required = locations.find(
        location => getCityId(location) === requiredId
      );

      if (required) {
        result = [
          required,
          ...result.filter(
            city => getCityId(city) !== requiredId
          )
        ];
      }
    }

    const seen = new Set();

    result = result.filter(city => {
      const id = getCityId(city);

      if (!id || seen.has(id)) return false;

      seen.add(id);
      return true;
    });

    if (result.length < maxDestinations) {
      const filler = Phaser.Utils.Array.Shuffle(
        locations.filter(location => {
          const id = getCityId(location);

          return (
            location.city &&
            id &&
            id !== currentId &&
            id !== 'hq' &&
            !seen.has(id)
          );
        })
      );

      for (const city of filler) {
        if (result.length >= maxDestinations) break;

        result.push(city);
        seen.add(getCityId(city));
      }
    }

    return result.slice(0, maxDestinations);
  }

  clearPins() {
    for (const object of this.activePins) {
      object?.destroy?.(true);
    }

    this.activePins = [];
  }

  renderCityPins(cities) {
    for (const city of cities) {
      const x =
        city.map?.x ??
        city.mapX ??
        this.scene.scale.width / 2;

      const y =
        city.map?.y ??
        city.mapY ??
        this.scene.scale.height / 2;

      const pin = this.scene.add.container(x, y);

      const dot = this.scene.add
        .circle(0, 0, 15, 0xffcc00)
        .setStrokeStyle(4, 0x8b0000)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, 30, city.city || 'Unknown city', {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 5, y: 5 }
        })
        .setOrigin(0.5);

      pin.add([dot, label]);

      this.container.add(pin);
      this.activePins.push(pin);

      dot.on('pointerover', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload ||
          this.selectedPin === dot
        ) {
          return;
        }

        dot.setFillStyle(0xffffff);
        label.setColor('#ffcc00');
      });

      dot.on('pointerout', () => {
        if (this.selectedPin === dot) return;

        dot.setFillStyle(0xffcc00);
        label.setColor('#ffffff');
      });

      dot.on('pointerdown', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.selectCity(city, dot, label);
      });
    }
  }

  selectCity(city, dot = null, label = null) {
    if (
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return;
    }

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

    const options = getTransportOptions(
      this.getCurrentCityData(),
      city
    ) || [];

    this.selectedTransport = options[0] || null;

    this.createTransportButtons(options);
    this.refreshInfoPanel(city);
    this.previewRoute(city);

    this.setConfirmEnabled(
      Boolean(this.selectedTransport)
    );
  }

  previewRoute(city) {
    this.routePreview?.destroy();
    this.routePreview = null;

    const current = this.getCurrentCityData();

    if (!current?.map || !city?.map) return;

    this.routePreview = this.scene.add.graphics();

    for (const [width, color, alpha] of [
      [9, ROUTE_SHADOW_COLOR, 0.55],
      [4, ROUTE_LINE_COLOR, 0.98]
    ]) {
      this.routePreview.lineStyle(width, color, alpha);
      this.routePreview.beginPath();
      this.routePreview.moveTo(
        current.map.x,
        current.map.y
      );
      this.routePreview.lineTo(
        city.map.x,
        city.map.y
      );
      this.routePreview.strokePath();
    }

    this.container.add(this.routePreview);

    this.container.moveAbove(
      this.routePreview,
      this.mapImage
    );
  }
}
