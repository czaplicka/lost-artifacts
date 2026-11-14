import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { EventBus } from '../../EventBus.js';

const STATION_TIME_COST_HOURS = {
  identity: 2,
  trace_0: 1,
  trace_1: 1
};

const FLAVOR_BY_CATEGORY = {
  hair: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_19651a35d5009550a40a"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_d1e015c0610f9ddd77ef"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_1d9c271d4ab6997c4a6f")
  ],
  blood: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_8d4ff1e06c0b623978bf"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_2425feab565b665cd62f"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_8e5ad4205c7b92386bb8")
  ],
  dna: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_04755d294a311364e76f"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_8ddcf08216b1cb2f1a13"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_e8ef7d46dff74e6adee0")
  ],
  fingerprint: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_f0063fd94072835c2ea9"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_89ad85cc8f1c221d3ba8"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_32d5ca50c1baf7901276")
  ],
  shoe: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_e5677d41db4dfb38dc76"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_e761f652c76d9c7f3d34"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_18089531ed2027b32ccd")
  ],
  dust: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_a6f5cd6d49633bec613f"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_473884dd2c529226be0b"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_2375cd420677491eb998")
  ],
  chemical: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_40284f10589541900d9f"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_3bc66916bced99de446d")
  ],
  material: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_b286e90bd56029948b85"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_2ff13a49818e8d926bac"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_9b1ec33909e0bb52875f")
  ],
  handedness: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_205729302e3953f731af"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_73e9cedee6f2e79c9126"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_f9433a155094df8b23ec")
  ],
  generic: [
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_b9df5fc280502ab8359f"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_7bfc0cad5796912dae7b"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_959ae70fe79125ebea33"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_3e5f90405336c8e2dbe5"),
    __dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_b740147826b687450367")
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

    const text = `${__dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_a318c24216defe206fee")}${hours}${__dialogueText("scenes/CSI/CrimeLabTimeController.js", "t_3766d128da968ce82644")}${this.pickFlavor(stationId)}`;

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