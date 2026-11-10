import {
  CrimeCityScene as OriginalCrimeCityScene
} from './CrimeCityScene.js';

import {
  BerlinMapAnimations
} from './crimeCity/BerlinMapAnimations.js';

export class CrimeCityScene extends OriginalCrimeCityScene {
  createCrimeCityContent(...args) {
    super.createCrimeCityContent(...args);

    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations = null;

    const background = this.mapUI?.background;

    if (
      this.cityId === 'berlin' &&
      background?.active
    ) {
      this.berlinMapAnimations = new BerlinMapAnimations(
        this,
        background
      );
    }
  }

  destroyControllers(...args) {
    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations = null;

    super.destroyControllers(...args);
  }
}