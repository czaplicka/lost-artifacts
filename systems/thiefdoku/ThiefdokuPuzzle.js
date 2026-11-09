const SIZE = 4;
const PEOPLE = [
 {id:'curator',name:'Victor',role:'Curator',short:'VIC',gender:'m',group:'resident',skin:0xd6a070,hair:0x654431,shirt:0xd7854e},
 {id:'guard',name:'Dorian',role:'Night guard',short:'DOR',gender:'m',group:'staff',skin:0xe1af83,hair:0x46342f,shirt:0x9962a2},
 {id:'assistant',name:'Nora',role:'Assistant',short:'NORA',gender:'f',group:'staff',skin:0xe8bd91,hair:0xe7cd6a,shirt:0x5b8ebc},
 {id:'cleaner',name:'Beryl',role:'Cleaner',short:'BER',gender:'f',group:'staff',skin:0xb97f66,hair:0x2e303b,shirt:0x60a47e},
 {id:'cook',name:'Felix',role:'Cook',short:'FEL',gender:'m',group:'staff',skin:0xdba882,hair:0x54382d,shirt:0xb96061},
 {id:'gardener',name:'Mina',role:'Gardener',short:'MINA',gender:'f',group:'staff',skin:0x9b694e,hair:0x352d2b,shirt:0x69944c},
 {id:'butler',name:'Edgar',role:'Butler',short:'EDG',gender:'m',group:'staff',skin:0xe2b58d,hair:0x734d36,shirt:0x4e667f},
 {id:'guest',name:'Ruby',role:'House guest',short:'RUBY',gender:'f',group:'resident',skin:0xeac3a0,hair:0xa65036,shirt:0xd89e54},
 {id:'driver',name:'Dante',role:'Driver',short:'DAN',gender:'m',group:'staff',skin:0xb9805d,hair:0x37302d,shirt:0x537e93},
 {id:'neighbour',name:'Iris',role:'Neighbour',short:'IRIS',gender:'f',group:'resident',skin:0xd2a185,hair:0xb4b6bd,shirt:0x957da9}
];
const THEMES={
 house:{name:'PRIVATE HOUSE',rooms:['bathroom','kitchen','bedroom','living','study','dining','guest_room','laundry','conservatory','attic'],items:['a diamond necklace','a gold watch','a rare first edition','a very expensive teaspoon'],roles:['Collector','Night guard','Assistant','Cleaner','Cook','Gardener','Butler','House guest','Driver','Neighbour']},
 museum:{name:'MUSEUM',rooms:['gallery','sculpture_hall','archive','restoration_lab','museum_reception','gift_shop','security','exhibit_hall','museum_kitchen','museum_bathroom'],items:['a golden scarab','an ancient mask','a suspiciously modern antiquity','a miniature marble emperor'],roles:['Curator','Security guard','Researcher','Cleaner','Cafe cook','Botanist','Conservator','Art dealer','Courier','Visitor']},
 office:{name:'OFFICE',rooms:['reception','open_office','conference','office_kitchen','ceo_office','library','copy_room','accounts','break_room','office_bathroom'],items:['the golden stapler','a prototype microchip','a confidential file','the Employee of the Month trophy'],roles:['CEO','Security guard','Executive assistant','Cleaner','Caterer','Facilities manager','Accountant','Consultant','Courier','Client']}
};
const ROOM_NAMES={
 bathroom:'BATHROOM',kitchen:'KITCHEN',bedroom:'MAIN BEDROOM',living:'LIVING ROOM',study:'STUDY',dining:'DINING ROOM',guest_room:'GUEST ROOM',laundry:'LAUNDRY',conservatory:'CONSERVATORY',attic:'ATTIC',
 gallery:'ART GALLERY',sculpture_hall:'SCULPTURE HALL',archive:'ARCHIVE',restoration_lab:'RESTORATION LAB',museum_reception:'MUSEUM LOBBY',gift_shop:'GIFT SHOP',security:'SECURITY ROOM',exhibit_hall:'EXHIBIT HALL',museum_kitchen:'MUSEUM KITCHEN',museum_bathroom:'MUSEUM WC',
 reception:'RECEPTION',open_office:'CUBICLES',conference:'CONFERENCE ROOM',office_kitchen:'OFFICE KITCHEN',ceo_office:'CEO OFFICE',library:'LIBRARY',copy_room:'COPY ROOM',accounts:'ACCOUNTS',break_room:'BREAK ROOM',office_bathroom:'OFFICE WC'
};
const FURNITURE={
 rug:{label:'a carpet',w:2,h:2,blocking:false,on:true},bed:{label:'a bed',w:1,h:2,blocking:false,on:true},chair:{label:'a chair',w:1,h:1,blocking:false,on:true},bench:{label:'a bench',w:2,h:1,blocking:false,on:true},
 sofa:{label:'a sofa',w:2,h:1,blocking:true},table:{label:'a table',w:2,h:1,blocking:true},shelf:{label:'a shelf',w:1,h:1,blocking:true},plant:{label:'a plant',w:1,h:1,blocking:true},tv:{label:'the TV',w:1,h:1,blocking:true},bath:{label:'a bath',w:1,h:2,blocking:true},
 display:{label:'the empty display',w:1,h:1,blocking:true},toilet:{label:'a toilet',w:1,h:1,blocking:true},sink:{label:'a sink',w:1,h:1,blocking:true},fridge:{label:'a fridge',w:1,h:1,blocking:true},stove:{label:'a stove',w:1,h:1,blocking:true},
 statue:{label:'a statue',w:1,h:1,blocking:true},exhibit:{label:'an exhibit case',w:1,h:1,blocking:true},desk:{label:'a desk',w:2,h:1,blocking:true},computer:{label:'a computer desk',w:1,h:1,blocking:true},cabinet:{label:'a filing cabinet',w:1,h:1,blocking:true},trash:{label:'a trash can',w:1,h:1,blocking:true},copier:{label:'a copier',w:1,h:1,blocking:true},washer:{label:'a washing machine',w:1,h:1,blocking:true}
};
const ROOM_FURNITURE={
 bathroom:['toilet','sink','bath'],museum_bathroom:['toilet','sink'],office_bathroom:['toilet','sink'],
 kitchen:['fridge','stove','sink'],museum_kitchen:['fridge','stove','sink'],office_kitchen:['fridge','stove','sink'],
 bedroom:['bed','cabinet'],guest_room:['bed','plant'],living:['sofa','tv','plant'],study:['shelf','desk','plant'],dining:['table','plant'],laundry:['washer','sink'],conservatory:['plant','bench'],attic:['cabinet','shelf'],
 gallery:['statue','exhibit','bench'],sculpture_hall:['statue','bench','plant'],archive:['shelf','cabinet'],restoration_lab:['exhibit','computer','sink'],museum_reception:['computer','plant'],gift_shop:['exhibit','shelf'],security:['computer','cabinet'],exhibit_hall:['exhibit','statue','bench'],
 reception:['computer','plant'],open_office:['computer','cabinet','trash'],conference:['table','computer'],ceo_office:['desk','cabinet','plant'],library:['shelf','bench'],copy_room:['copier','cabinet','trash'],accounts:['computer','cabinet'],break_room:['sofa','trash','plant']
};
const clone=x=>JSON.parse(JSON.stringify(x));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function storageDefault(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch(_){return null;}}
const all=values=>values.some(v=>v===false)?false:values.every(v=>v===true)?true:null;
const any=values=>values.some(v=>v===true)?true:values.every(v=>v===false)?false:null;

