import { gameState } from '../../GameData.js';
import { getGameTimeManager } from '../../managers/GameTimeManager.js';
import { LOCATION_HOURS, CITY_BACKGROUND_KEYS } from './CityConfig.js';

export class CityPresentation {
  createBackground(city) {
    const key = city.backgroundKey || this.getCityBackgroundKey(city);

    if (this.textures.exists(key)) {
      this.add.image(
        this.scale.width / 2,
        this.scale.height / 2,
        key
      ).setDisplaySize(this.scale.width, this.scale.height);
    } else {
      console.warn('[CityScene] Missing city background:', key);
      this.cameras.main.setBackgroundColor('#20242b');
    }
  }

  getCityBackgroundKey(city) {
    return CITY_BACKGROUND_KEYS[city.id] || city.id;
  }

  createHeader(city) {
    this.add.rectangle(
      0, 0, this.scale.width, 80, 0x000000, 0.45
    ).setOrigin(0);

    this.add.text(40, 24, `${city.city}, ${city.country}`, {
      fontFamily: 'SpecialElite',
      fontSize: '28px',
      color: '#ffffff'
    });

    let subtitle = 'Talk to witnesses and follow the trail.';

    if (this.isFinalShowdown) {
      subtitle =
        'The suspect is cornered. Review the evidence and make the arrest.';
    } else if (this.cityCompleted) {
      subtitle = 'City cleared. Choose the next destination on the map.';
    }

    this.add.text(40, 54, subtitle, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#f1e6b8',
      wordWrap: { width: Math.max(100, this.scale.width - 80) }
    });
  }

  showNoEnergyPopup() {
    this.showMessage(
      "You're too exhausted, detective.\nGet some rest before continuing the case.",
      2400,
      '#8b0000'
    );
  }

  showMessage(text, duration = 2200, color = '#37474f') {
    if (!text || !this.canUseCity()) return null;

    const popup = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      text,
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: color,
        padding: { x: 24, y: 16 },
        align: 'center',
        wordWrap: { width: Math.max(100, this.scale.width - 70) }
      }
    )
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => {
      if (popup?.active) popup.destroy();
    });

    return popup;
  }

  showLocationClosedPopup(
    locationId,
    encounterData,
    dialogueTargetCityId = null
  ) {
    if (!this.canStartInteraction()) return;

    const { width, height } = this.scale;
    const objects = [];

    const clock = this.getCityClock();
    const waitMinutes = this.getMinutesUntilOpening(locationId);
    const allowed = (LOCATION_HOURS[locationId] || []).join(', ');

    const waitLabel = waitMinutes === null
      ? 'Opening unavailable'
      : waitMinutes === 0
        ? 'Enter now'
        : `Wait ${this.formatWaitDuration(waitMinutes)}`;

    const overlay = this.add.rectangle(
      0, 0, width, height, 0x000000, 0.7
    )
      .setOrigin(0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add.rectangle(
      width / 2, height / 2, 500, 300, 0x111111, 0.95
    )
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100)
      .setInteractive();

    const warningText = this.add.text(
      width / 2,
      height / 2 - 50,
      [
        'Location is currently closed.',
        `Open: ${allowed}`,
        `Current: ${this.formatCityClock(clock)} (${this.getPartOfDayForHour(clock.hour)})`
      ].join('\n'),
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 460 }
      }
    )
      .setOrigin(0.5)
      .setDepth(101);

    const waitBtn = this.add.text(
      width / 2,
      height / 2 + 30,
      waitLabel,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: waitMinutes === null ? '#777777' : '#ffcc00'
      }
    )
      .setOrigin(0.5)
      .setDepth(101);

    if (waitMinutes !== null) {
      waitBtn.setInteractive({ useHandCursor: true });
    }

    const cancelBtn = this.add.text(
      width / 2,
      height / 2 + 80,
      'Return',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#aaaaaa'
      }
    )
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    objects.push(
      overlay,
      popupBg,
      warningText,
      waitBtn,
      cancelBtn
    );

    const popupState = {
      cleanup: null,
      objects,
      busy: false
    };

    const cleanupPopup = () => {
      for (const object of objects) {
        if (object?.active) {
          object.removeAllListeners?.();
          object.destroy();
        }
      }

      if (this.activePopup === popupState) {
        this.activePopup = null;
      }
    };

    const cancelPopup = () => {
      if (!popupState.busy) cleanupPopup();
    };

    popupState.cleanup = cleanupPopup;
    this.activePopup = popupState;

    overlay.on('pointerdown', cancelPopup);
    cancelBtn.on('pointerdown', cancelPopup);

    waitBtn.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (
        popupState.busy ||
        this.activePopup !== popupState ||
        this.isTransitioning ||
        !this.canUseCity()
      ) {
        return;
      }

      const minutesToWait = this.getMinutesUntilOpening(locationId);

      if (minutesToWait === null) {
        warningText.setText(
          'No opening time is available for this location.'
        );
        return;
      }

      popupState.busy = true;
      waitBtn.disableInteractive();
      cancelBtn.disableInteractive();

      const wasGameActive = gameState.isGameActive === true;

      try {
        if (minutesToWait > 0) {
          getGameTimeManager().handleAdvanceTime(0, minutesToWait);
        }

        if (
          !this.canUseCity() ||
          this.activePopup !== popupState
        ) {
          return;
        }

        if (wasGameActive && gameState.isGameActive === false) {
          cleanupPopup();
          return;
        }

        cleanupPopup();
        this.openEncounter(encounterData, dialogueTargetCityId);
      } catch (error) {
        console.error('[CityScene] Waiting failed:', error);

        if (
          this.canUseCity() &&
          this.activePopup === popupState
        ) {
          cleanupPopup();

          this.showMessage(
            'Waiting could not be completed.\nCheck the clock before trying again.',
            4000,
            '#8b0000'
          );
        }
      }
    });
  }
}
