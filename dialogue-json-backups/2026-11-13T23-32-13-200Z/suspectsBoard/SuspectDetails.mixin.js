// Presentation only: never evaluate suspect/evidence compatibility.
import {CrimeLabManager} from '../scenes/CSI/CrimeLabManager.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from '../scenes/CSI/DeductionEvidenceRegistry.js';
import {FIELD_BY_ALIAS,FIELD_DEFS} from './gridConstants.js';
import {getSuspectFileNotes} from '../suspects/SuspectFileNotes.js';
function fieldKey(raw=''){const key=String(raw||'').trim();return FIELD_BY_ALIAS.get(key)?.id||key;}
function fieldLabel(field){const key=fieldKey(field);return DEDUCTION_EVIDENCE_REGISTRY[key]?.label||FIELD_BY_ALIAS.get(key)?.label||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').toUpperCase();}
function hasValue(value){return value!==undefined&&value!==null&&String(value).trim()!=='';}
function evidenceValue(raw={}){return raw.value??raw.result??raw.selectedValue??raw.normalizedValue??raw.correctValue??raw.resultValue??raw.thiefValue??raw.thief_value??raw.evidenceConfig?.correctValue??null;}
function evidenceField(raw={}){return fieldKey(raw.field||raw.forensicField||raw.attribute||raw.evidenceType||raw.evidenceConfig?.evidenceType||raw.type||'');}
function formatted(field,value){
  if(!hasValue(value))return'UNKNOWN';if(Array.isArray(value))return value.map(v=>formatted(field,v)).join(', ');
  const entry=DEDUCTION_EVIDENCE_REGISTRY[fieldKey(field)];if(entry?.formatEvidence)return entry.formatEvidence(value);
  const normalized=entry?.normalizeEvidence?entry.normalizeEvidence(value):value;
  return String(normalized).replace(/_/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
}
function unique(items){
  const seen=new Set();return items.filter(item=>{
    if(typeof item!=='string'||!item.trim())return false;
    const key=item.trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true;
  }).map(item=>item.trim());
}
function done(raw,trusted=false){
  if(!raw||typeof raw!=='object'||raw.aborted===true||raw.completed===false||raw.success===false)return false;
  return raw.completed===true||raw.success===true||Boolean(raw.completedAt)||raw.unlocked===true||raw.resultUnlocked===true||['completed','success','solved','confirmed'].includes(raw.status)||trusted;
}
function fieldOrder(field){const i=FIELD_DEFS.findIndex(d=>d.id===field);return i<0?999:i;}
function makeButton(scene,parent,x,y,label,onClick,fontSize=8){
  const text=scene.add.text(x,y,label,{fontFamily:'PressStart2P',fontSize:`${fontSize}px`,color:'#ffe7a2',backgroundColor:'#382a1c',padding:{left:8,right:8,top:8,bottom:8},align:'center'}).setOrigin(.5).setInteractive({useHandCursor:true});
  text.on('pointerdown',(pointer,px,py,event)=>{event?.stopPropagation();onClick();});parent.add(text);return text;
}
function fitText(text,maxWidth,maxHeight){text.setScale(Math.min(1,maxWidth/Math.max(1,text.width),maxHeight/Math.max(1,text.height)));}
function paginate(textObject,content,maxHeight){
  const tokens=String(content||'').match(/\S+\s*/g)||[];if(!tokens.length)return[''];
  const pages=[];let start=0;
  while(start<tokens.length){
    let low=start+1,high=tokens.length,best=start+1;
    while(low<=high){const mid=Math.floor((low+high)/2);textObject.setText(tokens.slice(start,mid).join('').trim());
      if(textObject.height<=maxHeight){best=mid;low=mid+1;}else high=mid-1;}
    pages.push(tokens.slice(start,best).join('').trim());start=best;
  }return pages;
}
function pagedText(scene,{x,y,width,height,text,fontSize=17,color='#e2d1ad'}){
  const container=scene.add.container(x,y),footer=32,bodyHeight=Math.max(20,height-footer-6);
  const body=scene.add.text(0,0,'',{fontFamily:'SpecialElite',fontSize:`${fontSize}px`,color,lineSpacing:4,wordWrap:{width:Math.max(20,width),useAdvancedWrap:true}}).setOrigin(0,0);
  container.add(body);const pages=paginate(body,text,bodyHeight);let page=0;
  const pageText=scene.add.text(width/2,height-15,'',{fontFamily:'PressStart2P',fontSize:'7px',color:'#b8a67e'}).setOrigin(.5);container.add(pageText);
  const previous=makeButton(scene,container,28,height-15,'<',()=>{if(page>0){page--;render();}});
  const next=makeButton(scene,container,width-28,height-15,'>',()=>{if(page<pages.length-1){page++;render();}});
  function render(){
    body.setScale(1).setText(pages[page]);fitText(body,width,bodyHeight);
    const multiple=pages.length>1;pageText.setText(`${page+1}/${pages.length}`).setVisible(multiple);
    previous.setVisible(multiple);next.setVisible(multiple);previous.setAlpha(page>0?1:.35);next.setAlpha(page<pages.length-1?1:.35);
  }render();return{container,pages,body,height};
}
export const SuspectDetailsMixin={
  getCompletedCrimeLabResults(){
    const state=this.gameState||{},manager=new CrimeLabManager(state,this.cityId),caseKey=String(manager.getCaseKey());
    const current=state.caseForensics?.[caseKey],assignment=state.caseCsiAssignments?.[caseKey];
    const labCompletedForCase=state.crimeCityProgress?.[caseKey]?.crimeLabCompleted===true||current?.completed===true||(!current&&state.csiLabCompleted===true);
    const byField=new Map();
    const configFor=station=>station==='identity'?assignment?.identityEvidence:/^trace_[01]$/.test(String(station||''))?assignment?.traceEvidence?.[Number(station.slice(-1))]:null;
    const add=(raw,priority,{trusted=false,legacy=false}={})=>{
      if(!done(raw,trusted))return;if(raw.caseKey!=null&&String(raw.caseKey)!==caseKey)return;
      const config=configFor(raw.stationId),field=evidenceField(raw),value=evidenceValue(raw);
      if(!field||!hasValue(value))return;
      if(config&&field!==fieldKey(config.attribute||config.evidenceType||config.field))return;
      if(config?.id&&raw.evidenceId&&raw.evidenceId!==config.id)return;
      if(!trusted&&!legacy&&raw.caseKey==null){
        if(!labCompletedForCase)return;
        const assigned=[assignment?.identityEvidence,...(assignment?.traceEvidence||[])].filter(Boolean);
        if(assigned.length&&!assigned.some(e=>fieldKey(e.attribute||e.evidenceType||e.field)===field))return;
      }
      const existing=byField.get(field);if(existing&&existing.priority>=priority)return;
      const entry=DEDUCTION_EVIDENCE_REGISTRY[field];
      byField.set(field,{
        id:raw.id||raw.evidenceId||`${caseKey}_${raw.stationId||field}`,caseKey,stationId:raw.stationId||null,field,
        label:raw.label||raw.title||entry?.label||fieldLabel(field),value:formatted(field,value),rawValue:value,
        description:raw.clueText||raw.description||raw.clue?.text||raw.text||config?.clueText||'',
        source:raw.source||'Crime Lab',sourceConfirmed:raw.sourceConfirmed===true,
        sourceText:raw.sourceText||raw.evidenceConfig?.sourceText||'',assistantProvided:raw.assistantProvided===true,isCompleted:true,priority
      });
    };
    add(state.identityEvidenceResult,10);
    for(const r of Array.isArray(state.forensicResults)?state.forensicResults:[])add(r,10);
    for(const r of Array.isArray(state.crimeBoardData?.labResults)?state.crimeBoardData.labResults:[])add(r,15);
    if(current){
      add(current.identityEvidenceResult,30,{trusted:true});
      for(const r of current.traceEvidenceResults||[])add(r,30,{trusted:true});
      for(const r of current.forensicResults||[])add(r,25,{trusted:true});
    }
    if(labCompletedForCase&&byField.size===0){
      const hard=state.currentMission?.forensicHardEvidence||state.hardEvidence||[];
      if(Array.isArray(hard))for(const e of hard)add({...e,completed:true},1,{legacy:true});
    }
    return[...byField.values()].sort((a,b)=>fieldOrder(a.field)-fieldOrder(b.field)||a.label.localeCompare(b.label)).map(({priority,...result})=>result);
  },
  getSuspectFileSections(suspect){
    const all=Array.isArray(this.gameState?.caseSuspects)&&this.gameState.caseSuspects.length
      ?this.gameState.caseSuspects:Array.isArray(this.gameState?.suspects)?this.gameState.suspects:[];
    const raw=all.find(s=>s.id===suspect?.id)||suspect||{};
    return getSuspectFileNotes(raw);
  },
  buildDetailsText(suspect){
    const restricted=suspect?.restrictedProfile||{},forensic=restricted.forensicAttributes||{};
    const state=suspect?.deductionState||{},sections=this.getSuspectFileSections(suspect);
    const unlocked=new Set((Array.isArray(restricted.unlockedFields)?restricted.unlockedFields:[])
      .map(f=>fieldKey(typeof f==='string'?f:f?.field||f?.id||f?.key||'')).filter(Boolean));
    const revealed=new Set([...unlocked,...this.getCompletedCrimeLabResults().map(r=>r.field)]);
    const lines=[`Role: ${suspect?.publicProfile?.occupation||suspect?.occupation||'Unknown'}`];
    const connection=suspect?.publicProfile?.caseConnection||suspect?.caseConnection;
    if(connection)lines.push('\nConnection:',connection);
    const addSection=(title,values,empty)=>{lines.push(`\n${title}:`);if(values.length)for(const value of values)lines.push(`• ${value}`);else lines.push(`• ${empty}`);};
    addSection('Visible notes',sections.visible,'No visible traits recorded');
    addSection('Personal notes',sections.personal,'No personal notes recorded');addSection('Hobbies',sections.hobbies,'No hobbies recorded');
    const entries=new Map();
    Object.entries(forensic).forEach(([key,data])=>{
      const field=fieldKey(key);if(!(data?.unlocked||revealed.has(field)||revealed.has(key)))return;
      if(['dust_profile','material_profile'].includes(field))return;
      const value=data?.value??data;if(!hasValue(value)||(typeof value==='object'&&!Array.isArray(value)))return;
      entries.set(field,`${fieldLabel(field)}: ${formatted(field,value)}`);
    });
    addSection('Verified file data',[...entries].sort((a,b)=>fieldOrder(a[0])-fieldOrder(b[0])).map(([,text])=>text),'No verified forensic data yet');
    if(Array.isArray(state.eliminationReasons)&&state.eliminationReasons.length){
      lines.push('\nRecorded clearance:');for(const r of state.eliminationReasons){lines.push(`• ${r?.label||'Manual exclusion'}`);if(r?.note)lines.push(`  ${r.note}`);}
    }
    if(Array.isArray(state.notesUnlocked)&&state.notesUnlocked.length){
      const notes=unique(state.notesUnlocked.filter(n=>typeof n==='string'));if(notes.length)addSection('Investigator notes',notes,'');
    }return lines.join('\n');
  },
  buildCrimeLabReportsText(){
    const results=this.getCompletedCrimeLabResults();if(!results.length)return'No completed analyses.\nCrime Lab reports will appear here.';
    return results.map(r=>[r.label.toUpperCase(),`Result: ${r.value}`,r.description,
      r.sourceText&&!r.description.includes(r.sourceText)?`Sample origin: ${r.sourceText}`:'',
      r.assistantProvided?'Prepared by: Lab assistant.':'Prepared at: Crime Lab.'
    ].filter(Boolean).join('\n')).join('\n\n--------------------\n\n');
  },
  openSuspectFileDocument({title,text}){
    this.closeSuspectFileDocument();const {width,height}=this.scale;
    const root=this.add.container(0,0).setDepth(50000);let closed=false;
    const close=()=>{
      if(closed)return;closed=true;this.events.off('shutdown',close);this.scale.off('resize',close);
      if(this._suspectFileDocument?.root===root)this._suspectFileDocument=null;root.destroy();
    };
    const shade=this.add.rectangle(0,0,width,height,0x000000,.9).setOrigin(0,0).setInteractive();
    shade.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();close();});
    const w=Math.max(140,Math.min(width-24,800)),h=Math.max(140,height-24),left=(width-w)/2,top=12;
    const panel=this.add.rectangle(left,top,w,h,0x211711,1).setOrigin(0,0).setStrokeStyle(2,0xd4af37).setInteractive();
    panel.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    const heading=this.add.text(width/2,top+18,title,{fontFamily:'SpecialElite',fontSize:'24px',color:'#fff0cd',align:'center',wordWrap:{width:w-32,useAdvancedWrap:true}}).setOrigin(.5,0);
    fitText(heading,w-32,52);root.add([shade,panel,heading]);
    const body=pagedText(this,{x:left+18,y:top+78,width:w-36,height:Math.max(40,h-146),text,fontSize:width<=700?17:19});root.add(body.container);
    makeButton(this,root,width/2,top+h-26,'[ CLOSE FILE ]',close,9);this._suspectFileDocument={root,close};
    this.events.once('shutdown',close);this.scale.on('resize',close);
    root.once('destroy',()=>{
      this.events.off('shutdown',close);this.scale.off('resize',close);
      if(this._suspectFileDocument?.root===root)this._suspectFileDocument=null;closed=true;
    });return root;
  },
  closeSuspectFileDocument(){this._suspectFileDocument?.close();},
  createCrimeLabResultsWidget({x,y,width,maxHeight=200}){
    const results=this.getCompletedCrimeLabResults(),container=this.add.container(x,y);
    const height=Math.max(96,Math.min(maxHeight,results.length?196:118));
    container.add(this.add.rectangle(0,0,width,height,0x142022,.98).setOrigin(0,0).setStrokeStyle(2,0x668f91));
    container.add(this.add.text(12,12,'CRIME LAB RESULTS',{fontFamily:'PressStart2P',fontSize:'8px',color:'#91d8d9'}));
    let page=0;const available=height-72,rows=Math.max(1,Math.floor(available/42));
    const rowRoot=this.add.container(0,34);container.add(rowRoot);
    const indicator=this.add.text(width/2,height-18,'',{fontFamily:'PressStart2P',fontSize:'6px',color:'#b7c8c6'}).setOrigin(.5);container.add(indicator);
    const previous=makeButton(this,container,22,height-18,'<',()=>{if(page>0){page--;render();}},7);
    const next=makeButton(this,container,width-22,height-18,'>',()=>{if((page+1)*rows<results.length){page++;render();}},7);
    const open=makeButton(this,container,width/2,height-18,'[ REPORTS ]',()=>this.openSuspectFileDocument({title:'CRIME LAB REPORTS',text:this.buildCrimeLabReportsText()}),7);
    const render=()=>{
      rowRoot.removeAll(true);const totalPages=Math.max(1,Math.ceil(results.length/rows));
      previous.setVisible(totalPages>1);next.setVisible(totalPages>1);previous.setAlpha(page>0?1:.35);next.setAlpha(page<totalPages-1?1:.35);
      indicator.setVisible(false);open.setVisible(results.length>0);
      if(!results.length){rowRoot.add(this.add.text(12,0,'No completed analyses.',{fontFamily:'SpecialElite',fontSize:'16px',color:'#b7c8c6',wordWrap:{width:width-24,useAdvancedWrap:true}}));return;}
      results.slice(page*rows,(page+1)*rows).forEach((r,i)=>{
        const yy=i*42;
        const bg=this.add.rectangle(8,yy,width-16,40,0x233133,1).setOrigin(0,0).setInteractive({useHandCursor:true});
        const label=this.add.text(14,yy+3,r.label.toUpperCase(),{fontFamily:'PressStart2P',fontSize:'6px',color:'#a9d5d4'});fitText(label,width-28,12);
        const value=this.add.text(14,yy+17,r.value,{fontFamily:'SpecialElite',fontSize:'17px',color:'#f4e6b5'});fitText(value,width-28,21);
        bg.on('pointerdown',(p,x,y,event)=>{
          event?.stopPropagation();this.openSuspectFileDocument({title:r.label,text:[`Result: ${r.value}`,r.description,
            r.sourceText&&!r.description.includes(r.sourceText)?`Sample origin: ${r.sourceText}`:''].filter(Boolean).join('\n\n')});
        });rowRoot.add([bg,label,value]);
      });
    };render();return{container,height};
  },
  renderDetailsPanel(){
    const {width,height}=this.scale;if(width<=700)return;
    const selected=this.getAllSuspects().find(s=>s.id===this.selectedSuspectId);
    const panelWidth=width<=1100?330:430,left=width-panelWidth-20,top=184,panelHeight=Math.max(150,height-top-72);
    const panel=this.add.container(left,top);this.detailsContainer.add(panel);
    panel.add(this.add.rectangle(0,0,panelWidth,panelHeight,0x211711,.98).setOrigin(0,0).setStrokeStyle(2,0x8b6c38,.9));
    const widget=this.createCrimeLabResultsWidget({x:12,y:12,width:panelWidth-24,maxHeight:Math.max(96,Math.min(172,panelHeight*.35))});panel.add(widget.container);
    const notesY=widget.height+34,name=selected?.publicProfile?.displayName||selected?.name||'CASE NOTES';
    const heading=this.add.text(16,notesY,name,{fontFamily:'SpecialElite',fontSize:'24px',color:'#fff0cd'});fitText(heading,panelWidth-32,32);panel.add(heading);
    const text=selected?this.buildDetailsText(selected):'Select a suspect file to review their notes.',available=panelHeight-notesY-48;
    if(available>=85){panel.add(pagedText(this,{x:16,y:notesY+42,width:panelWidth-32,height:available,text,fontSize:width<=1100?16:18}).container);}
    else makeButton(this,panel,panelWidth/2,Math.min(panelHeight-24,notesY+54),'[ OPEN FILE ]',()=>this.openSuspectFileDocument({title:name,text}),8);
  },
  showMobileDetails(suspect){
    const name=suspect?.publicProfile?.displayName||suspect?.name||'Unknown Suspect';
    return this.openSuspectFileDocument({title:name,text:[this.buildDetailsText(suspect),'\n--------------------\nCRIME LAB REPORTS',this.buildCrimeLabReportsText()].join('\n\n')});
  },
  formatEvidenceField(field){return fieldLabel(field);},
  formatStatus(status){
    const labels={pending:'Pending',match:'Evidence recorded',mismatch:'Evidence recorded',eliminated:'Excluded',manually_cleared:'Cleared',locked:'Locked',unlocked:'Available',suspicious:'Questioned',confirmed:'Confirmed',not_applicable:'Not applicable',unverified:'Unverified',corroborated:'Corroborated',contradicted:'Contradicted'};
    return labels[status]||'Pending';
  }
};
