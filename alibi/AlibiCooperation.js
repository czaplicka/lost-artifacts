import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';

export const COOPERATION_LABELS = [__dialogueText("alibi/AlibiCooperation.js", "t_35d309ba5fab3077776b"), __dialogueText("alibi/AlibiCooperation.js", "t_5fe257db86adbd23c86f"), __dialogueText("alibi/AlibiCooperation.js", "t_2ba147f4089632cec120"), __dialogueText("alibi/AlibiCooperation.js", "t_ed077f3d8125d60dca19")];
export const APPROACHES = [
  { id: 'reassure', label: __dialogueText("alibi/AlibiCooperation.js", "t_a28ffdd7cf5f07f158e4"), line: __dialogueText("alibi/AlibiCooperation.js", "t_d1f6450e475caa2889d8") },
  { id: 'direct', label: __dialogueText("alibi/AlibiCooperation.js", "t_d5f05999c771c5fdafa3"), line: __dialogueText("alibi/AlibiCooperation.js", "t_6bd709e2733a86f95c97") },
  { id: 'joke', label: __dialogueText("alibi/AlibiCooperation.js", "t_c6bec1d1abcc0d092499"), line: __dialogueText("alibi/AlibiCooperation.js", "t_ea77fee3da3ee05afe8c") }
];
export const CHALLENGES = [
  { id: 'host', label: __dialogueText("alibi/AlibiCooperation.js", "t_db3326fdb86043e470e8") },
  { id: 'room', label: __dialogueText("alibi/AlibiCooperation.js", "t_298902d6b6852aa1dd78") },
  { id: 'departure', label: __dialogueText("alibi/AlibiCooperation.js", "t_ff280fb01cdef32ca7ef") },
  { id: 'arrival', label: __dialogueText("alibi/AlibiCooperation.js", "t_2c70b6453a1f4f4c5089") },
  { id: 'date', label: __dialogueText("alibi/AlibiCooperation.js", "t_70e00855b627da814340") },
  { id: 'duration', label: __dialogueText("alibi/AlibiCooperation.js", "t_36a97a66efda94f33918") }
];

const PROFILES = [
  { id: 'worried', likes: 'reassure', dislikes: 'direct',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_aadff47461a7cfc99689"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_05ab39f693e90b08c8aa"),
      __dialogueText("alibi/AlibiCooperation.js", "t_c4cb12ef2fe807299f50"),
      __dialogueText("alibi/AlibiCooperation.js", "t_fdba5d513b82912cc3c9"),
      __dialogueText("alibi/AlibiCooperation.js", "t_e79a436308ad1700dfb7"),
      __dialogueText("alibi/AlibiCooperation.js", "t_28735d969cf59bfdb0f6"),
      __dialogueText("alibi/AlibiCooperation.js", "t_6dccf132ab4b1def7018") ] },
  { id: 'busy', likes: 'direct', dislikes: 'joke',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_b9f0c9123980777f21d8"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_c36757d4a260907a7a61"),
      __dialogueText("alibi/AlibiCooperation.js", "t_b26799060edb61a4a7f9"),
      __dialogueText("alibi/AlibiCooperation.js", "t_ee5e92abccb59b98133f"),
      __dialogueText("alibi/AlibiCooperation.js", "t_ccf36773a99ab8ae87d4"),
      __dialogueText("alibi/AlibiCooperation.js", "t_328941ecff458cd8abea"),
      __dialogueText("alibi/AlibiCooperation.js", "t_89b129049279a815b514") ] },
  { id: 'chatty', likes: 'joke', dislikes: 'direct',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_06b2505f3ad4f29f9a86"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_3f14434c0352e07df95e"),
      __dialogueText("alibi/AlibiCooperation.js", "t_c877a044f2dbe0de84ec"),
      __dialogueText("alibi/AlibiCooperation.js", "t_91ca1c7e7c5fad456da1"),
      __dialogueText("alibi/AlibiCooperation.js", "t_9303098613f140895420"),
      __dialogueText("alibi/AlibiCooperation.js", "t_02f0949a53191871c14d"),
      __dialogueText("alibi/AlibiCooperation.js", "t_868c4d38370b7ee70bdf") ] },
  { id: 'precise', likes: 'direct', dislikes: 'reassure',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_8acde61f8db8e5a982ed"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_e99c5d66a0c69053f76a"),
      __dialogueText("alibi/AlibiCooperation.js", "t_422b5e666dda25893b11"),
      __dialogueText("alibi/AlibiCooperation.js", "t_1976aeb701af7c0130b0"),
      __dialogueText("alibi/AlibiCooperation.js", "t_0ceb499ac0669ddff1c3"),
      __dialogueText("alibi/AlibiCooperation.js", "t_206bfe715a6d3cc5c8c4"),
      __dialogueText("alibi/AlibiCooperation.js", "t_5a4bb9bb6b7ddd8f4087") ] },
  { id: 'proud', likes: 'reassure', dislikes: 'joke',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_8a7d13983e8327d42aca"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_adec099ee2af9741a302"),
      __dialogueText("alibi/AlibiCooperation.js", "t_57cfba5ff8f851ce5a1a"),
      __dialogueText("alibi/AlibiCooperation.js", "t_bca1f6d6d65f35843e7d"),
      __dialogueText("alibi/AlibiCooperation.js", "t_dad0121f5390f7e9c0fc"),
      __dialogueText("alibi/AlibiCooperation.js", "t_f6d36c7b60da2ba840bb"),
      __dialogueText("alibi/AlibiCooperation.js", "t_7e9c1699a3ac7b51762e") ] },
  { id: 'dry', likes: 'joke', dislikes: 'reassure',
    hint: __dialogueText("alibi/AlibiCooperation.js", "t_130c50af98d74ac55792"),
    openings: [
      __dialogueText("alibi/AlibiCooperation.js", "t_fbd99dfd598c66800fdd"),
      __dialogueText("alibi/AlibiCooperation.js", "t_9c33dec28d81ba75eec8"),
      __dialogueText("alibi/AlibiCooperation.js", "t_142d56b6bd642307852a"),
      __dialogueText("alibi/AlibiCooperation.js", "t_e4e44a621299c49a5458"),
      __dialogueText("alibi/AlibiCooperation.js", "t_658c68d90c9b0a254450"),
      __dialogueText("alibi/AlibiCooperation.js", "t_93896016e1b017117196") ] }
];

