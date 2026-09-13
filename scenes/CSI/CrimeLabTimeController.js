import { EventBus } from '../../EventBus.js';

const STATION_TIME_COST_HOURS = {
  identity: 2,
  trace_0: 1,
  trace_1: 1
};

const LAB_TIME_FLAVOR_LINES = [
  'The centrifuge hummed for hours. You are now an expert in staring at spinning tubes.',
  'Somewhere, a lab tech is annoyed you touched their equipment. Time well spent.',
  'You filled out three forms in triplicate just to look at a hair under glass.',
  'The coffee in the break room went cold twice while you waited for results.',
  'Science is slow. Also, it is later than when you started.'
];

export class CrimeLabTimeController {
  constructor(scene) {
    this.scene = scene;
    this.toastTimer = null;
  }

  getHoursForStation(stationId) {
    return STATION_TIME_COST_HOURS[stationId] || 0;
  }

  advanceForStation(stationId) {
    const hours = this.getHoursForStation(stationId);

    if (!Number.isFinite(hours) || hours <= 0) {
      return 0;
    }

    EventBus.emit('advanceTime', hours, 0);

    console.log('[CrimeLabTimeController] Game time advanced.', {
      caseKey: this.scene?.labManager?.getCaseKey?.(),
      stationId,
      hours
    });

    this.showTimeToast(hours);

    return hours;
  }

  showTimeToast(hours) {
    if (!this.scene?.navHint) {
      return;
    }

    const flavor = LAB_TIME_FLAVOR_LINES[
      Math.floor(Math.random() * LAB_TIME_FLAVOR_LINES.length)
    ];

    this.scene.navHint
      .setText(`+${hours}h — ${flavor}`)
      .setVisible(true);

    this.toastTimer?.remove?.(false);

    this.toastTimer = this.scene.time.delayedCall(3200, () => {
      if (!this.scene?.navHint) {
        return;
      }

      this.scene.hideNavHint?.();
      this.toastTimer = null;
    });
  }

  destroy() {
    this.toastTimer?.remove?.(false);
    this.toastTimer = null;
    this.scene = null;
  }
}