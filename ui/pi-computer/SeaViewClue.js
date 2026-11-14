import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const SEA_VIEW_KEYWORD='sea_view';
export const SEA_VIEW_LABEL=__dialogueText("ui/pi-computer/SeaViewClue.js", "t_042299b839391f6afccf");
const CASE='miramar_demo';

export function ensureSeaViewSearch(search){
  const definition=search?.data?.cases?.find(item=>item.id===CASE);
  if(!definition)return false;
  if(!definition.clouds.some(item=>item.id==='photo_view'))definition.clouds.push({id:'photo_view',title:__dialogueText("ui/pi-computer/SeaViewClue.js", "t_bd7d55b7e55862654992")});
  if(!definition.keywords.some(item=>item.id===SEA_VIEW_KEYWORD))definition.keywords.push({id:SEA_VIEW_KEYWORD,label:SEA_VIEW_LABEL,cloudId:'photo_view'});
  const targets=['mariner','coral','miramar'].filter(id=>definition.pages.some(page=>page.id===id));
  if(targets.length){
    const combinations=[[SEA_VIEW_KEYWORD]];
    if(definition.keywords.some(item=>item.id==='seahorse_logo'))combinations.push([SEA_VIEW_KEYWORD,'seahorse_logo']);
    for(const terms of combinations){
      const signature=[...terms].sort().join('|');
      if(!definition.recipes.some(recipe=>[...recipe.terms].sort().join('|')===signature))definition.recipes.push({terms,pageIds:[...targets]});
    }
  }
  return true;
}