const APPROACH_LINES = {
  reassure: [
    __dialogueText("alibi/AlibiCooperation.js", "t_d1f6450e475caa2889d8"),
    __dialogueText("alibi/AlibiCooperation.js", "t_cdd7eebb8164cce5dda0"),
    __dialogueText("alibi/AlibiCooperation.js", "t_0ca39183e9980f6b90ae"),
    __dialogueText("alibi/AlibiCooperation.js", "t_da97c1f5dbb3849dc3fb"),
    __dialogueText("alibi/AlibiCooperation.js", "t_ffcc4f245bd439eca3db"),
    __dialogueText("alibi/AlibiCooperation.js", "t_f084c36b2b606bcaab69"),
    __dialogueText("alibi/AlibiCooperation.js", "t_036125cd29f976178dba"),
    __dialogueText("alibi/AlibiCooperation.js", "t_4e4fb1703152a54d073f") ],
  direct: [
    __dialogueText("alibi/AlibiCooperation.js", "t_6bd709e2733a86f95c97"),
    __dialogueText("alibi/AlibiCooperation.js", "t_343e50404caa5d9cbdf9"),
    __dialogueText("alibi/AlibiCooperation.js", "t_fe5033081e07303494f3"),
    __dialogueText("alibi/AlibiCooperation.js", "t_37d800923eccf00a281c"),
    __dialogueText("alibi/AlibiCooperation.js", "t_4b84f5774faf1ce7cc0f"),
    __dialogueText("alibi/AlibiCooperation.js", "t_941fc83139aa19b7e38a"),
    __dialogueText("alibi/AlibiCooperation.js", "t_59d680451005189a53ff"),
    __dialogueText("alibi/AlibiCooperation.js", "t_7fa2409a69d6da15f96e") ],
  joke: [
    __dialogueText("alibi/AlibiCooperation.js", "t_ea77fee3da3ee05afe8c"),
    __dialogueText("alibi/AlibiCooperation.js", "t_3d18a57dbbc4a759a35b"),
    __dialogueText("alibi/AlibiCooperation.js", "t_c1cc286cd4998cbabf93"),
    __dialogueText("alibi/AlibiCooperation.js", "t_61ddab41ac040c2db923"),
    __dialogueText("alibi/AlibiCooperation.js", "t_e8af3ae650e71580d60f"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2e9d2eb28941ab95320f"),
    __dialogueText("alibi/AlibiCooperation.js", "t_d55c2d4ee8dcf49570cf"),
    __dialogueText("alibi/AlibiCooperation.js", "t_59d178c72cac01c72155") ]
};
const RESPONSES = {
  reassure: {
    positive: [__dialogueText("alibi/AlibiCooperation.js", "t_42b5f0fb41b201911005"), __dialogueText("alibi/AlibiCooperation.js", "t_6db292fbe51f98d47aac"), __dialogueText("alibi/AlibiCooperation.js", "t_82b7d2e980e606dda4cb"), __dialogueText("alibi/AlibiCooperation.js", "t_16540dee75c566cc17b6")],
    neutral: [__dialogueText("alibi/AlibiCooperation.js", "t_316781e849ad117696e0"), __dialogueText("alibi/AlibiCooperation.js", "t_9b07dd049d8793bcacb4"), __dialogueText("alibi/AlibiCooperation.js", "t_3e4eebb982ead9bd0c5c")],
    negative: [__dialogueText("alibi/AlibiCooperation.js", "t_70e397bbc7359e157623"), __dialogueText("alibi/AlibiCooperation.js", "t_2b48269395e9d9ff64e5"), __dialogueText("alibi/AlibiCooperation.js", "t_a42fd24901828f091241")] },
  direct: {
    positive: [__dialogueText("alibi/AlibiCooperation.js", "t_d825d73b986f2f48dc17"), __dialogueText("alibi/AlibiCooperation.js", "t_fd462339d70ab2b94f7f"), __dialogueText("alibi/AlibiCooperation.js", "t_94884ef75529d2872225"), __dialogueText("alibi/AlibiCooperation.js", "t_26ba473214b017bdf387")],
    neutral: [__dialogueText("alibi/AlibiCooperation.js", "t_e6c72cfaf3eaf1bfd8ae"), __dialogueText("alibi/AlibiCooperation.js", "t_3e2e8f55be096c86c6de"), __dialogueText("alibi/AlibiCooperation.js", "t_d297a55a3c8e399f9fc7")],
    negative: [__dialogueText("alibi/AlibiCooperation.js", "t_8b4b2136cb5082d2e0c0"), __dialogueText("alibi/AlibiCooperation.js", "t_af92e76fb5000938930a"), __dialogueText("alibi/AlibiCooperation.js", "t_642a54b33d848dc6d3e2")] },
  joke: {
    positive: [__dialogueText("alibi/AlibiCooperation.js", "t_e2a76c334d170604f5e9"), __dialogueText("alibi/AlibiCooperation.js", "t_8397b2f1e1a71733013c"), __dialogueText("alibi/AlibiCooperation.js", "t_b525da975d322d248bb3"), __dialogueText("alibi/AlibiCooperation.js", "t_2efd764e80db4a2a253a")],
    neutral: [__dialogueText("alibi/AlibiCooperation.js", "t_5cd04a839bed288803ad"), __dialogueText("alibi/AlibiCooperation.js", "t_746b2c7e263839f63b02"), __dialogueText("alibi/AlibiCooperation.js", "t_dce9918ef446f84d082c")],
    negative: [__dialogueText("alibi/AlibiCooperation.js", "t_7644d9733fc854477bdd"), __dialogueText("alibi/AlibiCooperation.js", "t_57a87634cc1939dc7033"), __dialogueText("alibi/AlibiCooperation.js", "t_759f6886df73df268e36")] }
};

const OPINIONS = {
  short: [
    __dialogueText("alibi/AlibiCooperation.js", "t_184cd881de183bb6e5ca"),
    __dialogueText("alibi/AlibiCooperation.js", "t_e7f246694df6adfcd62e"),
    __dialogueText("alibi/AlibiCooperation.js", "t_1d0dfd4d10b1d70f2539"),
    __dialogueText("alibi/AlibiCooperation.js", "t_a170fa83e1e1db0a958c"),
    __dialogueText("alibi/AlibiCooperation.js", "t_81f3368d52f8cd7c90a2"),
    __dialogueText("alibi/AlibiCooperation.js", "t_c30ae17e6dafa8d1ef33"),
    __dialogueText("alibi/AlibiCooperation.js", "t_f8104b922895a137da71"),
    __dialogueText("alibi/AlibiCooperation.js", "t_7dc82f26dab7e68bfeef"),
    __dialogueText("alibi/AlibiCooperation.js", "t_0f9bf3eb714951ad502b"),
    __dialogueText("alibi/AlibiCooperation.js", "t_58de031fe0af2a7dc48d") ],
  open: [
    __dialogueText("alibi/AlibiCooperation.js", "t_5c03efc1f8b1ed2d40df"),
    __dialogueText("alibi/AlibiCooperation.js", "t_5e934e86a1e70a0485e0"),
    __dialogueText("alibi/AlibiCooperation.js", "t_5d1e403c182713decb7b"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2fbb081c62654ab714eb"),
    __dialogueText("alibi/AlibiCooperation.js", "t_bee64520724bdb774559"),
    __dialogueText("alibi/AlibiCooperation.js", "t_7069dc75ce23989b1995"),
    __dialogueText("alibi/AlibiCooperation.js", "t_05eb286bc418e3782b46"),
    __dialogueText("alibi/AlibiCooperation.js", "t_5992d635d798088db3fa") ],
  secret: [
    __dialogueText("alibi/AlibiCooperation.js", "t_ed603c5da82e38547984"),
    __dialogueText("alibi/AlibiCooperation.js", "t_974ae333f66f35810c6a"),
    __dialogueText("alibi/AlibiCooperation.js", "t_c6d7580b27876f89188e"),
    __dialogueText("alibi/AlibiCooperation.js", "t_e9641555578cd8197b46"),
    __dialogueText("alibi/AlibiCooperation.js", "t_8f6ea03308afbb9e337d"),
    __dialogueText("alibi/AlibiCooperation.js", "t_336cb6419f6591cd2bc1"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2122b73f7813e199afcc"),
    __dialogueText("alibi/AlibiCooperation.js", "t_52c0a2dd7c00fea8e181") ]
};

const CUES = {
  space: [
    __dialogueText("alibi/AlibiCooperation.js", "t_92d096875417b5bf0c6a"),
    __dialogueText("alibi/AlibiCooperation.js", "t_7ecf695f21a437dd8a6e"),
    __dialogueText("alibi/AlibiCooperation.js", "t_7af8c879c20d6c0959e0"),
    __dialogueText("alibi/AlibiCooperation.js", "t_f40e50853565fdeea1d9"),
    __dialogueText("alibi/AlibiCooperation.js", "t_50a84ed8058be2478692"),
    __dialogueText("alibi/AlibiCooperation.js", "t_3b9074c2024c8b709faa") ],
  press: [
    __dialogueText("alibi/AlibiCooperation.js", "t_214103c201bcbcf4a129"),
    __dialogueText("alibi/AlibiCooperation.js", "t_e6310ededa546ef6d063"),
    __dialogueText("alibi/AlibiCooperation.js", "t_1ba35d926a2b90844910"),
    __dialogueText("alibi/AlibiCooperation.js", "t_16bc9b78771569674b53"),
    __dialogueText("alibi/AlibiCooperation.js", "t_6ad1090962d3ee3e25c3"),
    __dialogueText("alibi/AlibiCooperation.js", "t_e6972f23eedc17a37a2e") ],
  pause: [
    __dialogueText("alibi/AlibiCooperation.js", "t_9a678fc6a7224c66a284"),
    __dialogueText("alibi/AlibiCooperation.js", "t_262b3ff6ce5cac5a2539"),
    __dialogueText("alibi/AlibiCooperation.js", "t_775fadfbc78cb5869f29"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2958eed91da791504b92"),
    __dialogueText("alibi/AlibiCooperation.js", "t_4dc941a9cbfcd0eea7d2"),
    __dialogueText("alibi/AlibiCooperation.js", "t_40e8f83d8d76a8b67c52") ]
};
const FOLLOWUPS = {
  space: [__dialogueText("alibi/AlibiCooperation.js", "t_94792519cb1f2c5299ab"), __dialogueText("alibi/AlibiCooperation.js", "t_de169cf21de0db134c38"), __dialogueText("alibi/AlibiCooperation.js", "t_4e45e084076bd2257493")],
  press: [__dialogueText("alibi/AlibiCooperation.js", "t_c272dba84fd7af85cfe1"), __dialogueText("alibi/AlibiCooperation.js", "t_317ecc6e973cf53a50e6"), __dialogueText("alibi/AlibiCooperation.js", "t_6d0355df14d0c16ec178")],
  pause: [__dialogueText("alibi/AlibiCooperation.js", "t_1d427ed36e86d276242a"), __dialogueText("alibi/AlibiCooperation.js", "t_8e638cb7548d3f4962a2"), __dialogueText("alibi/AlibiCooperation.js", "t_3fbffebfe1b54a4c2200")]
};
const RETRACTIONS = {
  host: [
    __dialogueText("alibi/AlibiCooperation.js", "t_89101285f1d13690a3cf"),
    __dialogueText("alibi/AlibiCooperation.js", "t_0d602da8791f355ccd8f"),
    __dialogueText("alibi/AlibiCooperation.js", "t_091fb96bf13c233eebbf") ],
  room: [
    __dialogueText("alibi/AlibiCooperation.js", "t_5bdc60da0400bf7aa6aa"),
    __dialogueText("alibi/AlibiCooperation.js", "t_a711be5da4baebd17e33"),
    __dialogueText("alibi/AlibiCooperation.js", "t_b1c4ae34a1ff15c4e4be") ],
  departure: [
    __dialogueText("alibi/AlibiCooperation.js", "t_a737e2ef6f41002181cc"),
    __dialogueText("alibi/AlibiCooperation.js", "t_9d96ba459d1f0774c6fd"),
    __dialogueText("alibi/AlibiCooperation.js", "t_89fb6555cd1307755095") ],
  arrival: [
    __dialogueText("alibi/AlibiCooperation.js", "t_d3e04af601abc90490c9"),
    __dialogueText("alibi/AlibiCooperation.js", "t_b17893d291eefe4de63c"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2a47309ae93e467b1858") ],
  date: [
    __dialogueText("alibi/AlibiCooperation.js", "t_f740a642f225f5d21ab5"),
    __dialogueText("alibi/AlibiCooperation.js", "t_304b5e764be4b3c75f0c"),
    __dialogueText("alibi/AlibiCooperation.js", "t_2d4d17659280452f45ce") ],
  duration: [
    __dialogueText("alibi/AlibiCooperation.js", "t_c480924880b0bb88290f"),
    __dialogueText("alibi/AlibiCooperation.js", "t_a7206e8af82a9610748a"),
    __dialogueText("alibi/AlibiCooperation.js", "t_b54c85f9c41ce23c63d6") ]
};
const STAND_BY = [
  __dialogueText("alibi/AlibiCooperation.js", "t_5088643105580fcbec0f"),
  __dialogueText("alibi/AlibiCooperation.js", "t_259fd47ecee0684d0d7c"),
  __dialogueText("alibi/AlibiCooperation.js", "t_350207bdb6dc3b50fa71"),
  __dialogueText("alibi/AlibiCooperation.js", "t_cb49a92d4dbe2d8aeddb")
];
const PROGRESS = [
  __dialogueText("alibi/AlibiCooperation.js", "t_a8c5a2ce933744c3f06b"),
  __dialogueText("alibi/AlibiCooperation.js", "t_42efce72b156512c67c3"),
  __dialogueText("alibi/AlibiCooperation.js", "t_2bfa1cad7f51eafffd34"),
  __dialogueText("alibi/AlibiCooperation.js", "t_6c13fc8cfd7d89605b24")
];

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
function pick(pool, key) { return pool[hash(key) % pool.length]; }
function readCase(caseKey) {
  const entry = gameState.caseData?.alibiCases?.[caseKey];
  if (!entry) throw new Error('Missing stored alibi case.');
  return entry;
}
function findData(caseKey, encounterId) {
  const encounter = gameState.crimeCityEncounterState?.[caseKey]?.find(item => item.id === encounterId);
  if (!encounter) throw new Error('Missing witness encounter.');
  const subject = readCase(caseKey).suspects.find(item => item.suspectId === encounter.suspectId);
  const witness = subject?.witnesses.find(item => item.npcId === encounter.npcId);
  if (!subject || !witness) throw new Error('Missing stored witness.');
  return { encounter, subject, witness };
}
export function getRapport() {
  const stats = getEffectiveStats({ profile: gameState.detectiveProfile || 'analyst', stats: gameState.detectiveStats || {} });
  return Number.isFinite(Number(stats.rapport)) ? Math.max(0, Math.floor(Number(stats.rapport))) : 0;
}
export function getCooperationState(caseKey, encounterId) {
  const stored = readCase(caseKey);
  stored.cooperation ??= {};
  let dirty = false;
  if (!stored.cooperation[encounterId]) {
    const { encounter } = findData(caseKey, encounterId);
    stored.cooperation[encounterId] = {
      level: getRapport() >= 6 ? 2 : 1,
      usedApproaches: [], positiveBonusUsed: false, protectionUsed: false,
      asked: encounter.dialogueCompleted ? ['statement'] : [],
      transcript: [], challenges: [], pendingChallenge: null, revisedStatement: null
    };
    dirty = true;
  }
  const state = stored.cooperation[encounterId];
  state.challenges ??= [];
  state.pendingChallenge ??= null;
  state.revisedStatement ??= null;
  state.transcript ??= [];
  state.asked ??= [];
  state.usedApproaches ??= [];
  state.level = Math.max(0, Math.min(3, Number.isFinite(state.level) ? state.level : 1));
  if (state.version !== 3) {
    // Existing statements, history and completed revisions remain untouched.
    const legacy = ['worried', 'busy', 'chatty'][hash(`personality:${caseKey}:${encounterId}`) % 3];
    state.profileId = state.transcript.length ? legacy : pick(PROFILES, `profile:${caseKey}:${encounterId}`).id;
    state.dialogueSeed = hash(`dialogue-v3:${caseKey}:${encounterId}`);
    state.confrontations = {};
    state.version = 3;
    dirty = true;
  }
  state.confrontations ??= {};
  if (dirty) requestAutosave();
  return state;
}
export function getWitnessPersonality(caseKey, encounterId) {
  const state = getCooperationState(caseKey, encounterId);
  const profile = PROFILES.find(item => item.id === state.profileId) || PROFILES[0];
  return { ...profile, opening: pick(profile.openings, `${state.dialogueSeed}:opening`),
    positive: pick(RESPONSES[profile.likes].positive, `${state.dialogueSeed}:positive`),
    neutral: pick(RESPONSES[profile.likes].neutral, `${state.dialogueSeed}:neutral`),
    negative: pick(RESPONSES[profile.dislikes].negative, `${state.dialogueSeed}:negative`) };
}
function addEntry(state, id, detective, witness, note = '') {
  const entry = { id, detective, witness, note };
  state.transcript.push(entry);
  requestAutosave();
  return entry;
}
export function getInterviewView(caseKey, encounterId) {
  const state = getCooperationState(caseKey, encounterId);
  const { encounter, subject, witness } = findData(caseKey, encounterId);
  const encounters = gameState.crimeCityEncounterState?.[caseKey] || [];
  const othersReady = subject.witnesses.filter(item => item.npcId !== witness.npcId).every(other => encounters.some(item =>
    item.suspectId === subject.suspectId && item.npcId === other.npcId && item.interviewed === true && item.dialogueCompleted === true));
  return { state, personality: getWitnessPersonality(caseKey, encounterId),
    completed: encounter.interviewed === true && encounter.dialogueCompleted === true,
    canChallenge: state.asked.includes('statement') && othersReady,
    originalStatement: witness.statement, revisedStatement: state.revisedStatement };
}
export function applyApproach(caseKey, encounterId, approachId) {
  if (!APPROACHES.some(item => item.id === approachId)) return null;
  const state = getCooperationState(caseKey, encounterId);
  if (state.pendingChallenge || state.usedApproaches.includes(approachId)) return null;
  const personality = getWitnessPersonality(caseKey, encounterId);
  const previous = state.level;
  let change = 0;
  let kind = 'neutral';
  let note = '';
  if (approachId === personality.likes) {
    change = 1; kind = 'positive';
    if (getRapport() >= 3 && !state.positiveBonusUsed) {
      change = 2; state.positiveBonusUsed = true; note = __dialogueText("alibi/AlibiCooperation.js", "t_69c2df17663c13ffb0f1");
    }
  } else if (approachId === personality.dislikes) {
    change = -1; kind = 'negative';
    if (getRapport() >= 4 && !state.protectionUsed) {
      change = 0; state.protectionUsed = true; note = __dialogueText("alibi/AlibiCooperation.js", "t_9e2ad7bca797e5e57be2");
    }
  }
  state.level = Math.max(0, Math.min(3, previous + change));
  state.usedApproaches.push(approachId);
  return addEntry(state, `approach:${approachId}`,
    pick(APPROACH_LINES[approachId], `${state.dialogueSeed}:approach:${approachId}`),
    pick(RESPONSES[approachId][kind], `${state.dialogueSeed}:response:${approachId}`),
    [`${__dialogueText("alibi/AlibiCooperation.js", "t_86dfcbe96f81c8b24f6a")}${state.level - previous >= 0 ? '+' : ''}${state.level - previous}${__dialogueText("alibi/AlibiCooperation.js", "t_cdb4ee2aea69cc6a8333")}`, note].filter(Boolean).join(' '));
}
export function askWitness(caseKey, encounterId, topic) {
  const state = getCooperationState(caseKey, encounterId);
  const { subject, witness } = findData(caseKey, encounterId);
  if (state.pendingChallenge) return null;
  const existing = state.transcript.find(entry => entry.id === `question:${topic}`);
  if (existing) return existing;
  let question, answer, note = '';
  switch (topic) {
    case 'statement':
      question = `${__dialogueText("alibi/AlibiCooperation.js", "t_ed98a51f13ee311163da")}${subject.suspectName || __dialogueText("alibi/AlibiCooperation.js", "t_94864ebff58640bcf9bd")}${__dialogueText("alibi/AlibiCooperation.js", "t_d1d34c0c325770a074a2")}`;
      answer = witness.statement; break;
    case 'person':
      question = __dialogueText("alibi/AlibiCooperation.js", "t_12b2a831ca1bc49a7410");
      answer = pick(OPINIONS.short, `${state.dialogueSeed}:opinion`);
      note = __dialogueText("alibi/AlibiCooperation.js", "t_6103e3deb399b1b5fd32"); break;
    case 'personal':
      if (state.level < 2 || !state.asked.includes('person')) return null;
      question = __dialogueText("alibi/AlibiCooperation.js", "t_a93621d4044c024cfbf7");
      answer = pick(OPINIONS.open, `${state.dialogueSeed}:personal`);
      note = __dialogueText("alibi/AlibiCooperation.js", "t_6103e3deb399b1b5fd32"); break;
    case 'withheld':
      if (state.level < 3 || !state.asked.includes('statement')) return null;
      question = __dialogueText("alibi/AlibiCooperation.js", "t_aa64b60d351ed0fb658b");
      answer = state.revisedStatement
        ? __dialogueText("alibi/AlibiCooperation.js", "t_d8aa4209ad692a765cda")
        : pick(OPINIONS.secret, `${state.dialogueSeed}:withheld`);
      note = __dialogueText("alibi/AlibiCooperation.js", "t_e64d272f93ccf5d05997"); break;
    case 'summary':
      if (state.level < 2 || !state.asked.includes('statement') || !witness.timelineCard?.label) return null;
      question = __dialogueText("alibi/AlibiCooperation.js", "t_51662909a5e637e3b031");
      answer = witness.timelineCard.label;
      note = state.revisedStatement ? __dialogueText("alibi/AlibiCooperation.js", "t_58597cdcc94a3c9ebf5c") : __dialogueText("alibi/AlibiCooperation.js", "t_51f1f554e97ae202544c");
      break;
    default: return null;
  }
  if (!answer) return null;
  if (!state.asked.includes(topic)) state.asked.push(topic);
  return addEntry(state, `question:${topic}`, question, answer, note);
}
function getThread(state, topic) {
  if (!state.confrontations[topic]) {
    const modes = ['space', 'press', 'pause'];
    const first = hash(`${state.dialogueSeed}:${topic}:first`) % 3;
    const second = (first + 1 + hash(`${state.dialogueSeed}:${topic}:second`) % 2) % 3;
    state.confrontations[topic] = { stage: 0, failures: 0, attempts: 0,
      modes: [modes[first], modes[second]], resolved: false };
  }
  return state.confrontations[topic];
}
function cue(state, topic, thread) {
  const mode = thread.modes[Math.min(thread.stage, 1)];
  return pick(CUES[mode], `${state.dialogueSeed}:${topic}:cue:${thread.stage}:${thread.failures}`);
}
export function challengeWitness(caseKey, encounterId, topic) {
  const view = getInterviewView(caseKey, encounterId);
  const state = view.state;
  if (!view.canChallenge || state.pendingChallenge || state.revisedStatement) return null;
  const challenge = CHALLENGES.find(item => item.id === topic);
  if (!challenge) return null;
  const thread = getThread(state, topic);
  if (thread.resolved) return state.transcript.find(entry => entry.id === `resolved:${topic}`) || null;
  if (!state.challenges.includes(topic)) state.challenges.push(topic);
  thread.attempts++;
  state.pendingChallenge = topic;
  // Every topic gets the same conversational process. Opening a topic never identifies a liar.
  return addEntry(state, `challenge:${topic}:${thread.attempts}`,
    `${__dialogueText("alibi/AlibiCooperation.js", "t_5bd803ea30a7e7c5e0dd")}${challenge.label.toLowerCase()}${__dialogueText("alibi/AlibiCooperation.js", "t_cdb4ee2aea69cc6a8333")}`,
    cue(state, topic, thread), __dialogueText("alibi/AlibiCooperation.js", "t_90fdcc39bc55240d1882"));
}
export function followUpChallenge(caseKey, encounterId, mode) {
  if (!['space', 'press', 'pause'].includes(mode)) return null;
  const state = getCooperationState(caseKey, encounterId);
  const topic = state.pendingChallenge;
  if (!topic) return null;
  const { subject, witness } = findData(caseKey, encounterId);
  const thread = getThread(state, topic);
  const question = pick(FOLLOWUPS[mode], `${state.dialogueSeed}:${topic}:question:${thread.stage}:${thread.failures}`);
  const expected = thread.modes[Math.min(thread.stage, 1)];
  if (mode !== expected) {
    thread.failures++;
    const previous = state.level;
    if (mode === 'press' && expected !== 'press') state.level = Math.max(0, state.level - 1);
    // A pause always allows leaving the topic. Progress and cue survive a later visit.
    if (mode === 'pause') state.pendingChallenge = null;
    return addEntry(state, `followup:${topic}:${state.transcript.length}`, question,
      (mode === 'pause' ? __dialogueText("alibi/AlibiCooperation.js", "t_1dcc056924e2f92b7e41") : __dialogueText("alibi/AlibiCooperation.js", "t_56eb4522b22b954e7a33")) + cue(state, topic, thread),
      previous !== state.level ? __dialogueText("alibi/AlibiCooperation.js", "t_fe3d8093a611fd98fac7") : __dialogueText("alibi/AlibiCooperation.js", "t_4b6ca203ad788ed1cdbe"));
  }
  thread.stage++;
  if (thread.stage < 2) {
    if (mode === 'pause') state.pendingChallenge = null;
    return addEntry(state, `step:${topic}:1`, question,
      pick(PROGRESS, `${state.dialogueSeed}:${topic}:progress`) + ' ' + cue(state, topic, thread),
      mode === 'pause' ? __dialogueText("alibi/AlibiCooperation.js", "t_98ac20afb469f65888f9") : __dialogueText("alibi/AlibiCooperation.js", "t_33f3ec84d5c6bcda5226"));
  }
  state.pendingChallenge = null;
  thread.resolved = true;
  const scenarioMatch = String(subject.scenarioId || '').match(/_false_([0-5])$/);
  const relevant = witness.isLiar === true && scenarioMatch && CHALLENGES[Number(scenarioMatch[1])]?.id === topic;
  if (relevant) {
    state.revisedStatement = pick(RETRACTIONS[topic], `${state.dialogueSeed}:${topic}:revision`);
    return addEntry(state, 'revision', question,
      (mode === 'pause' ? __dialogueText("alibi/AlibiCooperation.js", "t_3cc240938570f04f1f4f") : '') + state.revisedStatement,
      __dialogueText("alibi/AlibiCooperation.js", "t_9eace54b8fa91b612eba"));
  }
  return addEntry(state, `resolved:${topic}`, question,
    pick(STAND_BY, `${state.dialogueSeed}:${topic}:standby`),
    __dialogueText("alibi/AlibiCooperation.js", "t_acbcd35a27c76e7eeeed"));
}