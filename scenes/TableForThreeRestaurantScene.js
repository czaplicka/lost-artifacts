import { BaseScene } from './BaseScene.js';
import { TableForThreePanel } from '../ui/TableForThreePanel.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { TABLE_FOR_THREE_CONTENT as C } from '../assets/data/tableForThreeContent.js';
import { confirmTableForThreeArrival, returnTableForThreeHome } from '../managers/TableForThreeLocations.js';
import { readTableForThree, dispatchTableForThree } from '../managers/TableForThreeService.js';
import { captureRestaurantEvidence, readRestaurantEvidence, giveTableForThreeRing } from '../managers/TableForThreeRestaurantService.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { buildReport } from '../managers/TableForThreeModel.js';
import { paintTableForThree, cropTableForThree, ART_WIDTH, ART_HEIGHT } from '../ui/TableForThreeRestaurantArt.js';
import { installTableForThreePawnShop } from '../ui/TableForThreePawnShop.js';

export class TableForThreeRestaurantScene extends BaseScene {
  constructor(){super({key:L.restaurant.sceneKey});}
  create(){
    super.create();installTableForThreePawnShop();this.panel=new TableForThreePanel(this);this.beat='idle';
    const arrival=confirmTableForThreeArrival();
    if(!arrival.ok){this.panel.render('Location unavailable',arrival.reason,[['DRIVE HOME',()=>this.home()]]);return;}
    this.menu();
  }
  act(type,extra={},context={}){
    const result=dispatchTableForThree({type,...extra},context);
    if(!result.ok)this.panel.render('Not yet',result.reason,[['BACK',()=>this.menu()]]);
    return result.ok;
  }
  menu(){
    const s=readTableForThree();
    if(!s){this.panel.render('Missing contract','Restore an accepted Table for Three case.');return;}
    const choices=[['EVIDENCE',()=>this.gallery()],['DRIVE HOME',()=>this.home()]];
    let body='Table 6 is visible through the window. The woman faces you; her companion does not.';
    if(s.stage==='observation'){
      choices.unshift(['OBSERVE',()=>this.observe()],['READ RESTAURANT MENU',()=>this.offer()]);
      if(s.romancePhoto&&s.dessertOfferRead)choices.unshift(['PLAN A ROMANTIC SURPRISE',()=>{
        if(this.act('PLAN_INTERVENTION'))this.panel.render('A cheap idea','A presentation ring might persuade the staff this is a genuine romantic surprise. There is a pawnshop back in Home Town.',[['BACK',()=>this.menu()]]);
      }]);
    }else if(s.stage==='ring'){
      body='You need a ring in a presentation box. Ziggy’s Pawn is on the Home Town map. You must drive back, buy it there and return to the restaurant.';
    }else if(s.stage==='kitchen'){
      body='The complimentary dessert can be arranged at the kitchen entrance.';
      choices.unshift(s.ringHandedOver?['RETURN TO OBSERVATION',()=>{if(this.act('RETURN_TO_VANTAGE'))this.menu();}]:['KITCHEN ENTRANCE',()=>this.kitchen()]);
    }else if(s.stage==='reveal'){
      body='You are back at your observation position. The dessert will not be delivered until you are ready.';
      choices.unshift(['OBSERVE',()=>this.observe()]);
    }else if(s.stage==='report'){
      body=s.reportSubmitted?'Your report has been sent. Return to your office computer to read the client’s reply.':'The original meeting, planted ring and companion’s face have been documented.';
      if(!s.reportSubmitted)choices.unshift(['PREVIEW REPORT',()=>this.report()]);
    }else if(s.stage==='closed')body='The case is closed. The final client reply remains in your office mailbox.';
    this.panel.render(L.restaurant.name+' — WhateverVille',body,choices);
  }
  offer(){
    const s=readTableForThree();
    if(!s.dessertOfferRead&&!this.act('READ_DESSERT_OFFER'))return;
    this.panel.render('A little romance, on the house','Complimentary dessert for couples.\n\nPlanning a surprise? Bring your presentation item to the kitchen entrance and tell us your table number. Staff handle the food.\n\nNo refunds for answers you were not expecting.',[['BACK',()=>this.menu()]]);
  }
  observe(){
    const s=readTableForThree();
    if(s.stage==='observation'){
      if(!s.cameraChecked&&!this.act('CHECK_CAMERA',{}, {hasCamera:piInventoryManager.hasItem('camera')}))return;
      if(this.beat!=='kiss')this.beat='idle';
    }else if(s.stage==='reveal')this.beat=s.revealPhase==='ring_visible'?'ring':s.revealPhase==='face_visible'?'face':'idle';
    else{this.menu();return;}
    const choices=[['BACK',()=>this.menu()]];
    let body='Camera: drag a rectangle over the relevant subjects. These are temporary test drawings, not final scene artwork.';
    if(s.stage==='observation'&&!s.romancePhoto){
      choices.unshift(['KEEP WATCHING',()=>{this.beat='kiss';this.observe();}]);
      if(this.beat==='kiss')body+='\n\nThey lean across the table and kiss. His face is still turned away.';
    }else if(s.stage==='observation')body+='\n\nThe romantic interaction is already documented. Inspect what the restaurant offers.';
    if(s.stage==='reveal'&&s.revealPhase==='waiting')choices.unshift(['KEEP WATCHING',()=>{if(this.act('SERVE_DESSERT'))this.observe();}]);
    if(s.stage==='reveal'&&s.revealPhase==='ring_visible'){
      body+='\n\nThe ring is on a holder beside the complimentary dessert. Photograph the scene before continuing.';
      if(s.ringPhoto)choices.unshift(['KEEP WATCHING',()=>{
        if(this.act('CONTINUE_REACTION'))this.panel.render('At table 6',C.companionReaction+'\n\n'+C.wifeReaction+'\n\nShe slaps him. He turns towards the window, holding his cheek.',[['RAISE CAMERA',()=>this.observe()]]);
      }]);
    }
    if(s.stage==='reveal'&&s.revealPhase==='face_visible')body+='\n\nHis face is visible. Take a clear identification photograph.';
    this.panel.render('Observation — table 6',body,choices);
    const canvas=document.createElement('canvas');canvas.width=ART_WIDTH;canvas.height=ART_HEIGHT;
    Object.assign(canvas.style,{display:'block',width:'min(960px,100%)',height:'auto',marginTop:'18px',touchAction:'none',cursor:'crosshair',imageRendering:'pixelated'});
    this.panel.root.append(canvas);
    const ctx=canvas.getContext('2d');paintTableForThree(ctx,this.beat);
    let start=null;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))};};
    const frame=e=>{const p=point(e);return {x:Math.min(p.x,start.x),y:Math.min(p.y,start.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};};
    canvas.onpointerdown=e=>{if(e.button!==0)return;start=point(e);canvas.setPointerCapture(e.pointerId);};
    canvas.onpointermove=e=>{
      if(!start)return;const f=frame(e);paintTableForThree(ctx,this.beat);ctx.strokeStyle='#ffe4ac';ctx.lineWidth=3;ctx.strokeRect(f.x*ART_WIDTH,f.y*ART_HEIGHT,f.w*ART_WIDTH,f.h*ART_HEIGHT);
    };
    canvas.onpointercancel=()=>{start=null;paintTableForThree(ctx,this.beat);};
    canvas.onpointerup=e=>{
      if(!start)return;const f=frame(e);start=null;
      const result=captureRestaurantEvidence(this.beat,f);
      this.panel.render(result.ok?'Photograph recorded':'Try another frame',result.ok?'Evidence added. The original crop is available in EVIDENCE.':result.reason,[['CONTINUE OBSERVATION',()=>this.observe()],['BACK',()=>this.menu()]]);
    };
  }
  gallery(){
    const records=Object.values(readRestaurantEvidence());
    this.panel.render('Photographic evidence',records.length?'Saved crops of the observation.':'No photographs yet.',[['BACK',()=>this.menu()]]);
    for(const record of records){
      const label=document.createElement('h3');label.textContent=record.kind==='romance'?'Original meeting':record.kind==='ring'?'Investigator-arranged dessert':'Companion identification';
      const canvas=document.createElement('canvas');cropTableForThree(canvas,record);Object.assign(canvas.style,{maxWidth:'100%',imageRendering:'pixelated',border:'1px solid #c0ab7b'});
      this.panel.root.append(label,canvas);
    }
  }
  kitchen(){
    this.panel.render('Kitchen entrance','“A surprise dessert? Which table?”',[
      ...[5,6,7].map(table=>['TABLE '+table,()=>{
        const result=giveTableForThreeRing(table);
        this.panel.render(result.ok?'Kitchen':'Not arranged',result.ok?C.kitchenLine+'\n\nThe ring is removed from your PI inventory. Staff will display it beside the dessert, not inside the food.':result.reason,[['BACK',()=>this.menu()]]);
      }]),['BACK',()=>this.menu()]
    ]);
  }
  report(){
    const report=buildReport(readTableForThree());
    this.panel.render('Review report',[report.observed,report.intervention,report.subsequentEvents,report.limitations].join('\n\n'),[
      ['SEND REPORT WITH INTERVENTION DISCLOSED',()=>{
        if(this.act('SUBMIT_REPORT',{discloseIntervention:true}))this.menu();
      }],['BACK WITHOUT SENDING',()=>this.menu()]
    ]);
  }
  async home(){const result=await returnTableForThreeHome(this);if(!result.ok)this.panel.render('Cannot travel',result.message||result.reason||'Travel was cancelled.',[['BACK',()=>this.menu()]]);}
}
