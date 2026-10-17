// scenes/AlibiScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import {
  getWitnessTestimony,
  markAlibiWitnessInterviewed
} from '../alibi/AlibiEncounterSetup.js';

const PORTRAIT_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

export class AlibiScene extends BaseScene {
  constructor() {
    super({ key: 'AlibiScene' });
  }

  init(data = {}) {
    this.caseKey = data.caseKey || null;
    this.encounterId = data.encounterId || null;
    this.suspectId = data.suspectId || null;
    this.npcId = data.npcId || null;
    this.cityId = data.cityId || null;

    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || {
      cityId: this.cityId
    };

    this.testimony = null;
    this.encounter = null;
    this.isLeaving = false;
    this.buttons = [];
    this.statusText = null;
  }

  create() {
    super.create();
    this.scene.stop('NewsHud');
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor('#171b22');

    this.getPlayerHudScene()?.closeAllUIPanels?.();

    this.drawLayout();

    try {
      this.loadTestimony();
      this.drawInterview();
    } catch (error) {
      console.error(
        '[AlibiScene] Cannot open witness interview.',
        error
      );

      this.drawError(
        'The witness file could not be opened.\n' +
        'Apparently, even paperwork needs an alibi.'
      );
    }

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  drawLayout() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.panelWidth = Math.min(940, width - 32);
    this.panelHeight = Math.min(620, height - 100);

    this.panelLeft = (width - this.panelWidth) / 2;
    this.panelTop = (height - this.panelHeight) / 2;

    this.add.rectangle(
      width / 2,
      height / 2,
      this.panelWidth,
      this.panelHeight,
      0xede1c4
    ).setStrokeStyle(3, 0x8a7350);

    this.add.text(
      width / 2,
      this.panelTop + 24,
      'WITNESS INTERVIEW',
      {
        fontFamily: 'PressStart2P',
        fontSize: '15px',
        color: '#382e24',
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 40
        }
      }
    ).setOrigin(0.5, 0);
  }

  loadTestimony() {
    if (
      !this.caseKey ||
      !this.encounterId ||
      !this.suspectId ||
      !this.npcId
    ) {
      throw new Error('Missing interview navigation data.');
    }

    const encounters =
      gameState.crimeCityEncounterState?.[this.caseKey];

    this.encounter = Array.isArray(encounters)
      ? encounters.find(
          (entry) => entry?.id === this.encounterId
        )
      : null;

    if (
      !this.encounter ||
      this.encounter.suspectId !== this.suspectId ||
      this.encounter.npcId !== this.npcId
    ) {
      throw new Error('Witness encounter does not match this case.');
    }

    this.testimony = getWitnessTestimony(
      this.caseKey,
      this.suspectId,
      this.npcId
    );

    if (
      !this.testimony ||
      this.testimony.encounterId !== this.encounterId
    ) {
      throw new Error('Witness testimony is missing or mismatched.');
    }
  }

  getPortraitKey() {
    const candidates = [
      this.encounter?.portraitKey,
      this.encounter?.textureKey,
      this.testimony?.portraitKey,
      this.testimony?.textureKey,
      ...PORTRAIT_KEYS
    ];

    return candidates.find(
      (key) =>
        PORTRAIT_KEYS.includes(key) &&
        this.textures.exists(key)
    ) || null;
  }

  drawInterview() {
    const left = this.panelLeft;
    const top = this.panelTop;
    const width = this.panelWidth;
    const height = this.panelHeight;
    const compact = width < 650;

    const portraitX = compact
      ? left + 65
      : left + 110;

    const portraitY = top + 143;
    const portraitKey = this.getPortraitKey();

    if (portraitKey) {
      const portrait = this.add.image(
        portraitX,
        portraitY,
        portraitKey
      );

      const maxWidth = compact ? 70 : 130;
      const maxHeight = compact ? 100 : 160;

      portrait.setScale(
        Math.min(
          maxWidth / portrait.width,
          maxHeight / portrait.height
        )
      );
    } else {
      this.add.text(
        portraitX,
        portraitY,
        '?',
        {
          fontFamily: 'SpecialElite',
          fontSize: '64px',
          color: '#766750'
        }
      ).setOrigin(0.5);

      console.warn(
        '[AlibiScene] No generic witness portrait is loaded.',
        { encounterId: this.encounterId }
      );
    }

    const headingX = compact
      ? left + 115
      : left + 210;

    const headingWidth = width - (headingX - left) - 24;

    this.add.text(
      headingX,
      top + 85,
      `${this.testimony.role || 'Witness'} of ` +
      `${this.testimony.suspectName || 'the suspect'}`,
      {
        fontFamily: 'SpecialElite',
        fontSize: compact ? '19px' : '24px',
        color: '#382e24',
        wordWrap: {
          width: headingWidth
        }
      }
    );

    this.add.text(
      headingX,
      top + 155,
      'Detective: Tell me what you remember.',
      {
        fontFamily: 'SpecialElite',
        fontSize: '17px',
        color: '#665741',
        wordWrap: {
          width: headingWidth
        }
      }
    );

    this.add.text(
      left + 28,
      top + 245,
      `"${this.testimony.statement || 'No statement available.'}"`,
      {
        fontFamily: 'SpecialElite',
        fontSize: compact ? '18px' : '23px',
        color: '#29231d',
        lineSpacing: 8,
        wordWrap: {
          width: width - 56
        }
      }
    );

    const completed =
      this.encounter.interviewed === true &&
      this.encounter.dialogueCompleted === true;

    this.statusText = this.add.text(
      left + 28,
      top + height - 140,
      completed
        ? 'This interview is already recorded.'
        : 'Finish the interview to record this testimony.',
      {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#665741',
        wordWrap: {
          width: width - 56
        }
      }
    );

    const buttonY = top + height - 58;
    const buttonWidth = Math.min(250, (width - 60) / 2);

    this.createButton(
      left + width * 0.26,
      buttonY,
      buttonWidth,
      'Leave',
      () => {
        void this.returnToCity();
      }
    );

    this.createButton(
      left + width * 0.74,
      buttonY,
      buttonWidth,
      completed ? 'Return to city' : 'Finish interview',
      () => {
        void this.finishInterview();
      }
    );
  }

  drawError(message) {
    this.add.text(
      this.scale.width / 2,
      this.panelTop + 150,
      message,
      {
        fontFamily: 'SpecialElite',
        fontSize: '21px',
        color: '#7b3028',
        align: 'center',
        lineSpacing: 10,
        wordWrap: {
          width: this.panelWidth - 56
        }
      }
    ).setOrigin(0.5, 0);

    this.statusText = this.add.text(
      this.scale.width / 2,
      this.panelTop + this.panelHeight - 140,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#7b3028',
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 56
        }
      }
    ).setOrigin(0.5, 0);

    this.createButton(
      this.scale.width / 2,
      this.panelTop + this.panelHeight - 58,
      Math.min(280, this.panelWidth - 48),
      'Return to city',
      () => {
        void this.returnToCity();
      }
    );
  }

  createButton(x, y, width, label, callback) {
    const background = this.add.rectangle(
      x,
      y,
      width,
      48,
      0x493d30
    ).setStrokeStyle(2, 0x9b815b)
      .setInteractive({ useHandCursor: true });

    this.add.text(
      x,
      y,
      label,
      {
        fontFamily: 'SpecialElite',
        fontSize: width < 180 ? '15px' : '19px',
        color: '#fff3d6',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.trackInputEvent(
      background,
      'pointerover',
      () => background.setFillStyle(0x65533e)
    );

    this.trackInputEvent(
      background,
      'pointerout',
      () => background.setFillStyle(0x493d30)
    );

    this.trackInputEvent(
      background,
      'pointerdown',
      () => {
        if (!this.isLeaving) {
          callback();
        }
      }
    );

    this.buttons.push(background);
  }

  async finishInterview() {
    if (this.isLeaving || !this.testimony) {
      return;
    }

    const saved = markAlibiWitnessInterviewed(
      this.caseKey,
      this.encounterId
    );

    if (!saved) {
      this.statusText?.setText(
        'The interview could not be recorded. Please try again.'
      );
      return;
    }

    await this.returnToCity();
  }

  async returnToCity() {
    if (this.isLeaving || this._cleanupDone) {
      return;
    }

    this.isLeaving = true;

    const opened = await this.goto(
      this.returnScene,
      this.returnData
    );

    if (!opened && !this._cleanupDone) {
      this.isLeaving = false;

      this.statusText?.setText(
        'Could not return to the city. Please try again.'
      );
    }
  }
}