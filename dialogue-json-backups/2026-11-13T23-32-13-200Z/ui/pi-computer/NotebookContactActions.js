import { gameState } from '../../GameData.js';
import { playComputerUiClick } from './ComputerUiAudio.js';
const INSTALLATION=Symbol.for('lostArtifacts.notebookContactActions');
const asText=value=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
export function notebookContact(keyword,numberLength=3){
 const label=asText(keyword?.label);
 const email=[keyword?.email,label,keyword?.value].map(asText).map(value=>
  value.match(/[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+/)?.[0]
 ).find(Boolean);
 if(email)return{kind:'email',value:email};
 const digits=new RegExp(`^\d{${numberLength}}$`);
 for(const value of[keyword?.number,keyword?.phone,keyword?.telephone]){
  const number=asText(value).replace(/^tel:/i,'').replace(/[\s()-]/g,'');if(digits.test(number))return{kind:'phone',value:number};
 }
 const number=label.match(new RegExp(`^(?:tel(?:ephone)?|phone)?\s*:?\s*(\d{${numberLength}})(?=$|\s*[—–-])`,'i'))?.[1];
 if(number)return{kind:'phone',value:number};
 if(/(?:phone|telephone|number|_tel)(?:_|$)/i.test(keyword?.id||'')){
  const value=asText(keyword?.value);if(digits.test(value))return{kind:'phone',value};
  const match=label.match(new RegExp(`(?:^|[^\d])(\d{${numberLength}})(?!\d)`));
  if(match&&!/\d:\d/.test(label))return{kind:'phone',value:match[1]};
 }
 return null;
}
export function installNotebookContactActions(ui){
 if(ui[INSTALLATION])return ui[INSTALLATION];
 let dead=false,busy=false,serial=0;const restorers=[];
 const live=()=>!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting&&ui.scene.sys.isActive();
 const known=(definition,keyword)=>(gameState.piKeywordSearch?.cases?.[definition.id]?.known||[]).includes(keyword.id);
 const length=()=>Number(ui.scene.cache.json.get('piPhoneDirectory')?.numberLength)||3;
 const notice=message=>{if(live()){ui.notice=message;ui.render();}};
 async function openEmail(definition,keyword){
  const mail=ui.photoQuest?.contactMail;
  if(!mail||typeof mail.openComposer!=='function'){notice('The mail application is unavailable.');return;}
  ui.openApp('mail');ui.search.selectCase(definition.id);
  const opening=mail.openComposer(),token=ui.viewToken;await opening;
  if(!live()||ui.app!=='mail'||!mail.composing||ui.viewToken!==token)return;
  ui.search.selectKeyword(keyword.id);
 }
 async function openPhone(contact,definition,keyword){
  const scene=ui.scene,phone=scene.phoneUI;
  if(!phone||phone.destroyed||typeof scene.openPhone!=='function'||typeof phone.pickUp!=='function'||typeof phone.startCall!=='function'){
   notice('The office phone is unavailable.');return;
  }
  if(scene.navigating||scene.disposed||scene.debugMode){notice('The phone cannot be opened right now.');return;}
  ui.close();scene.openPhone();
  if(!phone.isOpen||phone.destroyed){scene.openComputer?.();notice('The phone could not be opened. Please try again.');return;}
  const run=phone.run;await phone.investigation?.load();
  if(dead||phone.destroyed||!phone.isOpen||phone.run!==run||phone.state!=='on_hook')return;
  const target=phone.contacts.find(item=>String(item.number)===contact.value)||{number:contact.value,name:keyword.contactName||keyword.label||contact.value};
  phone.pickContact(target);phone.pickUp();if(phone.state!=='ready')return;phone.number=contact.value;phone.startCall();
 }
 async function activate(definition,keyword){
  if(!live()||busy||ui.caseCloudNotebook?.collapsed||!known(definition,keyword))return;
  const contact=notebookContact(keyword,length());if(!contact)return;
  const request=++serial;busy=true;playComputerUiClick(ui);
  try{if(contact.kind==='email')await openEmail(definition,keyword);else await openPhone(contact,definition,keyword);}
  catch(error){console.error('[NotebookContactActions] Could not open contact:',error);notice('This contact could not be opened. Please try again.');}
  finally{if(request===serial)busy=false;}
 }
 function bind(){
  if(!live()||ui.caseCloudNotebook?.collapsed)return;
  const paper=ui.root?.list?.find(container=>Array.isArray(container.list)&&container.list.some(child=>child.text==='PRIVATE INVESTIGATIONS'));
  if(!paper?.visible)return;
  const definitions=ui.search.data?.cases||[],titles=new Set(paper.list.filter(item=>typeof item.text==='string').map(item=>item.text));
  const displayed=definitions.filter(definition=>titles.has(definition.title));if(displayed.length!==1)return;
  const definition=displayed[0];
  for(const label of paper.list){
   if(typeof label.text!=='string'||typeof label.setInteractive!=='function')continue;
   const keyword=definition.keywords.find(item=>item.label===label.text&&known(definition,item));
   if(!keyword||!notebookContact(keyword,length()))continue;
   const enabled=!label.input||label.input.enabled!==false;
   label.setColor('#183b63');label.removeAllListeners('pointerdown');label.setInteractive({useHandCursor:true});label.input.enabled=enabled;
   label.on('pointerdown',(pointer,localX,localY,event)=>{
    event?.stopPropagation();if(label.active===false||!label.scene||!paper.visible||paper.active===false)return;
    void activate(definition,keyword);
   });
  }
 }
 const host=ui.monitor,original=host.render;
 const wrapped=function(...args){const result=original.apply(this,args);bind();return result;};host.render=wrapped;
 restorers.push(()=>{if(host.render===wrapped)host.render=original;});
 function destroy(){
  if(dead)return;dead=true;busy=false;serial++;
  ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);
  for(const restore of restorers.reverse())restore();if(ui[INSTALLATION]===api)delete ui[INSTALLATION];
 }
 const api={destroy};ui[INSTALLATION]=api;ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);return api;
}
