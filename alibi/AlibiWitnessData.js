import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// AlibiWitnessData.js
const WITNESS_TEXTURE_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const WITNESS_ROLES = [
  { id: 'neighbor', label: __dialogueText("alibi/AlibiWitnessData.js", "t_03385f7343ece6951b64"), tone: 'gossipy' },
  { id: 'coworker', label: __dialogueText("alibi/AlibiWitnessData.js", "t_756c08b7fe22295d6153"), tone: 'matter_of_fact' },
  { id: 'receptionist', label: __dialogueText("alibi/AlibiWitnessData.js", "t_ab63c0d0657040400f5a"), tone: 'chatty' }
];
export const ALIBI_DATA_VERSION = 5;
export const ALIBI_GENERATOR_REVISION = 4;

// Private activities do not invent or depend on a suspect's occupation.
const SETTINGS = [
  ['baking', __dialogueText("alibi/AlibiWitnessData.js", "t_29c3cc6e914c5f97d58c"), __dialogueText("alibi/AlibiWitnessData.js", "t_b42b5457540999825c74"), [__dialogueText("alibi/AlibiWitnessData.js", "t_b7b9be5f87ca2f50371b"), __dialogueText("alibi/AlibiWitnessData.js", "t_589141ec38a439c0f8af"), __dialogueText("alibi/AlibiWitnessData.js", "t_2d7960039409948ce9f9")], __dialogueText("alibi/AlibiWitnessData.js", "t_520e24760ee349742e62")],
  ['dance', __dialogueText("alibi/AlibiWitnessData.js", "t_fe0f20dcd83d9ae7c4de"), __dialogueText("alibi/AlibiWitnessData.js", "t_23f7638243ca20a35ae0"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c652761bf31911d3cfbd"), __dialogueText("alibi/AlibiWitnessData.js", "t_6ed212fb16b86243f0b6"), __dialogueText("alibi/AlibiWitnessData.js", "t_13c3ce03ef92ab8ced5b")], __dialogueText("alibi/AlibiWitnessData.js", "t_fa6b8257b368d0dd46bf")],
  ['pottery', __dialogueText("alibi/AlibiWitnessData.js", "t_e590cd86ee005d03ce45"), __dialogueText("alibi/AlibiWitnessData.js", "t_629991049ea08881c3a8"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c1f9b97c55ff0d2162a6"), __dialogueText("alibi/AlibiWitnessData.js", "t_4482d031d8ac1e9b3b46"), __dialogueText("alibi/AlibiWitnessData.js", "t_e27d0fa1f3a482f28d9c")], __dialogueText("alibi/AlibiWitnessData.js", "t_81fb6c2af49acc89a3f1")],
  ['theatre', __dialogueText("alibi/AlibiWitnessData.js", "t_1e719f08b2442ff41597"), __dialogueText("alibi/AlibiWitnessData.js", "t_eded0a2eff762666785a"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c149bc14e45c0d92e0ad"), __dialogueText("alibi/AlibiWitnessData.js", "t_c91c22e1c89c2269905e"), __dialogueText("alibi/AlibiWitnessData.js", "t_9133e8727bd5a5a1fef0")], __dialogueText("alibi/AlibiWitnessData.js", "t_22dd2cccdc4028d5d1da")],
  ['language', __dialogueText("alibi/AlibiWitnessData.js", "t_95f4534141a46b5ff351"), __dialogueText("alibi/AlibiWitnessData.js", "t_8205ead57fab1d27ddea"), [__dialogueText("alibi/AlibiWitnessData.js", "t_6210987236bd1e55af7c"), __dialogueText("alibi/AlibiWitnessData.js", "t_fb16589067e8e373ac07"), __dialogueText("alibi/AlibiWitnessData.js", "t_91e310e064954a8d0b02")], __dialogueText("alibi/AlibiWitnessData.js", "t_432317b7ca6df27bdb0b")],
  ['repair', __dialogueText("alibi/AlibiWitnessData.js", "t_415e130b0e99fb5acd14"), __dialogueText("alibi/AlibiWitnessData.js", "t_c07b068f00b8d3291759"), [__dialogueText("alibi/AlibiWitnessData.js", "t_df5b77762f03d8d7e871"), __dialogueText("alibi/AlibiWitnessData.js", "t_79d9d5789152950fc8d9"), __dialogueText("alibi/AlibiWitnessData.js", "t_f1437b6c064933d719fe")], __dialogueText("alibi/AlibiWitnessData.js", "t_3bb75e0a31f95d7d4cc6")],
  ['choir', __dialogueText("alibi/AlibiWitnessData.js", "t_9ca028263b43489b1557"), __dialogueText("alibi/AlibiWitnessData.js", "t_6c4f19d35fd449b6861e"), [__dialogueText("alibi/AlibiWitnessData.js", "t_7741518b0af3fd6d2e75"), __dialogueText("alibi/AlibiWitnessData.js", "t_f26921fb0d702ac17a88"), __dialogueText("alibi/AlibiWitnessData.js", "t_dbd0b4ee58ff126122a2")], __dialogueText("alibi/AlibiWitnessData.js", "t_1c69e11d6626765eef6a")],
  ['firstaid', __dialogueText("alibi/AlibiWitnessData.js", "t_2fe8c8d38b221f1fe5d5"), __dialogueText("alibi/AlibiWitnessData.js", "t_003c3f61d6c39b0e614d"), [__dialogueText("alibi/AlibiWitnessData.js", "t_4fdece9f9175bb0578b2"), __dialogueText("alibi/AlibiWitnessData.js", "t_e402d02ace97652b1b28"), __dialogueText("alibi/AlibiWitnessData.js", "t_24deba1ddcf56d32ff16")], __dialogueText("alibi/AlibiWitnessData.js", "t_b0756a81ee0fef1887ff")],
  ['dinner', __dialogueText("alibi/AlibiWitnessData.js", "t_8d8b11d10eb92ea37df0"), __dialogueText("alibi/AlibiWitnessData.js", "t_571a7562a7dd07307570"), [__dialogueText("alibi/AlibiWitnessData.js", "t_cafcec58aaa0aebdaf45"), __dialogueText("alibi/AlibiWitnessData.js", "t_4097c79366f2f2de3b25"), __dialogueText("alibi/AlibiWitnessData.js", "t_fbcb5cc9acbd2906906a")], __dialogueText("alibi/AlibiWitnessData.js", "t_bd7573c05240fceec27c")],
  ['chess', __dialogueText("alibi/AlibiWitnessData.js", "t_8050f43f10fe061a8601"), __dialogueText("alibi/AlibiWitnessData.js", "t_4d8a93608b6506b91318"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c0886e50d42e64069e7a"), __dialogueText("alibi/AlibiWitnessData.js", "t_f0b5d3c4f8e8334cce07"), __dialogueText("alibi/AlibiWitnessData.js", "t_08d8b11f6e12e9fbafc5")], __dialogueText("alibi/AlibiWitnessData.js", "t_b79348c636b6132d0d26")],
  ['dentist', __dialogueText("alibi/AlibiWitnessData.js", "t_9acd11aea94d40b16348"), __dialogueText("alibi/AlibiWitnessData.js", "t_390db6846e309bb997c9"), [__dialogueText("alibi/AlibiWitnessData.js", "t_7de3e38e730386663a9c"), __dialogueText("alibi/AlibiWitnessData.js", "t_97eec75d077202139ae6"), __dialogueText("alibi/AlibiWitnessData.js", "t_d673a8a1320f0e771071")], __dialogueText("alibi/AlibiWitnessData.js", "t_f06dbb681d07aa2864f7")],
  ['lift', __dialogueText("alibi/AlibiWitnessData.js", "t_f7311f6370037c61b5e7"), __dialogueText("alibi/AlibiWitnessData.js", "t_c4568d0f48dd2058d159"), [__dialogueText("alibi/AlibiWitnessData.js", "t_e88622a5d70cdd15e052"), __dialogueText("alibi/AlibiWitnessData.js", "t_63e02cd621057f3c8869"), __dialogueText("alibi/AlibiWitnessData.js", "t_b81b8267f2e86cc4cb06")], __dialogueText("alibi/AlibiWitnessData.js", "t_f3cfe3f4783a2ea1d85a")],
  ['nightshift', __dialogueText("alibi/AlibiWitnessData.js", "t_4f2726bca46247e997bc"), __dialogueText("alibi/AlibiWitnessData.js", "t_a6ad6fdc3bef00106820"), [__dialogueText("alibi/AlibiWitnessData.js", "t_84faa02d2cc0430c91dc"), __dialogueText("alibi/AlibiWitnessData.js", "t_5e04c3f0e1e0e3854baf"), __dialogueText("alibi/AlibiWitnessData.js", "t_e029972ad502d7eaac43")], __dialogueText("alibi/AlibiWitnessData.js", "t_77f6b2ba5be6eabea7ce")],
  ['dogs', __dialogueText("alibi/AlibiWitnessData.js", "t_b21ba2bb99ec477f6789"), __dialogueText("alibi/AlibiWitnessData.js", "t_fb35cbc4ce8855e8749a"), [__dialogueText("alibi/AlibiWitnessData.js", "t_f6171dfc5caf375e56ba"), __dialogueText("alibi/AlibiWitnessData.js", "t_6d8acdeaac4cdc1a4ce6"), __dialogueText("alibi/AlibiWitnessData.js", "t_068cab2b65d2366fb84b")], __dialogueText("alibi/AlibiWitnessData.js", "t_2b88145d239f864fe99a")],
  ['dumplings', __dialogueText("alibi/AlibiWitnessData.js", "t_6694e4dd41435fc5b5a4"), __dialogueText("alibi/AlibiWitnessData.js", "t_70c45fdfea24ebca0346"), [__dialogueText("alibi/AlibiWitnessData.js", "t_e5e5d2186ddca76f49f4"), __dialogueText("alibi/AlibiWitnessData.js", "t_3ce42edbbcd6f17a5a47"), __dialogueText("alibi/AlibiWitnessData.js", "t_4ca56660310479db9171")], __dialogueText("alibi/AlibiWitnessData.js", "t_56e02a5d1badd490385c")],
  ['neighbours', __dialogueText("alibi/AlibiWitnessData.js", "t_e812d9c01537752b577e"), __dialogueText("alibi/AlibiWitnessData.js", "t_b9f60a4edf8ef0fbdbf6"), [__dialogueText("alibi/AlibiWitnessData.js", "t_860af946e6d5a87a183c"), __dialogueText("alibi/AlibiWitnessData.js", "t_63459010fd739399c58d"), __dialogueText("alibi/AlibiWitnessData.js", "t_b7c5b8d47ff85b3f5b10")], __dialogueText("alibi/AlibiWitnessData.js", "t_04fc2de2129d4b6acfea")],
  ['broadcast', __dialogueText("alibi/AlibiWitnessData.js", "t_13f465d259958a13339c"), __dialogueText("alibi/AlibiWitnessData.js", "t_0183393dc4629a126688"), [__dialogueText("alibi/AlibiWitnessData.js", "t_f80f7055e1ca3fe0ce49"), __dialogueText("alibi/AlibiWitnessData.js", "t_c53f6312e1b2ea591e20"), __dialogueText("alibi/AlibiWitnessData.js", "t_6fceee137332efba4b00")], __dialogueText("alibi/AlibiWitnessData.js", "t_f62072931dfa7b19b299")],
  ['bingo', __dialogueText("alibi/AlibiWitnessData.js", "t_41b3aa8da69444c23874"), __dialogueText("alibi/AlibiWitnessData.js", "t_5abf045b58b3aca79586"), [__dialogueText("alibi/AlibiWitnessData.js", "t_2ff8fbaff72dbe529b17"), __dialogueText("alibi/AlibiWitnessData.js", "t_ca7a770169ef4a8c6187"), __dialogueText("alibi/AlibiWitnessData.js", "t_eb238a0f69483fed3033")], __dialogueText("alibi/AlibiWitnessData.js", "t_49b5ed8cb6ea6ef52d40")],
  ['karaoke', __dialogueText("alibi/AlibiWitnessData.js", "t_17bf864354db9f0dfc72"), __dialogueText("alibi/AlibiWitnessData.js", "t_338288c2c1a010505456"), [__dialogueText("alibi/AlibiWitnessData.js", "t_eb3b98e8a8c2ae1449fe"), __dialogueText("alibi/AlibiWitnessData.js", "t_a04c7d6540f472867afa"), __dialogueText("alibi/AlibiWitnessData.js", "t_eeb2c0ab923a277c9c6e")], __dialogueText("alibi/AlibiWitnessData.js", "t_bd9c1f6c63126100be7f")],
  ['tailor', __dialogueText("alibi/AlibiWitnessData.js", "t_e4771bf307d730132f09"), __dialogueText("alibi/AlibiWitnessData.js", "t_72ad28cc2345b4985e83"), [__dialogueText("alibi/AlibiWitnessData.js", "t_7b50347c175f458fff6e"), __dialogueText("alibi/AlibiWitnessData.js", "t_f0507ba62789b94ef159"), __dialogueText("alibi/AlibiWitnessData.js", "t_e78ad5c098e8d9c485fd")], __dialogueText("alibi/AlibiWitnessData.js", "t_0b0ff57286029e9c2e56")],
  ['hairdresser', __dialogueText("alibi/AlibiWitnessData.js", "t_1f8d7a301cb1f027646e"), __dialogueText("alibi/AlibiWitnessData.js", "t_dc32a302c77823a75c64"), [__dialogueText("alibi/AlibiWitnessData.js", "t_a104dc5ab2025fcd5a33"), __dialogueText("alibi/AlibiWitnessData.js", "t_75582633e1e5969ad938"), __dialogueText("alibi/AlibiWitnessData.js", "t_2534ff9fea0b8ba2864c")], __dialogueText("alibi/AlibiWitnessData.js", "t_0bf595c2622673491845")],
  ['cards', __dialogueText("alibi/AlibiWitnessData.js", "t_cfe2f154c560bbc85438"), __dialogueText("alibi/AlibiWitnessData.js", "t_6cbfaa7664f4fa231727"), [__dialogueText("alibi/AlibiWitnessData.js", "t_58f0b18928e34e932186"), __dialogueText("alibi/AlibiWitnessData.js", "t_c0886e50d42e64069e7a"), __dialogueText("alibi/AlibiWitnessData.js", "t_688dde0ece596f1dc273")], __dialogueText("alibi/AlibiWitnessData.js", "t_a22baffd4fd818fb229f")],
  ['painting', __dialogueText("alibi/AlibiWitnessData.js", "t_ea8bac76ef978810a1ed"), __dialogueText("alibi/AlibiWitnessData.js", "t_0321db1bf0088f48403e"), [__dialogueText("alibi/AlibiWitnessData.js", "t_7f486db06fa8eb7fc1b0"), __dialogueText("alibi/AlibiWitnessData.js", "t_b3801cf76837b9305169"), __dialogueText("alibi/AlibiWitnessData.js", "t_7ed8632d8d98bd404e3e")], __dialogueText("alibi/AlibiWitnessData.js", "t_51c600ad36a0121cb990")],
  ['magic', __dialogueText("alibi/AlibiWitnessData.js", "t_165538321e70aab1b5c8"), __dialogueText("alibi/AlibiWitnessData.js", "t_f0db69f385212f52385d"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c5aa8f07b4bed46fb7ca"), __dialogueText("alibi/AlibiWitnessData.js", "t_e402d02ace97652b1b28"), __dialogueText("alibi/AlibiWitnessData.js", "t_6530e1de37717cacb5a7")], __dialogueText("alibi/AlibiWitnessData.js", "t_3579c1709c67a7c1fa5c")],
  ['radio', __dialogueText("alibi/AlibiWitnessData.js", "t_41763281191af1dec23e"), __dialogueText("alibi/AlibiWitnessData.js", "t_f9be0984e63dd5eaee43"), [__dialogueText("alibi/AlibiWitnessData.js", "t_2b662665aa0a93088c71"), __dialogueText("alibi/AlibiWitnessData.js", "t_de11bebd8b00382ae391"), __dialogueText("alibi/AlibiWitnessData.js", "t_fe5a81570baedf7f6d3b")], __dialogueText("alibi/AlibiWitnessData.js", "t_444a54d061ccc0df9f7a")],
  ['flowers', __dialogueText("alibi/AlibiWitnessData.js", "t_80270a2fdeb6a2ad5e34"), __dialogueText("alibi/AlibiWitnessData.js", "t_45b9e515d7f8f7502fef"), [__dialogueText("alibi/AlibiWitnessData.js", "t_a5bd04109ea8459c2005"), __dialogueText("alibi/AlibiWitnessData.js", "t_f26ee817c5c3ba24c26c"), __dialogueText("alibi/AlibiWitnessData.js", "t_7e50f22881467cd3ce7c")], __dialogueText("alibi/AlibiWitnessData.js", "t_313437bbede1b0be215c")],
  ['boardgames', __dialogueText("alibi/AlibiWitnessData.js", "t_029a594d408d6218a844"), __dialogueText("alibi/AlibiWitnessData.js", "t_90984eb5e30e97db3182"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c0886e50d42e64069e7a"), __dialogueText("alibi/AlibiWitnessData.js", "t_3fd79a97e3ff7cccbd83"), __dialogueText("alibi/AlibiWitnessData.js", "t_728a0c48469fa214cb0a")], __dialogueText("alibi/AlibiWitnessData.js", "t_0bc7227c75efccc9cd7f")],
  ['auction', __dialogueText("alibi/AlibiWitnessData.js", "t_0671b7e0773b5f108686"), __dialogueText("alibi/AlibiWitnessData.js", "t_118d0cac86fe5b12fe6c"), [__dialogueText("alibi/AlibiWitnessData.js", "t_c5109d14d15ddcbe36e5"), __dialogueText("alibi/AlibiWitnessData.js", "t_6c6e76433e5c3f732dd1"), __dialogueText("alibi/AlibiWitnessData.js", "t_eeb2c0ab923a277c9c6e")], __dialogueText("alibi/AlibiWitnessData.js", "t_74643bf9433054d0fee4")],
  ['sewing', __dialogueText("alibi/AlibiWitnessData.js", "t_3635fc6bc354907a6561"), __dialogueText("alibi/AlibiWitnessData.js", "t_2168aed8524e88a35e9f"), [__dialogueText("alibi/AlibiWitnessData.js", "t_bee79b375a231a11f88c"), __dialogueText("alibi/AlibiWitnessData.js", "t_ba15bce125b832e393f5"), __dialogueText("alibi/AlibiWitnessData.js", "t_5293d9b7c38f38ed0c24")], __dialogueText("alibi/AlibiWitnessData.js", "t_4db4b198c379a62e3611")],
  ['mediation', __dialogueText("alibi/AlibiWitnessData.js", "t_5a251f0c83a1426c16d5"), __dialogueText("alibi/AlibiWitnessData.js", "t_03d7a2021bd455dc3c60"), [__dialogueText("alibi/AlibiWitnessData.js", "t_3688b077992aca1d5a7d"), __dialogueText("alibi/AlibiWitnessData.js", "t_fe1ad02d3bbfb7feac0f"), 'Co-mediator'], __dialogueText("alibi/AlibiWitnessData.js", "t_e0653b043c84f460bfc3")],
  ['quiz', __dialogueText("alibi/AlibiWitnessData.js", "t_f4eb9c641d1ef38edb8a"), __dialogueText("alibi/AlibiWitnessData.js", "t_6f918a2f0c11fbc7c38f"), [__dialogueText("alibi/AlibiWitnessData.js", "t_7073971e329405035ac5"), __dialogueText("alibi/AlibiWitnessData.js", "t_9dda962004efcdb3edb2"), __dialogueText("alibi/AlibiWitnessData.js", "t_728a0c48469fa214cb0a")], __dialogueText("alibi/AlibiWitnessData.js", "t_77f1423d692659bd605c")],
  ['fitness', __dialogueText("alibi/AlibiWitnessData.js", "t_de1958c3231882774daa"), __dialogueText("alibi/AlibiWitnessData.js", "t_26f645dd8b1dc0450b17"), [__dialogueText("alibi/AlibiWitnessData.js", "t_4331b10a67149cefffea"), __dialogueText("alibi/AlibiWitnessData.js", "t_3d1a368abc9c7426b208"), __dialogueText("alibi/AlibiWitnessData.js", "t_952ef9fa53d30a901443")], __dialogueText("alibi/AlibiWitnessData.js", "t_16ef131fbffbb23f3d7f")]
].map(([id, venue, activity, roles, joke]) => ({ id, venue, activity, roles, joke }));

function hash(value) {
  let n = 2166136261;
  for (const c of String(value)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); }
  return n >>> 0;
}
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function formatAlibiTime(minute) {
  if (!Number.isInteger(minute)) throw new Error('Alibi time must be an integer minute.');
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function buildAccounts(kind, c, thief) {
  const { n, v, a, b, t, activity, roles, joke, day } = c;
  const e = (minute, statement, summary) => ({ minute, statement, summary });
  const full = `${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 5)}`;
  const intro = `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_fbb9933a1bffcacef8b5")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_9a3ac9fd1b7c3c418a95")}`;
  let explanation = null;
  let entries;
  if (!thief) {
    switch (kind) {
      case 0:
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_b3c9d1030ad45031c9c5")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_b1a669f4ab1fafb6689d")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_9e139f466a83e8595ef9")}${t(b + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5769b8cf926df7c5abb9")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_1e83c324bc7c8fd4410d")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_64d99bc8467fc22650c7")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_45ac538df9802f113ade")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_ed4c06d4db96f4d8d782")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_36daa4a49679c007152d")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9acfbeda8a718541d8db")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0775ad63a6ab73ae44ca")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7e666ba0bf37c0e3b22a")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_655d6b967a51bfbe562c")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_1e0b76cab9caa2eb046c"))
        ]; break;
      case 1:
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_b3c9d1030ad45031c9c5")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_06f55b8e35919ad61184")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(a + 1)}${__dialogueText("alibi/AlibiWitnessData.js", "t_05384a3742d4033686d9")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_a2361c10eaed7f25827b")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5f666fb5c7be9bc46787")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_a7519e32fcec59121ad8")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_bc11358423d5e94bd5dd")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_9aa92d19a36be80af81c")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_c3f802ee260fd51f9431")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_9296eac782e56597aeab")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5769b8cf926df7c5abb9")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f405c4d17b6c80e85f9a")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5a593d8f26bdf2682380")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_dfd430332571e3e1b955")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_ed77e178eabd815a465a"))
        ]; break;
      case 2:
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_b3c9d1030ad45031c9c5")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_b1a669f4ab1fafb6689d")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_656384e8e797853d51c2")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_2743f11e3f8b21b20dfd")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_880b8275dd4810ffcc12")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_f7bde4c0b85ce758651c")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_ed4c06d4db96f4d8d782")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_afc889a6a9d0597c4a28")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_d899df67b7733634be7d")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_b58b1480e29f08909fbf")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_f5b6b05f00c43000871e")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_21108713693d8808c564")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_6b26f505960557fa2dc1"))
        ]; break;
      case 3:
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_5624f8bc523ad1c981f6")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_6ba2a4857bcca55ef0dc")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_40d2a56d512ef19ef89e")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_c133e517d673267b20ef")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_3be0b54111f201ddc86b")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_97d6ba10467da7afbd65")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_d995dacf336012d6a4e8")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_610456a5184181fcf480")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_86d3a71c6d63e5caced0")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_dfd430332571e3e1b955")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8aaa7a80ab3afdb9ced8")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_94696a77b4473f1dcf57"))
        ]; break;
      case 4:
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_b3c9d1030ad45031c9c5")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_d562326b34c7157c6be2")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_2743f11e3f8b21b20dfd")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_3f998031c4d44ba1fec9")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f1d8c93dead277f483ba")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d1001bb43457580df540")}${t(a + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_2161b9ade2c8e92afcd6")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_68221b6eaf54aa044429")}${t(b + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_1a4830e8e468cbc1b960")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_23c4f40c6ccb55986dcd")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_ff8a0868ab0ae34826cb")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_7fcba1285642720e1808")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_5624f8bc523ad1c981f6")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_99a3d05bfc4cbec34ddd")}${t(a + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_44335e13ed835eb12baf")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_caabbb9b8c0254a52938")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_8f648d5b369a2830d0f6"))
        ]; break;
      default:
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_b3c9d1030ad45031c9c5")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_b1a669f4ab1fafb6689d")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_e74ca48001ad673c9f4b")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_29e4fd824da8420154a2")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_6d64d600634388eb9bc3")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_dd89433bec3769f3a676")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_8c487f3844f02aab5387")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_3af484203f5d58d5c215")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_2219e630270d1cc77abf")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_fc76599c3804f086f8e3")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_0ad926b7a5785fbd2e0b")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5502b0047da3fb692196")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_6bdd45528135f663ff07"))
        ];
    }
  } else {
    switch (kind) {
      case 0:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_3d921945a61f70acb696");
        entries = [
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_10f332c85c4a151201ea")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_51b15d518848a42d8e99")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_54b1fd6ff0fbc3af45cc")),
          e(a - 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_2aedf65af7b0ba41370e")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_ed4c06d4db96f4d8d782")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5502b0047da3fb692196")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_db4d2acf3568a8e4f832")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_bbe9d6f039588cd399d4")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d9041acced4a83b8106c")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_e3ee915a8e8c7aa02d2f")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_d975ea32faeede1a340a")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_ed4c06d4db96f4d8d782")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_05384a3742d4033686d9")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_df1ac6437eeb4b3f72ee")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_b07410788e0e4e30c596"))
        ]; break;
      case 1:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_6acc5b4cad522ca4020e");
        entries = [
          e(a - 5, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7bda77d9c2eb569625ea")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_af9fe40282a902e6b286")),
          e(a - 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_004324959f38e701957f")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_12cd12f270bdc5611c75")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_405d8b372503e66a532f")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_34f1db948f754eeffc17")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_99179009a5c9d56b3c2f")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_dfd430332571e3e1b955")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_ce6a913eb91dd112e430")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_540387063cd922b0732c"))
        ]; break;
      case 2:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_8fc1a29b236dd856a088");
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7189651207068e54cd8c")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_9dcb23246874e66864c1")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_0b9e4dfaf0eb8426a4cc")),
          e(a - 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_9418a80eabbaf6111f2c")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_55dd909678994427e8c7")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_b4c88b110eeeafe70d34")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_266939a404e1c9b128c1")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3e8b3708cd3c0356c77f")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9040eda397b972510bf5")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_2203ab3c99991fc6f2e2")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_dfec1463299c4752396e")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_be39afc998b6f5db5b15")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_4e8d2e46e5e156cbd60b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_42fa4ae4c2748b4abe7c")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_0b1ede761a4455386e06"))
        ]; break;
      case 3:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_5f760bca2ccfe80fed9e");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_921c9eb67395ade44673")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_964440cd92259f3448b1")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_e39bf6b8e582740bcd19")),
          e(b + 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_686c7a30761b0c2ab5e9")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_31a5eba0663b73c1217e")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_378dbe8c02ff231fdd50")}${t(b + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_35dd8c8fe717fa50eda9")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_32bae3f68071e8b79c3e")),
          e(b + 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_4427967a2fec8888b775")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_70588f56cad95df7fdca")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_7b5089605d8f2b997c9e")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_cb140b3fdc4563ead829")}${t(b + 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_111a8a0fda35026afdab"))
        ]; break;
      case 4:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_97025d5f7679339ddfb6");
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_e846ed325dde7d03ad00")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_964440cd92259f3448b1")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_33838fb262de31cd3a4b")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_4f4fe311f68c07d988cc")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_c0bd01f126510572287d")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_4021b90ee0f3567e5b51")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_8e935244d52047177c0e")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_e6b606ccb19252e25ea8")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_870b8f1e583be63d8b47")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_557669f6fcaf799cee23")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_8d07790f7cef4f164976"))
        ]; break;
      case 5:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_dba060088bcd92f03005");
        entries = [
          e(a - 25, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7189651207068e54cd8c")}${t(a - 25)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_3dfdedaa027b99108e9e")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_ed802b7b6a5a4608ebb4")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_b422cd557561575f92bc")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_0fdd621869d7429c3f7d")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_02d0ddb60663e7aa8b8e")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_e4c9b75b5bcc01e5d51b")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_20621a2d39ac421626f6")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_083e1978cb5af9c8cd35")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_9f8c7960013a7d170702")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_bb7f4ae228b4c4195174")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_124988a887ae17de3d2c")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0bf65a9efaf9c83338be")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_c83b976308c0c1df9d46"))
        ]; break;
      case 6:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_ed3bfe7002278e2eab29");
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1c4290f8cded54620a09")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_23121941d5a71b302e82")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f0d7c945aa95f6b94d07")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_5b4724be4f9efd5fe492")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_d2d02f663e52f31b1d15")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_e250656ad6bd536a84fd")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1e028ceff18eaf72e114")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_ebac7fb81d89725cde38")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_d7498a6090fd78af7b7b")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_306632156cb57ac9ec29")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_f8fee35ae6ec211c93f8")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_c9319552b9684c4d4f79"))
        ]; break;
      case 7:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_91c83d6bee7d3a47f6a6");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_2d13fca3987c60174faf")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_71cc473330b72a907e97")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_cfcf991f126d1b8c03ee")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_692017402618752fa36f")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_2143c73036dc620575c6")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_75141046b9b5e3c26eb9")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_655d34423405dd2504ec")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_65016f2077f131af0978")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f5bcef4c4e4cbd008be2"))
        ]; break;
      case 8:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_63382446795416e4c972");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_43157b590b0f89319d8e")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_f9e250f1d3d27d2deb6c")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_6b76cf74d3dddc3147c7")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_80d0034262bf6f833796")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_1e21c212946865751b91")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9769d2452bc55c759add")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_d77014b5aac4df8c8cf9")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_a6e1af5d7905df773c51")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_a8d66866b69a3d804557"))
        ]; break;
      case 9:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_d9155a0f94bdf3753693");
        entries = [
          e(a - 5, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_e11932ba16752ad72c27")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_22c6c71f1a71b592c474")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_bd593db48acd15ed3d18")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_709b5c562ed731502dac")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_97d6ba10467da7afbd65")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_67bb0a86b51aa917fd20")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_60342bbe307a99c94916")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_d37221477195af167568")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9a1bc0432084f52f28a1")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_e484a95dcc85865b7e2b")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5c2cd301e0e3e0669ddb")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_e3ee915a8e8c7aa02d2f")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_d48ac03aa210828b4d21")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_ff96bc55071ab69572d6")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_cc7b00c552ddf2a3e854"))
        ]; break;
      case 10:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_fcb68c6d6ef2b749a2eb");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1c4290f8cded54620a09")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_b4359bea7a9904f84ca0")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_53687e3f8271b14cf0de")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_060c28b810585c25590b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_b445a373e5c2b97b9522")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_51d3fa492d0eb5945c99")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_519b994fd42a7b0ed70b")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3ac73b66a7f1b552aab2")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_ab6f7470218f68cfcb49")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_65016f2077f131af0978")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_e174cb6477250f9b9a75"))
        ]; break;
      default:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_a3cfc4685da90e217429");
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7189651207068e54cd8c")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_4f7dc6c2d7ea7c0c906e")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_351e53f2fc317b1da813")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_b422cd557561575f92bc")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_0fdd621869d7429c3f7d")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_3612916939a48e13fe01")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3e8b3708cd3c0356c77f")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_dda3689355e574370e70")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_94fd8d7d3d0ccc77a053")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_4ddb4c13522133b13963")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_35d1e483a181d8a201f3")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_e38da0fbea90782d6020")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_57475a87318e9c6be6ad"))
        ];
    }
  }
  return { explanation, entries };
}

