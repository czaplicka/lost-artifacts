import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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

    this.add.text(40, 24, `${city.city}${__dialogueText("scenes/city/CityPresentation.js", "t_0a07f659461970d8d8dc")}${city.country}`, {
      fontFamily: 'SpecialElite',
      fontSize: '28px',
      color: '#ffffff'
    });

    let subtitle = __dialogueText("scenes/city/CityPresentation.js", "t_fa7d03540474e4ed4166");

    if (this.isFinalShowdown) {
      subtitle =
        __dialogueText("scenes/city/CityPresentation.js", "t_6461b5c2b5b92355c350");
    } else if (this.cityCompleted) {
      subtitle = __dialogueText("scenes/city/CityPresentation.js", "t_440c1bc38f87a7ba0d16");
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
      __dialogueText("scenes/city/CityPresentation.js", "t_e75e9531dcc8081dac4c"),
      2400,
      __dialogueText("scenes/city/CityPresentation.js", "t_f27f7bc32875ed02b2fc")
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
      ? __dialogueText("scenes/city/CityPresentation.js", "t_097ea6975eaa7c5250f2")
      : waitMinutes === 0
        ? __dialogueText("scenes/city/CityPresentation.js", "t_a89d634b7f1a322c63f1")
        : `${__dialogueText("scenes/city/CityPresentation.js", "t_405a8d5892fbd33b66f2")}${this.formatWaitDuration(waitMinutes)}`;

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
        __dialogueText("scenes/city/CityPresentation.js", "t_3a9c3073a340ea9e1d33"),
        `${__dialogueText("scenes/city/CityPresentation.js", "t_377de36aed83402230d5")}${allowed}`,
        `${__dialogueText("scenes/city/CityPresentation.js", "t_f1560699839571d33e6b")}${this.formatCityClock(clock)}${__dialogueText("scenes/city/CityPresentation.js", "t_4f5a2ada1166172aa174")}${this.getPartOfDayForHour(clock.hour)}${__dialogueText("scenes/city/CityPresentation.js", "t_ba5ec51d07a4ac0e9516")}`
      ].join(__dialogueText("scenes/city/CityPresentation.js", "t_01ba4719c80b6fe911b0")),
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
      __dialogueText("scenes/city/CityPresentation.js", "t_6b0143d03864993fdf69"),
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
          __dialogueText("scenes/city/CityPresentation.js", "t_4c5ea29c71818b9a73ce")
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
            __dialogueText("scenes/city/CityPresentation.js", "t_f0f6601cc0893dd3e172"),
            4000,
            __dialogueText("scenes/city/CityPresentation.js", "t_f27f7bc32875ed02b2fc")
          );
        }
      }
    });
  }
}
