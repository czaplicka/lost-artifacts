import { gameState } from '../../GameData.js';
import { acceptPIQuestFromAdvert } from '../../managers/PIQuestManager.js';
import { getCurrentTownId } from '../../managers/RoadTripManager.js';
import { readTableForThree, dispatchTableForThree } from '../../managers/TableForThreeService.js';
import { installTableForThreeArrivalTracking } from '../../managers/TableForThreeLocations.js';
import { BusinessCenterScene } from '../../scenes/BusinessCenterScene.js';
import { TableForThreeCompanyScene } from '../../scenes/TableForThreeCompanyScene.js';
import { TableForThreeRestaurantScene } from '../../scenes/TableForThreeRestaurantScene.js';
import { TABLE_FOR_THREE_CONTENT as C } from '../../assets/data/tableForThreeContent.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../../config/TableForThreeLocations.js';
import { CASE_ID } from '../../managers/TableForThreeModel.js';

const AD='table_for_three_development_ad',MAIL='table_for_three_client_briefing';
const quest=()=>gameState.piQuests?.quests?.[CASE_ID];
let extended=false;
function installBusinessCenterEntry(){
  if(extended)return;extended=true;
  const original=BusinessCenterScene.prototype.reception;
  BusinessCenterScene.prototype.reception=function(...args){
    if(!quest()||getCurrentTownId()!==L.company.townId)return original.apply(this,args);
    this.show('Business Center reception','Which office are you visiting?',[
      [L.company.name,()=>{
        this.closePanel(false);
        if(!this.game.scene.keys[L.company.sceneKey])this.game.scene.add(L.company.sceneKey,TableForThreeCompanyScene,false);
        void this.goto(L.company.sceneKey).catch(error=>console.error('[TableForThree] Company:',error));
      }],
      ['OTHER BUILDING SERVICES',()=>original.apply(this,args)]
    ]);
  };
}
function registerBuildData(scene){
  const cache=scene.cache.json;
  const cases=cache.get('piCases'),classifieds=cache.get('piOfficeClassifieds');
  if(!Array.isArray(cases?.cases)||!Array.isArray(classifieds?.advertisements))return false;
  if(!cases.cases.some(c=>c.id===CASE_ID)){
    cache.remove('piCases');cache.add('piCases',{...cases,cases:[...cases.cases,{
      id:CASE_ID,kind:'side',title:'Table for Three — development build',
      description:'Investigate unexplained late evenings. Company and travel chapter available; restaurant finale under development.',
      requiresBoard:false,reward:0,objectives:[{id:'briefing',text:'Read the client briefing.'}],
      metadata:{implementedStage:'company_and_travel',developmentOnly:true}
    }]});
  }
  if(!classifieds.advertisements.some(a=>a.id===AD)){
    cache.remove('piOfficeClassifieds');cache.add('piOfficeClassifieds',{...classifieds,advertisements:[...classifieds.advertisements,{
      id:AD,kind:'pi',missionId:CASE_ID,title:'Table for Three — development build',contact:'A concerned husband',reward:0,requiresItem:'camera',
      description:'My wife says she is working late. Her office says otherwise. Development chapter: company investigation and local drive only. No payout in this build.'
    }]});
  }
  return true;
}
export function installTableForThreeComputer(ui,documents){
  installTableForThreeArrivalTracking();installBusinessCenterEntry();
  for(const [key,Class] of [[L.company.sceneKey,TableForThreeCompanyScene],[L.restaurant.sceneKey,TableForThreeRestaurantScene]])if(!ui.scene.game.scene.keys[key])ui.scene.game.scene.add(key,Class,false);
  const oldMail=documents.getMail,oldAds=documents.getClassifieds,oldRender=documents.render,oldPaged=documents.renderPagedText;
  let disposed=false;
  const viewing=()=>ui.app==='mail'&&ui.selectedId===MAIL&&!!quest();
  const mail=function(...args){
    const rows=(oldMail.apply(this,args)||[]).filter(m=>m.id!==MAIL);
    return quest()?[{id:MAIL,from:'A concerned husband',subject:'Table for Three — late evenings',date:'Case correspondence',
      body:C.briefing.join('\n\n')+'\n\nHer employer is XYZ Consulting, in the Business Center in Home Town. Begin there.\n\nDevelopment build: company and travel chapter. No reward is paid in this build.'},...rows]:rows;
  };
  const ads=function(...args){
    registerBuildData(ui.scene);
    const rows=oldAds.apply(this,args)||[];
    if(quest())return rows.filter(a=>a.missionId!==CASE_ID);
    if(rows.some(a=>a.missionId===CASE_ID))return rows;
    const ad=ui.scene.cache.json.get('piOfficeClassifieds')?.advertisements?.find(a=>a.id===AD);
    return ad?[...rows,ad]:rows;
  };
  const paged=function(body,x,y,w,h){return oldPaged.call(this,body,x,y,w,Math.max(40,h-(viewing()?64:0)));};
  const render=function(...args){
    const result=oldRender.apply(this,args);
    if(viewing()&&ui.window){const b=ui.window;ui.drawing.button(b.x+312,b.y+b.h-108,'RECORD CLIENT BRIEFING',()=>{
      const s=readTableForThree();
      if(s&&!s.briefingRead){const r=dispatchTableForThree({type:'READ_BRIEFING'});if(!r.ok){ui.notice=r.reason;ui.render();return;}}
      ui.notice='Visit the Business Center on the Home Town map and ask reception for XYZ Consulting.';ui.render();
    });}
    return result;
  };
  const previousAccept=ui.options.onAcceptMission;
  const accept=async function(advert){
    if(advert?.missionId!==CASE_ID)return previousAccept?.call(this,advert);
    if(!registerBuildData(ui.scene))return {ok:false,message:'PI case data has not loaded yet.'};
    return acceptPIQuestFromAdvert(ui.scene,AD);
  };
  ui.options.onAcceptMission=accept;
  documents.getMail=mail;documents.getClassifieds=ads;documents.render=render;documents.renderPagedText=paged;
  const destroy=()=>{
    if(disposed)return;disposed=true;
    if(documents.getMail===mail)documents.getMail=oldMail;
    if(documents.getClassifieds===ads)documents.getClassifieds=oldAds;
    if(documents.render===render)documents.render=oldRender;
    if(documents.renderPagedText===paged)documents.renderPagedText=oldPaged;
    if(ui.options.onAcceptMission===accept)ui.options.onAcceptMission=previousAccept;
    ui.scene.events.off('shutdown',destroy);
  };
  ui.scene.events.once('shutdown',destroy);return {destroy};
}
