import { CrimeCityScene as OriginalCrimeCityScene } from './CrimeCityScene.js';
import { BerlinMapAnimations } from './crimeCity/BerlinMapAnimations.js';
import { WarsawMapAnimations } from './crimeCity/WarsawMapAnimations.js';

const OPTIONAL_ANIMATIONS = {
  islamabad: () => import('./crimeCity/IslamabadMapAnimations.js').then(m => m.IslamabadMapAnimations),
  kotte: () => import('./crimeCity/KotteMapAnimations.js').then(m => m.KotteMapAnimations),
  london: () => import('./crimeCity/LondonMapAnimations.js').then(m => m.LondonMapAnimations),
  nairobi: () => import('./crimeCity/NairobiMapAnimations.js').then(m => m.NairobiMapAnimations),
  new_delhi: () => import('./crimeCity/NewDelhiMapAnimations.js').then(m => m.NewDelhiMapAnimations),
  new_york_city: () => import('./crimeCity/NewYorkMapAnimations.js').then(m => m.NewYorkMapAnimations),
  paris: () => import('./crimeCity/ParisMapAnimations.js').then(m => m.ParisMapAnimations),
  singapore: () => import('./crimeCity/SingaporeMapAnimations.js').then(m => m.SingaporeMapAnimations),
  tokyo: () => import('./crimeCity/TokyoMapAnimations.js').then(m => m.TokyoMapAnimations),
  toronto: () => import('./crimeCity/TorontoMapAnimations.js').then(m => m.TorontoMapAnimations)
};
const CITIES = ['berlin', 'islamabad', 'kotte', 'london', 'nairobi', 'new_delhi', 'new_york_city', 'paris', 'singapore', 'tokyo', 'toronto', 'warsaw'];
const canonicalCity = city => ({ newdelhi: 'new_delhi', newyorkcity: 'new_york_city' }[city] || city);
const animationProperty = city => ({ new_delhi: 'newDelhiMapAnimations', new_york_city: 'newYorkMapAnimations' }[city] || `${city}MapAnimations`);

export class CrimeCityScene extends OriginalCrimeCityScene {
  createCrimeCityContent(...args) {
    this.destroyMapAnimations();
    super.createCrimeCityContent(...args);
    const background = this.mapUI?.background;
    if (!background?.active) return;
    const city = canonicalCity(this.cityId);
    const direct = { berlin: BerlinMapAnimations, warsaw: WarsawMapAnimations };
    const property = animationProperty(city);
    if (direct[city]) {
      this[property] = new direct[city](this, background);
      return;
    }
    const load = OPTIONAL_ANIMATIONS[city];
    if (!load) return;
    const generation = this._mapAnimationGeneration;
    load().then(Animation => {
      if (generation !== this._mapAnimationGeneration || this._cleanupDone ||
          !background.active || this.mapUI?.background !== background ||
          canonicalCity(this.cityId) !== city) return;
      this[property] = new Animation(this, background);
    }).catch(error => console.warn(`[${city} animations] Could not load module:`, error));
  }

  destroyMapAnimations() {
    this._mapAnimationGeneration = (this._mapAnimationGeneration || 0) + 1;
    for (const city of CITIES) {
      const property = animationProperty(city);
      this[property]?.destroy();
      this[property] = null;
    }
  }

  destroyControllers(...args) {
    this.destroyMapAnimations();
    super.destroyControllers(...args);
  }
}
