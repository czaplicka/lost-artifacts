import {
  dialogueText as __dialogueText,
} from '../dialogues/DialogueText.js';

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  getReputation,
} from '../managers/ReputationManager.js';

import {
  HomeTownDialogue,
} from '../ui/HomeTownDialogue.js';

import {
  installHospitalWorldReactions,
} from '../ui/WorldHospitalReactionHooks.js';

import {
  preloadMenuActionAudio,
  playMenuActionAudio,
} from './archive/MenuActionAudio.js';

const KEY = 'HospitalScene';

const BACKGROUND_KEY = 'hospital_reception_nurse';
const BACKGROUND_URL = 'assets/pi/hospital/nurse.webp';

const NURSE_ID = 'pi_hospital_reception_nurse';
const DIALOGUE_DEPTH = 30000;

const T = id =>
  __dialogueText('scenes/HospitalScene.js', id);

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

    this.pendingPlayerLine = null;
  }

  preload() {
    if (!this.textures.exists(BACKGROUND_KEY)) {
      this.load.image(
        BACKGROUND_KEY,
        BACKGROUND_URL
      );
    }

    preloadMenuActionAudio(this);
  }

  create() {
    super.create();

    installHospitalWorldReactions(this, {
      canEnter: canEnterHospital,
    });

    this.registry.set('currentSceneKey', KEY);

    this.events.once(
      'shutdown',
      this.disposeHospital,
      this
    );

    this.events.once(
      'destroy',
      this.disposeHospital,
      this
    );

    this.hideGameplayHud();

    this.cameras.main.setBackgroundColor('#11191c');

    this.dialogue = new HomeTownDialogue(
      this,
      () => {
        this.dialogueOpen = false;
        this.pendingPlayerLine = null;

        this.refreshHotspot();

        void this.leave(false);
      }
    );

    if (this.textures.exists(BACKGROUND_KEY)) {
      this.background = this.add.image(
        0,
        0,
        BACKGROUND_KEY
      )
        .setOrigin(0)
        .setDepth(0);

      this.createNurseHotspot();
    } else {
      this.errorText = this.add.text(
        24,
        90,
        [
          T('t_940405beb6a225060ce1'),
          '',
          T('t_a59531ee131478a79104'),
          BACKGROUND_URL,
          '',
          T('t_e78e6cb773453ed2df43'),
        ].join(
          T('t_01ba4719c80b6fe911b0')
        ),
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: 22,
          color: '#ffe4c0',

          wordWrap: {
            width: Math.max(
              100,
              this.scale.width - 48
            ),
          },
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
        padding: { x: 12, y: 10 },
      }
    )
      .setDepth(100)
      .setInteractive({
        useHandCursor: true,
      });

    this.exitButton.on('pointerdown', () => {
      if (!this.dialogueOpen) {
        void this.leave();
      }
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
    this.getRegisteredScene('PlayerHudScene')
      ?.closeAllUIPanels?.();

    const news =
      this.getRegisteredScene('NewsHud');

    news?.closeMenu?.(true);
    news?.setHudVisible?.(false);

    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud',
    ]) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }

    const hud = document.getElementById(
      'hud-container'
    );

    if (hud) {
      this.hiddenHudElement = hud;
      this.previousHudDisplay = hud.style.display;
      hud.style.display = 'none';
    }
  }

  createNurseHotspot() {
    this.nurseHotspot = this.add.rectangle(
      0,
      0,
      1,
      1,
      0xffffff,
      0
    )
      .setDepth(10)
      .setInteractive({
        useHandCursor: true,
      });

    this.nurseLabel = this.add.text(
      0,
      0,
      'Nurse',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 20,
        color: '#ffe3a4',
        backgroundColor: '#18201c',
        padding: { x: 10, y: 6 },
      }
    )
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.nurseHotspot.on(
      'pointerover',
      () => {
        if (this.canInteract()) {
          this.nurseLabel.setVisible(true);
        }
      }
    );

    this.nurseHotspot.on(
      'pointerout',
      () => {
        this.nurseLabel.setVisible(false);
      }
    );

    this.nurseHotspot.on(
      'pointerdown',
      () => {
        if (this.canInteract()) {
          this.talk(true);
        }
      }
    );
  }

  canInteract() {
    return !this.disposed &&
      !this.navigating &&
      !this.dialogueOpen;
  }

  refreshHotspot() {
    if (this.nurseHotspot?.input) {
      this.nurseHotspot.input.enabled =
        this.canInteract();
    }

    this.nurseLabel?.setVisible(false);

    this.exitButton?.setVisible(
      !this.dialogueOpen
    );
  }

  raiseDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
  }

  layoutHospital() {
    if (this.disposed) return;

    const {
      width,
      height,
    } = this.scale;

    if (this.background) {
      const source = this.textures
        .get(BACKGROUND_KEY)
        .getSourceImage();

      const scale = Math.min(
        width / source.width,
        height / source.height
      );

      const imageWidth =
        source.width * scale;

      const imageHeight =
        source.height * scale;

      const left =
        (width - imageWidth) / 2;

      const top =
        (height - imageHeight) / 2;

      this.imageBox = {
        left,
        top,
        width: imageWidth,
        height: imageHeight,
      };

      this.background
        .setPosition(left, top)
        .setDisplaySize(
          imageWidth,
          imageHeight
        );

      if (this.nurseHotspot) {
        const hotspotWidth =
          imageWidth * 0.11;

        const hotspotHeight =
          imageHeight * 0.27;

        const x =
          left + imageWidth * 0.655;

        const y =
          top + imageHeight * 0.485;

        this.nurseHotspot
          .setPosition(x, y)
          .setSize(
            hotspotWidth,
            hotspotHeight
          );

        this.nurseHotspot.input
          ?.hitArea
          ?.setTo(
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

    this.raiseDialogue();
    this.refreshHotspot();
  }

  nurseReply(
    id,
    label,
    attitude,
    action
  ) {
    return {
      id,
      label,
      attitude,

      action: () => {
        this.pendingPlayerLine = String(label);

        try {
          return action();
        } finally {
          this.pendingPlayerLine = null;
        }
      },
    };
  }

  showDialogue(
    text,
    choices = [],
    options = {}
  ) {
    if (this.disposed || this.navigating) return;

    const playerLine = this.pendingPlayerLine;
    this.pendingPlayerLine = null;

    const systemMessage =
      options.system === true;

    const messages = [];

    if (playerLine && !systemMessage) {
      messages.push({
        speaker: 'player',
        text: playerLine,
      });
    }

    messages.push({
      speaker: systemMessage ? 'note' : 'npc',
      text: String(text ?? ''),
    });

    this.dialogueOpen = true;
    this.refreshHotspot();

    this.dialogue.show({
      title: systemMessage
        ? 'HOSPITAL'
        : T('t_41e96c33cee3543fb051'),

      text,
      choices,
      messages,

      npcId: systemMessage
        ? null
        : NURSE_ID,

      nodeId:
        options.nodeId ||
        'hospital_nurse_dialogue',

      showTrust:
        !systemMessage &&
        canEnterHospital(),
    });

    this.raiseDialogue();
  }

  talk(userAction = false) {
    if (this.disposed || this.navigating) return;

    if (userAction) {
      playMenuActionAudio(this);
    }

    const fame = getReputation().fame;

    if (!canEnterHospital()) {
      this.showDialogue(
        [
          T('t_049c7edbefc5856ee465'),
          T('t_cfab992a935e61a71f96'),
          '',

          `${T('t_50db7e2c64f442a59192')}` +
          `${HOSPITAL_MIN_FAME}` +
          `${T('t_92f33d623e93610818f9')}` +
          `${fame}` +
          `${T('t_cdb4ee2aea69cc6a8333')}`,
        ].join('\n'),

        [
          this.nurseReply(
            'hospital_nurse_access_denied_leave',
            T('t_dc9fe32279628cfe7fe1'),
            'neutral',
            () => void this.leave()
          ),
        ],

        {
          nodeId: 'hospital_access_denied',
        }
      );

      return;
    }

    this.showDialogue(
      T('t_0fa341d5ef1f46aa9ad9') +
      T('t_810ffb221674a798d24e'),

      [
        this.nurseReply(
          'hospital_nurse_ask_advice',
          T('t_7c35228e8fbd83330da4'),
          'neutral',
          () => this.showAdvice()
        ),

        this.nurseReply(
          'hospital_nurse_close',
          T('t_4e318cef134c9b7e5815'),
          'neutral',
          () => this.closeDialogue()
        ),
      ],

      {
        nodeId: 'hospital_nurse_menu',
      }
    );
  }

  showAdvice() {
    if (this.disposed || this.navigating) return;

    if (!canEnterHospital()) {
      this.talk(true);
      return;
    }

    playMenuActionAudio(this);

    this.showDialogue(
      T('t_68b129c1a4eed3db8cea') +
      T('t_d10249d5e821e4f43084'),

      [
        this.nurseReply(
          'hospital_nurse_advice_thanks',
          'Thank you. I appreciate your help.',
          'nice',
          () => this.showThanksReply()
        ),

        this.nurseReply(
          'hospital_nurse_advice_back',
          T('t_240f1c9f302be82fb90a'),
          'neutral',
          () => this.talk(true)
        ),

        this.nurseReply(
          'hospital_nurse_advice_insult',
          'That is your advice? What a waste of time.',
          'rude',
          () => this.showRudeReply()
        ),

        this.nurseReply(
          'hospital_nurse_close',
          T('t_4e318cef134c9b7e5815'),
          'neutral',
          () => this.closeDialogue()
        ),
      ],

      {
        nodeId: 'hospital_nurse_advice',
      }
    );
  }

  showThanksReply() {
    if (this.disposed || this.navigating) return;

    if (!canEnterHospital()) {
      this.talk();
      return;
    }

    playMenuActionAudio(this);

    this.showDialogue(
      'You are welcome. Look at that: a painless exchange. We should put it in a medical journal.',

      this.followUpChoices(),

      {
        nodeId: 'hospital_nurse_thanks_reply',
      }
    );
  }

  showRudeReply() {
    if (this.disposed || this.navigating) return;

    if (!canEnterHospital()) {
      this.talk();
      return;
    }

    playMenuActionAudio(this);

    this.showDialogue(
      'And yet you are still using it. My time, I mean. The advice remains optional.',

      this.followUpChoices(),

      {
        nodeId: 'hospital_nurse_rude_reply',
      }
    );
  }

  followUpChoices() {
    return [
      this.nurseReply(
        'hospital_nurse_follow_up_back',
        T('t_240f1c9f302be82fb90a'),
        'neutral',
        () => this.talk(true)
      ),

      this.nurseReply(
        'hospital_nurse_close',
        T('t_4e318cef134c9b7e5815'),
        'neutral',
        () => this.closeDialogue()
      ),
    ];
  }

  closeDialogue() {
    if (this.disposed || this.navigating) return;

    if (!canEnterHospital()) {
      void this.leave();
      return;
    }

    const wasOpen = this.dialogueOpen;

    this.dialogue?.close(false);

    this.dialogueOpen = false;
    this.pendingPlayerLine = null;

    this.refreshHotspot();

    if (wasOpen) {
      playMenuActionAudio(this);
    }
  }

  onEscape(event) {
    if (
      event?.repeat ||
      this.disposed ||
      this.navigating ||
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey
    ) {
      return;
    }

    if (
      event?.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        event?.target?.tagName
      )
    ) {
      return;
    }

    // Otwarty panel obsługuje Escape i wywołuje
    // istniejące wyjście ze szpitala.
    if (this.dialogueOpen) return;

    event?.preventDefault();

    void this.leave();
  }

  async leave(userAction = true) {
    if (this.disposed || this.navigating) {
      return false;
    }

    this.navigating = true;
    this.refreshHotspot();

    if (userAction) {
      playMenuActionAudio(this);
    }

    const token = this.token;

    try {
      const result = await this.goto(
        'HomeCityScene',
        {
          entryPoint: 'hospital',
          fromScene: KEY,
          gameState,
        }
      );

      if (
        !this.disposed &&
        this.token === token &&
        result === false
      ) {
        this.showNavigationError();
      }

      return result !== false;
    } catch (error) {
      console.error(
        '[HospitalScene]',
        error
      );

      if (
        !this.disposed &&
        this.token === token
      ) {
        this.showNavigationError();
      }

      return false;
    }
  }

  showNavigationError() {
    this.navigating = false;
    this.pendingPlayerLine = null;

    this.showDialogue(
      T('t_842cf46b73dce3f1f443'),

      [
        {
          id: 'hospital_navigation_retry',
          label: T('t_a0c2cc1374d949943e01'),
          attitude: 'neutral',
          action: () => void this.leave(),
        },
      ],

      {
        nodeId: 'hospital_navigation_error',
        system: true,
      }
    );
  }

  disposeHospital() {
    if (this.disposed) return;

    this.disposed = true;
    this.token = null;

    this.dialogue?.destroy();
    this.dialogue = null;

    this.pendingPlayerLine = null;

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