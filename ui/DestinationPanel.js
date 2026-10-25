import { gameState } from '../GameData.js';
import { getCityId } from './DestinationMeta.js';
import { getAvailableAgencyBudget, wouldCreateDebt, formatMoney } from './DestinationCalculator.js';

export class DestinationPanel {
  createInfoPanel(width, height) {
    this.infoPanel = this.scene.add.container(
      width - 405,
      height - 430
    );

    const bg = this.scene.add
      .rectangle(0, 0, 380, 415, 0x101820, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37)
      .setInteractive();

    const text = (x, y, value, size, color, wrap = 0) => {
      return this.scene.add.text(x, y, value, {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color,
        wordWrap: wrap
          ? { width: wrap, useAdvancedWrap: true }
          : undefined
      });
    };

    this.infoTitle = text(
      20, 16, 'Travel dossier', 27, '#f4e7c1'
    );

    this.infoCity = text(
      20, 58, '', 23, '#ffffff'
    );

    this.infoCountry = text(
      20, 86, '', 17, '#c6d7e5', 335
    );

    this.transportPrompt = text(
      20, 113, '', 17, '#ffd166', 335
    );

    this.infoTravel = text(
      20, 211, '', 17, '#d6e4f0', 340
    );

    this.infoHours = text(
      20, 257, '', 18, '#ffd166'
    );

    this.debtWarning = text(
      20, 282, '', 14, '#ff9d6b', 340
    );

    this.confirmButton = this.scene.add
      .rectangle(190, 350, 280, 44, 0x6c757d, 1)
      .setStrokeStyle(2, 0xf1f1f1)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = text(
      190, 350, 'Choose a city', 17, '#ffffff'
    ).setOrigin(0.5);

    this.confirmButton.on('pointerdown', () => {
      if (this.isDestroyed || this.isTransitioning) return;

      if (this.committedTravelPayload) {
        void this.retryCommittedTravel();
        return;
      }

      if (
        !this.canConfirm ||
        !this.selectedCity ||
        !this.selectedTransport
      ) {
        return;
      }

      void this.travelToCity(
        this.selectedCity,
        this.selectedTransport
      );
    });

    this.infoPanel.add([
      bg,
      this.infoTitle,
      this.infoCity,
      this.infoCountry,
      this.transportPrompt,
      this.infoTravel,
      this.infoHours,
      this.debtWarning,
      this.confirmButton,
      this.confirmLabel
    ]);

    this.container.add(this.infoPanel);
    this.setConfirmEnabled(false);
  }

  createHQButton() {
    this.hqButton = this.scene.add.container(150, 105);

    this.hqButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, 0x251926, 0.96)
      .setStrokeStyle(2, 0xff4f81)
      .setInteractive({ useHandCursor: true });

    this.hqButtonLabel = this.scene.add
      .text(0, 0, 'RETURN TO HQ', {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#fff2f6'
      })
      .setOrigin(0.5);

    this.hqButton.add([
      this.hqButtonBg,
      this.hqButtonLabel
    ]);

