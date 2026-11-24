import { dialogueText as __dialogueText } from './dialogues/DialogueText.js';
import { initCrimeBoard as initCrimeBoardCore, buildBoardLayout as buildBoardLayoutCore } from './CrimeBoardInitCore.js';
import { objectLabReportMatchesCase, getObjectLabReportCaseKey } from './crimeBoard/ObjectLabReportScope.js';
const REPORT_TAG='object-lab-report';
const text=key=>__dialogueText('CrimeBoardInit.js',key);
function asArray(value){return Array.isArray(value)?value:[];}
function asText(value,fallback=''){return typeof value==='string'&&value.trim()?value.trim():fallback;}
function isRecord(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value));}
function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
function getCurrentFindings(state){
  if(!state?.currentMission)return[];
  const seen=new Set();
  return asArray(state.crimeBoardData?.evidenceLabFindings).filter(report=>{
    if(!isRecord(report)||report.type!=='object_examination'||!asText(report.id)||!asText(report.observation)||!objectLabReportMatchesCase(state,report))return false;
    if(seen.has(report.id))return false;seen.add(report.id);return true;
  });
}
function cardId(report,kind){return 'object-lab-'+encodeURIComponent(report.id)+`-${kind}`;}
function buildReportCards(state){
  return getCurrentFindings(state).flatMap((report,index)=>{
    const name=asText(report.itemName,text('t_024e62d340f167ec1744')),location=[asText(report.cityId),asText(report.sceneId)].filter(Boolean).join(' / ');
    const row=Math.floor(index/2),column=index%2;
    const scope={caseKey:getObjectLabReportCaseKey(state,report),...(report.caseId!=null?{caseId:report.caseId}:{}),...(report.campaignId!=null?{campaignId:report.campaignId}:{})};
    const observation={id:cardId(report,'observation'),type:'note',x:80+column*640,y:850+row*440,z:6,rotation:index%2===0?-1.1:1.1,pinned:true,
      label:`${text('t_acb59bc6a0b3d5169a23')}${name}`,
      text:[text('t_a58583807dac06433c00'),asText(report.observation),'',text('t_84be82a670d02adb9950'),asText(report.limitation,text('t_fc79352a5c751403945a'))].join('\n'),
      metaText:[text('t_7ee08d149d217aa07a6e'),location].filter(Boolean).join(' — '),color:'blue',clueId:report.itemId??null,...scope,
      tags:[REPORT_TAG,'object-lab-observation'],discovered:true,createdByPlayer:false,editableByPlayer:false};
    const interpretation=asText(report.interpretation);if(!interpretation)return[observation];
    const hypothesis={id:cardId(report,'hypothesis'),type:'note',x:370+column*640,y:880+row*440,z:7,rotation:index%2===0?1.3:-1.3,pinned:true,
      label:`${text('t_6fbd2b3f4b75b7e046cd')}${name}`,
      text:[text('t_d797d4b665b3c4ba3be0'),interpretation,'',text('t_0a833eb7edf4adf4e824')].join('\n'),
      metaText:text('t_03a118390f7e29938977'),color:'yellow',clueId:report.itemId??null,...scope,
      tags:[REPORT_TAG,'object-lab-hypothesis'],discovered:true,createdByPlayer:false,editableByPlayer:false};
    return[observation,hypothesis];
  });
}
function isReportCard(item){return asArray(item?.tags).includes(REPORT_TAG);}
function restoreCardPlacement(card,previous){
  if(!previous)return card;const restored={...card};
  for(const key of ['x','y','z','rotation'])if(Number.isFinite(previous[key]))restored[key]=previous[key];
  if(typeof previous.pinned==='boolean')restored.pinned=previous.pinned;return restored;
}
function appendReports(layout,state,savedLayout=null){
  const base=clone(layout),originalItems=asArray(base.items).filter(item=>!isReportCard(item));
  const previousCards=new Map(asArray(savedLayout?.items).filter(isReportCard).map(item=>[item.id,item]));
  const reports=buildReportCards(state).map(card=>restoreCardPlacement(card,previousCards.get(card.id)));
  const items=[...originalItems,...reports],validIds=new Set(items.map(item=>item.id)),reportIds=new Set(reports.map(item=>item.id));
  const links=[],usedIds=new Set(),usedPairs=new Set();
  function addLink(link){
    if(!link||!validIds.has(link.from)||!validIds.has(link.to)||link.from===link.to)return;
    const pair=[link.from,link.to].sort().join('\u0000');if(usedPairs.has(pair)||(link.id&&usedIds.has(link.id)))return;
    links.push(clone(link));usedPairs.add(pair);if(link.id)usedIds.add(link.id);
  }
  asArray(base.links).forEach(addLink);
  // Restore player links only; never manufacture a report-to-suspect association.
  asArray(savedLayout?.links).forEach(link=>{
    if(!link||!(link.createdByPlayer||link.editableByPlayer))return;
    if(reportIds.has(link.from)||reportIds.has(link.to))addLink(link);
  });
  return{...base,meta:{...(base.meta||{}),objectLabReportsVersion:2},items,links};
}
export function buildBoardLayout(state,objectsData=[]){return appendReports(buildBoardLayoutCore(state,objectsData),state);}
export async function initCrimeBoard(options={}){
  const api=await initCrimeBoardCore(options);let state=options.gameState||{};
  api.board.loadBoard(appendReports(api.getData(),state,options.data));
  const coreRefresh=api.refresh.bind(api),coreDestroy=api.destroy.bind(api);
  return{...api,board:api.board,getData(){return api.getData();},
    refresh(nextState=state){const previousLayout=api.getData(),baseLayout=coreRefresh(nextState);state=nextState;
      const updatedLayout=appendReports(baseLayout,state,previousLayout);api.board.loadBoard(updatedLayout);return updatedLayout;},
    destroy(){coreDestroy();state=null;}};
}
