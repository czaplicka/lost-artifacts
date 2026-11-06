import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

export function syncNotebookSearchCase(ui,caseId,state=gameState,save=requestAutosave) {
  const search=ui?.search;
  if (!search || typeof caseId!=='string' || !search.data?.cases?.some(c=>c.id===caseId)) return false;
  const progress=state.piKeywordSearch || {cases:{}};
  const searching=ui.app==='search';
  const previous=search._notebookBoundCaseId ?? progress.selectedCaseId ?? null;
  const changed=searching && (previous!==caseId || progress.selectedCaseId!==caseId);
  let persist=false;
  if (searching && progress.selectedCaseId!==caseId) {
    state.piKeywordSearch={...progress,selectedCaseId:caseId};persist=true;
  }
  if (state.playerCloudViewV1?.selectedCaseId!==caseId) {
    state.playerCloudViewV1={...(state.playerCloudViewV1 || {}),selectedCaseId:caseId};persist=true;
  }
  if (searching) search._notebookBoundCaseId=caseId;
  if (changed) Object.assign(search,{
    terms:[],submitted:[],results:[],view:'home',pageId:null,
    resultPage:0,bodyPage:0,notePage:0,trail:[],tip:''
  });
  if (persist) save();
  return changed;
}
