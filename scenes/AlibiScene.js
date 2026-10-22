// scenes/AlibiScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';

import {
  getWitnessTestimony,
  markAlibiWitnessInterviewed,
  allWitnessesVisited
} from '../alibi/AlibiEncounterSetup.js';

const PORTRAIT_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 760;

function formatTime(minute) {
  return (
    String(Math.floor(minute / 60)).padStart(2, '0') +
    ':' +
    String(minute % 60).padStart(2, '0')
  );
}

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
    this.isSaving = false;

    this.root = null;
    this.statusText = null;

    this.dialogue = [];
    this.dialogueIndex = 0;
  }

  create() {
    super.create();

    this.stopSceneIfActive('NewsHud');
    this.getPlayerHudScene()?.closeAllUIPanels?.();

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor('#171b22');

    this.trackInputEvent(
      this.scale,
      'resize',
      this.fitView,
      this
    );

    try {
      this.loadTestimony();
      this.buildDialogue();
      this.render();
    } catch (error) {
      console.error(
        '[AlibiScene] Cannot open witness interview.',
        error
      );

      this.renderError();
    }
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
      throw new Error('Encounter does not match this witness.');
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
      throw new Error('Missing or mismatched witness testimony.');
    }
  }

  isInterviewCompleted() {
    return (
      this.encounter?.interviewed === true &&
      this.encounter?.dialogueCompleted === true
    );
  }

  getCrimeWindow() {
    return (
      this.testimony?.crimeWindow ||
      gameState.caseData?.crimeWindow
    );
  }

  buildDialogue() {
    const suspectName =
      this.testimony.suspectName || 'the suspect';

    const crimeWindow = this.getCrimeWindow();

    const timeDescription = crimeWindow
      ? `between ${formatTime(crimeWindow.startMinute)} ` +
        `and ${formatTime(crimeWindow.endMinute)} on the day of the theft`
      : 'during the theft';

    // Only the existing testimony supplies facts about the case.
    this.dialogue = [
      {
        detective:
          `I'm investigating the theft. I'd like to ask you ` +
          `a few questions about ${suspectName}.`,

        witness:
          `Is this going to take long? The word "few" tends ` +
          `to expand when detectives use it.`,

        nextLabel: 'Ask about the alibi'
      },
      {
        detective:
          `What can you tell me about ${suspectName}'s ` +
          `whereabouts ${timeDescription}?`,

        witness:
          this.testimony.statement ||
          'No statement available.',

        nextLabel: 'Wrap up'
      },
      {
        detective:
          `Thank you. I'll compare your statement with the ` +
          `other accounts. If I need anything else, I'll be in touch.`,

        witness:
          `Of course. I'll try to keep my next conversation ` +
          `less eligible for a police transcript.`,

        nextLabel: 'Finish interview'
      }
    ];

    this.dialogueIndex = 0;
  }

  fitView() {
    if (!this.root) {
      return;
    }

    const scale = Math.min(
      this.scale.width / VIEW_WIDTH,
      this.scale.height / VIEW_HEIGHT
    );

    this.root
      .setScale(scale)
      .setPosition(
        (this.scale.width - VIEW_WIDTH * scale) / 2,
        (this.scale.height - VIEW_HEIGHT * scale) / 2
      );
  }

  createRoot() {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);

    this.fitView();

    this.root.add(
      this.add.rectangle(
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2,
        VIEW_WIDTH - 24,
        VIEW_HEIGHT - 24,
        0xede1c4
      ).setStrokeStyle(3, 0x8a7350)
    );

    this.text(
      40,
      35,
      'WITNESS INTERVIEW',
      920,
      {
        fontFamily: 'PressStart2P',
        fontSize: '19px'
      }
    );
  }

  text(x, y, content, width, options = {}) {
    const object = this.add.text(x, y, content, {
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#382e24',
      wordWrap: { width },
      ...options
    });

    this.root.add(object);
    return object;
  }

  fitText(object, maxHeight, minimumSize = 16) {
    while (
      object.height > maxHeight &&
      parseInt(object.style.fontSize, 10) > minimumSize
    ) {
      object.setFontSize(
        parseInt(object.style.fontSize, 10) - 1
      );
    }

    return object;
  }

  button(x, y, width, label, callback) {
    const background = this.add.rectangle(
      x + width / 2,
      y + 27,
      width,
      54,
      0x493d30
    )
      .setStrokeStyle(2, 0x9b815b)
      .setInteractive({ useHandCursor: true });

    this.root.add(background);

    const labelObject = this.text(
      x + 10,
      y + 27,
      label,
      width - 20,
      {
        fontSize: '20px',
        color: '#fff3d6',
        align: 'center'
      }
    ).setOrigin(0, 0.5);

    labelObject.setFixedSize(width - 20, 0);

    background
      .on('pointerover', () => {
        background.setFillStyle(0x65533e);
      })
      .on('pointerout', () => {
        background.setFillStyle(0x493d30);
      })
      .on('pointerdown', () => {
        if (!this.isLeaving && !this.isSaving) {
          callback();
        }
      });
  }

  getPortraitKey() {
    return [
      this.encounter?.portraitKey,
      this.encounter?.textureKey,
      this.testimony?.portraitKey,
      this.testimony?.textureKey,
      ...PORTRAIT_KEYS
    ].find(
      (key) =>
        PORTRAIT_KEYS.includes(key) &&
        this.textures.exists(key)
    ) || null;
  }

  renderHeader() {
    const portraitKey = this.getPortraitKey();

    if (portraitKey) {
      const portrait = this.add.image(
        120,
        165,
        portraitKey
      );

      portrait.setScale(
        Math.min(
          130 / portrait.width,
          140 / portrait.height
        )
      );

      this.root.add(portrait);
    } else {
      this.text(90, 120, '?', 100, {
        fontSize: '65px'
      });
    }

    const title = this.text(
      225,
      100,
      `${this.testimony.role || 'Witness'} of ` +
      `${this.testimony.suspectName || 'the suspect'}`,
      725,
      { fontSize: '29px' }
    );

    this.fitText(title, 75, 20);

    const crimeWindow = this.getCrimeWindow();

    if (crimeWindow) {
      this.text(
        225,
        185,
        'Theft window: ' +
        `${formatTime(crimeWindow.startMinute)}–` +
        `${formatTime(crimeWindow.endMinute)} ` +
        '(day of the theft)',
        725,
        {
          fontSize: '20px',
          color: '#84372d'
        }
      );
    }
  }

  render() {
    this.createRoot();
    this.renderHeader();

    if (this.isInterviewCompleted()) {
      this.renderRecordedInterview();
      return;
    }

    this.renderDialogue();
  }

  renderDialogue() {
    const entry = this.dialogue[this.dialogueIndex];

    if (!entry) {
      throw new Error('Missing interview dialogue.');
    }

    this.text(
      45,
      250,
      `CONVERSATION ${this.dialogueIndex + 1}/${this.dialogue.length}`,
      910,
      {
        fontSize: '17px',
        color: '#84372d'
      }
    );

    const detectiveText = this.text(
      45,
      285,
      `Detective: ${entry.detective}`,
      910,
      {
        fontSize: '21px',
        color: '#665741',
        lineSpacing: 5
      }
    );

    this.fitText(detectiveText, 95, 17);

    this.text(
      45,
      395,
      'Witness:',
      910,
      {
        fontSize: '19px',
        color: '#84372d'
      }
    );

    const statement = this.text(
      45,
      428,
      `"${entry.witness}"`,
      910,
      {
        fontSize: '25px',
        lineSpacing: 7
      }
    );

    this.fitText(statement, 165, 16);

    const isLastStep =
      this.dialogueIndex === this.dialogue.length - 1;

    this.statusText = this.text(
      45,
      610,
      isLastStep
        ? 'Finish the interview to record this testimony.'
        : 'Leaving now will not mark this interview as completed.',
      910,
      {
        fontSize: '18px',
        color: '#665741'
      }
    );

    this.button(
      45,
      675,
      310,
      'Return to city',
      () => {
        void this.returnToCity();
      }
    );

    this.button(
      575,
      675,
      380,
      entry.nextLabel,
      () => {
        if (isLastStep) {
          void this.finishInterview();
        } else {
          this.nextDialogue();
        }
      }
    );
  }

  nextDialogue() {
    if (
      this.isLeaving ||
      this.isSaving ||
      this.dialogueIndex >= this.dialogue.length - 1
    ) {
      return;
    }

    this.dialogueIndex += 1;
    this.render();
  }

  renderRecordedInterview() {
    this.text(
      45,
      270,
      'RECORDED TESTIMONY',
      910,
      {
        fontSize: '19px',
        color: '#84372d'
      }
    );

    const statement = this.text(
      45,
      320,
      `"${this.testimony.statement || 'No statement available.'}"`,
      910,
      {
        fontSize: '25px',
        lineSpacing: 9
      }
    );

    this.fitText(statement, 265, 16);

    const boardReady = allWitnessesVisited(
      this.caseKey,
      this.suspectId
    );

    this.statusText = this.text(
      45,
      610,
      boardReady
        ? 'All three interviews are recorded. The alibi board is ready.'
        : 'Interview recorded. Question the other witnesses for this suspect.',
      910,
      {
        fontSize: '18px',
        color: '#665741'
      }
    );

    this.button(
      45,
      675,
      310,
      'Return to city',
      () => {
        void this.returnToCity();
      }
    );

    if (boardReady) {
      this.button(
        575,
        675,
        380,
        'Open alibi board',
        () => {
          void this.openBoard();
        }
      );
    } else {
      this.button(
        575,
        675,
        380,
        'Review conversation',
        () => {
          this.dialogueIndex = 0;
          this.createRoot();
          this.renderHeader();
          this.renderDialogue();
        }
      );
    }
  }

  renderError() {
    this.createRoot();

    this.text(
      65,
      180,
      'The witness file could not be opened.\n' +
      'Even paperwork needs an alibi.',
      870,
      {
        fontSize: '29px',
        color: '#84372d',
        lineSpacing: 12
      }
    );

    this.statusText = this.text(
      65,
      550,
      '',
      870,
      { fontSize: '19px' }
    );

    this.button(
      340,
      675,
      320,
      'Return to city',
      () => {
        void this.returnToCity();
      }
    );
  }

  async finishInterview() {
    if (
      this.isLeaving ||
      this.isSaving ||
      !this.testimony ||
      this.dialogueIndex !== this.dialogue.length - 1
    ) {
      return;
    }

    // Reviewing an already recorded conversation does not save it again.
    if (this.isInterviewCompleted()) {
      this.render();
      return;
    }

    this.isSaving = true;

    try {
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

      advanceCrimeTutorial(gameState, 'talk_to_npcs');

      this.loadTestimony();

      // Show confirmation before the player chooses where to go.
      this.render();
    } catch (error) {
      console.error(
        '[AlibiScene] Interview save failed.',
        error
      );

      this.statusText?.setText(
        'The interview could not be saved. Please try again.'
      );
    } finally {
      this.isSaving = false;
    }
  }

  async openBoard() {
    if (
      this.isLeaving ||
      this.isSaving ||
      !allWitnessesVisited(this.caseKey, this.suspectId)
    ) {
      return;
    }

    await this.navigate('AlibiTimelineScene', {
      caseKey: this.caseKey,
      suspectId: this.suspectId,
      cityId: this.cityId,
      returnScene: this.returnScene,
      returnData: this.returnData
    });
  }

  async returnToCity() {
    if (this.isSaving) {
      return;
    }

    await this.navigate(
      this.returnScene,
      this.returnData
    );
  }

  async navigate(sceneKey, data) {
    if (this.isLeaving || this._cleanupDone) {
      return;
    }

    this.isLeaving = true;

    try {
      const opened = await this.goto(sceneKey, data);

      if (!opened && !this._cleanupDone) {
        this.isLeaving = false;

        this.statusText?.setText(
          'The next scene could not be opened. Please try again.'
        );
      }
    } catch (error) {
      console.error(
        '[AlibiScene] Navigation failed.',
        error
      );

      if (!this._cleanupDone) {
        this.isLeaving = false;

        this.statusText?.setText(
          'The next scene could not be opened. Please try again.'
        );
      }
    }
  }
}