export function generateAlibiWitnesses(suspect, caseSeed = 'default_case', crimeWindow) {
  if (!suspect?.id) throw new Error('An alibi suspect with an ID is required.');
  const w = crimeWindow;
  if (!w || !Number.isInteger(w.day) || !Number.isInteger(w.startMinute) ||
      !Number.isInteger(w.endMinute) || w.startMinute < 30 ||
      w.endMinute <= w.startMinute || w.endMinute > 1409) {
    throw new Error('A valid crimeWindow with a 30-minute day margin is required.');
  }
  const thief = suspect.hiddenCaseData?.isTrueThief === true;
  const twin = suspect.hiddenCaseData?.isForensicTwin === true;
  if (thief === twin) throw new Error('Alibi suspect must be either the real thief or the forensic twin.');
  const occupation = String(suspect.occupation || suspect.publicProfile?.occupation || '').trim();
  const name = suspect.name || __dialogueText("alibi/AlibiWitnessData.js", "t_ceb6bc8a5017bfe62fa7");
  const rng = random(hash(`${caseSeed}:${suspect.id}:${name}:${occupation.toLowerCase()}:${w.day}:${w.startMinute}:${w.endMinute}`));
  const setting = SETTINGS[Math.floor(rng() * SETTINGS.length)];
  const pattern = Math.floor(rng() * (thief ? 12 : 6));
  const internalRoles = shuffle(WITNESS_ROLES, rng);
  const portraits = shuffle(WITNESS_TEXTURE_KEYS, rng);
  const built = buildAccounts(pattern, {
    n: name, v: setting.venue, a: w.startMinute, b: w.endMinute,
    day: w.day, t: formatAlibiTime, activity: setting.activity,
    roles: setting.roles, joke: setting.joke
  }, thief);
  const connection = suspect.publicProfile?.caseConnection || suspect.caseConnection;
  const contextNote = typeof connection === 'string' && connection.trim()
    ? `${__dialogueText("alibi/AlibiWitnessData.js", "t_ec0537fc1bba64031cb9")}${connection.trim()}${__dialogueText("alibi/AlibiWitnessData.js", "t_235eb0c3b2c1702b837f")}` : '';
  const cards = built.entries.map((entry, i) => ({
    id: `${suspect.id}_alibi_account_${i + 1}`,
    minute: entry.minute, timeSlot: formatAlibiTime(entry.minute),
    locationTag: setting.id, roleId: internalRoles[i].id, role: setting.roles[i],
    label: `${formatAlibiTime(entry.minute)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3b2e8119b6fcc97df985")}${entry.summary}`,
    isReal: !(thief && i === 0)
  }));
  const witnesses = built.entries.map((entry, i) => ({
    npcId: `${suspect.id}_witness_${internalRoles[i].id}`,
    suspectId: suspect.id, roleId: internalRoles[i].id, role: setting.roles[i],
    tone: internalRoles[i].tone, portraitKey: portraits[i], textureKey: portraits[i],
    isLiar: thief && i === 0,
    statement: entry.statement + (i === 2 ? contextNote : ''),
    contradictionHint: null, timelineCard: cards[i], motiveFragment: null
  }));
  return {
    version: ALIBI_DATA_VERSION, generatorRevision: ALIBI_GENERATOR_REVISION,
    suspectId: suspect.id, suspectName: name, crimeWindow: { ...w },
    alibiType: thief ? 'contradicted' : 'confirmed',
    scenarioId: `personal_${setting.id}_${thief ? 'false' : 'true'}_${pattern}`,
    scenarioContext: { type: 'personal', occupation, venue: setting.venue, activity: setting.activity },
    witnesses: shuffle(witnesses, rng),
    contradiction: thief ? {
      witnessRoleId: internalRoles[0].id, supportingRoleId: internalRoles[1].id,
      explanation: built.explanation
    } : null,
    trueTimeline: [...cards].sort((a, b) => a.minute - b.minute),
    boardCards: shuffle(cards, rng)
  };
}
export const AlibiWitnessData = {
  WITNESS_ROLES, WITNESS_TEXTURE_KEYS, generateAlibiWitnesses, formatAlibiTime
};