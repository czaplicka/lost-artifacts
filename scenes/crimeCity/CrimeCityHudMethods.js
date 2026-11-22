import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';

const FILE = 'scenes/crimeCity/CrimeCityHudMethods.js';
const text = id => __dialogueText(FILE, id);

const DEFAULT_POPUP_COLOR = '#37474f';

const NAMED_POPUP_COLORS = new Set([
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'gray',
  'grey',
  'transparent'
]);

function isPopupColor(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const candidate = value.trim();

  return (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate) ||
    /^(?:rgb|rgba|hsl|hsla)\([^()]+\)$/i.test(candidate) ||
    NAMED_POPUP_COLORS.has(candidate.toLowerCase())
  );
}

function getPopupPresentation(colorOrTitle) {
  if (isPopupColor(colorOrTitle)) {
    return {
      backgroundColor: colorOrTitle.trim(),
      title: ''
    };
  }

  return {
    backgroundColor: DEFAULT_POPUP_COLOR,
    title: typeof colorOrTitle === 'string'
      ? colorOrTitle.trim()
      : ''
  };
}

export const crimeCityHudMethods = {
  async setupCrimeCityUi() {
    if (
      this.isSettingUpUi ||
      this._cleanupDone ||
      this._crimeCityErrorView
    ) {
      return false;
    }

    const token = this._runToken;

    const canContinue = () => (
      this.isCurrentRun(token) &&
      !this._crimeCityErrorView
    );

    if (!canContinue()) {
      return false;
    }

    this.isSettingUpUi = true;

    try {
      const uiScene = await this.ensureOverlayScene('UIScene');

      if (!canContinue()) {
        return false;
      }

      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();

        uiScene.updateTime?.({
          day: gameState.currentDay ?? gameState.day ?? 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute: gameState.currentMinute ?? gameState.minute ?? 0,
          partOfDay:
            gameState.currentPartOfDay ||
            gameState.partOfDay ||
            text('t_e9376a281aac57bb78e2')
        });
      }

      const playerHud = await this.restorePlayerHud();

      if (!canContinue()) {
        return false;
      }

      if (playerHud) {
        playerHud.setCurrentGameplayScene('CrimeCityScene');
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      }

      const newsHud = await this.ensureOverlayScene('NewsHud');

      if (!canContinue()) {
        return false;
      }

      if (newsHud) {
        newsHud.events?.emit('setNewspaperVisible', true);
        newsHud.events?.emit('setTvVisible', false);

        this.bringSceneToTopIfActive('NewsHud');
      }

      return true;
    } catch (error) {
      if (
        token !== this._runToken ||
        this._cleanupDone
      ) {
        return false;
      }

      console.error(
        '[CrimeCityScene] UI restore failed:',
        error
      );

      // Obsługujemy błąd tutaj, ponieważ inne moduły również
      // uruchamiają setupCrimeCityUi() bez await.
      if (
        this.sys.isActive() &&
        !this._crimeCityErrorView
      ) {
        try {
          this.showCrimeCityError(
            'The city interface could not be restored. ' +
            'Please return to the city and try again.'
          );
        } catch (recoveryError) {
          console.error(
            '[CrimeCityScene] Could not show UI recovery screen:',
            recoveryError
          );
        }
      }

      return false;
    } finally {
      if (token === this._runToken) {
        this.isSettingUpUi = false;
      }
    }
  },

  showNoEnergyPopup() {
    return this.showMessage(
      text('t_e75e9531dcc8081dac4c'),
      2400,
      text('t_f27f7bc32875ed02b2fc')
    );
  },

  showMessage(
    message,
    duration = 2200,
    colorOrTitle = DEFAULT_POPUP_COLOR
  ) {
    if (
      !message ||
      this._cleanupDone ||
      this._crimeCityErrorView ||
      !this.sys.isActive()
    ) {
      return null;
    }

    const { backgroundColor, title } = getPopupPresentation(
      colorOrTitle
    );

    const body = String(message);

    const content = title
      ? `${title}\n\n${body}`
      : body;

    const popup = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      content,
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor,
        padding: {
          x: 24,
          y: 16
        },
        align: 'center',
        wordWrap: {
          width: Math.max(40, this.scale.width - 64),
          useAdvancedWrap: true
        }
      }
    )
      .setOrigin(0.5)
      .setDepth(200);

    const numericDuration = Number(duration);

    const lifetime = Number.isFinite(numericDuration)
      ? Math.max(0, numericDuration)
      : 2200;

    let timer = this.time.delayedCall(lifetime, () => {
      timer = null;

      if (popup?.active) {
        popup.destroy();
      }
    });

    popup.once('destroy', () => {
      timer?.remove(false);
      timer = null;
    });

    return popup;
  },

  closeAllUIPanels() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();
  }
};