export const CASE_ID='pi_short_shorts';
export const VERSION=1;
export const LIFT_ID='short_shorts_lift';
export const FACE_ID='short_shorts_face';
export const STAGES=Object.freeze({BRIEFING:'briefing',TRAVEL:'travel',OBSERVATION:'observation',REPORT:'report',REPLY:'reply',CLOSED:'closed'});
export const ENDINGS=Object.freeze(['deliver','spare']);
export function createCaseState(){
  return {version:VERSION,stage:STAGES.BRIEFING,briefingRead:false,arrived:false,cameraChecked:false,
    phase:'idle',event:0,liftPhoto:null,facePhoto:null,ending:null,replyRead:false,sequence:0,history:[]};
}
function failure(state,reason){return {ok:false,reason,state};}
function requirement(condition,message){if(!condition)throw new Error(message);}
function photo(record,kind,sequence,event){
  requirement(record&&typeof record.evidenceId==='string'&&record.evidenceId.length>0,'A captured evidence record is required.');
  requirement(record.kind===kind,'Wrong photograph type.');
  requirement(record.validated===true,'The scene must validate the framing first.');
  return {evidenceId:record.evidenceId,kind,sequence,event};
}
export function getObjectives(state,existing){
  const base=Array.isArray(existing)&&existing.length?existing:[
    {id:'photograph_lifting',text:'Photograph Subject #4 lifting an object over 50kg.'},
    {id:'photograph_face',text:'Photograph his face while he does it.'},
    {id:'deliver_evidence',text:'Deliver both photographs to Ray Kolpon.'}];
  const done={photograph_lifting:!!state.liftPhoto,photograph_face:!!state.facePhoto,deliver_evidence:!!state.ending};
  return base.map(o=>Object.prototype.hasOwnProperty.call(done,o.id)?{...o,completed:done[o.id]}:{...o});
}
export function transition(input,action,context={}){
  if(!input||input.version!==VERSION)return failure(input,'Unsupported case state.');
  const s=structuredClone(input),next=s.sequence+1;
  try{
    requirement(action&&typeof action.type==='string','Missing action.');
    requirement(s.stage!==STAGES.CLOSED,'This case is already closed.');
    switch(action.type){
      case 'READ_BRIEFING':
        requirement(s.stage===STAGES.BRIEFING,'Briefing already read.');
        s.briefingRead=true;s.stage=STAGES.TRAVEL;break;
      case 'ARRIVE':
        requirement(s.stage===STAGES.TRAVEL,'Read the briefing first.');
        requirement(context.inTown===true,'Drive to the observation town first.');
        s.arrived=true;s.stage=STAGES.OBSERVATION;break;
      case 'CHECK_CAMERA':
        requirement(s.stage===STAGES.OBSERVATION&&context.hasCamera===true,'Bring the PI camera.');
        s.cameraChecked=true;break;
      case 'START_LIFT':
        requirement(s.stage===STAGES.OBSERVATION&&s.cameraChecked,'Check your camera first.');
        requirement(s.phase==='idle','Gus is already lifting.');
        s.phase='lift';s.event+=1;break;
      case 'SHOW_FACE':
        requirement(s.stage===STAGES.OBSERVATION&&s.phase==='lift','Wait for Gus to lift something.');
        s.phase='face';break;
      case 'REST':
        requirement(s.stage===STAGES.OBSERVATION&&(s.phase==='lift'||s.phase==='face'),'Gus is not lifting.');
        s.phase='idle';if(!s.facePhoto)s.liftPhoto=null;break;
      case 'PHOTOGRAPH_LIFT':
        requirement(s.stage===STAGES.OBSERVATION&&s.phase==='lift','Wait until the refrigerator is in the air.');
        requirement(!s.liftPhoto,'The lift is already photographed.');
        s.liftPhoto=photo(action.photo,'lift',next,s.event);break;
      case 'PHOTOGRAPH_FACE':
        requirement(s.stage===STAGES.OBSERVATION&&s.phase==='face','Wait until his face appears.');
        requirement(s.liftPhoto&&s.liftPhoto.event===s.event,'Photograph the same lift first.');
        requirement(!s.facePhoto,'The face is already photographed.');
        s.facePhoto=photo(action.photo,'face',next,s.event);s.stage=STAGES.REPORT;s.phase='idle';break;
      case 'CHOOSE_ENDING':
        requirement(s.stage===STAGES.REPORT&&s.liftPhoto&&s.facePhoto,'Both photographs are required.');
        requirement(ENDINGS.includes(action.ending),'Choose a valid ending.');
        requirement(!s.ending,'The ending is already chosen.');
        s.ending=action.ending;s.stage=STAGES.REPLY;break;
      case 'READ_REPLY':
        requirement(s.stage===STAGES.REPLY&&s.ending,'There is no reply to read yet.');
        s.replyRead=true;s.stage=STAGES.CLOSED;break;
      default:throw new Error('Unknown action: '+action.type);
    }
    s.sequence=next;s.history.push({sequence:next,type:action.type});
    return {ok:true,state:s,reason:null};
  }catch(error){return failure(input,error.message);}
}
