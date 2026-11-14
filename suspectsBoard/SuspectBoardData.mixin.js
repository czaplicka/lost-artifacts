import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// suspectsBoard/SuspectBoardData.mixin.js
import {getPublicSuspectList,getSuspectCaseSummary} from '../ui/suspectUtils.js';

export const SuspectBoardDataMixin = {
  getAllSuspects() {
    try{return getPublicSuspectList();}
    catch(error){console.error('[SuspectsScene] Could not load suspect list.',error);return[];}
  },
  getFilteredSuspects() {
    const suspects=this.getAllSuspects();
    if(this.filterMode==='active')return suspects.filter(s=>!s.deductionState?.eliminated);
    if(this.filterMode==='eliminated')return suspects.filter(s=>s.deductionState?.eliminated);
    return suspects;
  },
  getCardsPerPage() {
    return typeof this.getSuspectCardsLayout==='function'?this.getSuspectCardsLayout().cardsPerPage:4;
  },
  getPageCount() {
    return Math.max(1,Math.ceil(this.getFilteredSuspects().length/this.getCardsPerPage()));
  },
  getVisibleSuspects() {
    const suspects=this.getFilteredSuspects(),perPage=this.getCardsPerPage();
    const pages=Math.max(1,Math.ceil(suspects.length/perPage));
    this.currentPage=Math.max(0,Math.min(Number.isInteger(this.currentPage)?this.currentPage:0,pages-1));
    return suspects.slice(this.currentPage*perPage,(this.currentPage+1)*perPage);
  },
  refreshBoard() {
    this.clearContainer(this.cardsContainer);this.clearContainer(this.detailsContainer);
    const visible=this.getVisibleSuspects();
    if(!visible.some(s=>s.id===this.selectedSuspectId))this.selectedSuspectId=visible[0]?.id||null;
    this.updateHeader();this.updateFilterButtonStyles();this.renderSuspectCards(visible);
    this.renderDetailsPanel();this.updatePagination();
  },
  updateHeader() {
    const suspects=this.getAllSuspects(),cleared=suspects.filter(s=>s.deductionState?.eliminated===true).length;
    let summary={hypothesisCompleted:false};
    try{summary=getSuspectCaseSummary();}catch(error){console.warn('[SuspectsScene] Summary unavailable.',error);}
    const results=typeof this.getCompletedCrimeLabResults==='function'?this.getCompletedCrimeLabResults():[];
    const labComplete=this.getCrimeLabCompleted?.()===true;
    const labLabel=labComplete?__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_5c88c43a0421003fa93a"):results.length?`${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_5549929b5e54118ce170")}${results.length}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_8d2cedfe81c77aaa05d9")}`:__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_8ee2e444c1aa05fb32d0");
    const theory=this.gameState.reconstructedHeist?.playerTheoryResult;
    const methodRecorded=summary.hypothesisCompleted||['exact','partial','weak'].includes(theory);
    this.summaryText?.setText(`${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_1550a552e9217295d875")}${suspects.length}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_2cdb95b90965eceb07e6")}${suspects.length-cleared}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_41a443aaeb8d0584f454")}${cleared}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_0aad7da77d2ed59c396c")}${labLabel}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_531704e3c8ce4550cbb7")}${methodRecorded?__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_1c606415d06b78f08ab0"):__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_332011b91ccd9887592c")}`);
    if(this.exclusionFinished) {
      this.modeHintText?.setText(__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_f803f2fc9f03621507d6"));return;
    }
    if(this.excludeMode) {
      this.modeHintText?.setText(__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_c8fdd9a5df3a20cb2f69"));return;
    }
    if(!results.length) {
      this.modeHintText?.setText(__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_e8971d6c42baa1b8b713"));return;
    }
    const labels=[...new Set(results.map(r=>this.formatEvidenceField?.(r.field)||r.label))];
    this.modeHintText?.setText(`${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_954ba519d13259994dce")}${labels.join(__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_005e1574a2b5c8163046"))}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_2ddcb29fe7b3bb0e8f14")}`);
  },
  updateFilterButtonStyles() {
    (this.filterButtons||[]).forEach(button=>{
      button.isActive=button.filterId===this.filterMode;button.applyStyle?.();
      this.setButtonEnabled(button,!this.excludeMode);
    });
  },
  getSuspectFileNumber(suspectId) {
    const index=this.getAllSuspects().findIndex(s=>s.id===suspectId);
    return index<0?'--':String(index+1).padStart(2,'0');
  },
  updatePagination() {
    const count=this.getPageCount(),multiple=count>1;
    this.previousPageButton?.setVisible(multiple);this.nextPageButton?.setVisible(multiple);this.pageText?.setVisible(multiple);
    if(!multiple)return;
    this.pageText?.setText(`${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_f8119b8ecd8507346fa7")}${this.currentPage+1}${__dialogueText("suspectsBoard/SuspectBoardData.mixin.js", "t_8a5edab282632443219e")}${count}`);
    if(this.previousPageButton)this.setButtonEnabled(this.previousPageButton,this.currentPage>0);
    if(this.nextPageButton)this.setButtonEnabled(this.nextPageButton,this.currentPage<count-1);
  },
  clearContainer(container) {
    if(!container)return;
    // removeAll(true) destroys children once, including their local listeners.
    container.removeAll(true);
  }
};
