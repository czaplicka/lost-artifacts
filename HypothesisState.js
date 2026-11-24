function positiveInteger(value, fallback, maximum=Number.MAX_SAFE_INTEGER) {
  const number=Number(value);
  return Number.isFinite(number)&&number!==0?Math.max(1,Math.min(maximum,Math.floor(number))):fallback;
}

export class HypothesisState {
  constructor({reconstruction=null,activeSlotCount=3,attempts=3}={}) {
    this.reconstruction=reconstruction&&typeof reconstruction==='object'&&!Array.isArray(reconstruction)?reconstruction:{};
    this.activeSlotCount=positiveInteger(activeSlotCount,3,3);
    this.maxAttempts=positiveInteger(attempts,3);
    this.cards=[];
    this.reset();
  }
  reset() {
    this.placedCards=new Array(this.activeSlotCount).fill(null);
    this.slotFeedback=new Array(this.activeSlotCount).fill('neutral');
    this.attemptsLeft=this.maxAttempts;
    this.lockedSlots=new Set();
    this.selectedSlotIndex=null; this.selectedCardIndex=null; this.uiLocked=false;
    this.syncAttemptsToReconstruction();
  }
  setActiveSlotCount(activeSlotCount) {
    const nextCount=positiveInteger(activeSlotCount,3,3);
    if (nextCount===this.activeSlotCount) return;
    this.activeSlotCount=nextCount; this.reset();
  }
  setCards(cards=[]) {
    const snapshot=this.getSnapshot();
    this.cards=Array.isArray(cards)?cards:[];
    // Revalidate missing/duplicate positions while preserving valid live feedback.
    this.restoreSnapshot(snapshot);
    this.slotFeedback=this.slotFeedback.map((status,index)=>{
      if (this.isSlotLocked(index)) return 'green';
      const previous=snapshot.slotFeedback[index];
      return this.isValidCard(this.placedCards[index])&&this.placedCards[index]===snapshot.placedCards[index]&&
        ['neutral','green','yellow','red'].includes(previous)?previous:status;
    });
  }
  getCard(cardIndex) {
    if (!Number.isInteger(cardIndex)) return null;
    return this.cards?.[cardIndex]||null;
  }
  getPlacedCardIndex(slotIndex) {
    return this.isValidSlot(slotIndex)?this.placedCards[slotIndex]:null;
  }
  getPlacedCard(slotIndex) {
    const cardIndex=this.getPlacedCardIndex(slotIndex);
    return cardIndex===null?null:this.getCard(cardIndex);
  }
  getOrderedCards() {return this.placedCards.map(cardIndex=>this.getCard(cardIndex));}
  getCardSlot(cardIndex) {return this.isValidCard(cardIndex)?this.placedCards.indexOf(cardIndex):-1;}
  isValidSlot(slotIndex) {return Number.isInteger(slotIndex)&&slotIndex>=0&&slotIndex<this.activeSlotCount;}
  isValidCard(cardIndex) {
    return Number.isInteger(cardIndex)&&cardIndex>=0&&Array.isArray(this.cards)&&
      cardIndex<this.cards.length&&Boolean(this.cards[cardIndex]);
  }
  isSlotLocked(slotIndex) {return this.isValidSlot(slotIndex)&&this.lockedSlots.has(slotIndex);}
  isSlotEmpty(slotIndex) {return this.isValidSlot(slotIndex)&&this.placedCards[slotIndex]===null;}
  isCardPlaced(cardIndex) {return this.getCardSlot(cardIndex)!==-1;}
  isTimelineComplete() {
    return Array.isArray(this.placedCards)&&this.placedCards.length===this.activeSlotCount&&Array.from(this.placedCards).every(index=>this.isValidCard(index))&&
      new Set(this.placedCards).size===this.activeSlotCount;
  }
  getFirstAvailableSlot() {
    return this.placedCards.findIndex((cardIndex,slotIndex)=>cardIndex===null&&!this.isSlotLocked(slotIndex));
  }
  selectCard(cardIndex) {
    if (this.uiLocked) return {ok:false,reason:'ui_locked'};
    if (!this.isValidCard(cardIndex)) return {ok:false,reason:'invalid_card'};
    if (this.isCardPlaced(cardIndex)) return {ok:false,reason:'card_already_used',cardIndex,slotIndex:this.getCardSlot(cardIndex)};
    if (this.selectedCardIndex===cardIndex) {
      this.selectedCardIndex=null; this.selectedSlotIndex=null;
      return {ok:true,selected:false,cardIndex};
    }
    this.selectedCardIndex=cardIndex; this.selectedSlotIndex=null;
    return {ok:true,selected:true,cardIndex};
  }
  clearSelectedCard() {this.selectedCardIndex=null;}
  placeSelectedCard(slotIndex) {
    if (this.uiLocked) return {ok:false,reason:'ui_locked'};
    if (!this.isValidSlot(slotIndex)) return {ok:false,reason:'invalid_slot'};
    if (this.isSlotLocked(slotIndex)) return {ok:false,reason:'slot_locked',slotIndex};
    if (!this.isSlotEmpty(slotIndex)) return {ok:false,reason:'slot_occupied',slotIndex,cardIndex:this.placedCards[slotIndex]};
    const cardIndex=this.selectedCardIndex;
    if (!this.isValidCard(cardIndex)) return {ok:false,reason:'no_card_selected'};
    if (this.isCardPlaced(cardIndex)) {
      this.selectedCardIndex=null;
      return {ok:false,reason:'card_already_used',cardIndex,slotIndex:this.getCardSlot(cardIndex)};
    }
    this.placedCards[slotIndex]=cardIndex; this.slotFeedback[slotIndex]='neutral';
    this.selectedCardIndex=null; this.selectedSlotIndex=null;
    this.resetUnlockedFeedback();
    return {ok:true,action:'placed',cardIndex,slotIndex};
  }
  toggleSelectedSlot(slotIndex) {
    if (this.uiLocked) return {ok:false,reason:'ui_locked',selectedSlotIndex:this.selectedSlotIndex};
    if (!this.isValidSlot(slotIndex)||this.isSlotLocked(slotIndex)||!this.isSlotEmpty(slotIndex)) {
      return {ok:false,reason:'slot_unavailable',selectedSlotIndex:this.selectedSlotIndex};
    }
    this.selectedSlotIndex=this.selectedSlotIndex===slotIndex?null:slotIndex;
    return {ok:true,selectedSlotIndex:this.selectedSlotIndex,selected:this.selectedSlotIndex===slotIndex};
  }
  clearSelectedSlot() {this.selectedSlotIndex=null;}
  removeCard(slotIndex) {
    if (this.uiLocked) return {ok:false,reason:'ui_locked'};
    if (!this.isValidSlot(slotIndex)) return {ok:false,reason:'invalid_slot'};
    if (this.isSlotLocked(slotIndex)) return {ok:false,reason:'slot_locked',slotIndex};
    const cardIndex=this.placedCards[slotIndex];
    if (cardIndex===null) return {ok:false,reason:'slot_empty',slotIndex};
    this.placedCards[slotIndex]=null; this.slotFeedback[slotIndex]='neutral';
    this.selectedCardIndex=null; this.selectedSlotIndex=null;
    this.resetUnlockedFeedback();
    return {ok:true,cardIndex,slotIndex};
  }
  setFeedback(feedback=[]) {
    const values=Array.isArray(feedback)?feedback:[];
    this.slotFeedback=new Array(this.activeSlotCount).fill('red').map((fallback,index)=>
      ['neutral','green','yellow','red'].includes(values[index])?values[index]:fallback);
    return [...this.slotFeedback];
  }
  lockGreenSlots(feedback=this.slotFeedback) {
    const newlyLockedSlotIndexes=[];
    if (!Array.isArray(feedback)) return newlyLockedSlotIndexes;
    feedback.forEach((status,slotIndex)=>{
      if (status==='green'&&this.isValidSlot(slotIndex)&&this.isValidCard(this.placedCards[slotIndex])&&!this.isSlotLocked(slotIndex)) {
        this.lockedSlots.add(slotIndex); this.slotFeedback[slotIndex]='green';
        newlyLockedSlotIndexes.push(slotIndex);
      }
    });
    return newlyLockedSlotIndexes;
  }
  resetUnlockedFeedback() {
    this.slotFeedback=this.slotFeedback.map((status,slotIndex)=>this.isSlotLocked(slotIndex)?'green':'neutral');
  }
  consumeAttempt() {
    if (this.attemptsLeft<=0) return 0;
    this.attemptsLeft-=1; this.syncAttemptsToReconstruction(); return this.attemptsLeft;
  }
  setAttemptsLeft(attemptsLeft) {
    const number=Number(attemptsLeft);
    this.attemptsLeft=Number.isFinite(number)?Math.max(0,Math.min(this.maxAttempts,Math.floor(number))):0;
    this.syncAttemptsToReconstruction();
  }
  setUiLocked(locked=true) {
    this.uiLocked=Boolean(locked);
    if (this.uiLocked) {this.selectedCardIndex=null;this.selectedSlotIndex=null;}
  }
  getSnapshot() {
    return {activeSlotCount:this.activeSlotCount,placedCards:[...this.placedCards],slotFeedback:[...this.slotFeedback],
      attemptsLeft:this.attemptsLeft,lockedSlots:[...this.lockedSlots],selectedSlotIndex:this.selectedSlotIndex,
      selectedCardIndex:this.selectedCardIndex,uiLocked:this.uiLocked};
  }
  restoreSnapshot(snapshot={}) {
    const data=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?snapshot:{};
    const placed=Array.isArray(data.placedCards)?data.placedCards:[],seen=new Set();
    this.placedCards=new Array(this.activeSlotCount).fill(null).map((_,index)=>{
      const cardIndex=placed[index];
      if (!this.isValidCard(cardIndex)||seen.has(cardIndex)) return null;
      seen.add(cardIndex); return cardIndex;
    });
    this.setFeedback(Array.isArray(data.slotFeedback)?data.slotFeedback:[]);
    this.lockedSlots=new Set((Array.isArray(data.lockedSlots)?data.lockedSlots:[]).filter(slotIndex=>
      this.isValidSlot(slotIndex)&&this.isValidCard(this.placedCards[slotIndex])&&this.slotFeedback[slotIndex]==='green'));
    this.selectedSlotIndex=this.isValidSlot(data.selectedSlotIndex)&&this.isSlotEmpty(data.selectedSlotIndex)&&!this.isSlotLocked(data.selectedSlotIndex)?data.selectedSlotIndex:null;
    this.selectedCardIndex=this.isValidCard(data.selectedCardIndex)&&!this.isCardPlaced(data.selectedCardIndex)?data.selectedCardIndex:null;
    this.setAttemptsLeft(data.attemptsLeft??this.maxAttempts);
    this.setUiLocked(Boolean(data.uiLocked));
    this.resetUnlockedFeedback();
  }
  syncAttemptsToReconstruction() {
    if (this.reconstruction&&typeof this.reconstruction==='object'&&!Array.isArray(this.reconstruction)) {
      this.reconstruction.playerAttemptsLeft=this.attemptsLeft;
    }
  }
}
