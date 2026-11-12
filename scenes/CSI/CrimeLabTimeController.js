import { EventBus } from '../../EventBus.js';

const STATION_TIME_COST_HOURS = {
  identity: 2,
  trace_0: 1,
  trace_1: 1
};

const FLAVOR_BY_CATEGORY = {
  hair: [
    'You squinted at one hair for an hour. It squinted back.',
    'Hair analysis: 5% science, 95% staring at something thinner than your patience.',
    'The hair has been analysed, catalogued, and quietly judged.'
  ],
  blood: [
    'The centrifuge spun with unnecessary drama. The results, thankfully, did not.',
    'You now know more about blood types than you ever wanted before lunch.',
    'Blood work done. The lab fridge sends its regards.'
  ],
  dna: [
    'The thermocycler beeped for hours. Nobody knows why. It does it every time.',
    'DNA amplified. Dignity not included.',
    'You pipetted a very small amount of liquid into a very small tube. Science!'
  ],
  fingerprint: [
    'Ridges, loops and swirls. The fingerprint card is now more famous than you.',
    'You dusted, lifted and sealed. The brush has asked for a day off.',
    'Somewhere, a thumb is feeling very exposed.'
  ],
  shoe: [
    'One boot print, measured to the millimetre. The boot remains unrepentant.',
    'You spent an hour with a boot print. Somewhere, a boot is blushing.',
    'Shoe size confirmed. The sole has been read. Sorry. Soul. Sole.'
  ],
  dust: [
    'You analysed dust. Dust never lies; it just gets everywhere.',
    'Microscopic residue catalogued. The dust bunnies are very nervous.',
    'An hour of dust. You have never felt so thorough, or so sneezy.'
  ],
  chemical: [
    'Reagents mixed, fumes ignored. The fume hood did what it could.',
    'Chemistry done. You have a new respect for goggles.'
  ],
  material: [
    'A tiny fragment, closely examined. It told you everything except its name.',
    'Material analysed. It was, regrettably, not a clue about the coffee machine.',
    'You compared fragments for an hour. The fragments won on style.'
  ],
  handedness: [
    'Left or right: such a short question, such a long afternoon.',
    'You compared smudges for an hour. The smudges are not talking.',
    'Handedness established. Somebody is about to be very predictable.'
  ],
  generic: [
    'The centrifuge hummed for hours. You are now an expert in staring at spinning tubes.',
    'Somewhere, a lab tech is annoyed you touched their equipment. Time well spent.',
    'You filled out three forms in triplicate just to look at a sample under glass.',
    'The coffee in the break room went cold twice while you waited for results.',
    'Science is slow. Also, it is later than when you started.'
  ]
};

const CATEGORY_MATCHERS = [
  ['hair', /hair/],
  ['blood', /blood/],
  ['dna', /dna|biolog|gender|genetic/],
  ['fingerprint', /finger|print|ridge|loop|whorl/],
  ['shoe', /shoe|boot|sole|footprint/],
  ['dust', /dust|micro|residue/],
  ['chemical', /chem|reagent|acid/],
  ['material', /material|fib(er|re)|fragment|thread/],
  ['handedness', /hand|left|right|tool/]
];

function categoryForConfig(config) {
  const haystack = [config?.evidenceType, config?.attribute, config?.clueType, config?.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const match = CATEGORY_MATCHERS.find(([, regex]) => regex.test(haystack));
  return match ? match[0] : 'generic';
}

export class CrimeLabTimeController {
  constructor(scene) {
    this.scene = scene;
    this.lastLine = '';
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

    this.showTimeToast(hours, stationId);

    return hours;
  }

  pickFlavor(stationId) {
    const config = this.scene?.getEvidenceConfigForStation?.(stationId);
    const lines = FLAVOR_BY_CATEGORY[categoryForConfig(config)] || FLAVOR_BY_CATEGORY.generic;
    const pool = lines.length > 1 ? lines.filter(line => line !== this.lastLine) : lines;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.lastLine = line;
    return line;
  }

  showTimeToast(hours, stationId) {
    if (!this.scene) {
      return;
    }

    const text = `+${hours}h — ${this.pickFlavor(stationId)}`;

    // Dedicated toast: it is not wiped when the mouse leaves a hotspot.
    if (typeof this.scene.showToast === 'function') {
      this.scene.showToast(text, 3800);
      return;
    }

    this.scene.navHint?.setText(text).setVisible(true);
  }

  destroy() {
    this.scene = null;
  }
}