    this.hqButtonBg.on('pointerover', () => {
      if (
        this.isTransitioning ||
        this.isAtHQ() ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.hqButtonBg.setFillStyle(0x5a1c38, 1);
    });

    this.hqButtonBg.on('pointerout', () => {
      this.updateHQButton();
    });

    this.hqButtonBg.on('pointerdown', () => {
      if (
        this.isTransitioning ||
        this.isAtHQ() ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.selectHeadquarters();
    });

    this.container.add(this.hqButton);
  }

  isAtHQ() {
    return (
      this.gameState?.currentCityId ||
      gameState.currentCityId
    ) === 'hq';
  }

  updateHQButton() {
    if (!this.hqButtonBg) return;

    const blocked =
      this.isAtHQ() ||
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.hqButton.setVisible(true);
    this.hqButton.setAlpha(blocked ? 0.6 : 1);

    this.hqButtonBg.setFillStyle(
      blocked ? 0x30343b : 0x251926,
      0.96
    );

    this.hqButtonBg.setStrokeStyle(
      2,
      blocked ? 0x777777 : 0xff4f81
    );

    this.hqButtonLabel
      .setText(
        this.isAtHQ() ? 'MARK AGENCY HQ' : 'RETURN TO HQ'
      )
      .setColor(blocked ? '#a5a5a5' : '#fff2f6');

    if (blocked) {
      this.hqButtonBg.disableInteractive();
    } else {
      this.hqButtonBg.setInteractive({
        useHandCursor: true
      });
    }
  }

  selectHeadquarters() {
    if (
      this.isAtHQ() ||
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return;
    }

    const headquarters = this.getLocationsData().find(
      location => getCityId(location) === 'hq'
    );

    if (!headquarters) {
      this.showTravelError(
        'Headquarters is missing from the location data.'
      );
      return;
    }

    this.selectCity(headquarters);
  }

  createOfficeButton() {
    this.officeButton = this.scene.add.container(430, 105);

    this.officeButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, 0x1c2a1e, 0.96)
      .setStrokeStyle(2, 0x6fbf73)
      .setInteractive({ useHandCursor: true });

    this.officeButtonLabel = this.scene.add
      .text(0, 0, 'PI OFFICE', {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#eaf6ec'
      })
      .setOrigin(0.5);

    this.officeButton.add([
      this.officeButtonBg,
      this.officeButtonLabel
    ]);

    this.officeButtonBg.on('pointerover', () => {
      if (
        this.isTransitioning ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.officeButtonBg.setFillStyle(0x2c4a30, 1);
      this.officeButtonLabel.setColor('#c9f2cf');
    });

    this.officeButtonBg.on('pointerout', () => {
      this.updateOfficeButton();
    });

    this.officeButtonBg.on(
      'pointerdown',
      (_pointer, _x, _y, event) => {
        event?.stopPropagation();

        console.log('[DestinationsUI] PI OFFICE clicked', {
          ownerScene: this.scene.sys.settings.key,
          currentCityId: gameState.currentCityId
        });

        void this.enterOffice();
      }
    );

    this.container.add(this.officeButton);
  }

  updateOfficeButton() {
    if (!this.officeButtonBg) return;

    const blocked =
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.officeButton
      .setVisible(true)
      .setAlpha(blocked ? 0.6 : 1);

    this.officeButtonBg.setFillStyle(0x1c2a1e, 0.96);
    this.officeButtonLabel.setColor('#eaf6ec');

    if (blocked) {
      this.officeButtonBg.disableInteractive();
    } else {
      this.officeButtonBg.setInteractive({
        useHandCursor: true
      });
    }
  }

  clearTransportButtons() {
    for (const button of this.transportButtons) {
      button?.destroy?.(true);
    }

    this.transportButtons = [];
  }

  createTransportButtons(options) {
    this.clearTransportButtons();

    if (options.length <= 1) return;

    const gap = 8;

    const buttonWidth = Math.min(
      82,
      Math.floor(
        (330 - gap * (options.length - 1)) /
        options.length
      )
    );

    options.forEach((option, index) => {
      const x =
        20 +
        buttonWidth / 2 +
        index * (buttonWidth + gap);

      const selected =
        option.id === this.selectedTransport?.id;

      const container =
        this.scene.add.container(x, 169);

      const bg = this.scene.add
        .rectangle(
          0, 0,
          buttonWidth, 48,
          selected ? option.color : 0x273746,
          1
        )
        .setStrokeStyle(
          2,
          selected ? 0xffffff : option.color
        )
        .setInteractive({ useHandCursor: true });

      const icon = this.scene.add
        .text(0, -9, option.icon || '', {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      const label = this.scene.add
        .text(0, 14, option.label || option.id, {
          fontFamily: 'SpecialElite',
          fontSize: '13px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      container.add([bg, icon, label]);

      bg.on('pointerdown', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.clearTravelErrorTimer();
        this.selectedTransport = option;

        this.createTransportButtons(options);
        this.refreshInfoPanel(this.selectedCity);
        this.previewRoute(this.selectedCity);
      });

      this.infoPanel.add(container);
      this.transportButtons.push(container);
    });
  }

  getTravelPreview(city) {
    const transport = this.selectedTransport;

    return {
      fromCity: this.getCurrentCityData()?.city || '',
      toCity: city?.city || '',
      travelHours: transport?.travelHours ?? 0,
      baseTravelHours: transport?.baseTravelHours ?? 0,
      moneySpent: transport?.moneySpent ?? 0,
      energyChange: transport?.energyChange ?? 0
    };
  }

  refreshInfoPanel(city = null) {
    if (this.isDestroyed) return;

    if (!city) {
      this.infoCity.setText('Choose a city');
      this.infoCountry.setText('');
      this.transportPrompt
        .setColor('#ffd166')
        .setText('');

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText('Choose a city');
      return;
    }

    this.infoCity.setText(city.city || 'Unknown city');
    this.infoCountry.setText(city.country || '');

    if (!this.selectedTransport) {
      this.transportPrompt
        .setColor('#ff6b6b')
        .setText('No sensible route is available.');

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText('No route available');

      this.setConfirmEnabled(false);
      return;
    }

    const preview = this.getTravelPreview(city);
    const budget = getAvailableAgencyBudget();

    const freeTransfers = Math.max(
      0,
      Number(gameState.freeTransfers) || 0
    );

    const cost = freeTransfers > 0
      ? 0
      : preview.moneySpent;

    const createsDebt =
      cost > 0 && wouldCreateDebt(cost);

    this.transportPrompt
      .setColor('#ffd166')
      .setText(
        `Selected: ${this.selectedTransport.icon || ''} ` +
        this.selectedTransport.label
      );

    this.infoTravel.setText(
      `Ticket: ${cost === 0 ? 'FREE' : formatMoney(cost)}\n` +
      `Agency: ${formatMoney(budget)} | Energy: ${preview.energyChange}`
    );

    this.infoHours.setText(
      `Travel time: +${preview.travelHours}h`
    );

    this.debtWarning.setText(
      freeTransfers > 0
        ? `Free transfers: ${freeTransfers}. This trip will use one.`
        : createsDebt
          ? 'Insufficient agency budget. The balance will become agency debt.'
          : ''
    );

    this.confirmLabel.setText(
      `Go by ${this.selectedTransport.label}`
    );

    this.setConfirmEnabled(true);
  }

  setConfirmEnabled(enabled) {
    this.canConfirm = Boolean(
      enabled &&
      !this.isTransitioning &&
      !this.isDestroyed &&
      !this.committedTravelPayload
    );

    if (!this.confirmButton || this.isDestroyed) return;

    this.confirmButton.setFillStyle(
      this.canConfirm ? 0x9b5de5 : 0x6c757d,
      1
    );

    const alpha = this.canConfirm ? 1 : 0.7;

    this.confirmButton.setAlpha(alpha);
    this.confirmLabel.setAlpha(alpha);
  }

  clearTravelErrorTimer() {
    this.travelErrorTimer?.remove(false);
    this.travelErrorTimer = null;
  }

  showTravelError(message) {
    if (this.isDestroyed) return;

    this.clearTravelErrorTimer();

    this.transportPrompt
      .setColor('#ff6b6b')
      .setText(message);

    this.travelErrorTimer =
      this.scene.time.delayedCall(3500, () => {
        this.travelErrorTimer = null;

        if (
          this.isDestroyed ||
          !this.isOpen ||
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.refreshInfoPanel(this.selectedCity);
      });
  }
}
