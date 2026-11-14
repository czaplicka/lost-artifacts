import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { loadJson } from '../../config/loadJson.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { progressionManager } from '../../managers/ProgressionManager.js';

import {
  normalizeConfrontation,
  confrontationLines,
  selectConfrontationTopic,
  advanceConfrontation
} from './GordonConfrontationModel.js';

const DATA = await loadJson(
  '../../assets/data/gordonConfrontation.json',
  import.meta.url
);

const KEY = 'gordon_confrontation_progress';

const COMPLETION_FLAG =
  'gordon_safe_confrontation_completed';

const XP_REWARD_ID = 'story_puzzle_large';
const XP_SCOPE_ID = COMPLETION_FLAG;

const XP_EVENT_ID = JSON.stringify([
  'reward',
  XP_REWARD_ID,
  XP_SCOPE_ID
]);

export class GordonConfrontationController {
  constructor(scene) {
    this.scene = scene;

    this.state = normalizeConfrontation(
      DATA,
      scene.preview
        ? {}
        : MainStoryManager.getSideClue(KEY)
    );

    this.layer = null;
    this.destroyed = false;
    this.advancing = false;
    this.inputLockedUntil = 0;

    this.rewardError = null;
    this.savedOk = null;

    this.onKeyBound = event => this.onKey(event);
  }

  get completed() {
    return this.state.phase === 'complete';
  }

  get isOpen() {
    return Boolean(this.layer);
  }

  get objective() {
    return DATA.objective;
  }

  persist() {
    if (
      this.scene.preview ||
      !this.scene.allowed ||
      !this.scene.safeController.state.searched
    ) {
      return;
    }

    MainStoryManager.setSideClue(
      KEY,
      structuredClone(this.state)
    );

    MainStoryManager.setFlag(
      'gordon_return_seen',
      true
    );

    for (const topic of DATA.topics) {
      if (this.state.asked.includes(topic.id)) {
        MainStoryManager.setFlag(
          topic.factFlag,
          true
        );
      }
    }

    if (this.completed) {
      MainStoryManager.setFlag(
        COMPLETION_FLAG,
        true
      );

      MainStoryManager.setFlag(
        'archive_crash_followup_inquiry_unlocked',
        true
      );

      MainStoryManager.setSideClue(
        'gordon_crash_followup',
        {
          source: 'supervisor_gordon',
          kind: 'npc_statement',
          summary: DATA.summary,
          objective: DATA.objective,
          nextObjective: 'check_archive_followup_records',
          survivalConfirmed: false,
          saboteurIdentified: false
        }
      );
    }

    try {
      this.savedOk = saveGameState();
    } catch (error) {
      this.savedOk = false;

      console.error(
        '[GordonConfrontation] Save failed:',
        error
      );
    }

    if (this.savedOk === false) {
      console.warn(
        '[GordonConfrontation] Progress updated in memory, but saving failed.'
      );
    }
  }

  open() {
    if (
      this.isOpen ||
      this.destroyed ||
      this.completed ||
      !this.scene.safeController.state.searched ||
      !this.scene.allowed
    ) {
      return false;
    }

    this.scene.tooltip?.setVisible(false);
    this.scene.status?.setVisible(false);
    this.scene.statusTimer?.remove(false);

    this.layer = this.scene.add.container(0, 0);
    this.scene.root.add(this.layer);

    this.scene.dialogue = {
      container: this.layer
    };

    this.scene.input.keyboard?.on(
      'keydown',
      this.onKeyBound
    );

    this.persist();
    this.render();

    this.inputLockedUntil =
      this.scene.time.now + 180;

    return true;
  }

