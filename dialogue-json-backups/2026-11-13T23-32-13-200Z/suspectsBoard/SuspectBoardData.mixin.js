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
    const labLabel=labComplete?'LAB: COMPLETE':results.length?`LAB: ${results.length}/3`:'LAB: PENDING';
    const theory=this.gameState.reconstructedHeist?.playerTheoryResult;
    const methodRecorded=summary.hypothesisCompleted||['exact','partial','weak'].includes(theory);
    this.summaryText?.setText(`FILES: ${suspects.length}   ACTIVE: ${suspects.length-cleared}   CLEARED: ${cleared}   ${labLabel}   METHOD: ${methodRecorded?'RECORDED':'PENDING'}`);
    if(this.exclusionFinished) {
      this.modeHintText?.setText('Evidence Grid submitted. Alibi contacts are available in Crime City.');return;
    }
    if(this.excludeMode) {
      this.modeHintText?.setText('Review the evidence and file notes. Exclusions are your decision.');return;
    }
    if(!results.length) {
      this.modeHintText?.setText('No completed lab reports. Complete an analysis to review its findings.');return;
    }
    const labels=[...new Set(results.map(r=>this.formatEvidenceField?.(r.field)||r.label))];
    this.modeHintText?.setText(`LAB RESULTS: ${labels.join(' / ')}. Open a file or report to review the details.`);
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
    this.pageText?.setText(`PAGE ${this.currentPage+1}/${count}`);
    if(this.previousPageButton)this.setButtonEnabled(this.previousPageButton,this.currentPage>0);
    if(this.nextPageButton)this.setButtonEnabled(this.nextPageButton,this.currentPage<count-1);
  },
  clearContainer(container) {
    if(!container)return;
    // removeAll(true) destroys children once, including their local listeners.
    container.removeAll(true);
  }
};
