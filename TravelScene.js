import { gameState } from './GameData.js';
import { getDestinationPreviewData, travelToCity } from './gameSetup.js';

export default class TravelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TravelScene' });
  }

  init(data) {
    this.sceneData = data || {};
    this.selectedLocation = null;
    this.selectedMarker = null;
    this.markers = [];
  }

  create() {
    this.locationsData = this.registry.get('locationsData') || [];
    this.mapImageKey = this.sceneData.mapImageKey || 'mapbg';

    this.currentCity = gameState.currentCity;
    this.currentCityData = this.locationsData.find(loc => loc.city === this.currentCity) || null;
    this.candidates = getDestinationPreviewData(this.locationsData);

    if (!this.currentCityData) {
      throw new Error(`TravelScene: current city not found: ${this.currentCity}`);
    }

    this.drawMap();
    this.drawHeader();
    this.drawRoutes();
    this.drawCandidateMarkers();
    this.drawInfoPanel();
  }

  drawMap() {
    const { width, height } = this.scale;

    this.add.image(width * 0.5, height * 0.5, this.mapImageKey)
      .setDisplaySize(width, height);

    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x081018, 0.22);

    this.add.text(40, 28, 'Choose next destination', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#f4e7c1'
    });

    this.add.text(40, 66, `Current city: ${this.currentCity}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    });
  }

  drawHeader() {
    const { width } = this.scale;

    this.add.text(width - 40, 30, `Time: ${gameState.timeSpent || 0}h`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(1, 0);

    this.add.text(width - 40, 58, `Score: ${gameState.score || 0}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(1, 0);
  }

  drawRoutes() {
    if (!this.currentCityData?.map) return;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xd9c27a, 0.28);

    this.candidates.forEach(loc => {
      if (!loc?.map) return;

      graphics.beginPath();
      graphics.moveTo(this.currentCityData.map.x, this.currentCityData.map.y);
      graphics.lineTo(loc.map.x, loc.map.y);
      graphics.strokePath();
    });

    this.add.circle(this.currentCityData.map.x, this.currentCityData.map.y, 9, 0x52b788, 1)
      .setStrokeStyle(3, 0xf8f9fa);

    this.add.text(this.currentCityData.map.x, this.currentCityData.map.y - 22, this.currentCityData.city, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000'
    }).setOrigin(0.5, 1);
  }

  drawCandidateMarkers() {
    this.candidates.forEach(loc => {
      if (!loc?.map) return;

      const marker = this.add.circle(loc.map.x, loc.map.y, 11, 0xd4af37)
        .setStrokeStyle(2, 0x1a1a1a)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(loc.map.x, loc.map.y - 20, loc.city, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#f8f9fa',
        backgroundColor: '#000000'
      }).setOrigin(0.5, 1);

      marker.on('pointerover', () => {
        marker.setScale(1.15);
      });

      marker.on('pointerout', () => {
        if (this.selectedMarker !== marker) {
          marker.setScale(1);
        }
      });

      marker.on('pointerup', () => {
        this.selectLocation(loc, marker);
      });

      this.markers.push({ marker, label, location: loc });
    });
  }

  drawInfoPanel() {
    const { width, height } = this.scale;

    this.infoPanel = this.add.container(width - 360, height - 240);

    const bg = this.add.rectangle(0, 0, 320, 190, 0x101820, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd4af37);

    this.infoTitle = this.add.text(20, 18, 'Travel dossier', {
      fontFamily: 'Georgia',
      fontSize: '26px',
      color: '#f4e7c1'
    });

    this.infoCity = this.add.text(20, 62, 'Select a city on the map.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: 280 }
    });

    this.infoCountry = this.add.text(20, 96, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cfcfcf'
    });

    this.infoHours = this.add.text(20, 124, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd166'
    });

    this.confirmButton = this.add.rectangle(160, 158, 180, 38, 0x6c757d)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0xf1f1f1)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = this.add.text(160, 177, 'Confirm travel', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.confirmButton.on('pointerup', () => {
      this.confirmTravel();
    });

    this.infoPanel.add([
      bg,
      this.infoTitle,
      this.infoCity,
      this.infoCountry,
      this.infoHours,
      this.confirmButton,
      this.confirmLabel
    ]);

    this.setConfirmEnabled(false);
  }

  selectLocation(loc, marker) {
    this.selectedLocation = loc;

    if (this.selectedMarker) {
      this.selectedMarker.setFillStyle(0xd4af37, 1);
      this.selectedMarker.setScale(1);
    }

    this.selectedMarker = marker;
    this.selectedMarker.setFillStyle(0xffe066, 1);
    this.selectedMarker.setScale(1.2);

    this.refreshInfoPanel();
    this.previewRoute(loc);
    this.setConfirmEnabled(true);
  }

  refreshInfoPanel() {
    if (!this.selectedLocation) {
      this.infoCity.setText('Select a city on the map.');
      this.infoCountry.setText('');
      this.infoHours.setText('');
      return;
    }

    this.infoCity.setText(this.selectedLocation.city);
    this.infoCountry.setText(this.selectedLocation.country || '');
    this.infoHours.setText(`Travel time: +${this.selectedLocation.travelHours}h`);
  }

  previewRoute(loc) {
    if (this.routePreview) {
      this.routePreview.destroy();
    }

    this.routePreview = this.add.graphics();
    this.routePreview.lineStyle(4, 0xffe066, 0.9);

    this.routePreview.beginPath();
    this.routePreview.moveTo(this.currentCityData.map.x, this.currentCityData.map.y);
    this.routePreview.lineTo(loc.map.x, loc.map.y);
    this.routePreview.strokePath();
  }

  setConfirmEnabled(enabled) {
    if (!this.confirmButton) return;

    if (enabled) {
      this.confirmButton.setFillStyle(0x9b5de5, 1);
      this.confirmButton.setAlpha(1);
      this.confirmButton.disableInteractive();
      this.confirmButton.setInteractive({ useHandCursor: true });
    } else {
      this.confirmButton.setFillStyle(0x6c757d, 1);
      this.confirmButton.setAlpha(0.7);
      this.confirmButton.disableInteractive();
    }
  }

  confirmTravel() {
    if (!this.selectedLocation) return;

    const result = travelToCity(this.selectedLocation.city, this.locationsData);

    this.scene.start('TravelTransitionScene', {
      ...result,
      selectedLocation: this.selectedLocation,
      nextScene: result.wasCorrect ? 'CityScene' : 'TravelScene'
    });
  }
}