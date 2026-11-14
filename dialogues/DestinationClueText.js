import { dialogueText as __dialogueText } from "./DialogueText.js";
import { normalizePursuitCityId } from '../managers/PursuitCityContext.js';
import { editableTravelLines } from './EditableTravelTemplates.js';
const text=value=>typeof value==='string'?value.trim():'';
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function cityNameGuard(countryFacts={},extraIds=[]){
 const names=new Set();for(const raw of [...Object.keys(countryFacts),...extraIds]){if(!raw)continue;const id=normalizePursuitCityId(raw);for(const value of [String(raw),String(raw).replace(/_/g,' '),id,id?.replace(/_/g,' ')])if(value&&value.length>=3)names.add(value);if(id==='new_delhi')for(const v of [__dialogueText("dialogues/DestinationClueText.js", "t_9ed6d0e61816a424d0e0"),__dialogueText("dialogues/DestinationClueText.js", "t_57a5d8b2b8fe19458333"),'NewDelhi',__dialogueText("dialogues/DestinationClueText.js", "t_7d1550b844ff586a6023")])names.add(v);if(id==='new_york_city')for(const v of [__dialogueText("dialogues/DestinationClueText.js", "t_815eca977c7d75f72bd2"),__dialogueText("dialogues/DestinationClueText.js", "t_5a59ef2e40c5f89adb8c"),'NewYorkCity','NYC'])names.add(v);}
 const patterns=[...names].sort((a,b)=>b.length-a.length).map(name=>new RegExp(`${__dialogueText("dialogues/DestinationClueText.js", "t_e56efff8eaa8211f6f1d")}${escape(name)}${__dialogueText("dialogues/DestinationClueText.js", "t_581f143bdd0c1f7bde5f")}`,'giu'));
 return {safe:value=>Boolean(text(value))&&!patterns.some(pattern=>{pattern.lastIndex=0;return pattern.test(value);}),clean:value=>{let result=text(value);for(const pattern of patterns)result=result.replace(pattern,__dialogueText("dialogues/DestinationClueText.js", "t_0f53fb3533eb343bc155"));return result;}};
}
export function findCityFacts(source,cityId){const id=normalizePursuitCityId(cityId);if(!id)return null;const match=Object.entries(source||{}).find(([key])=>normalizePursuitCityId(key)===id);return match?.[1]&&typeof match[1]==='object'?match[1]:null;}
const read=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const fieldText={
 specialtyDish:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_52e5aaacaf12be8ac695")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_40865093bc7c980ff40e")}`,
 foodIngredient:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_b6ba38985127dbcd6486")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_97eec0ec5cb59814a78c")}`,
 classicCar:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_5a90ec39fabc7748587c")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_c9969ff4f5424efc3190")}`,
 drivingFact:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_75bd4a2d5c8b30de3214")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_8116ef9715f2688417b8")}`,
 guidebookNote:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_358a9acff3cab9889ac8")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_2ce6bad36fec3e79862c")}`,
 cityRiver:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_a1923e313c1a7c0ff758")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_d8eed4a28d572688da5b")}`,
 callingCode:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_61292e630f8bedabcb07")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_81079c7d350b692a49a2")}`,
 flagColors:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_671657ff354b7675062c")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_1653a8ad979ca6536307")}`,
 plugType:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_07b996bf20b1b30e00b1")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_1dea5dba3c22bee6b7ee")}`,
 utcOffsetFact:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_e1ed034799d15fd0fe5a")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_1e4011debdc139fa9898")}`,
 wildlife:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_d6c87105bbf82e93fd6a")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_1d686a0cfb4ad85ac516")}`,
 famousPerson:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_2768e88a3c53c460f71c")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_d14391e8533bbc9953c3")}`,
 artStyle:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_aa15ec0da536e6bee7a8")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_c075137fd6a8696b886c")}`,
 craftGood:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_b3631c4e95c9d3652f82")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_36e1ef226d1149e1ec4d")}`,
 exportGood:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_9313b98fab136ee4b14e")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_bb8f80e9c710a3b77c4d")}`,
 traditionFact:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_71f443c92cbc6bf1460f")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_0dd6cf5d7bc84fff607c")}`,
 mountainFact:v=>`${__dialogueText("dialogues/DestinationClueText.js", "t_2768e88a3c53c460f71c")}${v}${__dialogueText("dialogues/DestinationClueText.js", "t_12e44925d373bbdfe7e4")}`
};
const keys={dish:['specialtyDish','foodIngredient'],cars:['classicCar','drivingFact'],flight:['guidebookNote','cityRiver','flagColors'],currency:[],travel:['guidebookNote','cityRiver','specialtyDish','callingCode','flagColors','classicCar']};
export function buildDestinationLines({topicId,facts,templates=[],guard}){
 if(!facts)return [];
 const authored=editableTravelLines(templates,facts,guard);if(authored.length)return authored;
 const accept=value=>typeof value==='string'&&value.trim()&&guard.safe(value)&&!/[{}]/.test(value),lines=[];
 const add=value=>{if(accept(value)&&!lines.includes(value))lines.push(value);};
 if(topicId==='currency'){const currency=text(facts.currency?.name);if(currency&&guard.safe(currency)){const landmark=[facts.guidebookNote,facts.cityRiver].find(accept);if(landmark){add(`${__dialogueText("dialogues/DestinationClueText.js", "t_55ecdb2e2eceab7dff79")}${currency}${__dialogueText("dialogues/DestinationClueText.js", "t_00bf7d1036c0fc982406")}${landmark}${__dialogueText("dialogues/DestinationClueText.js", "t_e3a3f5718db8cdc0a22a")}`);add(`${__dialogueText("dialogues/DestinationClueText.js", "t_4bc1abcbcb4d8b15dbe4")}${currency}${__dialogueText("dialogues/DestinationClueText.js", "t_499a429dc453fa7b1073")}${landmark}${__dialogueText("dialogues/DestinationClueText.js", "t_73a14fb1a3f05bf1fb8f")}`);}else add(`${__dialogueText("dialogues/DestinationClueText.js", "t_1075bbd2e81aae9bb815")}${currency}${__dialogueText("dialogues/DestinationClueText.js", "t_b3c7d29e8a9464ef22c6")}`);}return lines;}
 let fields=keys[topicId];if(!fields){fields=[...new Set(templates.filter(v=>typeof v==='string').flatMap(t=>[...t.matchAll(/\{([\w.]+)\}/g)].map(m=>m[1])).filter(f=>Object.hasOwn(fieldText,f)))];if(!fields.length)fields=['guidebookNote','cityRiver'];}
 for(const field of fields){const value=text(read(facts,field));if(value&&fieldText[field]&&guard.safe(value))add(fieldText[field](value));}return lines;
}
