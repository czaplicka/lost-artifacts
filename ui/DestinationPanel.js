import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { getCityId, getDestinationTheme } from './DestinationMeta.js';
import { getAvailableAgencyBudget, wouldCreateDebt, formatMoney } from './DestinationCalculator.js';

export class DestinationPanel {
  getPanelTheme() {
    return this.theme || getDestinationTheme('agency');
  }

  createInfoPanel(width, height) {
    const t = this.getPanelTheme();
    const isAgency = t.id === 'agency';

    this.infoPanel = this.scene.add.container(
      width - 405,
      height - 430
    );

    const bg = this.scene.add
      .rectangle(0, 0, 380, 415, t.panelBg, t.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(2, t.panelStroke)
      .setInteractive();

    // Theme decoration: HUD brackets (agency) or ledger rules (PI).
    const deco = this.scene.add.graphics();

    if (isAgency) {
      deco.lineStyle(3, t.accent, 1);

      [[0, 0, 1, 1], [380, 0, -1, 1], [0, 415, 1, -1], [380, 415, -1, -1]]
        .forEach(([x, y, dx, dy]) => {
          deco.beginPath();
          deco.moveTo(x + dx * 26, y);
          deco.lineTo(x, y);
          deco.lineTo(x, y + dy * 26);
          deco.strokePath();
        });

      deco.lineStyle(1, t.accent, 0.5);
      deco.lineBetween(20, 52, 360, 52);
    } else {
      deco.lineStyle(2, t.panelStroke, 0.9);
      deco.lineBetween(20, 51, 360, 51);
      deco.lineStyle(1, t.panelStroke, 0.7);
      deco.lineBetween(20, 55, 360, 55);
      deco.fillStyle(0xd9c27a, 0.85);
      deco.fillPoints([
        { x: -6, y: 8 }, { x: 18, y: -4 }, { x: 30, y: 10 }, { x: 6, y: 22 }
      ], true);
    }

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
      20, 14, t.panelTitle, 27, t.titleColor
    );

    this.panelTag = isAgency
      ? this.scene.add.text(360, 26, __dialogueText("ui/DestinationPanel.js", "t_394115ac4eb09aa49429"), {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: t.accentCss
      }).setOrigin(1, 0.5)
      : null;

    this.infoCity = text(
      20, 60, '', 23, t.cityColor
    );

    this.infoCountry = text(
      20, 88, '', 17, t.countryColor, 335
    );

    this.transportPrompt = text(
      20, 113, '', 17, t.promptColor, 335
    );

    this.infoTravel = text(
      20, 211, '', 17, t.travelColor, 340
    );

    this.infoHours = text(
      20, 257, '', 18, t.hoursColor
    );

    this.debtWarning = text(
      20, 282, '', 14, t.warnColor, 340
    );

    this.confirmButton = this.scene.add
      .rectangle(190, 350, 280, 44, t.confirmOff, 1)
      .setStrokeStyle(2, t.confirmStroke)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = text(
      190, 350, __dialogueText("ui/DestinationPanel.js", "t_70db5eaaecce103e33d3"), 17, t.confirmText
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
      deco,
      this.infoTitle,
      ...(this.panelTag ? [this.panelTag] : []),
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
    const t = this.getPanelTheme();

    this.hqButton = this.scene.add.container(150, 105);

    this.hqButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, t.hq.fill, 0.96)
      .setStrokeStyle(2, t.hq.stroke)
      .setInteractive({ useHandCursor: true });

    this.hqButtonLabel = this.scene.add
      .text(0, 0, __dialogueText("ui/DestinationPanel.js", "t_522e8a33e721296e0f4f"), {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: t.hq.text
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

      this.hqButtonBg.setFillStyle(t.hq.hover, 1);
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

    const t = this.getPanelTheme();

    const blocked =
      this.isAtHQ() ||
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.hqButton.setVisible(true);
    this.hqButton.setAlpha(blocked ? 0.6 : 1);

    this.hqButtonBg.setFillStyle(
      blocked ? t.hq.blockedFill : t.hq.fill,
      0.96
    );

    this.hqButtonBg.setStrokeStyle(
      2,
      blocked ? t.hq.blockedStroke : t.hq.stroke
    );

    this.hqButtonLabel
      .setText(
        this.isAtHQ() ? __dialogueText("ui/DestinationPanel.js", "t_47dd394e38f0f5b5f970") : __dialogueText("ui/DestinationPanel.js", "t_522e8a33e721296e0f4f")
      )
      .setColor(blocked ? t.hq.blockedText : t.hq.text);

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
        __dialogueText("ui/DestinationPanel.js", "t_60c2c242eaa4396d0476")
      );
      return;
    }

    this.selectCity(headquarters);
  }

