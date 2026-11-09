import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getReputation } from '../managers/ReputationManager.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';

const KEY = 'HospitalScene';
const BACKGROUND_KEY = 'hospital_reception_nurse';
const BACKGROUND_URL = 'assets/pi/hospital/nurse.webp';

export const HOSPITAL_MIN_FAME = 30;

export function canEnterHospital() {
  return getReputation().fame >= HOSPITAL_MIN_FAME;
}

export class HospitalScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init() {
    this.disposed = false;
    this.navigating = false;
    this.token = Symbol(KEY);

    this.background = null;
    this.nurseHotspot = null;
    this.nurseLabel = null;
    this.exitButton = null;
    this.dialogue = null;
    this.dialogueOpen = false;
    this.errorText = null;
    this.imageBox = null;

    this.hiddenHudElement = null;
    this.previousHudDisplay = '';
  }

  preload() {
    if (!this.textures.exists(BACKGROUND_KEY)) {
      this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
    }
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', KEY);

    this.events.once('shutdown', this.disposeHospital, this);
    this.events.once('destroy', this.disposeHospital, this);

    this.hideGameplayHud();

    this.cameras.main.setBackgroundColor('#11191c');

    this.dialogue = new HomeTownDialogue(this, () => {
      this.dialogueOpen = false;
      this.refreshHotspot();
      void this.leave();
    });

    if (this.textures.exists(BACKGROUND_KEY)) {
      this.background = this.add
        .image(0, 0, BACKGROUND_KEY)
        .setOrigin(0)
        .setDepth(0);

      this.createNurseHotspot();
    } else {
      this.errorText = this.add.text(
        24,
        90,
        [
          'Hospital background could not be loaded.',
          '',
          'Expected file:',
          BACKGROUND_URL,
          '',
          'Use Back to town to return.'
        ].join('\n'),
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: 22,
          color: '#ffe4c0',
          wordWrap: {
            width: Math.max(100, this.scale.width - 48)
          }
        }
      ).setDepth(20);
    }

    this.exitButton = this.add.text(
      18,
      16,
      '< Back to town',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 20,
        color: '#ffe0a0',
        backgroundColor: '#24352e',
        padding: {
          x: 12,
          y: 10
        }
      }
    )
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.exitButton.on('pointerdown', () => {
      void this.leave();
    });

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layoutHospital
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        this.onEscape
      );
    }

    this.layoutHospital();

    if (this.background) {
      this.talk();
    }
  }

  hideGameplayHud() {
    this.getRegisteredScene(
      'PlayerHudScene'
    )?.closeAllUIPanels?.();

    const news = this.getRegisteredScene('NewsHud');

    news?.closeMenu?.(true);
    news?.setHudVisible?.(false);

    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud'
    ]) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }

    const hud = document.getElementById('hud-container');

    if (hud) {
      this.hiddenHudElement = hud;
      this.previousHudDisplay = hud.style.display;
      hud.style.display = 'none';
    }
  }

  createNurseHotspot() {
    this.nurseHotspot = this.add
      .rectangle(0, 0, 1, 1, 0xffffff, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.nurseLabel = this.add.text(
      0,
      0,
      'Nurse',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 20,
        color: '#ffe3a4',
        backgroundColor: '#18201c',
        padding: {
          x: 10,
          y: 6
        }
      }
    )
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.nurseHotspot.on('pointerover', () => {
      if (this.canInteract()) {
        this.nurseLabel.setVisible(true);
      }
    });

    this.nurseHotspot.on('pointerout', () => {
      this.nurseLabel.setVisible(false);
    });

    this.nurseHotspot.on('pointerdown', () => {
      if (this.canInteract()) {
        this.talk();
      }
    });
  }

  canInteract() {
    return (
      !this.disposed &&
      !this.navigating &&
      !this.dialogueOpen
    );
  }

  refreshHotspot() {
    if (this.nurseHotspot?.input) {
      this.nurseHotspot.input.enabled =
        this.canInteract();
    }

    this.nurseLabel?.setVisible(false);
  }

  layoutHospital() {
    if (this.disposed) return;

    const { width, height } = this.scale;

    if (this.background) {
      const source =
        this.textures.get(BACKGROUND_KEY).getSourceImage();

      const scale = Math.min(
        width / source.width,
        height / source.height
      );

      const imageWidth = source.width * scale;
      const imageHeight = source.height * scale;

      const left = (width - imageWidth) / 2;
      const top = (height - imageHeight) / 2;

      this.imageBox = {
        left,
        top,
        width: imageWidth,
        height: imageHeight
      };

      this.background
        .setPosition(left, top)
        .setDisplaySize(imageWidth, imageHeight);

      if (this.nurseHotspot) {
        const hotspotWidth = imageWidth * 0.11;
        const hotspotHeight = imageHeight * 0.27;

        const x = left + imageWidth * 0.655;
        const y = top + imageHeight * 0.485;

        this.nurseHotspot
          .setPosition(x, y)
          .setSize(hotspotWidth, hotspotHeight);

        this.nurseHotspot.input?.hitArea?.setTo(
          0,
          0,
          hotspotWidth,
          hotspotHeight
        );

        this.nurseLabel.setPosition(
          x,
          y - hotspotHeight / 2 - 8
        );
      }
    }

    this.exitButton?.setPosition(18, 16);

    this.errorText?.setWordWrapWidth(
      Math.max(100, width - 48)
    );
  }

  showDialogue(text, choices = []) {
    if (this.disposed || this.navigating) return;

    this.dialogueOpen = true;
    this.refreshHotspot();

    this.dialogue.show({
      title: 'Nurse',
      text,
      choices
    });
  }

  talk() {
    if (this.disposed || this.navigating) return;

    const fame = getReputation().fame;

    if (!canEnterHospital()) {
      this.showDialogue(
        [
          'Patient information is confidential.',
          'Your coat is not a medical qualification. Out.',
          '',
          `Fame required: ${HOSPITAL_MIN_FAME}. Your fame: ${fame}.`
        ].join('\n'),
        [
          [
            'I know where the exit is.',
            () => void this.leave()
          ]
        ]
      );

      return;
    }

    this.showDialogue(
      "Oh. You're that detective. Fine, you can stay. " +
      'Touch nothing. Especially the patients.',
      [
        [
          'Any advice?',
          () => this.showAdvice()
        ],
        [
          "I'll stay out of your way.",
          () => this.closeDialogue()
        ]
      ]
    );
  }

  showAdvice() {
    if (!canEnterHospital()) {
      this.talk();
      return;
    }

    this.showDialogue(
      'Yes. Stop calling every bruise a clue. ' +
      'And wash your hands.',
      [
        [
          'Something else.',
          () => this.talk()
        ],
        [
          "I'll stay out of your way.",
          () => this.closeDialogue()
        ]
      ]
    );
  }

  closeDialogue() {
    if (!canEnterHospital()) {
      void this.leave();
      return;
    }

    this.dialogue?.close(false);
    this.dialogueOpen = false;
    this.refreshHotspot();
  }

  onEscape(event) {
    if (event?.repeat) return;
    if (this.disposed || this.navigating) return;

    event?.preventDefault();

    void this.leave();
  }

  async leave() {
    if (this.disposed || this.navigating) return false;

    this.navigating = true;
    this.refreshHotspot();

    const token = this.token;

    try {
      const result = await this.goto('HomeCityScene', {
        entryPoint: 'hospital',
        fromScene: KEY,
        gameState
      });

      if (
        !this.disposed &&
        this.token === token &&
        result === false
      ) {
        this.showNavigationError();
      }

      return result !== false;
    } catch (error) {
      console.error('[HospitalScene]', error);

      if (!this.disposed && this.token === token) {
        this.showNavigationError();
      }

      return false;
    }
  }

  showNavigationError() {
    this.navigating = false;

    this.showDialogue(
      'The town could not be opened. Please try again.',
      [
        [
          'Try again.',
          () => void this.leave()
        ]
      ]
    );
  }

  disposeHospital() {
    if (this.disposed) return;

    this.disposed = true;
    this.token = null;

    this.dialogue?.destroy();
    this.dialogue = null;

    this.nurseLabel?.setVisible(false);

    if (this.hiddenHudElement) {
      this.hiddenHudElement.style.display =
        this.previousHudDisplay;

      this.hiddenHudElement = null;
    }

    this.events.off(
      'shutdown',
      this.disposeHospital,
      this
    );

    this.events.off(
      'destroy',
      this.disposeHospital,
      this
    );
  }
}