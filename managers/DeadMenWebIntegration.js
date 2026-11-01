import { gameState } from '../GameData.js';
import { discoverSearchKeywords, getSearchProgress } from '../ui/pi-computer/ComputerSearchCore.js';

export const DEAD_MEN_WEB_CASE = 'dead_men_calling';
const QUEST='pi_dead_men_calling';
const CONTACTS={
 '619':{id:'dead_men_margaret',number:'619',name:'Margaret Vale',keyword:'dm_phone_margaret'},
 '620':{id:'dead_men_leo',number:'620',name:'Leo Mercer',keyword:'dm_phone_leo'},
 '621':{id:'dead_men_colin',number:'621',name:'Colin Ward',keyword:'dm_phone_colin'}
};
const UI_INSTALLED=Symbol.for('lostArtifacts.deadMenWebUI');
const PHONE_INSTALLED=Symbol.for('lostArtifacts.deadMenWebPhone');
function accepted(){return ['active','completed'].includes(gameState.piQuests?.quests?.[QUEST]?.status);}
function known(){return getSearchProgress().cases[DEAD_MEN_WEB_CASE]?.known||[];}
export function isDeadMenWebContactVisible(contact){
 const spec=CONTACTS[contact?.number];
 return !spec || (accepted()&&known().includes(spec.keyword));
}
export function deadMenWebContacts(){
 return Object.values(CONTACTS).filter(isDeadMenWebContactVisible)
  .map(({keyword,...contact})=>({...contact,listed:true,status:'available',dialogueId:null}));
}
export function installDeadMenWebPhone(phone){
 if(phone[PHONE_INSTALLED])return;phone[PHONE_INSTALLED]=true;
 const start=phone.startCall.bind(phone);
 phone.startCall=()=>{
  if(CONTACTS[phone.number]&&!isDeadMenWebContactVisible({number:phone.number})){
   phone.finishCall('The number cannot be connected.');return;
  }
  return start();
 };
}
export function fragmentDeadMenText(value,keywords){
 const aliases=[];
 for(const keyword of keywords){
  // Numbers can only be discovered through their website fragments.
  if(keyword.id.startsWith('dm_phone_'))continue;
  for(const alias of keyword.aliases||[]){if(alias)aliases.push({alias,id:keyword.id});}
 }
 aliases.sort((a,b)=>b.alias.length-a.alias.length);
 const source=String(value),result=[];let plain='',index=0;
 while(index<source.length){
  const match=aliases.find(item=>source.slice(index,index+item.alias.length).toLowerCase()===item.alias.toLowerCase()&&
   (index===0||!/[a-z0-9_]/i.test(source[index-1]))&&
   (index+item.alias.length===source.length||!/[a-z0-9_]/i.test(source[index+item.alias.length])));
  if(!match){plain+=source[index++];continue;}
  if(plain){result.push(plain);plain='';}
  result.push({keywordId:match.id,text:source.slice(index,index+match.alias.length)});index+=match.alias.length;
 }
 if(plain)result.push(plain);return result;
}
const MAILS=new Set([
 'dead_men_client_mail','dead_men_archive_delivery','dead_men_access_enquiry',
 'dead_men_mercer_permission','dead_men_release','dead_men_manifest','dead_men_delivery',
 'dead_men_folder_cover','dead_men_folder_sheet','dead_men_folder_bank','dead_men_colin_request',
 'dead_men_colin_statement','dead_men_admission_copy','dead_men_consent_copy','dead_men_audio_next'
]);
export function installDeadMenWebUI(ui){
 if(ui[UI_INSTALLED])return;ui[UI_INSTALLED]=true;
 const docs=ui.documents,original=docs.renderPagedText.bind(docs);
 docs.renderPagedText=(content,x,y,w,h)=>{
  if(!accepted()||ui.app!=='mail'||!MAILS.has(ui.selectedId))return original(content,x,y,w,h);
  const search=ui.search;
  const definition=search.data?.cases?.find(c=>c.id===DEAD_MEN_WEB_CASE);
  if(!definition){if(!search.loading&&!search.error)void search.load();return original(content,x,y,w,h);}
  const blocks=String(content).split('\n').map(line=>fragmentDeadMenText(line,definition.keywords));
  const lines=search.retroArticleLines.call({definition,textWidth:search.textWidth.bind(search)},
   {blocks,links:[]},Math.max(1,w-8),16);
  const lineHeight=25,rows=Math.max(1,Math.floor((h-38)/lineHeight));
  const pages=Math.max(1,Math.ceil(lines.length/rows));
  ui.bodyPage=Math.max(0,Math.min(pages-1,Number(ui.bodyPage)||0));
  const mailId=ui.selectedId;
  lines.slice(ui.bodyPage*rows,(ui.bodyPage+1)*rows).forEach((line,i)=>{
   let xx=x;const yy=y+i*lineHeight;
   for(const part of line){
    const collected=part.keywordId&&known().includes(part.keywordId);
    const label=ui.drawing.text(xx,yy,part.text,16,part.keywordId?(collected?'#497050':'#94572f'):'#343e35');
    if(part.keywordId){
     ui.drawing.rectangle(xx,yy+label.height+1,Math.max(1,label.width),1,collected?0x497050:0x94572f);
     label.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
      if(!accepted()||ui.app!=='mail'||ui.selectedId!==mailId)return;
      discoverSearchKeywords(DEAD_MEN_WEB_CASE,[part.keywordId]);ui.render();
     });
    }
    xx+=search.textWidth(part.text,16);
   }
  });
  const fy=y+h-32;
  ui.drawing.button(x,fy,'<',()=>{ui.bodyPage--;ui.render();},ui.bodyPage>0);
  ui.drawing.text(x+62,fy+8,`${ui.bodyPage+1}/${pages}`,13,'#696c59');
  ui.drawing.button(x+122,fy,'>',()=>{ui.bodyPage++;ui.render();},ui.bodyPage<pages-1);
 };
}