  createOfficeButton() {
    const t = this.getPanelTheme();

    this.officeButton = this.scene.add.container(430, 105);

    this.officeButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, t.office.fill, 0.96)
      .setStrokeStyle(2, t.office.stroke)
      .setInteractive({ useHandCursor: true });

    this.officeButtonLabel = this.scene.add
      .text(0, 0, __dialogueText("ui/DestinationPanel.js", "t_f99419d296900dce0711"), {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: t.office.text
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

      this.officeButtonBg.setFillStyle(t.office.hover, 1);
    });

    this.officeButtonBg.on('pointerout', () => {
      this.updateOfficeButton();
    });

    this.officeButtonBg.on(
      'pointerdown',
      (_pointer, _x, _y, event) => {
        event?.stopPropagation();

        void this.enterOffice();
      }
    );

    this.container.add(this.officeButton);
  }

  updateOfficeButton() {
    if (!this.officeButtonBg) return;

    const t = this.getPanelTheme();

    const blocked =
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.officeButton
      .setVisible(true)
      .setAlpha(blocked ? 0.6 : 1);

    this.officeButtonBg.setFillStyle(t.office.fill, 0.96);
    this.officeButtonLabel.setColor(t.office.text);

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

    const t = this.getPanelTheme();
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
          selected ? option.color : t.transportIdle,
          1
        )
        .setStrokeStyle(
          2,
          selected ? t.confirmStroke : option.color
        )
        .setInteractive({ useHandCursor: true });

      const textColor = selected
        ? t.transportTextSelected
        : t.transportText;

      const icon = this.scene.add
        .text(0, -9, option.icon || '', {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: textColor
        })
        .setOrigin(0.5);

      const label = this.scene.add
        .text(0, 14, option.label || option.id, {
          fontFamily: 'SpecialElite',
          fontSize: '13px',
          color: textColor
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

    const t = this.getPanelTheme();

    if (!city) {
      this.infoCity.setText(__dialogueText("ui/DestinationPanel.js", "t_70db5eaaecce103e33d3"));
      this.infoCountry.setText('');
      this.transportPrompt
        .setColor(t.promptColor)
        .setText('');

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText(__dialogueText("ui/DestinationPanel.js", "t_70db5eaaecce103e33d3"));
      return;
    }

    this.infoCity.setText(city.city || __dialogueText("ui/DestinationPanel.js", "t_2491fe94a7ba027ffff4"));
    this.infoCountry.setText(city.country || '');

    if (!this.selectedTransport) {
      this.transportPrompt
        .setColor(t.errorColor)
        .setText(__dialogueText("ui/DestinationPanel.js", "t_ba6ce2725eb225a3324a"));

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText(__dialogueText("ui/DestinationPanel.js", "t_5f0fbd36417d7f3d9f74"));

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
      .setColor(t.promptColor)
      .setText(
        `${__dialogueText("ui/DestinationPanel.js", "t_1f153fd1824c1367e373")}${this.selectedTransport.icon || ''}${__dialogueText("ui/DestinationPanel.js", "t_36a9e7f1c95b82ffb997")}` +
        this.selectedTransport.label
      );

    this.infoTravel.setText(
      `${__dialogueText("ui/DestinationPanel.js", "t_bb4d5fd69512fbaae282")}${cost === 0 ? __dialogueText("ui/DestinationPanel.js", "t_19f1fa5ec989d121d8d2") : formatMoney(cost)}${__dialogueText("ui/DestinationPanel.js", "t_01ba4719c80b6fe911b0")}` +
      `${__dialogueText("ui/DestinationPanel.js", "t_3b83bd97552e7b897191")}${formatMoney(budget)}${__dialogueText("ui/DestinationPanel.js", "t_5ca26b1a55f0a6113de2")}${preview.energyChange}`
    );

    this.infoHours.setText(
      `${__dialogueText("ui/DestinationPanel.js", "t_c711c9607a1cab511905")}${preview.travelHours}${__dialogueText("ui/DestinationPanel.js", "t_aaa9402664f1a41f40eb")}`
    );

    this.debtWarning.setText(
      freeTransfers > 0
        ? `${__dialogueText("ui/DestinationPanel.js", "t_8ed7dd6b245229364ec6")}${freeTransfers}${__dialogueText("ui/DestinationPanel.js", "t_30c0002790ef3b44e964")}`
        : createsDebt
          ? __dialogueText("ui/DestinationPanel.js", "t_211e1635bcd2c9bf6019")
          : ''
    );

    this.confirmLabel.setText(
      `${__dialogueText("ui/DestinationPanel.js", "t_b264db19b73fe8425fbf")}${this.selectedTransport.label}`
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

    const t = this.getPanelTheme();

    this.confirmButton.setFillStyle(
      this.canConfirm ? t.confirmOn : t.confirmOff,
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
      .setColor(this.getPanelTheme().errorColor)
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