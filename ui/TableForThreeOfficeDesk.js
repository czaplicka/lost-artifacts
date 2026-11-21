export const OFFICE_DESK_HOTSPOTS = Object.freeze([
  Object.freeze({ id:'calendar', label:'Desk calendar', x:110,y:115,w:230,h:255 }),
  Object.freeze({ id:'card', label:'Business card', x:395,y:240,w:245,h:110 }),
  Object.freeze({ id:'appointments', label:'Appointment folder', x:705,y:110,w:185,h:265 })
]);
export function officeDeskHit(clientX, clientY, rect) {
  if(!rect||![clientX,clientY,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)return null;
  const x=(clientX-rect.left)*960/rect.width,y=(clientY-rect.top)*480/rect.height;
  return OFFICE_DESK_HOTSPOTS.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)?.id||null;
}
export class TableForThreeOfficeDesk {
  constructor(panel,state,onInspect){
    this.panel=panel;this.revision=panel.revision;this.state=state;this.destroyed=false;this.hover=null;
    this.canvas=document.createElement('canvas');this.canvas.width=960;this.canvas.height=480;
    this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Employee’s desk: calendar on the left, business card in the middle, appointment folder on the right. The same actions are available through the buttons below.');
    Object.assign(this.canvas.style,{display:'block',width:'min(960px,100%)',height:'auto',margin:'0 auto 20px',imageRendering:'pixelated'});
    this.move=e=>{if(!this.active())return;this.hover=officeDeskHit(e.clientX,e.clientY,this.canvas.getBoundingClientRect());this.canvas.style.cursor=this.hover?'pointer':'default';this.draw();};
    this.leave=()=>{this.hover=null;this.draw();};
    this.click=e=>{if(!this.active()||e.button!==0)return;const id=officeDeskHit(e.clientX,e.clientY,this.canvas.getBoundingClientRect());if(id)onInspect(id);};
    this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerleave',this.leave);this.canvas.addEventListener('click',this.click);
    panel.root.prepend(this.canvas);this.draw();
  }
  active(){return !this.destroyed&&!this.panel.destroyed&&!this.panel.pendingAction&&!this.panel.notebookOpen&&this.panel.revision===this.revision&&this.canvas.isConnected;}
  draw(){
    if(this.destroyed)return;
    const c=this.canvas.getContext('2d');c.save();c.imageSmoothingEnabled=false;
    c.fillStyle='#17130f';c.fillRect(0,0,960,480);c.fillStyle='#344138';c.fillRect(30,24,900,108);
    c.fillStyle='#8b7044';c.fillRect(30,121,900,8);c.fillStyle='#68472e';c.fillRect(30,129,900,315);
    for(let y=145;y<440;y+=23){c.fillStyle=y%2?'#735035':'#704c31';c.fillRect(40,y,880,4);}
    c.fillStyle='#30251c';c.fillRect(30,444,900,20);
    for(const h of OFFICE_DESK_HOTSPOTS){c.fillStyle='#302016';c.fillRect(h.x+9,h.y+10,h.w,h.h);}
    c.fillStyle='#e5d3a6';c.fillRect(110,115,230,255);c.fillStyle='#713d37';c.fillRect(110,115,230,42);
    c.fillStyle='#d7bc83';c.fillRect(126,176,198,1);
    c.strokeStyle='#b29c75';c.lineWidth=1;
    for(let row=0;row<4;row++)for(let col=0;col<5;col++)c.strokeRect(126+col*39,190+row*36,39,36);
    c.strokeStyle='#91453d';c.lineWidth=3;c.strokeRect(165,226,39,36);
    c.fillStyle='#f0e3be';c.fillRect(395,240,245,110);c.fillStyle='#b48d4c';c.fillRect(412,256,5,76);
    c.fillStyle='#a9ad99';c.fillRect(705,110,185,265);c.fillStyle='#7a846f';c.fillRect(705,110,85,25);
    c.fillStyle='#ede0b8';c.fillRect(723,160,149,170);
    c.fillStyle='#8d8a72';for(let y=195;y<315;y+=24)c.fillRect(740,y,112,2);
    c.font='17px monospace';c.fillStyle='#f2e1b8';c.fillText('CALENDAR',130,143);
    c.fillStyle='#4b4030';c.fillText('TABLE SIX',435,284);c.fillText('APPOINTMENTS',728,185);
    c.font='15px monospace';c.fillText('Restaurant card',435,316);
    c.fillStyle='#d8c69e';c.fillText('OFFICE DESK — TEST ART',36,54);
    for(const h of OFFICE_DESK_HOTSPOTS){
      if(this.hover===h.id){c.strokeStyle='#efc66a';c.lineWidth=4;c.strokeRect(h.x-4,h.y-4,h.w+8,h.h+8);}
      const known=h.id==='calendar'?this.state.calendarRead:h.id==='card'?this.state.venueIdentified:this.state.nextMeetingFound;
      if(known){c.fillStyle='#a9c198';c.fillRect(h.x+h.w-18,h.y+7,10,10);}
    }
    if(this.hover){const h=OFFICE_DESK_HOTSPOTS.find(h=>h.id===this.hover);c.fillStyle='#1d261f';c.fillRect(300,402,370,30);c.fillStyle='#f0dfae';c.fillText(h.label,315,423);}
    c.restore();
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;
    this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerleave',this.leave);this.canvas.removeEventListener('click',this.click);
    this.canvas.remove();
  }
}
