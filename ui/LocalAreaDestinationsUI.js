import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

import {
  RoadTripDestinationsUI
} from './RoadTripDestinationsUI.js';

import {
  getCurrentTownId,
  canStartRoadTrip
} from '../managers/RoadTripManager.js';

const SOURCE = 'ui/LocalAreaDestinationsUI.js';

const NOTE_OFFSET_Y = 20;

const t = id => __dialogueText(SOURCE, id);

export class LocalAreaDestinationsUI
  extends RoadTripDestinationsUI {

  constructor(scene, options = {}) {
    super(scene, options);

    this.title.setText(t('local_title'));
    this.subtitle.setText(t('local_subtitle'));
    this.infoTitle.setText(t('local_title'));
  }

  buildNote() {
    super.buildNote();

    if (this.noteText) {
      this.noteText.setY(
        this.noteText.y + NOTE_OFFSET_Y
      );
    }
  }

  refreshInfoPanel(town) {
    super.refreshInfoPanel(town);

    if (!town || this.isDestroyed) return;

    const access =
      this.options.getAvailability?.(town);

    if (!access) {
      this.setConfirmEnabled(false);
      return;
    }

    this.infoPrompt.setText(
      access.description || ''
    );

    if (!access.ok) {
      this.infoWarn
        .setColor(this.theme.errorColor)
        .setText(access.message);

      this.confirmLabel.setText(t('locked'));
      this.setConfirmEnabled(false);

      return;
    }

    const alreadyThere =
      town.id === getCurrentTownId();

    const check = alreadyThere
      ? { ok: true }
      : canStartRoadTrip(
          getCurrentTownId(),
          town.id
        );

    this.infoWarn
      .setColor(
        check.ok
          ? this.theme.warnColor
          : this.theme.errorColor
      )
      .setText(
        check.ok
          ? access.message
          : check.message
      );

    this.confirmLabel.setText(
      alreadyThere
        ? t('enter_garden')
        : access.label
    );

    this.setConfirmEnabled(check.ok);
  }

  async confirm() {
    if (
      !this.isOpen ||
      !this.canConfirm ||
      !this.selectedTown ||
      this.isTransitioning ||
      this.isDestroyed
    ) {
      return false;
    }

    this.isTransitioning = true;
    this.setConfirmEnabled(false);

    try {
      return await this.options.onConfirm(
        this.selectedTown
      );
    } catch (error) {
      console.error(
        '[LocalAreaDestinationsUI] Departure failed:',
        error
      );

      if (!this.isDestroyed) {
        this.showError(t('departure_error'));
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;

        if (this.isOpen) {
          this.refreshInfoPanel(
            this.selectedTown
          );
        }
      }
    }
  }
}