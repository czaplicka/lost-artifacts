import {
  RoadTripDestinationsUI
} from './RoadTripDestinationsUI.js';

import {
  getCurrentTownId,
  canStartRoadTrip
} from '../managers/RoadTripManager.js';

import {
  localAreaText as t
} from '../dialogues/LocalAreaText.js';

export class LocalAreaDestinationsUI
  extends RoadTripDestinationsUI {

  constructor(scene, options = {}) {
    super(scene, options);

    this.title.setText(t('title'));
    this.subtitle.setText(t('subtitle'));
    this.infoTitle.setText(t('title'));
  }

  buildNote() {
    super.buildNote();

    if (this.noteText) {
      this.noteText.setY(this.noteText.y - 15);
    }
  }

  renderPins() {
    super.renderPins();

    // The base map disables the current-town pin.
    // Local Area also allows exploring the current town.

    const pin = this.pins.find(
      entry => entry.town.id === getCurrentTownId()
    );

    if (!pin) return;

    for (const target of [pin.hit, pin.labelHit]) {
      target.setInteractive({
        useHandCursor: true
      });

      target.on(
        'pointerdown',
        (pointer, x, y, event) => {
          event?.stopPropagation?.();

          if (!this.isBlocked()) {
            this.selectTown(pin.town, pin);
          }
        }
      );
    }
  }

  refreshInfoPanel(town) {
    super.refreshInfoPanel(town);

    if (!town || this.isDestroyed) return;

    const here = town.id === getCurrentTownId();

    const access =
      this.options.getAvailability?.(town) ??
      { ok: true };

    const check = !access.ok
      ? access
      : here
        ? { ok: true }
        : canStartRoadTrip(
            getCurrentTownId(),
            town.id
          );

    this.infoPrompt.setText(
      access.description || ''
    );

    this.infoWarn
      .setColor(
        check.ok
          ? this.theme.warnColor
          : this.theme.errorColor
      )
      .setText(
        check.ok
          ? (
              here
                ? t('here')
                : access.message || ''
            )
          : check.message || ''
      );

    this.confirmLabel.setText(
      check.ok
        ? (
            here
              ? t('explore')
              : t('drive', {
                  town: town.name
                })
          )
        : t('unavailable')
    );

    if (here) {
      this.infoTravel.setText(t('noTravel'));
      this.infoHours.setText('');
    }

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
        '[LocalArea] Departure failed:',
        error
      );

      if (!this.isDestroyed) {
        this.showError(t('travelError'));
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