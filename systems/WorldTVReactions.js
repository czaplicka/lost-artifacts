import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  latestWorldNewspaperEvent,
  worldNewspaperArticle
} from './WorldReactionModel.js';

export function getWorldTVUpdate(state,cityId){
  const local=latestWorldNewspaperEvent(state,cityId);
  const latest=latestWorldNewspaperEvent(state,'hq');
  if(latest&&state.currentCaseId!=null&&String(latest.caseId)===String(state.currentCaseId))return latest;
  return local||latest;
}

export function buildWorldTVSegment(event,cityConfig,tvConfig={}){
  if(!event||event.visibility!=='public')return null;
  const article=worldNewspaperArticle(event);
  const template=(tvConfig.storySegments||[]).find(segment=>segment.id==='news-main')||{};
  return{
    id:`world-tv:${event.id}`,type:'news',worldEventId:event.id,worldCaseId:event.caseId,
    worldOutcome:event.kind,title:article.headline,
    anchorName:cityConfig.reporterName||cityConfig.anchorName,
    label:__dialogueText("systems/WorldTVReactions.js", "t_e3a112c078c2633766e0"),badge:'UPDATE',channel:cityConfig.channel,
    charDelay:template.charDelay||17,linePause:template.linePause||260,hold:template.hold||1400,
    theme:{...(template.theme||{})},
    backgroundKey:cityConfig.backgroundKey,presenterKey:cityConfig.presenterKey,
    // Archive facts describe this event, never the next active mission.
    caseFacts:{
      caseId:event.caseId,artifact:event.artifact||null,city:event.cityName||null,
      worldEventId:event.id,outcome:event.kind,
      publicClue:null,missionClue:null
    },
    lines:[article.headline+__dialogueText("systems/WorldTVReactions.js", "t_cdb4ee2aea69cc6a8333"),article.lead,article.body]
  };
}
