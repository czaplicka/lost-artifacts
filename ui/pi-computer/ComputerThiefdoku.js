import { ThiefdokuPuzzle } from '../../systems/thiefdoku/ThiefdokuPuzzle.js';
import { ComputerThiefdokuArt } from './ComputerThiefdokuArt.js';

const ROOM_SHORT={bathroom:'BATH',kitchen:'KITCHEN',bedroom:'BEDROOM',living:'LOUNGE',study:'STUDY',dining:'DINING',guest_room:'GUEST',laundry:'LAUNDRY',conservatory:'GARDEN',attic:'ATTIC',gallery:'GALLERY',sculpture_hall:'SCULPTURE',archive:'ARCHIVE',restoration_lab:'LAB',museum_reception:'LOBBY',gift_shop:'SHOP',security:'SECURITY',exhibit_hall:'EXHIBITS',museum_kitchen:'KITCHEN',museum_bathroom:'WC',reception:'RECEPTION',open_office:'CUBICLES',conference:'MEETING',office_kitchen:'KITCHEN',ceo_office:'CEO',library:'LIBRARY',copy_room:'COPIER',accounts:'ACCOUNTS',break_room:'BREAK',office_bathroom:'WC'};

export class ComputerThiefdoku {
 constructor(ui){
  this.ui=ui;this.art=new ComputerThiefdokuArt(ui);
  this.puzzle=new ThiefdokuPuzzle({storageKey:ui.options?.thiefdokuStorageKey||'lost-artifacts.thiefdoku.illustrated.v1'});
  this.page=0;this.statementPage={};this.accused=null;this.tool='place';this.confirmNew=false;
  this.zoom=false;this.offsetRow=0;this.offsetCol=0;this.help=false;this.helpPage=0;this.destroyed=false;
  this.feedback=this.puzzle.completed?'Case solved. Open the next case.':this.puzzle.failed?'The thief escaped. Try another case.':this.puzzle.migrated?'New room rules loaded. Your solved-case progress was kept.':'One person per row, column and room. Place everyone before accusing.';
 }
 hit(x,y,w,h,callback){
  const o=this.ui.scene.add.rectangle(x+w/2,y+h/2,w,h,0xffffff,0.001).setInteractive({useHandCursor:true});this.ui.drawing.add(o);
  o.on('pointerdown',()=>{if(this.destroyed)return;this.ui.options.onSfx?.('click');callback();});return o;
 }
 button(x,y,w,label,callback,{enabled=true,active=false}={}){
  const g=this.art.graphic();this.art.panel(g,x,y,w,25,active?0xf0d98e:enabled?0xf5eee1:0xd2c9bd,4);
  this.art.text(x+w/2,y+6,label,11,enabled?'#302833':'#8c8278').setOrigin(0.5,0);
  if(enabled)this.hit(x,y,w,25,callback);
 }
 reset(){
  if(this.destroyed)return;this.puzzle.reset();this.page=0;this.statementPage={};this.accused=null;
  this.confirmNew=false;this.tool='place';this.offsetRow=0;this.offsetCol=0;this.zoom=false;
  this.feedback='A new theft. A fresh floor plan. Same suspicious people.';this.ui.render();
 }
 requestNew(){if(this.puzzle.completed||this.puzzle.failed||this.confirmNew){this.reset();return;}this.confirmNew=true;this.feedback='Discard this case? Click CONFIRM NEW again.';this.ui.render();}
 render(){
  if(this.destroyed||!this.ui.window)return;
  const b=this.ui.window,a=this.art,s=this.puzzle.getState();if(!s.allPlaced)this.accused=null;
  const x=b.x+12,y=b.y+43,w=b.w-24,h=b.h-84,bg=a.graphic();bg.fillStyle(0xf1ebe5,1);bg.fillRect(x,y,w,h);
  if(w<720||h<460){a.text(x+20,y+20,'Enlarge the Thiefdoku window to see the floor plan.',15,'#302833',w-40);return;}
  a.text(x+12,y+5,'THIEFDOKU',22,'#292632');
  a.text(x+185,y+9,`${s.themeName} | ${s.size} x ${s.size} | ${s.size} rooms`,12);
  a.text(x+185,y+25,`People ${s.placedCount}/${s.people.length} | Cases solved: ${s.solved}`,11,'#65515e');
  a.text(x+12,y+45,`Missing: ${s.stolenItem}. The empty display is in the ${s.roomNames[s.theftRoom].toLowerCase()}.`,12,'#5b474b',w-24);
  const leftW=Math.min(354,Math.floor(w*0.38)),cardY=y+76,cardH=Math.floor((h-150)/2),gap=10;
  const cardW=Math.floor((leftW-gap)/2),perPage=4,pages=Math.ceil(s.people.length/perPage);this.page=Math.max(0,Math.min(this.page,pages-1));
  s.people.slice(this.page*perPage,(this.page+1)*perPage).forEach((p,i)=>this.drawCard(x+9+(i%2)*(cardW+gap),cardY+Math.floor(i/2)*(cardH+8),cardW,cardH,p,s));
  const navY=y+h-65;
  this.button(x+10,navY,55,'PREV',()=>{this.page--;this.ui.render();},{enabled:this.page>0});a.text(x+74,navY+7,`Suspects ${this.page+1}/${pages}`,11);
  this.button(x+leftW-52,navY,55,'NEXT',()=>{this.page++;this.ui.render();},{enabled:this.page<pages-1});
  const availableW=w-leftW-85,side=Math.floor(Math.min(h-139,availableW)),bx=x+leftW+29+(availableW-side)/2,by=y+85;
  this.drawBoard(bx,by,side,s);this.drawTools(x+w-48,by,s);
  a.text(bx,by+side+8,'One per row, column AND room. Pale X: automatic. Dark X: your notes.',10,'#5b474b',side);
  if(this.help)this.drawHelp(bx,by,side,s);
  const footerY=y+h-32;
  this.button(x+10,footerY,108,s.completed?'NEXT CASE':this.confirmNew?'CONFIRM NEW':'NEW CASE',()=>this.requestNew());
  if(this.confirmNew&&!s.completed&&!s.failed)this.button(x+124,footerY,65,'CANCEL',()=>{this.confirmNew=false;this.feedback='Current case kept.';this.ui.render();});
  const fx=this.confirmNew&&!s.completed&&!s.failed?x+200:x+130;
  a.text(fx,footerY+2,this.feedback,12,s.completed?'#2d714d':'#6b444b',x+w-fx-12);
 }
 statementChunks(texts,width,maxLines){
  const probe=this.art.text(-10000,-10000,'',12,'#352e37',width),chunks=[];
  for(const text of texts){const lines=probe.getWrappedText(text);for(let i=0;i<lines.length;i+=maxLines)chunks.push(lines.slice(i,i+maxLines).join('\n'));}
  probe.destroy();return chunks.length?chunks:['No statement.'];
 }
 drawCard(x,y,w,h,p,s){
  const a=this.art,g=a.graphic(),selected=s.selectedPersonId===p.id,chosen=s.allPlaced&&this.accused===p.id,locked=s.completed||s.failed;
  const placed=s.board.some(row=>row.includes(p.id)),cleared=s.wrongAccusations.includes(p.id);
  g.fillStyle(0x342b37,0.16);g.fillRoundedRect(x+3,y+4,w,h,5);
  a.panel(g,x,y,w,h,selected?0xffedaa:placed?0xd6d5d1:0xfaf5ed,5);
  if(chosen){g.lineStyle(3,0xb66b61,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,4);}
  const portraitW=Math.min(52,w*0.32),portraitH=Math.min(60,h*0.32),px=x+8,py=y+7;
  a.panel(g,px-3,py-3,portraitW+6,portraitH+6,placed?0xc6c6c4:0xfff9ed,2);
  a.portrait(p,px,py,portraitW,portraitH,{muted:placed&&!selected});
  const metaX=px+portraitW+9,metaW=x+w-7-metaX;
  a.nameTag(metaX+metaW/2,y+17,p.name,metaW,16);
  a.text(metaX,y+31,p.role,9,'#5c535c',metaW);
  a.text(metaX,y+54,p.group,9,'#5c535c',metaW);
  a.text(metaX,y+65,p.gender==='f'?'woman':'man',9,'#5c535c',metaW);
  const sy=y+82;
  if(!locked)this.hit(x+3,y+3,w-6,sy-y-6,()=>{
   this.tool='place';this.confirmNew=false;
   if(selected){this.puzzle.clearSelection();this.feedback='Selection cleared.';}
   else{this.puzzle.selectPerson(p.id);this.feedback=`${p.name}: choose a square to place or move them.`;}
   this.ui.render();
  });
  const bottom=s.allPlaced?52:24,maxLines=Math.max(1,Math.floor((y+h-bottom-sy)/15));
  const chunks=this.statementChunks(s.clues.filter(c=>c.personId===p.id).map(c=>c.text),w-16,maxLines),index=Math.min(this.statementPage[p.id]||0,chunks.length-1);
  a.text(x+8,sy,chunks[index],12,'#352e37',w-16);
  const pagerY=y+h-(s.allPlaced?48:18);
  if(chunks.length>1){
   a.text(x+w-8,pagerY,`${index+1}/${chunks.length} >`,10,'#79566a').setOrigin(1,0);
   this.hit(x+5,sy,w-10,Math.max(15,pagerY+14-sy),()=>{this.statementPage[p.id]=(index+1)%chunks.length;this.ui.render();});
  }
  if(s.allPlaced)this.button(x+7,y+h-29,w-14,cleared?'CLEARED':chosen?'ACCUSE '+p.name:'SUSPECT',()=>{
   if(!this.puzzle.allPlaced()){this.accused=null;this.feedback='Place everyone first.';this.ui.render();return;}
   this.confirmNew=false;
   if(this.accused===p.id){this.feedback=this.puzzle.submitGuess(p.id).message;this.accused=null;}
   else{this.accused=p.id;this.feedback=`Accuse ${p.name}? Click ACCUSE on this card to confirm.`;}
   this.ui.render();
  },{enabled:!locked&&!cleared,active:chosen});
 }
 drawBoard(x,y,side,s){
  const a=this.art,n=s.size,visible=this.zoom?Math.min(4,n):n,cell=side/visible;
  const r0=this.zoom?Math.max(0,Math.min(this.offsetRow,n-visible)):0,c0=this.zoom?Math.max(0,Math.min(this.offsetCol,n-visible)):0;this.offsetRow=r0;this.offsetCol=c0;
  const shadow=a.graphic();shadow.fillStyle(0x2e2537,0.2);shadow.fillRect(x+6,y+8,side,side);
  const layer=this.ui.scene.add.container(x,y);this.ui.drawing.add(layer);a.parent=layer;
  try{
   const floors=a.graphic();
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++)a.floor(floors,vc*cell,vr*cell,cell,s.layout[r0+vr][c0+vc],r0+vr,c0+vc);
   for(const o of [...s.objects].sort((a,b)=>(a.kind==='rug'?-1:0)-(b.kind==='rug'?-1:0))){
    if(o.row+o.h<=r0||o.col+o.w<=c0||o.row>=r0+visible||o.col>=c0+visible)continue;
    a.furniture(o,(o.col-c0)*cell,(o.row-r0)*cell,o.w*cell,o.h*cell);
   }
   const grid=a.graphic();grid.lineStyle(1,0x302934,0.65);
   for(let i=0;i<=visible;i++){grid.lineBetween(i*cell,0,i*cell,side);grid.lineBetween(0,i*cell,side,i*cell);}
   const walls=a.graphic();walls.lineStyle(Math.max(4,cell*0.065),0x201e27,1);
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,room=s.layout[r][c],px=vc*cell,py=vr*cell;
    if(vr===0||s.layout[r-1][c]!==room)walls.lineBetween(px,py,px+cell,py);
    if(vc===0||s.layout[r][c-1]!==room)walls.lineBetween(px,py,px,py+cell);
    if(vr===visible-1)walls.lineBetween(px,py+cell,px+cell,py+cell);
    if(vc===visible-1)walls.lineBetween(px+cell,py,px+cell,py+cell);
   }
   for(const room of new Set(s.layout.flat())){
    let best=null;
    for(let vr=0;vr<visible;vr++)for(let start=0;start<visible;start++){
     if(s.layout[r0+vr][c0+start]!==room)continue;
     let len=0;while(start+len<visible&&s.layout[r0+vr][c0+start+len]===room)len++;
     const hasPerson=s.board[r0+vr].slice(c0+start,c0+start+len).some(Boolean),score=len-(hasPerson?0.4:0);
     if(!best||score>best.score)best={vr,start,len,score};
    }
    if(!best)continue;
    const text=ROOM_SHORT[room]||s.roomNames[room],font=Math.min(10,Math.max(7,best.len*cell/(text.length*0.72)));
    const tag=a.text((best.start+best.len/2)*cell,best.vr*cell+5,text,font,'#fff7ed').setOrigin(0.5,0);
    if(tag.width>best.len*cell-8)tag.setScale((best.len*cell-8)/tag.width,1);
    tag.setShadow(1,1,'#211c28',2,true,true);
   }
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,id=s.board[r][c],px=vc*cell,py=vr*cell;
    if(!id&&(s.crosses[r][c]||s.autoCrosses[r][c])){
     const manual=s.crosses[r][c],g=a.graphic();g.lineStyle(manual?3:1.8,manual?0x624151:0x806c84,manual?0.9:0.42);
     g.lineBetween(px+cell*0.32,py+cell*0.32,px+cell*0.68,py+cell*0.68);g.lineBetween(px+cell*0.68,py+cell*0.32,px+cell*0.32,py+cell*0.68);
    }
    if(id){
     const person=s.people.find(p=>p.id===id);a.pawn(person,px+cell*0.14,py+cell*0.04,cell*0.72);
     a.nameTag(px+cell/2,py+cell-10,person.name,cell-5,Math.min(14,Math.max(11,cell*0.2)));
    }
   }
  }finally{a.parent=null;}
  const matrix=layer.getWorldTransformMatrix?.();
  if(matrix&&this.ui.scene.make?.graphics){
   const top=matrix.transformPoint(0,0),bottom=matrix.transformPoint(side,side),maskGraphic=this.ui.scene.make.graphics({add:false});
   maskGraphic.fillStyle(0xffffff,1);maskGraphic.fillRect(top.x,top.y,bottom.x-top.x,bottom.y-top.y);
   const mask=maskGraphic.createGeometryMask();layer.setMask(mask);layer.once('destroy',()=>{mask.destroy();maskGraphic.destroy();});
  }
  for(let i=0;i<visible;i++){
   a.text(x+i*cell+cell/2,y-15,String(c0+i+1),10,'#6f6069').setOrigin(0.5,0);a.text(x-11,y+i*cell+cell/2,String(r0+i+1),10,'#6f6069').setOrigin(0.5);
  }
  const border=a.graphic();border.lineStyle(4,0x201e27,1);border.strokeRect(x,y,side,side);
  if(!s.completed&&!s.failed)for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
   const r=r0+vr,c=c0+vc;this.hit(x+vc*cell+2,y+vr*cell+2,cell-4,cell-4,()=>this.clickCell(r,c));
  }
 }
 clickCell(r,c){
  this.confirmNew=false;
  if(this.puzzle.isBlocked(r,c)){this.feedback='Furniture blocks this square.';this.ui.render();return;}
  const id=this.puzzle.board[r][c];
  if(this.tool==='erase')this.puzzle.removePerson(r,c);
  else if(this.tool==='cross'){if(id)this.feedback='Use ERASE to remove a person. X marks empty squares only.';else this.puzzle.toggleCross(r,c);}
  else if(this.puzzle.selectedPersonId){this.puzzle.placePerson(r,c);this.feedback=this.puzzle.allPlaced()?'Everyone is on the map. You may now choose a suspect.':'Pale X updated for this row, column and room.';}
  else if(id){this.puzzle.removePerson(r,c);this.puzzle.selectPerson(id);this.feedback='Picked up. Automatic X updated; your own notes are kept.';}
  else this.feedback='Choose a portrait on the left first.';
  if(!this.puzzle.allPlaced())this.accused=null;this.ui.render();
 }
 drawTools(x,y,s){
  const locked=s.completed||s.failed;
  [['X','cross'],['ERASE','erase'],['PLACE','place']].forEach(([label,tool],i)=>this.button(x,y+i*31,43,label,()=>{this.tool=tool;if(tool!=='place')this.puzzle.clearSelection();this.ui.render();},{active:this.tool===tool,enabled:!locked}));
  this.button(x,y+98,43,'UNDO',()=>{this.puzzle.undo();if(!this.puzzle.allPlaced())this.accused=null;this.ui.render();},{enabled:s.canUndo&&!locked});
  this.button(x,y+136,43,this.zoom?'ALL':'ZOOM',()=>{this.zoom=!this.zoom;this.offsetRow=0;this.offsetCol=0;this.ui.render();},{enabled:s.size>4});
  [['UP',-1,0],['DN',1,0],['<',0,-1],['>',0,1]].forEach(([label,dr,dc],i)=>{
   const r=this.offsetRow+dr,c=this.offsetCol+dc;this.button(x,y+167+i*29,43,label,()=>{this.offsetRow=r;this.offsetCol=c;this.ui.render();},{enabled:this.zoom&&r>=0&&c>=0&&r<=s.size-4&&c<=s.size-4});
  });
  this.button(x,y+289,43,'HELP',()=>{this.help=!this.help;this.ui.render();},{active:this.help});this.art.text(x+21,y+328,`${s.attempts}/3`,12,'#7a4c56').setOrigin(0.5,0);
 }
 drawHelp(x,y,side,s){
  const a=this.art,g=a.graphic();a.panel(g,x+8,y+15,side-16,side-30,0xfff8e6,8);a.text(x+22,y+28,'THE HOUSE RULES',16,'#3c3242',side-44);
  const pages=[
   ['One person per row, column AND room. There are as many rooms as suspects.',
    'The person in the room with the empty display is the thief.',
    'A grey portrait means that person is on the map. You can still select and move them.',
    'Place everyone to unlock SUSPECT / ACCUSE. Accusations check the identity, not your whole arrangement.'],
   ['Pale X: an occupied row, column or room. These marks update automatically.',
    'Dark X: your own notes. Moving a person does not erase them.',
    'X marks empty squares only. ERASE removes a person or a note. UNDO restores the previous move.',
    'Beds, chairs, benches and carpets may be occupied. Other furniture blocks squares.'],
   ['Beside means sharing an edge in the SAME room. No diagonals.',
    'North/south means a higher/lower row, regardless of column. One row south means a difference of exactly one.',
    'Either/or includes both. Counts exclude the speaker. Roles and groups appear on the cards.',
    'Click statements to turn pages. Three wrong accusations end the case. Three wins unlock the next size.']
  ];
  this.helpPage=Math.max(0,Math.min(this.helpPage,pages.length-1));
  a.text(x+22,y+59,pages[this.helpPage].join('\n\n'),side<380?10:12,'#4d414d',side-44);
  this.hit(x+8,y+15,side-16,side-30,()=>{});
  this.button(x+20,y+side-47,60,'CLOSE',()=>{this.help=false;this.ui.render();});
  this.button(x+side-95,y+side-47,75,`${this.helpPage+1}/3 NEXT`,()=>{this.helpPage=(this.helpPage+1)%3;this.ui.render();});
 }
 checkBoard(){if(this.destroyed)return;this.feedback=this.puzzle.submitGuess(this.accused).message;this.accused=null;this.ui.render();}
 destroy(){if(this.destroyed)return;this.puzzle.save();this.destroyed=true;this.ui=null;this.art=null;this.puzzle=null;}
}