export class ThiefdokuPuzzle {
 constructor(options={}){
  this.options=options;this.storage=options.storage===undefined?storageDefault():options.storage;
  this.storageKey=options.storageKey||'lost-artifacts.thiefdoku.illustrated.v1';
  this.solved=0;this.saveError=false;this.history=[];this.migrated=false;
  if(!this.restore())this.reset();
 }
 sizeForProgress(){return Number.isInteger(this.options.size)?clamp(this.options.size,4,10):clamp(4+Math.floor(this.solved/3),4,10);}
 makePeople(){
  return clone(PEOPLE.slice(0,this.size)).map((p,i)=>({...p,role:THEMES[this.theme].roles[i],group:this.theme==='house'?p.group:['guest','driver','neighbour'].includes(p.id)?'visitor':'staff'}));
 }
 valid(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&c>=0&&r<this.size&&c<this.size;}
 roomAt(p){return this.layout[p.row][p.col];}
 covers(o,r,c){return r>=o.row&&r<o.row+o.h&&c>=o.col&&c<o.col+o.w;}
 objectsAt(r,c){return this.objects.filter(o=>this.covers(o,r,c));}
 isBlocked(r,c){return this.objectsAt(r,c).some(o=>o.blocking);}
 beside(p,o){
  if(this.roomAt(p)!==this.layout[o.row][o.col]||this.covers(o,p.row,p.col))return false;
  return Math.max(o.row-p.row,0,p.row-o.row-o.h+1)+Math.max(o.col-p.col,0,p.col-o.col-o.w+1)===1;
 }
 unary(p,c){
  switch(c.type){
   case 'room':return this.roomAt(p)===c.roomId;
   case 'notRoom':return this.roomAt(p)!==c.roomId;
   case 'row':return p.row===c.value;case 'col':return p.col===c.value;
   case 'on':return this.objects.some(o=>o.kind===c.kind&&this.covers(o,p.row,p.col));
   case 'notOn':return !this.objects.some(o=>o.kind===c.kind&&this.covers(o,p.row,p.col));
   case 'beside':return this.objects.some(o=>o.kind===c.kind&&this.beside(p,o));
   case 'notBeside':return !this.objects.some(o=>o.kind===c.kind&&this.beside(p,o));
   default:return false;
  }
 }
 pair(a,b,type,value=1){
  switch(type){
   case 'north':return a.row<b.row;case 'south':return a.row>b.row;
   case 'west':return a.col<b.col;case 'east':return a.col>b.col;
   case 'rowDelta':return a.row-b.row===value;
   case 'notAdjacentColumn':return Math.abs(a.col-b.col)!==1;
   default:return false;
  }
 }
 inGroup(person,filter={}){return Object.entries(filter).every(([key,value])=>person[key]===value);}
 targets(c,id){return this.people.filter(p=>p.id!==id&&this.inGroup(p,c.filter||{}));}
 evaluateRule(c,assigned,subject){
  const id=c.subjectId||subject;
  if(c.type==='all')return all(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='any')return any(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='not'){const v=this.evaluateRule(c.rule,assigned,id);return v===null?null:!v;}
  const a=assigned.get(id);if(!a)return null;
  if(c.otherId){const b=assigned.get(c.otherId);return b?this.pair(a,b,c.type,c.value):null;}
  if(c.type==='onlyOn'){
   if(!this.unary(a,{type:'on',kind:c.kind}))return false;
   let unknown=false;
   for(const p of this.people)if(p.id!==id){const b=assigned.get(p.id);if(!b)unknown=true;else if(this.unary(b,{type:'on',kind:c.kind}))return false;}
   return unknown?null:true;
  }
  if(c.type==='countRelative'){
   let yes=0,unknown=0;
   for(const p of this.targets(c,id)){const b=assigned.get(p.id);if(!b)unknown++;else if(this.pair(b,a,c.direction))yes++;}
   if(yes>c.count||yes+unknown<c.count)return false;
   return unknown?null:yes===c.count;
  }
  if(c.type==='rowDeltaGroup'){
   let unknown=false;
   for(const p of this.targets(c,id)){const b=assigned.get(p.id);if(!b)unknown=true;else if(a.row-b.row===c.value)return true;}
   return unknown?null:false;
  }
  return this.unary(a,c);
 }
 evaluate(clue,assigned){return this.evaluateRule(clue.rule||clue,assigned,clue.personId);}
 matchesClue(solution,c){return this.evaluate(c,new Map(solution.map(p=>[p.personId,p])))===true;}
 dependencies(clue){
  const found=new Set();
  const visit=(c,subject)=>{
   const id=c.subjectId||subject;found.add(id);
   if(c.type==='all'||c.type==='any'){c.rules.forEach(r=>visit(r,id));return;}
   if(c.type==='not'){visit(c.rule,id);return;}
   if(c.otherId)found.add(c.otherId);
   if(c.type==='onlyOn')this.people.forEach(p=>found.add(p.id));
   if(c.type==='countRelative'||c.type==='rowDeltaGroup')this.targets(c,id).forEach(p=>found.add(p.id));
  };visit(clue.rule||clue,clue.personId);return found;
 }
 solve(clues=this.clues,{limit=2,maxNodes=4000}={}){
  const n=this.size,rooms=[...new Set(this.layout.flat())],roomIndex=new Map(rooms.map((r,i)=>[r,i])),cells=[],assigned=new Map();
  if(rooms.length!==n)return{solutions:[],exhausted:false,nodes:0};
  for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(!this.isBlocked(row,col))cells.push({row,col,roomBit:1<<roomIndex.get(this.layout[row][col])});
  const records=clues.map(c=>({clue:c,deps:this.dependencies(c)}));
  const domains=this.people.map(person=>{
   const own=records.filter(r=>r.deps.size===1&&r.deps.has(person.id));
   return cells.filter(p=>{assigned.set(person.id,p);const ok=own.every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(person.id);return ok;});
  });
  const affected=this.people.map(p=>records.filter(r=>r.deps.size>1&&r.deps.has(p.id))),chosen=Array(n).fill(null),solutions=[];
  let nodes=0,exhausted=false;
  const compatible=(i,p)=>{const id=this.people[i].id;assigned.set(id,p);const ok=affected[i].every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(id);return ok;};
  const bits=v=>{let k=0;while(v){v&=v-1;k++;}return k;};
  const walk=(usedRows,usedCols,usedRooms,depth)=>{
   if(exhausted||solutions.length>=limit)return;
   if(++nodes>maxNodes){exhausted=true;return;}
   if(depth===n){if(clues.every(c=>this.evaluate(c,assigned)===true))solutions.push(chosen.map((p,i)=>({personId:this.people[i].id,row:p.row,col:p.col})));return;}
   let best=-1,values=null,possibleRows=0,possibleCols=0,possibleRooms=0;
   for(let i=0;i<n;i++)if(!chosen[i]){
    const avail=domains[i].filter(p=>!(usedRows&(1<<p.row))&&!(usedCols&(1<<p.col))&&!(usedRooms&p.roomBit)&&compatible(i,p));
    if(!avail.length)return;
    for(const p of avail){possibleRows|=1<<p.row;possibleCols|=1<<p.col;possibleRooms|=p.roomBit;}
    if(values===null||avail.length<values.length){best=i;values=avail;}
   }
   if(bits(possibleRows)<n-depth||bits(possibleCols)<n-depth||bits(possibleRooms)<n-depth)return;
   for(const p of values){
    const id=this.people[best].id;chosen[best]=p;assigned.set(id,p);
    walk(usedRows|(1<<p.row),usedCols|(1<<p.col),usedRooms|p.roomBit,depth+1);
    chosen[best]=null;assigned.delete(id);if(exhausted||solutions.length>=limit)return;
   }
  };walk(0,0,0,0);return{solutions,exhausted,nodes};
 }
 neighbours(row,col){return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].filter(([r,c])=>this.valid(r,c));}
 makeLayout(){
  const n=this.size,roomIds=shuffle(THEMES[this.theme].rooms.slice(0,n));
  const cols=shuffle(Array.from({length:n},(_,i)=>i));
  this.solution=shuffle(this.people).map((p,row)=>({personId:p.id,row,col:cols[row]}));
  for(let attempt=0;attempt<60;attempt++){
   const layout=Array.from({length:n},()=>Array(n).fill(null)),regions=this.solution.map((p,i)=>({id:roomIds[i],cells:[[p.row,p.col]]}));
   this.solution.forEach((p,i)=>{layout[p.row][p.col]=roomIds[i];});
   let remaining=n*n-n;
   while(remaining){
    const choices=regions.map(region=>{
     const edge=new Map();for(const [r,c] of region.cells)for(const [rr,cc] of this.neighbours(r,c))if(layout[rr][cc]===null)edge.set(`${rr},${cc}`,[rr,cc]);
     return{region,edge:[...edge.values()]};
    }).filter(q=>q.edge.length);
    if(!choices.length)break;
    const minimum=Math.min(...choices.map(q=>q.region.cells.length)),small=choices.filter(q=>q.region.cells.length<=minimum+(minimum<2?0:1)),choice=pick(small),[r,c]=pick(choice.edge);
    layout[r][c]=choice.region.id;choice.region.cells.push([r,c]);remaining--;
   }
   if(!remaining&&regions.every(r=>r.cells.length>=2)){this.layout=layout;return;}
  }
  // Connected, valid fallback: one vertical room per seed column.
  const byCol=new Map(this.solution.map((p,i)=>[p.col,roomIds[i]]));
  this.layout=Array.from({length:n},()=>Array.from({length:n},(_,c)=>byCol.get(c)));
 }
 addFurniture(){
  this.objects=[];let serial=0;
  const rooms=[...new Set(this.layout.flat())];
  const canPlace=(kind,r,c,w,h,overRug)=>{
   const def=FURNITURE[kind];if(!this.valid(r,c)||!this.valid(r+h-1,c+w-1))return false;
   const room=this.layout[r][c];
   for(let rr=r;rr<r+h;rr++)for(let cc=c;cc<c+w;cc++){
    if(this.layout[rr][cc]!==room||this.objectsAt(rr,cc).some(o=>!overRug||o.kind!=='rug'))return false;
    if(def.blocking&&this.solution.some(p=>p.row===rr&&p.col===cc))return false;
   }
   if(def.blocking&&kind!=='display'){
    let open=0,total=0;for(let rr=0;rr<this.size;rr++)for(let cc=0;cc<this.size;cc++)if(this.layout[rr][cc]===room){total++;if(!this.isBlocked(rr,cc))open++;}
    if(open-w*h<Math.min(2,total-1))return false;
   }return true;
  };
  const place=(kind,room,preferred=null)=>{
   const def=FURNITURE[kind],shapes=def.w===def.h?[[def.w,def.h]]:[[def.w,def.h],[def.h,def.w]];
   let candidates=[];
   for(const [w,h] of shapes)for(let r=0;r<this.size;r++)for(let c=0;c<this.size;c++)if(this.layout[r][c]===room&&canPlace(kind,r,c,w,h,kind!=='rug'))candidates.push({row:r,col:c,w,h});
   if(preferred){const on=candidates.filter(o=>this.covers(o,preferred.row,preferred.col));if(on.length)candidates=on;}
   if(!candidates.length)return false;
   this.objects.push({...pick(candidates),id:`${kind}_${serial++}`,kind,blocking:def.blocking});return true;
  };
  if(!place('display',this.theftRoom))throw Error('No space for the empty display.');
  for(const room of rooms){if(this.size>=5)place('rug',room);}
  for(const room of rooms){
   const list=ROOM_FURNITURE[room]||['plant','shelf'];
   for(const kind of list)place(kind,room);
  }
  const seated=shuffle(this.solution).slice(0,pick([1,2,Math.max(2,Math.floor(this.size/2))]));
  for(const p of seated)place('chair',this.roomAt(p),p);
  if(this.size>=6)for(const room of shuffle(rooms).slice(0,Math.floor(this.size/3)))place('plant',room);
 }
 reset(){
  this.size=this.sizeForProgress();
  this.theme=THEMES[this.options.theme]?this.options.theme:pick(Object.keys(THEMES).filter(id=>id!==this.theme));
  this.people=this.makePeople();this.makeLayout();
  const thief=pick(this.solution);this.theftRoom=this.roomAt(thief);this.thiefId=thief.personId;this.stolenItem=pick(THEMES[this.theme].items);
  this.addFurniture();this.makeClues();
  this.board=Array.from({length:this.size},()=>Array(this.size).fill(null));this.crosses=Array.from({length:this.size},()=>Array(this.size).fill(false));
  this.selectedPersonId=null;this.attempts=0;this.maxAttempts=3;this.completed=false;this.failed=false;this.wrongAccusations=[];this.history=[];
  this.save();return this.getState();
 }
 makeClues(){
  const pool=[],seen=new Set(),positions=new Map(this.solution.map(p=>[p.personId,p])),kinds=[...new Set(this.objects.map(o=>o.kind))],rooms=[...new Set(this.layout.flat())];
  const add=(personId,rule,text,family=rule.type)=>{
   const key=personId+JSON.stringify(rule)+family;if(seen.has(key))return;
   const clue={personId,rule,text,family};if(this.matchesClue(this.solution,clue)){pool.push(clue);seen.add(key);}
  };
  const onText=kind=>kind==='chair'?'Sitting in a chair.':kind==='bench'?'Sitting on a bench.':`On ${FURNITURE[kind].label}.`;
  for(const person of this.people){
   const id=person.id,p=positions.get(id),room=this.roomAt(p),others=this.people.filter(q=>q.id!==id),roomRule={type:'room',roomId:room};
   add(id,roomRule,`In the ${ROOM_NAMES[room].toLowerCase()}.`);
   for(const r of rooms)if(r!==room)add(id,{type:'notRoom',roomId:r},`Not in the ${ROOM_NAMES[r].toLowerCase()}.`);
   if(p.row===0||p.row===this.size-1)add(id,{type:'row',value:p.row},`In the ${p.row===0?'top':'bottom'} row.`,'edge');
   if(p.col===0||p.col===this.size-1)add(id,{type:'col',value:p.col},`In the ${p.col===0?'first':'last'} column.`,'edge');
   for(const kind of kinds){
    const def=FURNITURE[kind];
    if(def.on){
     add(id,{type:'on',kind},onText(kind));
     add(id,{type:'notOn',kind},kind==='chair'?'Not sitting in a chair.':`Not on ${def.label}.`);
     add(id,{type:'onlyOn',kind},kind==='chair'?'The only person sitting in a chair.':`The only person on ${def.label}.`,'only');
    }
    add(id,{type:'beside',kind},`Beside ${def.label}.`);
    add(id,{type:'notBeside',kind},`Not beside ${def.label}.`);
    add(id,{type:'all',rules:[roomRule,{type:'notBeside',kind}]},`In the ${ROOM_NAMES[room].toLowerCase()}. Not beside ${def.label}.`,'compound');
    if(p.row===0||p.row===this.size-1)add(id,{type:'all',rules:[{type:'row',value:p.row},{type:'on',kind}]},`${onText(kind)} In the ${p.row===0?'top':'bottom'} row.`,'compound');
   }
   const alternate=shuffle(kinds).slice(0,5);
   for(let i=0;i<alternate.length-1;i++){
    const a=alternate[i],b=alternate[i+1];
    add(id,{type:'any',rules:[{type:'beside',kind:a},{type:'beside',kind:b}]},`Beside ${FURNITURE[a].label} or ${FURNITURE[b].label} (or both).`,'either');
   }
   for(const other of others){
    const q=positions.get(other.id);
    for(const direction of ['north','south','east','west']){
     add(id,{type:direction,otherId:other.id},`${direction[0].toUpperCase()+direction.slice(1)} of ${other.name}.`,'direction');
     add(id,{type:direction,otherId:other.id},`${direction[0].toUpperCase()+direction.slice(1)} of the ${other.role.toLowerCase()}.`,'role');
    }
    add(id,{type:'notAdjacentColumn',otherId:other.id},`My column was not next to ${other.name}'s column.`,'columnGap');
    if(Math.abs(p.row-q.row)===1)add(id,{type:'rowDelta',otherId:other.id,value:p.row-q.row},`Exactly one row ${p.row>q.row?'south':'north'} of ${other.name}.`,'distance');
   }
   const groups=[[{gender:'f'},'women','a woman'],[{gender:'m'},'men','a man'],[{group:'staff'},'staff members','a staff member'],[{group:'resident'},'residents','a resident'],[{group:'visitor'},'visitors','a visitor']];
   for(const [filter,label,singular] of groups){
    const members=others.filter(q=>this.inGroup(q,filter));if(!members.length)continue;
    add(id,{type:'rowDeltaGroup',filter,value:1},`Exactly one row south of ${singular}.`,'groupDistance');
    if(members.length>=2)for(const direction of ['south','west']){
     const count=members.filter(q=>this.pair(positions.get(q.id),p,direction)).length;
     add(id,{type:'countRelative',filter,direction,count},`Exactly ${count} ${label} were ${direction} of me.`,'count');
    }
   }
   for(const gender of ['f','m'])for(const group of ['resident','staff','visitor']){
    const members=this.people.filter(q=>q.gender===gender&&q.group===group);if(members.length!==1||members[0].id===id)continue;
    const other=members[0];
    for(const direction of ['north','south','east','west'])add(id,{type:direction,otherId:other.id},`${direction[0].toUpperCase()+direction.slice(1)} of the only ${gender==='f'?'woman':'man'} among the ${group==='staff'?'staff members':group+'s'}.`,'uniqueRole');
   }
  }
  this.clues=[];const used=new Set();
  for(const p of shuffle(this.people)){
   const own=shuffle(pool.filter(c=>c.personId===p.id)),fresh=own.filter(c=>!used.has(c.family)),chosen=pick(fresh.length?fresh:own);
   this.clues.push(chosen);used.add(chosen.family);
  }
  let check=this.solve(this.clues,{maxNodes:600});
  const remaining=shuffle(pool.filter(c=>!this.clues.includes(c))).sort((a,b)=>Number(used.has(a.family))-Number(used.has(b.family)));
  for(const c of remaining.slice(0,this.size)){
   if(!check.exhausted&&check.solutions.length===1)break;this.clues.push(c);check=this.solve(this.clues,{maxNodes:600});
  }
  const anchors=shuffle(this.solution.flatMap(p=>[
   {personId:p.personId,rule:{type:'row',value:p.row},text:`In row ${p.row+1}.`,family:'row'},
   {personId:p.personId,rule:{type:'col',value:p.col},text:`In column ${p.col+1}.`,family:'col'}
  ]));
  for(const c of anchors){if(!check.exhausted&&check.solutions.length===1)break;this.clues.push(c);check=this.solve(this.clues,{maxNodes:600});}
  if(check.exhausted||check.solutions.length!==1)throw Error('Thiefdoku uniqueness check failed.');
  for(let i=this.clues.length-1;i>=0;i--){
   const c=this.clues[i];if(this.clues.filter(q=>q.personId===c.personId).length<=1)continue;
   const reduced=this.clues.filter((_,j)=>j!==i),result=this.solve(reduced,{maxNodes:350});
   if(!result.exhausted&&result.solutions.length===1)this.clues=reduced;
  }
 }
 checkpoint(){this.history.push({board:clone(this.board),crosses:clone(this.crosses),selectedPersonId:this.selectedPersonId});if(this.history.length>40)this.history.shift();}
 selectPerson(id){if(this.completed||this.failed||!this.people.some(p=>p.id===id))return false;this.selectedPersonId=id;this.save();return true;}
 clearSelection(){this.selectedPersonId=null;this.save();}
 autoCrosses(){
  const rows=new Set(),cols=new Set(),rooms=new Set();for(const p of this.getPlacedPeople()){rows.add(p.row);cols.add(p.col);rooms.add(this.roomAt(p));}
  return Array.from({length:this.size},(_,r)=>Array.from({length:this.size},(_,c)=>!this.board[r][c]&&!this.isBlocked(r,c)&&(rows.has(r)||cols.has(c)||rooms.has(this.layout[r][c]))));
 }
 placePerson(r,c){
  if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||!this.selectedPersonId)return false;
  this.checkpoint();const id=this.selectedPersonId;
  for(const line of this.board)for(let i=0;i<this.size;i++)if(line[i]===id)line[i]=null;
  this.board[r][c]=id;this.crosses[r][c]=false;this.selectedPersonId=null;this.save();return true;
 }
 removePerson(r,c){if(this.completed||this.failed||!this.valid(r,c)||(!this.board[r][c]&&!this.crosses[r][c]))return false;this.checkpoint();this.board[r][c]=null;this.crosses[r][c]=false;this.save();return true;}
 toggleCross(r,c){if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||this.board[r][c])return false;this.checkpoint();this.crosses[r][c]=!this.crosses[r][c];this.save();return true;}
 undo(){if(this.completed||this.failed||!this.history.length)return false;Object.assign(this,this.history.pop());this.save();return true;}
 isFixedCell(){return false;}
 getPlacedPeople(){return this.board.flatMap((line,row)=>line.flatMap((personId,col)=>personId?[{personId,row,col}]:[]));}
 allPlaced(){const p=this.getPlacedPeople();return p.length===this.people.length&&new Set(p.map(q=>q.personId)).size===this.people.length&&this.people.every(q=>p.some(v=>v.personId===q.id));}
 validateBoard(){
  const p=this.getPlacedPeople();if(!this.allPlaced())return{valid:false,reason:'Not everyone is placed.'};
  if(new Set(p.map(q=>q.row)).size!==this.size||new Set(p.map(q=>q.col)).size!==this.size||new Set(p.map(q=>this.roomAt(q))).size!==this.size)return{valid:false,reason:'One person per row, column AND room.'};
  if(p.some(q=>this.isBlocked(q.row,q.col))||!this.clues.every(c=>this.matchesClue(p,c)))return{valid:false,reason:'The statements do not match.'};
  return{valid:true};
 }
 submitGuess(id){
  if(this.completed)return{status:'completed',message:'Already solved. Open the next case.'};
  if(this.failed)return{status:'failed',message:'The thief escaped. Start another case.'};
  if(!this.allPlaced())return{status:'incomplete',message:`Place everyone first (${this.getPlacedPeople().length}/${this.people.length}).`};
  if(!this.people.some(p=>p.id===id))return{status:'invalid',message:'Choose a suspect first.'};
  if(this.wrongAccusations.includes(id))return{status:'invalid',message:'That suspect is already cleared.'};
  this.attempts++;let result;
  if(id===this.thiefId){this.completed=true;this.solved++;result={status:'success',message:`Correct! ${this.getPersonName(id)} stole ${this.stolenItem}.`};}
  else{this.wrongAccusations.push(id);this.failed=this.attempts>=this.maxAttempts;result={status:this.failed?'failed':'wrong',message:this.failed?'The thief escaped. Your paperwork was magnificent.':`Wrong suspect. ${this.maxAttempts-this.attempts} accusations left.`};}
  this.save();return result;
 }
 getPersonName(id){return this.people.find(p=>p.id===id)?.name||'Unknown';}
 getState(){return clone({size:this.size,people:this.people,layout:this.layout,objects:this.objects,board:this.board,crosses:this.crosses,autoCrosses:this.autoCrosses(),allPlaced:this.allPlaced(),placedCount:this.getPlacedPeople().length,
  theme:this.theme,themeName:THEMES[this.theme].name,roomNames:ROOM_NAMES,theftRoom:this.theftRoom,stolenItem:this.stolenItem,clues:this.clues,selectedPersonId:this.selectedPersonId,
  attempts:this.attempts,maxAttempts:this.maxAttempts,completed:this.completed,failed:this.failed,wrongAccusations:this.wrongAccusations,solved:this.solved,nextSize:this.sizeForProgress(),canUndo:this.history.length>0,saveError:this.saveError,migrated:this.migrated});}
 save(){if(!this.storage)return;try{this.storage.setItem(this.storageKey,JSON.stringify({version:3,...this.getState(),solution:this.solution,thiefId:this.thiefId}));this.saveError=false;}catch(_){this.saveError=true;}}
 connectedRoom(room){
  const cells=[];for(let r=0;r<this.size;r++)for(let c=0;c<this.size;c++)if(this.layout[r][c]===room)cells.push([r,c]);
  if(cells.length<2)return false;const seen=new Set([cells[0].join(',')]),queue=[cells[0]];
  for(let i=0;i<queue.length;i++)for(const [r,c] of this.neighbours(...queue[i]))if(this.layout[r][c]===room&&!seen.has(`${r},${c}`)){seen.add(`${r},${c}`);queue.push([r,c]);}
  return seen.size===cells.length;
 }
 restore(){
  if(!this.storage)return false;try{
   const s=JSON.parse(this.storage.getItem(this.storageKey));if(!s||![1,2,3].includes(s.version)||!Number.isInteger(s.solved)||s.solved<0)return false;
   this.solved=s.solved;
   if(s.version!==3){
    this.migrated=true;
    try{const key=this.storageKey+'.backup.before-room-rule-v3';if(!this.storage.getItem(key))this.storage.setItem(key,JSON.stringify(s));}catch(_){}
    return false;
   }
   if(!Number.isInteger(s.size)||s.size<4||s.size>10||!THEMES[s.theme])return false;
   if(Number.isInteger(this.options.size)&&s.size!==clamp(this.options.size,4,10))return false;
   if(this.options.theme&&s.theme!==this.options.theme)return false;
   const n=s.size;this.size=n;this.theme=s.theme;this.people=this.makePeople();const ids=new Set(this.people.map(p=>p.id));
   if(![s.layout,s.board,s.crosses].every(a=>Array.isArray(a)&&a.length===n&&a.every(r=>Array.isArray(r)&&r.length===n)))return false;
   if(s.layout.flat().some(r=>!THEMES[s.theme].rooms.slice(0,n).includes(r))||s.board.flat().some(id=>id!==null&&!ids.has(id))||s.crosses.flat().some(v=>typeof v!=='boolean'))return false;
   this.layout=s.layout;const rooms=[...new Set(this.layout.flat())];if(rooms.length!==n||!rooms.every(r=>this.connectedRoom(r)))return false;
   if(!Array.isArray(s.solution)||s.solution.length!==n||!Array.isArray(s.objects)||!Array.isArray(s.clues)||!Array.isArray(s.wrongAccusations))return false;
   this.objects=s.objects;
   if(this.objects.some(o=>!FURNITURE[o.kind]||o.blocking!==FURNITURE[o.kind].blocking||!Number.isInteger(o.w)||!Number.isInteger(o.h)||o.w<1||o.h<1||!this.valid(o.row,o.col)||!this.valid(o.row+o.h-1,o.col+o.w-1)))return false;
   for(const o of this.objects)for(let r=o.row;r<o.row+o.h;r++)for(let c=o.col;c<o.col+o.w;c++)if(this.layout[r][c]!==this.layout[o.row][o.col])return false;
   this.solution=s.solution;this.clues=s.clues;this.theftRoom=s.theftRoom;this.thiefId=s.thiefId;
   if(this.solution.some(p=>!ids.has(p.personId)||!this.valid(p.row,p.col)||this.isBlocked(p.row,p.col)))return false;
   if(new Set(this.solution.map(p=>p.personId)).size!==n||new Set(this.solution.map(p=>p.row)).size!==n||new Set(this.solution.map(p=>p.col)).size!==n||new Set(this.solution.map(p=>this.roomAt(p))).size!==n)return false;
   const thief=this.solution.find(p=>p.personId===this.thiefId);if(!thief||this.roomAt(thief)!==this.theftRoom)return false;
   if(this.objects.filter(o=>o.kind==='display').length!==1||this.objects.find(o=>o.kind==='display'&&this.layout[o.row][o.col]===this.theftRoom)===undefined)return false;
   if(!this.clues.every(c=>this.matchesClue(this.solution,c)))return false;
   const result=this.solve(this.clues,{maxNodes:5000});if(result.exhausted||result.solutions.length!==1)return false;
   this.board=s.board;this.crosses=s.crosses;const placed=this.getPlacedPeople();if(new Set(placed.map(p=>p.personId)).size!==placed.length||placed.some(p=>this.isBlocked(p.row,p.col)))return false;
   if(!Number.isInteger(s.attempts)||s.attempts<0||s.attempts>3)return false;
   this.stolenItem=String(s.stolenItem);this.selectedPersonId=ids.has(s.selectedPersonId)?s.selectedPersonId:null;
   this.attempts=s.attempts;this.maxAttempts=3;this.completed=Boolean(s.completed);this.failed=Boolean(s.failed);this.wrongAccusations=s.wrongAccusations.filter(id=>ids.has(id));this.history=[];this.migrated=false;
   return true;
  }catch(_){return false;}
 }
}
export {SIZE,PEOPLE,ROOM_NAMES,THEMES,FURNITURE};
