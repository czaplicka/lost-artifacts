import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import hintManager from '../managers/HintManager.js';



const TYPE_DELAY_MS = 22;



const OPENING_SCRIPT = [
  {
    speaker: 'HOLLY',
    text: 'Mark Agency says my husband is gone.'
  },

  {
    choice: true,
    options: [
      {
        tone: 'sarcastic',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'Gone as in missing, or gone as in paperwork already gave up?'
          },
          {
            speaker: 'HOLLY',
            text: 'They used careful words. That is how institutions lie politely.'
          }
        ]
      },
      {
        tone: 'serious',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'What exactly did they tell you?'
          },
          {
            speaker: 'HOLLY',
            text: 'Careful words. That is how institutions lie politely.'
          }
        ]
      },
      {
        tone: 'greedy',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'Is there a retainer attached to this tragedy?'
          },
          {
            speaker: 'HOLLY',
            text: 'Let me finish the tragedy first. Then we will discuss the retainer.'
          },
          {
            speaker: 'HOLLY',
            text: 'They used careful words. That is how institutions lie politely.'
          }
        ]
      }
    ]
  },

  {
    speaker: 'HOLLY',
    text: 'John worked recovery. Stolen artefacts, private contracts, bad coffee, worse secrets.'
  },
  {
    speaker: 'DETECTIVE',
    text: 'Mark Agency.'
  },
  {
    speaker: 'HOLLY',
    text: 'Yes. He vanished during a job tied to the Black Lady.',
    stamp: 'CLASSIFIED'
  },

  {
    choice: true,
    options: [
      {
        tone: 'sarcastic',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'Let me guess: the file got lost between a shredder and a coffee machine.'
          },
          {
            speaker: 'HOLLY',
            text: 'Closer than you think.'
          }
        ]
      },
      {
        tone: 'serious',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'And the Agency buried it?'
          }
        ]
      },
      {
        tone: 'greedy',
        lines: [
          {
            speaker: 'DETECTIVE',
            text: 'Is danger pay part of the deal?'
          },
          {
            speaker: 'HOLLY',
            text: 'Everything is part of the deal. Eventually.'
          }
        ]
      }
    ]
  },

  {
    speaker: 'HOLLY',
    text: 'They buried the questions. The man came after.'
  },
  {
    speaker: 'DETECTIVE',
    text: 'That line almost makes me want to charge extra.'
  },
  {
    speaker: 'HOLLY',
    text: 'I can help with that.'
  },
  {
    speaker: 'DETECTIVE',
    text: 'Now you are speaking my language.'
  },
  {
    speaker: 'HOLLY',
    text: 'Take the case. Find John. Find out what Mark Agency is hiding.',
    stamp: 'CASE OPEN'
  }
];



const CLOSING_SCRIPT = [
  { speaker: 'HOLLY', text: 'There is one more thing. Someone in Mark Agency still expects updates.' },
  { speaker: 'DETECTIVE', text: 'That sounds less like a lead and more like a trap with office furniture.' },
  { speaker: 'HOLLY', text: 'I never said it was a safe case.' },
  { speaker: 'DETECTIVE', text: 'Good. Safe cases are usually boring.' }
];



const REWARD_CHOICES = [
  {
    id: 'cash',
    label: 'Cash advance',
    desc: '+250 cash'
  },
  {
    id: 'rest',
    label: 'Rest voucher',
    desc: '+2 rest vouchers'
  },
  {
    id: 'kit',
    label: 'Field support',
    desc: '+2 free hints'
  },
  {
    id: 'travel',
    label: 'Travel fund',
    desc: '+2 free transfers'
  }
];



const SPEAKER_COLORS = {
  HOLLY: '#e6c27a',
  DETECTIVE: '#8fc7e8'
};



export class HollyIntroScene extends BaseScene {
  constructor() {
    super({ key: 'HollyIntroScene' });



    this.returnScene = null;
    this.returnData = {};



    this.phase = 'idle';
    this.queue = [];
    this.nextPhaseAfterDialogue = null;
    this.choiceNodes = [];
    this.pickedTones = [];

    this.fullText = '';
    this.isTyping = false;
    this.typingEvent = null;

    this.video = null;
    this.bgVideo = null;
    this.videoFitted = false;

    this.hollyPortrait = null;
    this.portraitBaseY = 0;
    this.stampText = null;
    this.stampShown = false;



    this.boundAdvance = this.handleAdvance.bind(this);
  }



