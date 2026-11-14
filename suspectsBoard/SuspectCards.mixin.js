import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// suspectsBoard/SuspectCards.mixin.js
// Read-only evidence presentation. No suspect/evidence comparisons here.
import {requestAutosave} from '../gameStatePersistence.js';
import {FIELD_BY_ALIAS} from './gridConstants.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from '../scenes/CSI/DeductionEvidenceRegistry.js';

const FILE_DATA_FIELDS = [
  {field:'hair_color',aliases:['hair_color','hairColor','hair'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_3ba4bceecdd038ee3335")},
  {field:'blood_type',aliases:['blood_type','bloodType'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_c9f5b99404f021accad3")},
  {field:'biological_sex',aliases:['biological_sex','biologicalSex','sex','gender','dna_gender','dna_profile'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_4d9e779cd9bdb7cbf1ae")},
  {field:'fingerprint_pattern',aliases:['fingerprint_pattern','fingerprintPattern'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_9ac60029d6f80c0ba9a7")},
  {field:'shoe_size_category',aliases:['shoe_size_category','shoeSizeCategory'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_9319d315c89a5df3c981")},
  {field:'handedness',aliases:['handedness','dominantHand','dominant_hand'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_53c7e3bfe50d2301d0d4")},
  {field:'eye_color',aliases:['eye_color','eyeColor','eyes'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_0dfe76e6578feacef7f6")},
  {field:'race',aliases:['race','ancestry'],label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_b293d9ae7302a1380124")}
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
      this.emptyText?.setText(__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_7abc5c0a3e3dfd97b37f"))
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
        facts.push({field:'dust_profile',label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_515b9cb58a5062def8aa"),value:sections.hobbies.join('; ')});
      }
      if((completed.has('material_profile')||unlocked.has('material_profile'))&&sections.personal.length) {
        facts.push({field:'material_profile',label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_df487601a0e69aae2574"),value:sections.personal.join('; ')});
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
    const file=this.add.text(-width/2+12,top+10,`${__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_3e25b41de17bf0813725")}${this.getSuspectFileNumber(suspect.id)}`,{
      fontFamily:'PressStart2P',fontSize:'8px',color:cleared?'#d07f75':'#bba276'
    }).setOrigin(0,0);
    const name=this.add.text(0,top+30,suspect.publicProfile?.displayName||suspect.name||__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_b764cdc0eab713746721"),{
      fontFamily:'SpecialElite',fontSize:width<230?'20px':'25px',color:cleared?'#b8a39d':'#fff0cd',
      align:'center',wordWrap:{width:width-28,useAdvancedWrap:true}
    }).setOrigin(.5,0);
    fit(name,width-28,Math.max(22,Math.min(42,height*.22)));
    const nameBottom=name.y+name.height*(name.scaleY??name.scaleX??1);
    const occupation=this.add.text(0,nameBottom+5,suspect.publicProfile?.occupation||suspect.occupation||__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_1db2d66a8edb2f1e4892"),{
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
    const open=this.add.text(0,height/2-36,__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_06f12f2eb2d889c513e1"),{
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
      const stamp=this.add.text(0,0,__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_2026e813d70cc656862b"),{
        fontFamily:'PressStart2P',fontSize:width<230?'15px':'18px',color:'#db5750',
        stroke:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_d7229b9146b855c45b63"),strokeThickness:5,align:'center'
      }).setOrigin(.5).setAngle(-12).setAlpha(.9).setDepth(10);
      card.add(stamp);
    }
    return card;
  },

  createFileDataPanel(suspect,width,height,isEliminated,layout={}) {
    const facts=this.getVisibleFileFacts(suspect),left=-width/2+14;
    const top=layout.top??(-height/2+108),bottom=layout.bottom??(height/2-54);
    if(bottom-top<26)return[];
    const title=this.add.text(left,top,__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_96bfda3dec6ed5b76a0b"),{
      fontFamily:'PressStart2P',fontSize:'7px',color:isEliminated?'#a58781':'#c9b785'
    }).setOrigin(0,0);
    const available=bottom-top-17;
    const body=this.add.text(left,top+17,'',{
      fontFamily:'SpecialElite',fontSize:'13px',color:isEliminated?'#9c8984':'#e9dbbb',lineSpacing:2,
      wordWrap:{width:width-28,useAdvancedWrap:true}
    }).setOrigin(0,0);
    if(!facts.length)body.setText(__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_9fcd40b91774c1e4d21e"));
    else {
      let shown=facts.length;
      while(shown>=0) {
        const lines=facts.slice(0,shown).map(fact=>`${fact.label}: ${fact.value}`);
        if(shown<facts.length)lines.push(`${__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_dd425feef83c5d3c5a19")}${facts.length-shown}${__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_6d883d890719883bee14")}`);
        body.setText(lines.join(__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_01ba4719c80b6fe911b0")));
        if(body.height<=available||shown===0)break;
        shown--;
      }
    }
    fit(body,width-28,available);return[title,body];
  },

  getCardStatus(suspect) {
    const state=suspect?.deductionState||{};
    if(state.eliminated===true)return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_2026e813d70cc656862b"),color:'#e6766e'};
    if(this.excludeMode)return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_b3d269ca43c8eefd5926"),color:'#ffdc73'};
    if(state.alibiStatus==='contradicted')return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_df7143eb5daca94f19f6"),color:'#ffb347'};
    if(state.interviewStatus==='suspicious')return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_845a27b8c089d283ac91"),color:'#ffb347'};
    // Availability markers, not a free deduction from internal match flags.
    if(['match','mismatch'].includes(state.hypothesisStatus))return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_cb6901fe8204eb1fce1d"),color:'#f0ddb0'};
    if(['match','mismatch'].includes(state.labStatus))return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_0537a7b72e6691a3efb4"),color:'#f0ddb0'};
    return{label:__dialogueText("suspectsBoard/SuspectCards.mixin.js", "t_e07c83efc4b8e5952e74"),color:'#b6aa90'};
  }
};
