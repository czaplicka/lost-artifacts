// suspectsBoard/SuspectCards.mixin.js
// Read-only evidence presentation. No suspect/evidence comparisons here.
import {requestAutosave} from '../gameStatePersistence.js';
import {FIELD_BY_ALIAS} from './gridConstants.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from '../scenes/CSI/DeductionEvidenceRegistry.js';

const FILE_DATA_FIELDS = [
  {field:'hair_color',aliases:['hair_color','hairColor','hair'],label:'HAIR'},
  {field:'blood_type',aliases:['blood_type','bloodType'],label:'BLOOD'},
  {field:'biological_sex',aliases:['biological_sex','biologicalSex','sex','gender','dna_gender','dna_profile'],label:'DNA'},
  {field:'fingerprint_pattern',aliases:['fingerprint_pattern','fingerprintPattern'],label:'PRINT'},
  {field:'shoe_size_category',aliases:['shoe_size_category','shoeSizeCategory'],label:'SHOES'},
  {field:'handedness',aliases:['handedness','dominantHand','dominant_hand'],label:'HAND'},
  {field:'eye_color',aliases:['eye_color','eyeColor','eyes'],label:'EYES'},
  {field:'race',aliases:['race','ancestry'],label:'ANCESTRY'}
];
function fieldKey(value='') {
  const key=String(value||'').trim();return FIELD_BY_ALIAS.get(key)?.id||key;
}
function attributeValue(attributes,aliases) {
  for(const key of aliases) {
    const entry=attributes[key],value=entry?.value??entry;
    if(value===undefined||value===null||value==='')continue;
    if(typeof value==='object'&&!Array.isArray(value))continue;
    return value;
  }
  return null;
}
function formatScalar(field,value) {
  if(Array.isArray(value))return value.map(v=>formatScalar(field,v)).filter(Boolean).join(', ');
  if(value==null||value==='')return'';
  const normalizer=DEDUCTION_EVIDENCE_REGISTRY[field]?.normalizeEvidence;
  const normalized=normalizer?normalizer(value):value;
  return String(normalized).replace(/_/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
}
function fit(text,width,height) {
  const scale=Math.min(1,width/Math.max(1,text.width),height/Math.max(1,text.height));
  text.setScale(scale);return text;
}

export const SuspectCardsMixin = {
  getSuspectCardsLayout() {
    const {width,height}=this.scale,isMobile=width<=700,isTablet=width>700&&width<=1100;
    const top=184,bottom=height-72,availableHeight=Math.max(80,bottom-top);
    const detailsWidth=isMobile?0:isTablet?350:450;
    const sidePadding=isMobile?18:24,gap=18;
    const areaWidth=Math.max(120,width-sidePadding*2-detailsWidth-(isMobile?0:22));
    const columns=!isMobile&&areaWidth>=458?2:1;
    const rows=Math.max(1,Math.min(isMobile?3:2,Math.floor((availableHeight+16)/206)));
    const cardWidth=Math.min(isMobile?width-36:360,(areaWidth-gap*(columns-1))/columns);
    const cardHeight=Math.min(260,(availableHeight-16*(rows-1))/rows);
    const gridWidth=columns*cardWidth+(columns-1)*gap;
    return {
      top,columns,rows,cardWidth,cardHeight,gapX:gap,gapY:16,
      startX:sidePadding+(areaWidth-gridWidth)/2+cardWidth/2,
      cardsPerPage:columns*rows,isMobile
    };
  },

  renderSuspectCards(suspects=[]) {
    const L=this.getSuspectCardsLayout();
    if(!suspects.length) {
      this.emptyText?.setText('No suspect files match this filter.')
        ?.setPosition(this.scale.width/2,this.scale.height/2)?.setVisible(true);return;
    }
    this.emptyText?.setVisible(false);
    suspects.forEach((suspect,index)=>{
      const x=L.startX+(index%L.columns)*(L.cardWidth+L.gapX);
      const y=L.top+L.cardHeight/2+Math.floor(index/L.columns)*(L.cardHeight+L.gapY);
      this.cardsContainer?.add(this.createSuspectCard(suspect,x,y,L.cardWidth,L.cardHeight));
    });
  },

  getCompletedCrimeLabFields() {
    if(typeof this.getCompletedCrimeLabResults!=='function') {
      throw new Error('Install the updated SuspectDetails.mixin.js before SuspectCards.mixin.js.');
    }
    return new Set(this.getCompletedCrimeLabResults().map(result=>fieldKey(result.field)));
  },

  getVisibleFileFacts(suspect) {
    const attributes=suspect?.restrictedProfile?.forensicAttributes||{};
    const rawUnlocked=suspect?.restrictedProfile?.unlockedFields;
    const unlocked=new Set((Array.isArray(rawUnlocked)?rawUnlocked:[]).map(value=>fieldKey(
      typeof value==='string'?value:value?.field||value?.id||value?.key||''
    )).filter(Boolean));
    const completed=this.getCompletedCrimeLabFields();
    const facts=[];
    for(const definition of FILE_DATA_FIELDS) {
      const revealed=completed.has(definition.field)||unlocked.has(definition.field)||
        definition.aliases.some(alias=>attributes[alias]?.unlocked===true);
      if(!revealed)continue;
      const value=attributeValue(attributes,definition.aliases);
      if(value==null||value==='')continue;
      facts.push({field:definition.field,label:definition.label,value:formatScalar(definition.field,value)});
    }
    // Personal notes stay accessible in the full file in every case. Cards
    // summarize them when that kind of lab evidence is actually available.
    if(completed.has('dust_profile')||completed.has('material_profile')||
      unlocked.has('dust_profile')||unlocked.has('material_profile')) {
      if(typeof this.getSuspectFileSections!=='function')throw new Error('Updated dossier sections are required.');
      const sections=this.getSuspectFileSections(suspect);
      if((completed.has('dust_profile')||unlocked.has('dust_profile'))&&sections.hobbies.length) {
        facts.push({field:'dust_profile',label:'HOBBIES',value:sections.hobbies.join('; ')});
      }
      if((completed.has('material_profile')||unlocked.has('material_profile'))&&sections.personal.length) {
        facts.push({field:'material_profile',label:'PERSONAL',value:sections.personal.join('; ')});
      }
    }
    return facts;
  },

  createSuspectCard(suspect,x,y,width,height) {
    const selected=suspect.id===this.selectedSuspectId,cleared=suspect.deductionState?.eliminated===true;
    const background=cleared?0x2c211e:this.excludeMode?0x38251d:selected?0x4a3520:0x2a2018;
    const border=cleared?0x8e3d34:this.excludeMode?0xffb347:selected?0xd4af37:0x766044;
    const card=this.add.container(x,y),top=-height/2;
    const bg=this.add.rectangle(0,0,width,height,background,1)
      .setStrokeStyle(this.excludeMode||selected?3:2,border,.95).setInteractive({useHandCursor:true});
    const file=this.add.text(-width/2+12,top+10,`FILE ${this.getSuspectFileNumber(suspect.id)}`,{
      fontFamily:'PressStart2P',fontSize:'8px',color:cleared?'#d07f75':'#bba276'
    }).setOrigin(0,0);
    const name=this.add.text(0,top+30,suspect.publicProfile?.displayName||suspect.name||'Unknown',{
      fontFamily:'SpecialElite',fontSize:width<230?'20px':'25px',color:cleared?'#b8a39d':'#fff0cd',
      align:'center',wordWrap:{width:width-28,useAdvancedWrap:true}
    }).setOrigin(.5,0);
    fit(name,width-28,Math.max(22,Math.min(42,height*.22)));
    const nameBottom=name.y+name.height*(name.scaleY??name.scaleX??1);
    const occupation=this.add.text(0,nameBottom+5,suspect.publicProfile?.occupation||suspect.occupation||'Unknown role',{
      fontFamily:'SpecialElite',fontSize:'16px',color:cleared?'#9a8581':'#dfca9e',
      align:'center',wordWrap:{width:width-30,useAdvancedWrap:true}
    }).setOrigin(.5,0);
    fit(occupation,width-30,Math.min(28,height*.14));
    const dataTop=occupation.y+occupation.height*(occupation.scaleY??occupation.scaleX??1)+8;
    const data=this.createFileDataPanel(suspect,width,height,cleared,{top:dataTop,bottom:height/2-54});
    const status=this.getCardStatus(suspect);
    const statusText=this.add.text(0,height/2-14,status.label,{
      fontFamily:'PressStart2P',fontSize:'7px',color:status.color,align:'center'
    }).setOrigin(.5);fit(statusText,width-24,16);
    const open=this.add.text(0,height/2-36,'[ OPEN FILE ]',{
      fontFamily:'PressStart2P',fontSize:'7px',color:'#dcc89b',backgroundColor:'#201710',padding:{x:8,y:5}
    }).setOrigin(.5).setInteractive({useHandCursor:true});
    card.add([bg,file,name,occupation,...data,statusText,open]);
    const select=(forceDocument=false)=>{
      this.selectedSuspectId=suspect.id;this.gameState.selectedSuspectId=suspect.id;requestAutosave();
      if(forceDocument||this.scale.width<=700)this.showMobileDetails(suspect);else this.refreshBoard();
    };
    open.on('pointerdown',(p,px,py,event)=>{event?.stopPropagation();select(true);});
    bg.on('pointerover',()=>{
      if((cleared||selected)&&!this.excludeMode)return;
      bg.setFillStyle(this.excludeMode?0x5b3224:0x514027,1).setStrokeStyle(3,this.excludeMode?0xffdc73:0xd4af37,1);
    });
    bg.on('pointerout',()=>bg.setFillStyle(background,1).setStrokeStyle(this.excludeMode||selected?3:2,border,.95));
    bg.on('pointerdown',()=>{
      if(this.excludeMode){
        this.toggleSuspectExclusion(suspect.id,{playerInitiated:true,source:'suspect_card_pointerdown'});return;
      }
      select(false);
    });
    if(cleared) {
      const stamp=this.add.text(0,0,'CLEARED',{
        fontFamily:'PressStart2P',fontSize:width<230?'15px':'18px',color:'#db5750',
        stroke:'#1f0d0b',strokeThickness:5,align:'center'
      }).setOrigin(.5).setAngle(-12).setAlpha(.9).setDepth(10);
      card.add(stamp);
    }
    return card;
  },

  createFileDataPanel(suspect,width,height,isEliminated,layout={}) {
    const facts=this.getVisibleFileFacts(suspect),left=-width/2+14;
    const top=layout.top??(-height/2+108),bottom=layout.bottom??(height/2-54);
    if(bottom-top<26)return[];
    const title=this.add.text(left,top,'FILE DATA',{
      fontFamily:'PressStart2P',fontSize:'7px',color:isEliminated?'#a58781':'#c9b785'
    }).setOrigin(0,0);
    const available=bottom-top-17;
    const body=this.add.text(left,top+17,'',{
      fontFamily:'SpecialElite',fontSize:'13px',color:isEliminated?'#9c8984':'#e9dbbb',lineSpacing:2,
      wordWrap:{width:width-28,useAdvancedWrap:true}
    }).setOrigin(0,0);
    if(!facts.length)body.setText('No lab-linked data available.');
    else {
      let shown=facts.length;
      while(shown>=0) {
        const lines=facts.slice(0,shown).map(fact=>`${fact.label}: ${fact.value}`);
        if(shown<facts.length)lines.push(`+ ${facts.length-shown} MORE — OPEN FILE`);
        body.setText(lines.join('\n'));
        if(body.height<=available||shown===0)break;
        shown--;
      }
    }
    fit(body,width-28,available);return[title,body];
  },

  getCardStatus(suspect) {
    const state=suspect?.deductionState||{};
    if(state.eliminated===true)return{label:'CLEARED',color:'#e6766e'};
    if(this.excludeMode)return{label:'REVIEW FILE DATA',color:'#ffdc73'};
    if(state.alibiStatus==='contradicted')return{label:'ALIBI QUESTIONED',color:'#ffb347'};
    if(state.interviewStatus==='suspicious')return{label:'WITNESS CONCERN',color:'#ffb347'};
    // Availability markers, not a free deduction from internal match flags.
    if(['match','mismatch'].includes(state.hypothesisStatus))return{label:'METHOD DATA AVAILABLE',color:'#f0ddb0'};
    if(['match','mismatch'].includes(state.labStatus))return{label:'LAB DATA AVAILABLE',color:'#f0ddb0'};
    return{label:'UNDER REVIEW',color:'#b6aa90'};
  }
};