  init(data = {}) {
    this.returnScene = data.returnScene || null;
    this.returnData =
      data.returnData && typeof data.returnData === 'object'
        ? { ...data.returnData }
        : {};

    this.phase = 'idle';
    this.queue = [];
    this.choiceNodes = [];
    this.pickedTones = [];
    this.fullText = '';
    this.isTyping = false;
    this.typingEvent = null;
    this.video = null;
    this.bgVideo = null;
    this.videoFitted = false;
    this.hollyPortrait = null;
    this.stampText = null;
  }



  create() {
    super.create();



    const { width, height } = this.scale;



    this.cameras.main.setBackgroundColor('#000000');



    this.bg = this.add
      .rectangle(0, 0, width, height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(0);



    this.overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setDepth(8)
      .setVisible(false);



    this.dialogPanel = this.add
      .rectangle(width / 2, height - 138, width - 56, 220, 0x111111, 0.96)
      .setStrokeStyle(3, 0x8b6b3f, 1)
      .setDepth(10)
      .setVisible(false);



    this.nameText = this.add
      .text(42, height - 236, '', {
        fontFamily: 'SpecialElite',
        fontSize: '30px',
        color: '#d7c29a'
      })
      .setDepth(11)
      .setVisible(false);



    this.dialogText = this.add
      .text(42, height - 190, '', {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f4ead7',
        wordWrap: { width: width - 320 }
      })
      .setDepth(11)
      .setVisible(false);



    this.continueText = this.add
      .text(width - 40, height - 30, 'CLICK TO CONTINUE', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#c9b78c'
      })
      .setOrigin(1, 1)
      .setDepth(11)
      .setVisible(false);



    this.createTrackedTween({
      targets: this.continueText,
      alpha: 0.3,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });



    this.stampText = this.add
      .text(width * 0.42, height * 0.3, '', {
        fontFamily: 'PressStart2P',
        fontSize: '44px',
        color: '#c0392b',
        stroke: '#c0392b',
        strokeThickness: 2,
        padding: { x: 18, y: 12 }
      })
      .setOrigin(0.5)
      .setAngle(-14)
      .setDepth(14)
      .setVisible(false);



    this.trackInputEvent(this.input, 'pointerdown', this.boundAdvance);



    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-SPACE',
        this.boundAdvance
      );
    }



    this.playIntroVideo();
  }



  update() {
    if (this.video && !this.videoFitted) {
      this.tryFitVideo(this.video);
    }
  }



  // ------------------------------------------------------------------
  // Video
  // ------------------------------------------------------------------

  createFullscreenVideo(key) {
    const { width, height } = this.scale;

    this.videoFitted = false;

    const video = this.add
      .video(width / 2, height / 2, key)
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0);

    video.once('textureready', () => this.tryFitVideo(video));
    video.once('playing', () => this.tryFitVideo(video));

    this.time.delayedCall(1500, () => {
      if (video.active) {
        this.tryFitVideo(video);
        video.setAlpha(1);
      }
    });

    return video;
  }



  tryFitVideo(video) {
    if (!video?.active) {
      return false;
    }

    const videoWidth = video.video?.videoWidth || 0;
    const videoHeight = video.video?.videoHeight || 0;

    if (!videoWidth || !videoHeight) {
      return false;
    }

    const { width, height } = this.scale;

    const scale = Math.min(
      width / videoWidth,
      height / videoHeight
    );

    video.setPosition(width / 2, height / 2);
    video.setScale(scale);
    video.setAlpha(1);

    this.videoFitted = true;

    return true;
  }



  destroyVideo(video) {
    if (video?.active) {
      video.destroy();
    }
  }



  playIntroVideo() {
    this.phase = 'intro-video';

    this.video = this.createFullscreenVideo('in');

    this.video.once('complete', () => {
      this.tryFitVideo(this.video);

      this.bgVideo = this.video;
      this.video = null;

      this.startScript(OPENING_SCRIPT, 'choices');
    });

    this.video.play(false);
  }



  playOutroVideo() {
    this.phase = 'outro-video';

    this.hideDialogueLayout();

    this.video = this.createFullscreenVideo('out');
    this.video.setDepth(20);

    this.video.once('complete', () => {
      this.destroyVideo(this.video);
      this.video = null;

      this.destroyVideo(this.bgVideo);
      this.bgVideo = null;

      this.finishScene();
    });

    this.video.play(false);
  }



  // ------------------------------------------------------------------
  // Layout
  // ------------------------------------------------------------------

  layoutDialogue() {
    const { width, height } = this.scale;

    this.dialogPanel
      .setPosition(width / 2, height - 138)
      .setSize(width - 56, 220);

    this.nameText.setPosition(42, height - 236);
    this.dialogText.setPosition(42, height - 190);
  }



  layoutOptions(count, spacing) {
    const { width, height } = this.scale;

    const panelHeight = (count * spacing) + 140;
    const panelTop = height - 20 - panelHeight;

    this.dialogPanel
      .setPosition(width / 2, panelTop + (panelHeight / 2))
      .setSize(width - 56, panelHeight);

    this.nameText.setPosition(42, panelTop + 12);
    this.dialogText.setPosition(42, panelTop + 54);

    return panelTop + 130;
  }



  showDialogueLayout() {
    const { width, height } = this.scale;

    this.layoutDialogue();

    this.overlay.setVisible(true);
    this.dialogPanel.setVisible(true);
    this.nameText.setVisible(true);
    this.dialogText.setVisible(true);



    if (!this.hollyPortrait) {
      this.portraitBaseY = height - 362;

      this.hollyPortrait = this.add
        .image(width - 165, this.portraitBaseY, 'holly')
        .setOrigin(0.5)
        .setScale(0.42)
        .setDepth(9);

      this.createTrackedTween({
        targets: this.hollyPortrait,
        y: this.portraitBaseY - 6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }



    this.hollyPortrait.setVisible(true);
  }



  hideDialogueLayout() {
    this.stopTyping();
    this.hideStamp();

    this.overlay.setVisible(false);
    this.dialogPanel.setVisible(false);
    this.nameText.setVisible(false);
    this.dialogText.setVisible(false);
    this.continueText.setVisible(false);

    if (this.hollyPortrait) {
      this.hollyPortrait.setVisible(false);
    }
  }



  // ------------------------------------------------------------------
  // Script engine
  // ------------------------------------------------------------------

  startScript(script, nextPhase) {
    this.queue = [...script];
    this.nextPhaseAfterDialogue = nextPhase;
    this.phase = 'dialogue';

    this.showDialogueLayout();
    this.advance();
  }



  handleAdvance() {
    if (this.phase !== 'dialogue') {
      return;
    }

    if (this.isTyping) {
      this.finishTyping();
      return;
    }

    this.advance();
  }



  advance() {
    this.hideStamp();

    if (this.queue.length === 0) {
      this.onScriptDone();
      return;
    }

    const item = this.queue.shift();

    if (item.choice) {
      this.showDialogueChoice(item);
      return;
    }

    this.showLine(item);
  }



  onScriptDone() {
    if (this.nextPhaseAfterDialogue === 'choices') {
      this.showRewardChoices();
      return;
    }

    if (this.nextPhaseAfterDialogue === 'outro') {
      this.playOutroVideo();
    }
  }



  showLine(line) {
    this.layoutDialogue();

    this.nameText
      .setText(line.speaker)
      .setColor(SPEAKER_COLORS[line.speaker] || '#d7c29a');

    this.setSpeaker(line.speaker);

    if (line.stamp) {
      this.showStamp(line.stamp);
    }

    this.typeLine(line.text);
  }



  // ------------------------------------------------------------------
  // Typewriter
  // ------------------------------------------------------------------

  typeLine(text) {
    this.stopTyping();

    this.fullText = text;
    this.isTyping = true;

    this.dialogText.setText('');
    this.continueText.setVisible(false);

    let index = 0;

    this.typingEvent = this.time.addEvent({
      delay: TYPE_DELAY_MS,
      loop: true,
      callback: () => {
        index += 1;
        this.dialogText.setText(this.fullText.slice(0, index));

        if (index >= this.fullText.length) {
          this.finishTyping();
        }
      }
    });
  }



  stopTyping() {
    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }
  }



  finishTyping() {
    this.stopTyping();

    this.isTyping = false;
    this.dialogText.setText(this.fullText);
    this.continueText.setVisible(true);
  }



  // ------------------------------------------------------------------
  // Portrait and stamp
  // ------------------------------------------------------------------

  setSpeaker(speaker) {
    if (!this.hollyPortrait?.active) {
      return;
    }

    if (speaker === 'HOLLY') {
      this.hollyPortrait.clearTint().setAlpha(1);

      this.createTrackedTween({
        targets: this.hollyPortrait,
        scale: 0.45,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut'
      });

      return;
    }

    this.hollyPortrait.setTint(0x8a8a8a).setAlpha(0.7);
  }



  showStamp(label) {
    if (!this.stampText?.active) {
      return;
    }

    this.killTrackedTweensOf(this.stampText);

    this.stampText
      .setText(label)
      .setVisible(true)
      .setAlpha(0)
      .setScale(2.6);

    this.stampShown = true;

    this.createTrackedTween({
      targets: this.stampText,
      scale: 1,
      alpha: 0.92,
      duration: 170,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.cameras.main.shake(90, 0.004);
      }
    });
  }



  hideStamp() {
    if (!this.stampShown || !this.stampText?.active) {
      return;
    }

    this.killTrackedTweensOf(this.stampText);
    this.stampText.setVisible(false);
    this.stampShown = false;
  }



  // ------------------------------------------------------------------
  // Option lists (dialogue choices and rewards)
  // ------------------------------------------------------------------

  showOptions({ speaker, prompt, entries, spacing, fontSize, onPick }) {
    this.continueText.setVisible(false);

    const { width } = this.scale;
    const firstTop = this.layoutOptions(entries.length, spacing);
    const boxHeight = spacing - 10;

    this.nameText
      .setText(speaker)
      .setColor(SPEAKER_COLORS[speaker] || '#d7c29a');

    this.dialogText.setText(prompt);

    entries.forEach((entry, index) => {
      const y = firstTop + (index * spacing) + (spacing / 2);

      const box = this.add
        .rectangle(width / 2, y, width - 120, boxHeight, 0x2a2a2a, 0.97)
        .setStrokeStyle(2, 0x8b6b3f, 1)
        .setInteractive({ useHandCursor: true })
        .setDepth(12);

      const text = this.add
        .text(60, y, entry.label, {
          fontFamily: 'SpecialElite',
          fontSize: `${fontSize}px`,
          color: '#f4ead7',
          wordWrap: { width: width - 180 }
        })
        .setOrigin(0, 0.5)
        .setDepth(13);

      box.on('pointerover', () => {
        box.setFillStyle(0x3a3126, 1);
      });

      box.on('pointerout', () => {
        box.setFillStyle(0x2a2a2a, 0.97);
      });

      box.on('pointerdown', () => {
        onPick(index);
      });

      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        onPick(index);
      });

      this.choiceNodes.push(box, text);
    });
  }



  clearChoices() {
    this.choiceNodes.forEach((node) => {
      if (node?.active) {
        node.destroy();
      }
    });

    this.choiceNodes = [];
  }



  // ------------------------------------------------------------------
  // Dialogue choice (detective replies)
  // ------------------------------------------------------------------

  showDialogueChoice(item) {
    this.phase = 'dialogue-choice';
    this.setSpeaker('DETECTIVE');

    this.showOptions({
      speaker: 'DETECTIVE',
      prompt: 'What do you say?',
      spacing: 62,
      fontSize: 21,

      entries: item.options.map((option) => ({
        label: option.lines[0].text
      })),

      onPick: (index) => {
        this.pickDialogueOption(item, index);
      }
    });
  }



  pickDialogueOption(item, index) {
    if (this.phase !== 'dialogue-choice') {
      return;
    }

    const option = item.options[index];

    if (!option) {
      return;
    }

    this.phase = 'picking';
    this.pickedTones.push(option.tone);
    this.clearChoices();

    // Krótkie opóźnienie, żeby ten sam klik nie przeskoczył pierwszej linii.
    this.time.delayedCall(80, () => {
      if (this._cleanupDone) {
        return;
      }

      this.queue.unshift(...option.lines);
      this.phase = 'dialogue';

      this.layoutDialogue();
      this.advance();
    });
  }



  // ------------------------------------------------------------------
  // Reward choice
  // ------------------------------------------------------------------

  showRewardChoices() {
    this.phase = 'choices';
    this.setSpeaker('HOLLY');

    this.showOptions({
      speaker: 'HOLLY',
      prompt: 'Pick one favor. I can help with money, travel, rest, or field support.',
      spacing: 48,
      fontSize: 22,

      entries: REWARD_CHOICES.map((choice) => ({
        label: `${choice.label} — ${choice.desc}`
      })),

      onPick: (index) => {
        this.selectChoice(REWARD_CHOICES[index]);
      }
    });
  }



  selectChoice(choice) {
    if (this.phase !== 'choices' || !choice) {
      return;
    }

    this.phase = 'applying-choice';
    this.clearChoices();

    try {
      this.applyChoice(choice);
    } catch (error) {
      console.error(
        '[HollyIntroScene] Applying choice failed:',
        error
      );
    }

    this.time.delayedCall(80, () => {
      if (this._cleanupDone) {
        return;
      }

      this.startScript(CLOSING_SCRIPT, 'outro');
    });
  }



  getDominantTone() {
    if (this.pickedTones.length === 0) {
      return null;
    }

    const counts = {};

    this.pickedTones.forEach((tone) => {
      counts[tone] = (counts[tone] || 0) + 1;
    });

    return Object.keys(counts).reduce((best, tone) => (
      counts[tone] > counts[best] ? tone : best
    ));
  }



  applyChoice(choice) {
    this.grantHollyChoiceReward(choice.id);



    gameState.updateState({
      hollyIntroSeen: true,
      hollyIntroPending: false,
      hollyIntroChoice: choice.id,
      hollyIntroTone: this.getDominantTone(),
      johnCaseAccepted: true,
      blackLadyCaseAccepted: true
    });



    EventBus.emit('hollyIntroChoiceMade', {
      choice: choice.id
    });
  }



  grantHollyChoiceReward(choiceId) {
    const fullState =
      gameState.getState ? gameState.getState() : {};



    switch (choiceId) {
      case 'cash':
        moneyManager.addCash(250, {
          category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
          description: 'Holly case advance',
          missionId: 'black-lady-main-case',
          metadata: {
            source: 'holly_intro_choice',
            choiceId
          }
        });
        break;



      case 'rest': {
        const restVouchers = Number(fullState.restVouchers || 0);



        gameState.updateState({
          restVouchers: restVouchers + 2
        });
        break;
      }



      case 'kit': {
        hintManager.grantOnce(
          'holly_intro_field_support',
          2,
          'Holly field support'
        );
        break;
      }



      case 'travel': {
        const freeTransfers = Number(fullState.freeTransfers || 0);



        gameState.updateState({
          freeTransfers: freeTransfers + 2
        });
        break;
      }



      default:
        console.warn('[HollyIntroScene] Unknown reward choice:', choiceId);
        break;
    }
  }



  // ------------------------------------------------------------------
  // Finish
  // ------------------------------------------------------------------

  finishScene() {
    const choice = gameState.getState?.().hollyIntroChoice || null;
    const sleepHours = Number(this.returnData?.sleepHours || 8);


    EventBus.emit('hollyIntroFinished', {
      choice,
      sleepHours,
      source: 'forced_sleep'
    });


    if (
      this.returnScene === 'HotelScene' ||
      this.returnScene === 'SleepScene'
    ) {
      EventBus.emit('hollySleepFinished', {
        choice,
        sleepHours
      });
      return;
    }


    this.scene.stop();
  }



  cleanup() {
    this.stopTyping();
    this.clearChoices();



    this.destroyVideo(this.video);
    this.destroyVideo(this.bgVideo);

    this.video = null;
    this.bgVideo = null;
    this.hollyPortrait = null;
    this.stampText = null;



    super.cleanup();
  }
}