import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const NIGHT_EVENTS = [
  {time:'20:55',title:__dialogueText("assets/data/deadMailNightData.js", "t_07a181faa6f8582c4a3c"),text:__dialogueText("assets/data/deadMailNightData.js", "t_fa6d10be59e77a55e604"),facts:['costumes']},
  {time:'21:06',title:__dialogueText("assets/data/deadMailNightData.js", "t_762d8172071b393c177f"),text:__dialogueText("assets/data/deadMailNightData.js", "t_3572db6b078dadabf7a4"),facts:['chapelEntry']},
  {time:'21:10',title:__dialogueText("assets/data/deadMailNightData.js", "t_2107f57705d86afc3ce3"),text:__dialogueText("assets/data/deadMailNightData.js", "t_0245b71f838c60c89418"),facts:['gatePhoto','chapelWitness','bell']},
  {time:'21:14',title:__dialogueText("assets/data/deadMailNightData.js", "t_db6cd1d50d3068f18020"),text:__dialogueText("assets/data/deadMailNightData.js", "t_86768356bca507d65d24"),facts:['shedRoute']},
  {time:'21:17',title:__dialogueText("assets/data/deadMailNightData.js", "t_d2b865fd560d956496a3"),text:__dialogueText("assets/data/deadMailNightData.js", "t_7c5e469f6a98e50b5da3"),facts:['unmasked']}
];
export const NIGHT_FACTS = {
  costumes:[__dialogueText("assets/data/deadMailNightData.js", "t_51ab136f5bd1e2e537c5"),__dialogueText("assets/data/deadMailNightData.js", "t_609153b63b5c2cecb514"),__dialogueText("assets/data/deadMailNightData.js", "t_45da0db70f8132c6fc5b")],
  chapelEntry:[__dialogueText("assets/data/deadMailNightData.js", "t_78ec2792e23d6df9cfa0"),__dialogueText("assets/data/deadMailNightData.js", "t_4cc25caedd88ecd820f2"),__dialogueText("assets/data/deadMailNightData.js", "t_4fd05e4c071b5781e5f1")],
  gatePhoto:[__dialogueText("assets/data/deadMailNightData.js", "t_9a93498a18dd6b82ec71"),__dialogueText("assets/data/deadMailNightData.js", "t_8ebefc35d33396791847"),__dialogueText("assets/data/deadMailNightData.js", "t_22798de70ea838ba1709")],
  chapelWitness:[__dialogueText("assets/data/deadMailNightData.js", "t_9d54fff1422184bb1b4e"),__dialogueText("assets/data/deadMailNightData.js", "t_5e7e88fe3ec64181cb06"),__dialogueText("assets/data/deadMailNightData.js", "t_4ca515ed73e9796dca87")],
  bell:[__dialogueText("assets/data/deadMailNightData.js", "t_e910d3c9d8000917b758"),__dialogueText("assets/data/deadMailNightData.js", "t_1a4ecc7a4f94ec66480e"),__dialogueText("assets/data/deadMailNightData.js", "t_5e477dccf83c94412e7d")],
  shedRoute:[__dialogueText("assets/data/deadMailNightData.js", "t_099a4b5ee1ee9774ae77"),__dialogueText("assets/data/deadMailNightData.js", "t_a49e2f7a76f8cfa3c096"),__dialogueText("assets/data/deadMailNightData.js", "t_22798de70ea838ba1709")],
  unmasked:[__dialogueText("assets/data/deadMailNightData.js", "t_f5dfa77a31cf9de6e031"),__dialogueText("assets/data/deadMailNightData.js", "t_1e9cef7862ed275b0b03"),__dialogueText("assets/data/deadMailNightData.js", "t_4fd05e4c071b5781e5f1")],
  courierStory:[__dialogueText("assets/data/deadMailNightData.js", "t_4272b5be47b63b7bd44c"),__dialogueText("assets/data/deadMailNightData.js", "t_7de082b8c5101e56e1fb"),__dialogueText("assets/data/deadMailNightData.js", "t_b54c7f87aa98a84b566b")],
  courierVerified:[__dialogueText("assets/data/deadMailNightData.js", "t_4d6e0d413d62cfb8a4e4"),__dialogueText("assets/data/deadMailNightData.js", "t_77a5c54f4739c8ca5efc"),__dialogueText("assets/data/deadMailNightData.js", "t_44fa0f9a432530e75548")],
  courierSheet:[__dialogueText("assets/data/deadMailNightData.js", "t_f90b79345e3bb539395d"),__dialogueText("assets/data/deadMailNightData.js", "t_2bc324494f7a346875f4"),__dialogueText("assets/data/deadMailNightData.js", "t_bb9a783868903198ab36")]
};
export const COURIER_TOPICS = [
  ['identity',__dialogueText("assets/data/deadMailNightData.js", "t_80495816f7f221579a47"),__dialogueText("assets/data/deadMailNightData.js", "t_a2e880c0b651b72fde9a")],
  ['costume',__dialogueText("assets/data/deadMailNightData.js", "t_6602c97e15acdec1b530"),__dialogueText("assets/data/deadMailNightData.js", "t_59f77d963ac3798d79d8")],
  ['bell',__dialogueText("assets/data/deadMailNightData.js", "t_d83e8b2de0ad72ef813b"),__dialogueText("assets/data/deadMailNightData.js", "t_e89a40ed1bd3fbf317eb")],
  ['records',__dialogueText("assets/data/deadMailNightData.js", "t_a4e653999f857accfcaa"),__dialogueText("assets/data/deadMailNightData.js", "t_e9f0d2cf85439b5645b1")]
];
export const NIGHT_DEDUCTIONS = [
  {id:'twoPeople',question:__dialogueText("assets/data/deadMailNightData.js", "t_13284355cd3f689102e5"),options:[__dialogueText("assets/data/deadMailNightData.js", "t_1d53e0e005ae93dbd39d"),__dialogueText("assets/data/deadMailNightData.js", "t_9ea36123927791c2465a"),__dialogueText("assets/data/deadMailNightData.js", "t_20478b2c6fc46d81b670")],answer:0,explanation:__dialogueText("assets/data/deadMailNightData.js", "t_3a13fda79f4d068b6e52")},
  {id:'limits',question:__dialogueText("assets/data/deadMailNightData.js", "t_2bea59eeb235fc19240c"),options:[__dialogueText("assets/data/deadMailNightData.js", "t_d9ffd208c4d32ed63125"),__dialogueText("assets/data/deadMailNightData.js", "t_8defe2a147ef49f24fc1"),__dialogueText("assets/data/deadMailNightData.js", "t_bc9f4f96ea353db83300")],answer:1,explanation:__dialogueText("assets/data/deadMailNightData.js", "t_e003e90c677680452e95")},
  {id:'nextStep',question:__dialogueText("assets/data/deadMailNightData.js", "t_61dc6a8016fd6254a72e"),options:[__dialogueText("assets/data/deadMailNightData.js", "t_eb5e2ce2e79de4755a11"),__dialogueText("assets/data/deadMailNightData.js", "t_66763196e7dc641d2d06"),__dialogueText("assets/data/deadMailNightData.js", "t_ce65aac701ed4dc81744")],answer:2,explanation:__dialogueText("assets/data/deadMailNightData.js", "t_368a1208cbf031fc5e2e")}
];
