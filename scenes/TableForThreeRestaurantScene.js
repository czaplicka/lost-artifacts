import { BaseScene } from './BaseScene.js';
import { TableForThreePanel } from '../ui/TableForThreePanel.js';
import { TableForThreeCameraInput } from '../ui/TableForThreeCameraInput.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { TABLE_FOR_THREE_CONTENT as C } from '../assets/data/tableForThreeContent.js';
import { confirmTableForThreeArrival, returnTableForThreeHome } from '../managers/TableForThreeLocations.js';
import { readTableForThree, dispatchTableForThree } from '../managers/TableForThreeService.js';
import { captureRestaurantEvidence, readRestaurantEvidence, giveTableForThreeRing } from '../managers/TableForThreeRestaurantService.js';
import { validateRestaurantFrame } from '../managers/TableForThreeCapturePolicy.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { buildReport } from '../managers/TableForThreeModel.js';
import { paintTableForThree, cropTableForThree, ART_WIDTH, ART_HEIGHT } from '../ui/TableForThreeRestaurantArt.js';
import { installTableForThreePawnShop } from '../ui/TableForThreePawnShop.js';

export class TableForThreeRestaurantScene extends BaseScene {
  constructor(){super({key:L.restaurant.sceneKey});}
  create(){
    super.create();installTableForThreePawnShop();this.cameraInput=null;this.panel=new TableForThreePanel(this);this.beat='idle';
    this.cameraCleanup=()=>this.disposeCamera();this.events.once('shutdown',this.cameraCleanup);this.events.once('destroy',this.cameraCleanup);
    const arrival=confirmTableForThreeArrival();
    if(!arrival.ok){this.screen('Location unavailable',arrival.reason,[['DRIVE HOME',()=>this.home()]]);return;}
    this.menu();
  }
  disposeCamera(){const camera=this.cameraInput;this.cameraInput=null;camera?.destroy();}
  screen(title,body,choices=[]){this.disposeCamera();this.panel.render(title,body,choices);}
  act(type,extra={},context={}){
    const result=dispatchTableForThree({type,...extra},context);
    if(!result.ok)this.screen('Not yet',result.reason,[['BACK',()=>this.menu()]]);
    return result.ok;
  }
  menu(){
    const s=readTableForThree();
    if(!s){this.screen('Missing contract','Restore an accepted Table for Three case.');return;}
    const choices=[['EVIDENCE',()=>this.gallery()],['DRIVE HOME',()=>this.home()]];
    let body='Table 6 is visible through the window. The woman faces you; her companion does not.';
    if(s.stage==='observation'){
      choices.unshift(['OBSERVE',()=>this.observe()],['READ RESTAURANT MENU',()=>this.offer()]);
      if(s.romancePhoto&&s.dessertOfferRead)choices.unshift(['PLAN A ROMANTIC SURPRISE',()=>{
        if(this.act('PLAN_INTERVENTION'))this.screen('A cheap idea','A presentation ring might persuade the staff this is a genuine romantic surprise. There is a pawnshop back in Home Town.',[['BACK',()=>this.menu()]]);
      }]);
    }else if(s.stage==='ring')body='You need a ring in a presentation box. Ziggy’s Pawn is on the Home Town map. You must drive back, buy it there and return to the restaurant.';
    else if(s.stage==='kitchen'){
      body='The complimentary dessert can be arranged at the kitchen entrance.';
      choices.unshift(s.ringHandedOver?['RETURN TO OBSERVATION',()=>{if(this.act('RETURN_TO_VANTAGE'))this.menu();}]:['KITCHEN ENTRANCE',()=>this.kitchen()]);
    }else if(s.stage==='reveal'){
      body='You are back at your observation position. The dessert will not be delivered until you are ready.';choices.unshift(['OBSERVE',()=>this.observe()]);
    }else if(s.stage==='report'){
      body=s.reportSubmitted?'Your report has been sent. Return to your office computer to read the client’s reply.':'The original meeting, planted ring and companion’s face have been documented.';
      if(!s.reportSubmitted)choices.unshift(['PREVIEW REPORT',()=>this.report()]);
    }else if(s.stage==='closed')body='The case is closed. The final client reply remains in your office mailbox.';
    this.screen(L.restaurant.name+' — WhateverVille',body,choices);
  }
  offer(){
    const s=readTableForThree();if(!s)return;
    if(!s.dessertOfferRead&&!this.act('READ_DESSERT_OFFER'))return;
    this.screen('A little romance, on the house','Complimentary dessert for couples.\n\nPlanning a surprise? Bring your presentation item to the kitchen entrance and tell us your table number. Staff handle the food.\n\nNo refunds for answers you were not expecting.',[['BACK',()=>this.menu()]]);
  }
  observe(){
    let s=readTableForThree();if(!s){this.menu();return;}
    if(s.stage==='observation'){
      if(!s.cameraChecked&&!this.act('CHECK_CAMERA',{}, {hasCamera:piInventoryManager.hasItem('camera')}))return;
      s=readTableForThree();if(this.beat!=='kiss')this.beat='idle';
    }else if(s.stage==='reveal')this.beat=s.revealPhase==='ring_visible'?'ring':s.revealPhase==='face_visible'?'face':'idle';
    else{this.menu();return;}
    const choices=[['BACK',()=>this.menu()]];
    let body='Drag a frame over the subjects, then use TAKE PHOTO or Enter. Escape clears the selection. Test artwork; the events wait for you.';
    if(s.stage==='observation'&&!s.romancePhoto){
      choices.unshift(['KEEP WATCHING',()=>{this.beat='kiss';this.observe();}]);
      if(this.beat==='kiss')body+='\n\nThey lean across the table and kiss. His face is still turned away.';
    }else if(s.stage==='observation')body+='\n\nThe original romantic interaction is already documented.';
    if(s.stage==='reveal'&&s.revealPhase==='waiting')choices.unshift(['KEEP WATCHING',()=>{if(this.act('SERVE_DESSERT'))this.observe();}]);
    if(s.stage==='reveal'&&s.revealPhase==='ring_visible'){
      body+='\n\nThe ring is beside the complimentary dessert. Document the scene before continuing.';
      if(s.ringPhoto)choices.unshift(['KEEP WATCHING',()=>{
        if(this.act('CONTINUE_REACTION'))this.screen('At table 6',C.companionReaction+'\n\n'+C.wifeReaction+'\n\nShe slaps him. He turns towards the window, holding his cheek.',[['RAISE CAMERA',()=>this.observe()]]);
      }]);
    }
    if(s.stage==='reveal'&&s.revealPhase==='face_visible')body+='\n\nHis face is visible. Take a clear identification photograph.';
    this.screen('Observation — table 6',body,choices);
    const revision=this.panel.revision,beat=this.beat;
    const canvas=document.createElement('canvas');canvas.width=ART_WIDTH;canvas.height=ART_HEIGHT;
    Object.assign(canvas.style,{display:'block',width:'min(960px,100%)',height:'auto',marginTop:'18px',touchAction:'none',cursor:'crosshair',imageRendering:'pixelated'});
    const status=document.createElement('p');status.textContent='Select a frame. Releasing the pointer does not take a photograph.';status.setAttribute('role','status');
    const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'});
    const button=label=>{const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{padding:'12px 18px',fontFamily:'SpecialElite, monospace',fontSize:'18px',background:'#263729',color:'#e3f0d7',border:'1px solid #88b589',cursor:'pointer'});controls.append(b);return b;};
    const shutter=button('TAKE PHOTO'),clear=button('CLEAR FRAME');
    this.panel.root.append(canvas,status,controls);
    const ctx=canvas.getContext('2d');
    const camera=new TableForThreeCameraInput(canvas,{
      isActive:()=>!this.panel.destroyed&&!this.panel.notebookOpen&&!this.panel.pendingAction&&this.panel.revision===revision&&canvas.isConnected,
      draw:frame=>{paintTableForThree(ctx,beat);if(frame){ctx.strokeStyle='#ffe4ac';ctx.lineWidth=3;ctx.strokeRect(frame.x*ART_WIDTH,frame.y*ART_HEIGHT,frame.w*ART_WIDTH,frame.h*ART_HEIGHT);}},
      onFrame:(frame,flags)=>{shutter.disabled=!frame||flags.busy||flags.dragging;clear.disabled=!frame||flags.busy;},
      onStatus:text=>{status.textContent=text;},
      onCapture:frame=>{
        const result=captureRestaurantEvidence(beat,frame);
        if(result.ok)this.photoResult(result.evidenceId);
        return result;
      }
    });
    this.cameraInput=camera;shutter.onclick=()=>void camera.capture();clear.onclick=()=>camera.clear();
  }
  photoResult(id){
    this.screen('Photograph recorded','Evidence added. This is the crop recorded for your report.',[['CONTINUE OBSERVATION',()=>this.observe()],['EVIDENCE',()=>this.gallery()],['BACK',()=>this.menu()]]);
    const record=readRestaurantEvidence()[id];if(record)this.appendCrop(record);
  }
  appendCrop(record){
    const check=validateRestaurantFrame(record?.beat,record?.frame);
    if(record?.rendererVersion!==1||!check.ok||check.kind!==record.kind){
      const warning=document.createElement('p');warning.textContent='This crop is invalid or uses an unsupported renderer. It has not been changed.';this.panel.root.append(warning);return;
    }
    const canvas=document.createElement('canvas');cropTableForThree(canvas,record);Object.assign(canvas.style,{maxWidth:'100%',imageRendering:'pixelated',border:'1px solid #c0ab7b'});this.panel.root.append(canvas);
  }
  gallery(){
    const records=Object.values(readRestaurantEvidence());this.screen('Photographic evidence',records.length?'Saved crops of the observation.':'No photographs yet.',[['BACK',()=>this.menu()]]);
    for(const record of records){const label=document.createElement('h3');label.textContent=record?.kind==='romance'?'Original meeting':record?.kind==='ring'?'Investigator-arranged dessert':'Companion identification';this.panel.root.append(label);this.appendCrop(record);}
  }
  kitchen(){
    this.screen('Kitchen entrance','“A surprise dessert? Which table?”',[
      ...[5,6,7].map(table=>['TABLE '+table,()=>{const result=giveTableForThreeRing(table);this.screen(result.ok?'Kitchen':'Not arranged',result.ok?C.kitchenLine+'\n\nThe ring is removed from your PI inventory. Staff will display it beside the dessert, not inside the food.':result.reason,[['BACK',()=>this.menu()]]);}]),['BACK',()=>this.menu()]
    ]);
  }
  report(){
    const report=buildReport(readTableForThree());
    this.screen('Review report',[report.observed,report.intervention,report.subsequentEvents,report.limitations].join('\n\n'),[['SEND REPORT WITH INTERVENTION DISCLOSED',()=>{if(this.act('SUBMIT_REPORT',{discloseIntervention:true}))this.menu();}],['BACK WITHOUT SENDING',()=>this.menu()]]);
  }
  async home(){const result=await returnTableForThreeHome(this);if(!result.ok)this.screen('Cannot travel',result.message||result.reason||'Travel was cancelled.',[['BACK',()=>this.menu()]]);}
}