  text(
    x,
    y,
    value,
    size = 29,
    width = 1660,
    color = '#f1e6cf'
  ) {
    const object = this.scene.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: `${size}px`,
        color,
        align: 'center',
        wordWrap: { width },
        lineSpacing: 8
      }
    ).setOrigin(0.5);

    this.layer.add(object);

    return object;
  }

  button(x, y, label, callback, width = 0) {
    const object = this.scene.add.text(
      x,
      y,
      label,
      {
        fontFamily: 'SpecialElite',
        fontSize: '25px',
        color: '#ffe2ae',
        backgroundColor: '#294331',
        padding: { x: 20, y: 12 },
        align: 'center',
        ...(width ? { fixedWidth: width } : {})
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    object.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          this.isOpen &&
          !this.advancing &&
          this.scene.time.now >= this.inputLockedUntil
        ) {
          this.inputLockedUntil =
            this.scene.time.now + 180;

          callback();
        }
      }
    );

    this.layer.add(object);

    return object;
  }

  render() {
    if (!this.layer) return;

    this.layer.removeAll(true);

    const shade = this.scene.add
      .rectangle(
        960, 540, 1920, 1080,
        0x000000, 0.25
      )
      .setInteractive();

    shade.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      }
    );

    this.layer.add(shade);

    this.button(
      1610, 100,
      __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_cf2835c84477bd6eed9c"),
      () => this.pause()
    );

    if (this.rewardError) {
      this.text(
        960, 650,
        this.rewardError,
        23, 1660, '#ffcf84'
      );
    }

    if (this.state.phase === 'topics') {
      this.layer.add(
        this.scene.add
          .rectangle(
            515, 490, 920, 660,
            0x10231a, 0.98
          )
          .setStrokeStyle(3, 0xd0a663)
      );

      this.text(
        515, 245,
        __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_9d652444430613fbd000"),
        31, 800, '#ffcf84'
      );

      DATA.topics
        .filter(
          topic => !this.state.asked.includes(topic.id)
        )
        .forEach((topic, index) => {
          this.button(
            515,
            360 + index * 110,
            topic.label,
            () => this.ask(topic.id),
            780
          );
        });

      this.text(
        515, 735,
        __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_7eb738c7cf5c18c1394c"),
        23, 780
      );

      return;
    }

    const lines = confrontationLines(
      DATA,
      this.state
    );

    const line = lines[this.state.line];

    if (!line) return;

    this.layer.add(
      this.scene.add
        .rectangle(
          960, 892, 1840, 310,
          0x0d1b14, 0.98
        )
        .setStrokeStyle(3, 0xd0a663)
    );

    this.text(
      960, 779,
      line.speaker,
      29, 1660, '#ffcf84'
    );

    this.text(
      960, 875,
      line.text,
      29
    );

    const last =
      this.state.line === lines.length - 1;

    const label = !last
      ? 'CONTINUE'
      : this.state.phase === 'opening'
        ? __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_a70cc5302c043cd93e8b")
        : this.state.phase === 'reply'
          ? __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_cb96474abe56715a0ada")
          : __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_9a4d05fafdc2a8fd5ba2");

    this.button(
      960, 997,
      label,
      () => this.next()
    );
  }

  ask(id) {
    if (
      this.destroyed ||
      this.advancing ||
      this.completed ||
      !this.isOpen
    ) {
      return;
    }

    const result = selectConfrontationTopic(
      DATA,
      this.state,
      id
    );

    if (!result.ok) return;

    this.rewardError = null;
    this.state = result.state;

    this.persist();
    this.render();
  }

  grantCompletionXP() {
    // Nie przyznajemy nagrody wstecz za stary finał.
    if (MainStoryManager.hasFlag(COMPLETION_FLAG)) {
      return;
    }

    let result;

    try {
      result = progressionManager.grantReward(
        XP_REWARD_ID,
        XP_SCOPE_ID,
        __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_bfea72ae6a996019ee8e")
      );
    } catch (error) {
      if (!progressionManager.hasReward(XP_EVENT_ID)) {
        throw error;
      }

      console.error(
        '[GordonConfrontation] Reward recorded, but grantReward threw:',
        error
      );

      result = {
        success: false,
        reason: 'already_granted'
      };
    }

    if (
      !result.success &&
      result.reason !== 'already_granted'
    ) {
      throw new Error(
        `XP settlement failed: ${
          result.reason || 'unknown_error'
        }`
      );
    }

    if (!progressionManager.hasReward(XP_EVENT_ID)) {
      throw new Error(
        "The Gordon's office XP reward was not recorded."
      );
    }
  }

  next() {
    if (
      this.destroyed ||
      this.advancing ||
      this.completed ||
      !this.isOpen ||
      !this.scene.allowed ||
      !this.scene.safeController.state.searched
    ) {
      return;
    }

    const result = advanceConfrontation(
      DATA,
      this.state
    );

    if (!result.ok) return;

    this.advancing = true;

    try {
      const completing =
        result.state.phase === 'complete';

      if (completing && !this.scene.preview) {
        try {
          this.grantCompletionXP();
        } catch (error) {
          console.error(
            '[GordonConfrontation] XP settlement failed:',
            error
          );

          this.rewardError =
            __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_385594f6730cfaa28a40");

          this.render();
          return;
        }
      }

      this.rewardError = null;
      this.state = result.state;

      this.persist();

      if (this.completed) {
        this.close();
        this.scene.onConfrontationFinished();
      } else {
        this.render();
      }
    } finally {
      this.advancing = false;
    }
  }

  onKey(event) {
    if (
      !this.isOpen ||
      this.advancing ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const advanceKey = [
      __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_20eac5aae274985fd886"),
      __dialogueText("scenes/gordon/GordonConfrontationController.js", "t_dc8659db6d416dc32fca"),
      'NumpadEnter'
    ].includes(event.code);

    if (
      advanceKey &&
      this.state.phase !== 'topics'
    ) {
      event.preventDefault();

      if (
        this.scene.time.now < this.inputLockedUntil
      ) {
        return;
      }

      this.inputLockedUntil =
        this.scene.time.now + 180;

      this.next();
    }
  }

  pause() {
    if (this.destroyed || this.advancing) return;

    this.persist();
    this.close();

    this.scene.closeSearch({
      skipConfrontation: true
    });
  }

  close() {
    if (!this.layer) return;

    this.scene.input.keyboard?.off(
      'keydown',
      this.onKeyBound
    );

    const layer = this.layer;
    this.layer = null;

    if (this.scene.dialogue?.container === layer) {
      this.scene.dialogue = null;
    }

    layer.destroy(true);

    this.scene.interactionLockedUntil =
      this.scene.time.now + 180;
  }

  destroy() {
    if (this.destroyed) return;

    this.persist();
    this.close();

    this.destroyed = true;
  }
}