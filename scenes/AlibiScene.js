import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';

import {
  flushAutosave,
  requestAutosave
} from '../gameStatePersistence.js';

import {
  getWitnessTestimony,
  markAlibiWitnessInterviewed,
  allWitnessesVisited
} from '../alibi/AlibiEncounterSetup.js';

import {
  APPROACHES,
  CHALLENGES,
  COOPERATION_LABELS,
  getRapport,
  getInterviewView,
  applyApproach,
  askWitness,
  challengeWitness,
  followUpChallenge
} from '../alibi/AlibiCooperation.js';

const W = 1000;
const H = 940;

const PORTRAITS = [
  'npc', 'npc1', 'npc2', 'npc3',
  'npc4', 'npc5', 'npc6'
];

function time(minute) {
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

    this.root = null;
    this.statusText = null;
    this.testimony = null;
    this.encounter = null;
    this.view = null;
    this.entry = null;

    this.tab = 'questions';
    this.page = 0;
    this.historyIndex = -1;
    this.isLeaving = false;
    this.isSaving = false;
    this.error = '';
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
      this.loadWitness();

      const history = this.view.state.transcript;

      this.entry = history.length
        ? history[history.length - 1]
        : {
            detective:
              "I'm investigating the theft. I'd like to ask a few questions.",
            witness: this.view.personality.opening
          };

      this.render();
    } catch (error) {
      console.error('[AlibiScene] Cannot open interview.', error);
      this.renderError();
    }
  }

  loadWitness() {
    if (
      !this.caseKey ||
      !this.encounterId ||
      !this.suspectId ||
      !this.npcId
    ) {
      throw new Error('Missing interview navigation data.');
    }

    this.encounter =
      gameState.crimeCityEncounterState?.[this.caseKey]
        ?.find(item => item.id === this.encounterId);

    if (
      !this.encounter ||
      this.encounter.suspectId !== this.suspectId ||
      this.encounter.npcId !== this.npcId
    ) {
      throw new Error('Witness navigation mismatch.');
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
      throw new Error('Missing witness testimony.');
    }

    this.view = getInterviewView(
      this.caseKey,
      this.encounterId
    );
  }

  fitView() {
    if (!this.root) return;

    const scale = Math.min(
      this.scale.width / W,
      this.scale.height / H
    );

    this.root.setScale(scale).setPosition(
      (this.scale.width - W * scale) / 2,
      (this.scale.height - H * scale) / 2
    );
  }

  text(x, y, content, width, options = {}) {
    const object = this.add.text(x, y, content, {
      fontFamily: 'SpecialElite',
      fontSize: '21px',
      color: '#382e24',
      wordWrap: { width },
      ...options
    });

    this.root.add(object);
    return object;
  }

  fitText(object, height, minimum = 15) {
    while (
      object.height > height &&
      parseInt(object.style.fontSize, 10) > minimum
    ) {
      object.setFontSize(
        parseInt(object.style.fontSize, 10) - 1
      );
    }

    return object;
  }

  button(x, y, width, label, callback, enabled = true, height = 48) {
    const normal = enabled ? 0x493d30 : 0xb5a88f;

    const background = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      normal
    ).setStrokeStyle(2, 0x9b815b);

    this.root.add(background);

    const labelObject = this.text(
      x + 10,
      y + height / 2,
      label,
      width - 20,
      {
        fontSize: '19px',
        color: enabled ? '#fff3d6' : '#615746',
        align: 'center'
      }
    ).setOrigin(0, 0.5);

    labelObject.setFixedSize(width - 20, 0);
    this.fitText(labelObject, height - 10, 14);

    if (!enabled) return;

    background
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => background.setFillStyle(0x65533e))
      .on('pointerout', () => background.setFillStyle(normal))
      .on('pointerdown', () => {
        if (!this.isLeaving && !this.isSaving) callback();
      });
  }

  createRoot() {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);

    this.root.add(
      this.add.rectangle(
        W / 2,
        H / 2,
        W - 24,
        H - 24,
        0xede1c4
      ).setStrokeStyle(3, 0x8a7350)
    );

    this.text(40, 30, 'WITNESS INTERVIEW', 920, {
      fontFamily: 'PressStart2P',
      fontSize: '18px'
    });

    this.fitView();
  }

  render() {
    this.view = getInterviewView(
      this.caseKey,
      this.encounterId
    );

    this.createRoot();
    this.renderHeader();
    this.renderReply();
    this.renderTabs();
    this.renderActions();
    this.renderFooter();
  }

  renderHeader() {
    const portraitKey = [
      this.encounter.portraitKey,
      this.testimony.portraitKey,
      ...PORTRAITS
    ].find(key =>
      PORTRAITS.includes(key) && this.textures.exists(key)
    );

    if (portraitKey) {
      const portrait = this.add.image(110, 140, portraitKey);

      portrait.setScale(
        Math.min(125 / portrait.width, 130 / portrait.height)
      );

      this.root.add(portrait);
    }

    const title = this.text(
      205,
      82,
      `${this.testimony.role || 'Witness'} of ` +
        `${this.testimony.suspectName || 'the suspect'}`,
      745,
      { fontSize: '27px' }
    );

    this.fitText(title, 65, 18);

    const window = this.testimony.crimeWindow;

    if (window) {
      this.text(
        205,
        155,
        `Theft: ${time(window.startMinute)}–` +
          `${time(window.endMinute)} on the day of the theft`,
        740,
        { fontSize: '18px', color: '#84372d' }
      );
    }

    const state = this.view.state;

    this.text(
      205,
      192,
      `COOPERATION: ${COOPERATION_LABELS[state.level]}`,
      580,
      { fontSize: '19px', color: '#4e6440' }
    );

    for (let index = 0; index < 4; index++) {
      this.root.add(
        this.add.rectangle(
          820 + index * 33,
          202,
          25,
          19,
          index <= state.level ? 0x627b49 : 0xc4b698
        ).setStrokeStyle(1, 0x77674d)
      );
    }

    this.text(
      45,
      235,
      getRapport() >= 5
        ? this.view.personality.hint
        : 'Listen first. A willing witness is not necessarily an honest one.',
      910,
      { fontSize: '18px', color: '#665741' }
    );
  }

  renderReply() {
    const entry = this.entry || {
      detective: '',
      witness: this.view.personality.opening
    };

    const question = this.text(
      45,
      275,
      `Detective: ${entry.detective}`,
      910,
      { fontSize: '21px', color: '#665741' }
    );

    this.fitText(question, 65, 16);

    const reply = this.text(
      45,
      350,
      `Witness: "${entry.witness}"`,
      910,
      { fontSize: '24px', lineSpacing: 5 }
    );

    this.fitText(reply, 190, 15);

    const note = this.text(
      45,
      550,
      entry.note || '',
      910,
      { fontSize: '17px', color: '#4e6440' }
    );

    this.fitText(note, 45, 14);
  }

  renderTabs() {
    const tabs = [
      ['questions', 'Questions'],
      ['approaches', 'Approach'],
      ['challenge', 'Challenge'],
      ['notes', 'Notes']
    ];

    tabs.forEach(([id, label], index) => {
      this.button(
        45 + index * 232,
        610,
        215,
        this.tab === id ? `[ ${label} ]` : label,
        () => {
          this.tab = id;
          this.page = 0;
          this.render();
        },
        !this.view.state.pendingChallenge
      );
    });
  }

  run(action) {
    if (this.isLeaving || this.isSaving) return;

    try {
      const result = action();

      if (result) this.entry = result;

      this.error = '';
      this.render();
    } catch (error) {
      console.error('[AlibiScene] Interview action failed.', error);
      this.error = 'That action could not be completed.';
      this.render();
    }
  }

  renderActions() {
    if (this.view.state.pendingChallenge) {
      this.renderFollowUp();
      return;
    }

    if (this.tab === 'questions') {
      this.renderQuestions();
    } else if (this.tab === 'approaches') {
      this.renderApproaches();
    } else if (this.tab === 'challenge') {
      this.renderChallenges();
    } else {
      this.renderNotes();
    }
  }

  gridButton(index, label, callback, enabled = true) {
    this.button(
      45 + (index % 2) * 470,
      680 + Math.floor(index / 2) * 58,
      440,
      label,
      callback,
      enabled
    );
  }

  renderQuestions() {
    const state = this.view.state;
    const asked = state.asked;

    const topics = [
      ['statement', 'Ask about the alibi', true],
      ['person', 'What are they like?', true],
      [
        'personal',
        'Tell me what you really think',
        state.level >= 2 && asked.includes('person')
      ],
      [
        'withheld',
        'Anything you left out?',
        state.level >= 3 && asked.includes('statement')
      ],
      [
        'summary',
        'Clarify the original account',
        state.level >= 2 &&
          asked.includes('statement') &&
          Boolean(this.testimony.timelineCard?.label)
      ]
    ];

    topics.forEach(([id, label, enabled], index) => {
      this.gridButton(
        index,
        `${asked.includes(id) ? 'Review: ' : ''}${label}`,
        () => this.run(() =>
          askWitness(this.caseKey, this.encounterId, id)
        ),
        enabled
      );
    });
  }

  renderApproaches() {
    APPROACHES.forEach((approach, index) => {
      const used = this.view.state.usedApproaches.includes(
        approach.id
      );

      this.gridButton(
        index,
        `${approach.label}${used ? ' — used' : ''}`,
        () => this.run(() =>
          applyApproach(
            this.caseKey,
            this.encounterId,
            approach.id
          )
        ),
        !used
      );
    });

    const tip = this.text(
      45,
      810,
      'Grey topics may need more cooperation or an earlier question.',
      910,
      { fontSize: '17px', color: '#665741' }
    );

    this.fitText(tip, 28, 14);
  }

  renderChallenges() {
    if (this.view.revisedStatement) {
      this.text(
        45,
        690,
        'This witness has revised their account.\n' +
          'Both versions are available in Notes.',
        910,
        { fontSize: '23px' }
      );
      return;
    }

    if (!this.view.canChallenge) {
      this.text(
        45,
        690,
        'Hear this account and record the other two witnesses ' +
          'for this suspect before confronting anyone.',
        910,
        { fontSize: '23px' }
      );
      return;
    }

    CHALLENGES.forEach((challenge, index) => {
      this.gridButton(
        index,
        challenge.label,
        () => this.run(() =>
          challengeWitness(
            this.caseKey,
            this.encounterId,
            challenge.id
          )
        )
      );
    });
  }

  renderFollowUp() {
    const choices = [
      ['space', 'Give them room to explain'],
      ['press', 'Demand an explanation'],
      ['pause', 'Return to other questions']
    ];

    choices.forEach(([id, label], index) => {
      this.gridButton(
        index,
        label,
        () => this.run(() =>
          followUpChallenge(
            this.caseKey,
            this.encounterId,
            id
          )
        )
      );
    });
  }

  renderNotes() {
    this.gridButton(
      0,
      'Original account',
      () => {
        this.entry = {
          detective: 'Let me review your original statement.',
          witness: this.view.originalStatement,
          note: this.view.revisedStatement
            ? 'Original account — subsequently withdrawn.'
            : 'Original account.'
        };
        this.render();
      }
    );

    this.gridButton(
      1,
      'Revised account',
      () => {
        this.entry = {
          detective: 'What is your revised account?',
          witness: this.view.revisedStatement,
          note: 'The original has not been deleted.'
        };
        this.render();
      },
      Boolean(this.view.revisedStatement)
    );

    const history = this.view.state.transcript;

    this.gridButton(
      2,
      'Previous reply',
      () => {
        this.historyIndex = this.historyIndex < 0
          ? history.length - 1
          : (this.historyIndex - 1 + history.length) % history.length;

        this.entry = history[this.historyIndex];
        this.render();
      },
      history.length > 0
    );

    this.gridButton(
      3,
      'Next reply',
      () => {
        this.historyIndex =
          (this.historyIndex + 1) % history.length;

        this.entry = history[this.historyIndex];
        this.render();
      },
      history.length > 0
    );
  }

  renderFooter() {
    const hasStatement =
      this.view.state.asked.includes('statement');

    this.statusText = this.text(
      45,
      852,
      this.error ||
        (this.view.completed
          ? 'Recorded. You may return and ask further questions.'
          : 'Record the interview after hearing the alibi statement.'),
      910,
      {
        fontSize: '17px',
        color: this.error ? '#84372d' : '#665741'
      }
    );

    this.button(
      45,
      887,
      260,
      'Return to city',
      () => this.returnToCity(),
      true,
      38
    );

    this.button(
      325,
      887,
      330,
      this.view.completed ? 'Interview recorded' : 'Record interview',
      () => this.finishInterview(),
      hasStatement &&
        !this.view.completed &&
        !this.view.state.pendingChallenge,
      38
    );

    const ready = allWitnessesVisited(
      this.caseKey,
      this.suspectId
    );

    this.button(
      675,
      887,
      280,
      'Open alibi board',
      () => this.openBoard(),
      ready,
      38
    );
  }

  async finishInterview() {
    if (
      this.isSaving ||
      this.isLeaving ||
      this.view.completed ||
      this.view.state.pendingChallenge ||
      !this.view.state.asked.includes('statement')
    ) {
      return;
    }

    this.isSaving = true;

    try {
      const recorded = markAlibiWitnessInterviewed(
        this.caseKey,
        this.encounterId
      );

      if (!recorded) {
        throw new Error('Interview could not be recorded.');
      }

      advanceCrimeTutorial(gameState, 'talk_to_npcs');

      requestAutosave();
      flushAutosave();

      this.loadWitness();
      this.error = '';
    } catch (error) {
      console.error('[AlibiScene] Recording failed.', error);
      this.error = 'Could not record the interview. Please try again.';
    } finally {
      this.isSaving = false;
      this.render();
    }
  }

  renderError() {
    this.createRoot();

    this.text(
      65,
      200,
      'The witness file could not be opened.\n' +
        'Even paperwork needs an alibi.',
      870,
      { fontSize: '29px', color: '#84372d' }
    );

    this.statusText = this.text(65, 550, '', 870);

    this.button(
      340,
      780,
      320,
      'Return to city',
      () => this.returnToCity()
    );
  }

  async openBoard() {
    if (!allWitnessesVisited(this.caseKey, this.suspectId)) {
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
    await this.navigate(this.returnScene, this.returnData);
  }

  async navigate(sceneKey, data) {
    if (
      this.isLeaving ||
      this.isSaving ||
      this._cleanupDone
    ) {
      return;
    }

    this.isLeaving = true;

    try {
      flushAutosave();

      const opened = await this.goto(sceneKey, data);

      if (!opened && !this._cleanupDone) {
        this.isLeaving = false;
        this.statusText?.setText(
          'The next scene could not be opened. Please try again.'
        );
      }
    } catch (error) {
      console.error('[AlibiScene] Navigation failed.', error);

      if (!this._cleanupDone) {
        this.isLeaving = false;
        this.statusText?.setText(
          'The next scene could not be opened. Please try again.'
        );
      }
    }
  }
}