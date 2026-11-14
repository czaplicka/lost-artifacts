import { getEnergyManager } from '../../managers/EnergyManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { SHOP_TAXI_ENERGY, SHOP_ICON_SIZE, SHOP_LABEL_OFFSET } from './CityConfig.js';

export class CityPlaces {
  createHotelIcon() {
    this.destroyHotelObjects();

    const configured = this.city?.hotel;
    const x = Number.isFinite(configured?.x)
      ? configured.x
      : this.scale.width - 130;

    const y = Number.isFinite(configured?.y)
      ? configured.y
      : Math.max(150, this.scale.height - 355);

    let icon;

    if (this.textures.exists('hotel_icon')) {
      icon = this.add.image(x, y, 'hotel_icon');

      const size = Math.max(icon.width, icon.height, 1);
      icon.setScale(112 / size);
    } else {
      icon = this.add.rectangle(
        x, y, 112, 86, 0x30271d, 0.96
      ).setStrokeStyle(3, 0xd4af37);
    }

    const baseScaleX = icon.scaleX;
    const baseScaleY = icon.scaleY;

    icon
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(
      x,
      y + 66,
      'HOTEL',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { x: 10, y: 5 }
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    const objects = [icon, label];

    if (!this.textures.exists('hotel_icon')) {
      const symbol = this.add.text(x, y, 'HOTEL', {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#f6dc8c'
      })
        .setOrigin(0.5)
        .setDepth(6);

      objects.push(symbol);
    }

    const enter = pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitHotel();
    };

    for (const target of [icon, label]) {
      target.on('pointerdown', enter);

      target.on('pointerover', () => {
        if (!this.canStartInteraction()) return;

        icon.setScale(baseScaleX * 1.08, baseScaleY * 1.08);
        label.setColor('#ffe066');
      });

      target.on('pointerout', () => {
        icon.setScale(baseScaleX, baseScaleY);
        label.setColor('#ffffff');
      });
    }

    this.hotelObjects.push(...objects);
    this.interactiveObjects.push(icon, label);
  }

  visitHotel() {
    if (!this.canStartInteraction()) return false;

    this.closeAllUIPanels();

    return this.transitionTo('HotelScene', {
      cityId: this.cityId,
      returnScene: 'CityScene',
      returnData: {
        cityId: this.cityId,
        cityCompleted: this.cityCompleted,
        investigationStatus: this.investigationStatus,
        pendingPhoneCall: false,
        openDestinations: false
      }
    });
  }

  destroyHotelObjects() {
    const objects = this.hotelObjects.splice(0);
    const removing = new Set(objects);

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !removing.has(object)
    );

    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  createShopIcon() {
    this.destroyShopObjects();

    const position = this.city?.shop || {
      x: this.scale.width - 130,
      y: this.scale.height - 170
    };

    const hasTexture = this.textures.exists('shop_icon');

    const icon = hasTexture
      ? this.add.image(position.x, position.y, 'shop_icon')
      : this.add.circle(
          position.x,
          position.y,
          SHOP_ICON_SIZE / 2,
          0x806127,
          0.95
        ).setStrokeStyle(3, 0xffd166);

    const baseScale = hasTexture
      ? SHOP_ICON_SIZE / Math.max(icon.width, icon.height, 1)
      : 1;

    icon
      .setScale(baseScale)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(
      position.x,
      position.y + SHOP_LABEL_OFFSET,
      `Shop (-${SHOP_TAXI_ENERGY} Energy)`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 7, y: 4 },
        align: 'center'
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(6);

    icon.on('pointerover', () => {
      if (!this.canStartInteraction()) return;

      icon.setScale(baseScale * 1.1);
      label.setColor('#ffe066');
    });

    icon.on('pointerout', () => {
      icon.setScale(baseScale);
      label.setColor('#ffffff');
    });

    icon.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitShop();
    });

    this.shopObjects.push(icon, label);
    this.interactiveObjects.push(icon);

    if (!hasTexture) this.requestShopIconAsset();
  }

  requestShopIconAsset() {
    if (
      this.shopAssetHandler ||
      this.textures.exists('shop_icon')
    ) {
      return;
    }

    const event = 'filecomplete-image-shop_icon';

    const callback = () => {
      this.shopAssetHandler = null;

      if (this.canUseCity()) {
        this.createShopIcon();
      }
    };

    this.shopAssetHandler = { event, callback };

    this.load.once(event, callback);
    this.load.image('shop_icon', 'assets/shop.png');

    if (!this.load.isLoading()) {
      this.load.start();
    }
  }

  destroyShopObjects() {
    const objects = this.shopObjects.splice(0);
    const removing = new Set(objects);

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !removing.has(object)
    );

    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  visitShop() {
    if (!this.canStartInteraction()) return false;

    if (getEnergyManager().getCurrentEnergy() < SHOP_TAXI_ENERGY) {
      this.showNoEnergyPopup();
      return false;
    }

    this.closeAllUIPanels();
    this.isTransitioning = true;

    void this.openShopOverlay();
    return true;
  }

  async openShopOverlay() {
    try {
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.ensure('ShopScene');
      }

      if (!this.canUseCity()) return false;

      if (!this.hasScene('ShopScene')) {
        throw new Error('ShopScene is not registered.');
      }

      const energy = getEnergyManager();

      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.showNoEnergyPopup();
        return false;
      }

      const opened = await this.launchOverlay('ShopScene', {
        cityId: this.cityId,
        returnScene: 'CityScene'
      });

      if (!this.canUseCity()) return false;

      if (!opened) {
        this.showMessage(
          'The shop could not be opened.\nPlease try again.',
          2800,
          '#8b0000'
        );

        return false;
      }

      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.scene.stop('ShopScene');
        this.showNoEnergyPopup();
        void this.setupCityUi();
        return false;
      }

      energy.consumeCustom(
        SHOP_TAXI_ENERGY,
        'Taxi to shop: -3'
      );

      saveGameState();

      this.getSceneIfActive('UIScene')?.updateEnergy?.();

      this.scene.pause();
      return true;
    } catch (error) {
      console.error('[CityScene] Opening ShopScene failed:', error);

      if (this.canUseCity()) {
        this.scene.stop('ShopScene');

        this.showMessage(
          'The shop could not be opened.\nCheck the console for details.',
          3200,
          '#8b0000'
        );

        void this.setupCityUi();
      }

      return false;
    } finally {
      this.isTransitioning = false;
    }
  }
}
