import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { readEvidenceProfileIds } from './EvidenceProfileRead.js';
// Authored deduction-puzzle conventions, not real-world proof.
const HOBBIES = Object.freeze({
  "bouldering": "t_13e21bad6df8981b68b7",
  "gymnastics": "t_766407af68d2456457c4",
  "weightlifting": "t_3623004950e5e2b1033e",
  "painting": "t_c21abf5b2d5601254dd9",
  "miniature_painting": "t_1dc4932bd7acf3f8206e",
  "stage_scenery": "t_47ac216e53c9e73a8b93",
  "pottery": "t_4d3338ff7a67ea568392",
  "ceramic_sculpture": "t_a31a21ababde2e881aff",
  "ceramic_jewellery": "t_68af0542b940ce90c106",
  "model_shipbuilding": "t_4cb8c8490016c2b39c49",
  "woodcarving": "t_176c18cc0837bc68e38d",
  "furniture_restoration": "t_d816988e37631e3a016d",
  "pencil_sketching": "t_aaad13b268e596236973",
  "graphite_portraits": "t_a75525586954cd35f2f3",
  "graphite_illustration": "t_e63b58a9e44046c1dd1a",
  "candle_making": "t_9dd37da0058c6d495f5d",
  "batik": "t_669f2e0610243bbad1ec",
  "wax_sculpture": "t_963dbfff76f1d12b4ecb",
  "running": "t_23faec2eb54629afc59f",
  "chess": "t_c1aade8253979ee2f395",
  "birdwatching": "t_5aab3f0e1e1e6969b45d",
  "photography": "t_7be8b75c22f417725401",
  "crosswords": "t_86cba9722e58df4b658d",
  "astronomy": "t_0dda27a77996f8307cd7",
  "origami": "t_501073e4a4a7203951b3",
  "stamp_collecting": "t_a38edc555108198d3f49"
});
const PROFILES = {
  "sports_chalk": {
    "label": "t_885fb3fc83878f275608",
    "composition": "t_c7ce4a8f72344c9420bc",
    "report": [
      "t_502c13365811d83a5554"
    ],
    "hobbyIds": [
      "bouldering",
      "gymnastics",
      "weightlifting"
    ]
  },
  "acrylic_paint": {
    "label": "t_365fc99f9289e65e2f4a",
    "composition": "t_2ee9880faece65cde391",
    "report": [
      "t_2951de1adaacc6f6b482",
      "t_124f4e4f4c18dbc97a20"
    ],
    "hobbyIds": [
      "painting",
      "miniature_painting",
      "stage_scenery"
    ]
  },
  "ceramic_clay": {
    "label": "t_68ebff24663aea8bf0c4",
    "composition": "t_415b11904d2d0a58f777",
    "report": [
      "t_015687b9414a46ef5bfd",
      "t_433b5066bdbaeaf36292"
    ],
    "hobbyIds": [
      "pottery",
      "ceramic_sculpture",
      "ceramic_jewellery"
    ]
  },
  "wood_dust": {
    "label": "t_b55dab10602e39b12d51",
    "composition": "t_bf6e25aa92ced2b8ed39",
    "report": [
      "t_ad44157055ed434375f2",
      "t_40ab696343814c59950b"
    ],
    "hobbyIds": [
      "model_shipbuilding",
      "woodcarving",
      "furniture_restoration"
    ]
  },
  "graphite_dust": {
    "label": "t_65436effecac519b2de0",
    "composition": "t_a7493e752e8c171a15ab",
    "report": [
      "t_6db1e8c97766608aea8f",
      "t_d94129e4f2e0c8de9c98"
    ],
    "hobbyIds": [
      "pencil_sketching",
      "graphite_portraits",
      "graphite_illustration"
    ]
  },
  "wax_particles": {
    "label": "t_f4fec99a5a7bfb1b8a0b",
    "composition": "t_87f96817c6c161919ec6",
    "report": [
      "t_3bb57e80b1641445600c",
      "t_af433f2d80e8038b64e6"
    ],
    "hobbyIds": [
      "candle_making",
      "batik",
      "wax_sculpture"
    ]
  }
};
const textCache=new Map();
function text(key){if(!textCache.has(key))textCache.set(key,__dialogueText('suspects/DustEvidence.js',key));return textCache.get(key);}
function report(definition){return definition.report.map(text).join('');}
function getDefinition(profileId){if(!Object.hasOwn(PROFILES,profileId))throw Error(`Unsupported microtrace profile: ${profileId}`);return PROFILES[profileId];}
function pick(items,rng){if(!Array.isArray(items)||!items.length)throw Error('Cannot pick from an empty collection.');const roll=rng();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('rng must return a number in [0, 1).');return items[Math.floor(roll*items.length)];}
function sample(items,count,rng){const pool=[...items],result=[];while(result.length<count&&pool.length){const item=pick(pool,rng);pool.splice(pool.indexOf(item),1);result.push(item);}return result;}
function getCheckedHobbies(profile,{strict=true}={}){return readEvidenceProfileIds(profile,{registry:HOBBIES,field:'hobbyIds',kind:'hobby',module:'DustEvidence',strict});}
function publicProfile(profileId,definition){return{id:profileId,label:text(definition.label),composition:text(definition.composition),report:report(definition)};}
export function getDustProfiles(){return Object.entries(PROFILES).map(([id,d])=>publicProfile(id,d));}
export function getDustProfile(profileId){return publicProfile(profileId,getDefinition(profileId));}
export function createDustEvidence(profileId,{stationId='trace_0',sourceConfirmed=false,sourceText=''}={}){
  const definition=getDefinition(profileId);if(typeof sourceConfirmed!=='boolean')throw Error('sourceConfirmed must be a boolean.');const cleanSourceText=String(sourceText??'').trim();if(sourceConfirmed&&!cleanSourceText)throw Error('Confirmed origin requires a description.');
  return{id:`trace_dust_${profileId}`,attribute:'dust_profile',evidenceType:'dust_profile',stationId,minigame:'ToolmarkAnalysisScene',label:text('t_8a1b0a09e53e7085462e'),correctValue:profileId,thief_value:profileId,clueType:'trace',isRedHerring:false,source:'crime_lab',sourceConfirmed,sourceText:cleanSourceText,clueText:[report(definition),cleanSourceText].filter(Boolean).join(' ')};
}
export function createDustProfile(profileId,{compatible=true,rng=Math.random}={}){
  const definition=getDefinition(profileId);if(typeof compatible!=='boolean')throw Error('compatible must be a boolean.');const all=Object.keys(HOBBIES);let hobbyIds;
  if(compatible){const matching=pick(definition.hobbyIds,rng);hobbyIds=[matching,...sample(all.filter(id=>id!==matching),2,rng)];}else hobbyIds=sample(all.filter(id=>!definition.hobbyIds.includes(id)),3,rng);
  return{schemaVersion:1,complete:true,hobbyIds:sample(hobbyIds,hobbyIds.length,rng)};
}
export function evaluateDustEvidence(suspect,evidence){
  if(evidence?.evidenceType!=='dust_profile')throw Error('Expected dust_profile evidence.');const definition=getDefinition(evidence.correctValue??evidence.thief_value);
  if(evidence.sourceConfirmed!==true||!String(evidence.sourceText??'').trim())return{status:'unknown',reasonCode:'unconfirmed_origin'};
  const ids=getCheckedHobbies(suspect?.dustProfile);if(!ids)return{status:'unknown',reasonCode:'missing_profile'};
  return ids.some(id=>definition.hobbyIds.includes(id))?{status:'compatible',reasonCode:'hobby_association'}:{status:'incompatible',reasonCode:'no_hobby_association'};
}
export function getDustHobbyLabels(suspect){return(getCheckedHobbies(suspect?.dustProfile,{strict:false})||[]).map(id=>text(HOBBIES[id]));}
export function getDustDossierNotes(suspect){const labels=getDustHobbyLabels(suspect);return labels.length?[{id:'personal_hobbies',text:`${text('t_873d76d8a2e7a535bdf1')}${labels.join(text('t_0a2d3f8f9b727cf73e6c'))}${text('t_cdb4ee2aea69cc6a8333')}`}]:[];}
