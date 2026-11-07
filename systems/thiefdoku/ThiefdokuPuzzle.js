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
const ROOM_NAMES={bathroom:'BATHROOM',study:'STUDY',bedroom:'MAIN BEDROOM',dining:'DINING ROOM',living:'LIVING ROOM',kitchen:'KITCHEN'};
const ITEMS=['a diamond necklace','a gold watch','a silver trophy','a rare first edition','a vintage camera','a very expensive teaspoon'];
const clone=x=>JSON.parse(JSON.stringify(x));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function storageDefault(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch(_){return null;}}
const and=rules=>rules.some(v=>v===false)?false:rules.every(v=>v===true)?true:null;
const or=rules=>rules.some(v=>v===true)?true:rules.every(v=>v===false)?false:null;

export class ThiefdokuPuzzle {
 constructor(options={}){
  this.options=options;this.storage=options.storage===undefined?storageDefault():options.storage;
  this.storageKey=options.storageKey||'lost-artifacts.thiefdoku.illustrated.v1';
  this.solved=0;this.saveError=false;this.history=[];
  if(!this.restore())this.reset();
 }
 sizeForProgress(){return Number.isInteger(this.options.size)?clamp(this.options.size,4,10):clamp(4+Math.floor(this.solved/3),4,10);}
 valid(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&c>=0&&r<this.size&&c<this.size;}
 roomAt(p){return this.layout[p.row][p.col];}
 covers(o,r,c){return r>=o.row&&r<o.row+o.h&&c>=o.col&&c<o.col+o.w;}
 objectsAt(r,c){return this.objects.filter(o=>this.covers(o,r,c));}
 isBlocked(r,c){return this.objectsAt(r,c).some(o=>o.blocking);}
 beside(p,o){
  if(this.roomAt(p)!==this.layout[o.row][o.col]||this.covers(o,p.row,p.col))return false;
  const dr=Math.max(o.row-p.row,0,p.row-(o.row+o.h-1));
  const dc=Math.max(o.col-p.col,0,p.col-(o.col+o.w-1));return dr+dc===1;
 }
 unary(p,c){
  switch(c.type){
   case 'room':return this.roomAt(p)===c.roomId;
   case 'notRoom':return this.roomAt(p)!==c.roomId;
   case 'row':return p.row===c.value;
   case 'col':return p.col===c.value;
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
   case 'sameRoom':return this.roomAt(a)===this.roomAt(b);
   case 'differentRoom':return this.roomAt(a)!==this.roomAt(b);
   case 'rowDelta':return a.row-b.row===value;
   case 'notAdjacentColumn':return Math.abs(a.col-b.col)!==1;
   default:return false;
  }
 }
 inGroup(person,filter={}){return Object.entries(filter).every(([key,value])=>person[key]===value);}
 targets(c,subject){
  if(c.targetIds)return this.people.filter(p=>c.targetIds.includes(p.id)&&p.id!==subject);
  return this.people.filter(p=>p.id!==subject&&this.inGroup(p,c.filter||{}));
 }
 evaluateRule(c,assigned,subjectId){
  const id=c.subjectId||subjectId;
  if(c.type==='all')return and(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='any')return or(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='not'){const v=this.evaluateRule(c.rule,assigned,id);return v===null?null:!v;}
  const a=assigned.get(id);if(!a)return null;
  if(c.otherId){const b=assigned.get(c.otherId);return b?this.pair(a,b,c.type,c.value):null;}
  if(c.type==='withUnique'){
   const targets=this.people.filter(p=>this.inGroup(p,c.filter||{}));
   if(targets.length!==1||targets[0].id===id)return false;
   const b=assigned.get(targets[0].id);return b?this.roomAt(a)===this.roomAt(b):null;
  }
  if(c.type==='onlyOn'){
   if(!this.unary(a,{type:'on',kind:c.kind}))return false;
   let unknown=false;
   for(const person of this.people)if(person.id!==id){
    const p=assigned.get(person.id);if(!p)unknown=true;else if(this.unary(p,{type:'on',kind:c.kind}))return false;
   }return unknown?null:true;
  }
  if(c.type==='roomCount'||c.type==='countRelative'||c.type==='withGroup'||c.type==='withSeated'){
   let yes=0,unknown=0;
   for(const person of this.targets(c,id)){
    const p=assigned.get(person.id);if(!p){unknown++;continue;}
    const match=c.type==='countRelative'?this.pair(p,a,c.direction):
     c.type==='withSeated'?this.roomAt(p)===this.roomAt(a)&&this.unary(p,{type:'on',kind:'chair'}):this.roomAt(p)===this.roomAt(a);
    if(match)yes++;
   }
   if(c.type==='withGroup'||c.type==='withSeated')return yes>0?true:unknown?null:false;
   if(yes>c.count||yes+unknown<c.count)return false;
   return unknown?null:yes===c.count;
  }
  if(c.type==='rowDeltaGroup'){
   let unknown=false;
   for(const person of this.targets(c,id)){
    const p=assigned.get(person.id);if(!p)unknown=true;else if(a.row-p.row===c.value)return true;
   }return unknown?null:false;
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
   if(['roomCount','countRelative','withGroup','withSeated','rowDeltaGroup','withUnique'].includes(c.type))this.targets(c,id).forEach(p=>found.add(p.id));
  };
  visit(clue.rule||clue,clue.personId);return found;
 }
 solve(clues=this.clues,{limit=2,maxNodes=4000}={}){
  const n=this.size,cells=[],assigned=new Map();
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!this.isBlocked(r,c))cells.push({row:r,col:c,theft:this.layout[r][c]===this.theftRoom});
  const records=clues.map(c=>({clue:c,deps:this.dependencies(c)}));
  const domains=this.people.map(person=>{
   const own=records.filter(r=>r.deps.size===1&&r.deps.has(person.id));
   return cells.filter(p=>{assigned.set(person.id,p);const ok=own.every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(person.id);return ok;});
  });
  const affected=this.people.map(p=>records.filter(r=>r.deps.size>1&&r.deps.has(p.id)));
  const chosen=Array(n).fill(null),solutions=[];let nodes=0,exhausted=false;
  const compatible=(i,p)=>{const id=this.people[i].id;assigned.set(id,p);const ok=affected[i].every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(id);return ok;};
  const bits=v=>{let k=0;while(v){v&=v-1;k++;}return k;};
  const walk=(rows,cols,theft,depth)=>{
   if(exhausted||solutions.length>=limit)return;
   if(++nodes>maxNodes){exhausted=true;return;}
   if(depth===n){
    if(theft===1&&clues.every(c=>this.evaluate(c,assigned)===true))solutions.push(chosen.map((p,i)=>({personId:this.people[i].id,row:p.row,col:p.col})));
    return;
   }
   let best=-1,values=null,possibleRows=0,possibleCols=0,canTheft=false;
   for(let i=0;i<n;i++)if(!chosen[i]){
    const avail=domains[i].filter(p=>!(rows&(1<<p.row))&&!(cols&(1<<p.col))&&!(theft&&p.theft)&&compatible(i,p));
    if(!avail.length)return;
    for(const p of avail){possibleRows|=1<<p.row;possibleCols|=1<<p.col;canTheft||=p.theft;}
    if(values===null||avail.length<values.length){best=i;values=avail;}
   }
   if((!theft&&!canTheft)||bits(possibleRows)<n-depth||bits(possibleCols)<n-depth)return;
   for(const p of values){
    const id=this.people[best].id;chosen[best]=p;assigned.set(id,p);
    walk(rows|(1<<p.row),cols|(1<<p.col),theft+Number(p.theft),depth+1);
    chosen[best]=null;assigned.delete(id);if(exhausted||solutions.length>=limit)return;
   }
  };
  walk(0,0,0,0);return{solutions,exhausted,nodes};
 }
 makeLayout(){
  const n=this.size,cut=Math.floor(n/2),bands=n<6?[0,cut,n]:[0,Math.floor(n/3),Math.floor(2*n/3),n];
  const names=n<6?['bathroom','study','bedroom','living']:['bathroom','bedroom','study','dining','living','kitchen'];
  this.layout=Array.from({length:n},()=>Array(n).fill(null));
  for(let b=0;b<bands.length-1;b++){
   const split=clamp(cut+(b%2===0?0:(n>4?1:0)),2,n-2);
   for(let r=bands[b];r<bands[b+1];r++)for(let c=0;c<n;c++)this.layout[r][c]=names[b*2+(c<split?0:1)];
  }
  if(n>=5){const r=bands[1]-1,c=cut-1;if(r>0&&this.layout[r][c]===names[0])this.layout[r][c]=names[1];}
 }
 addFurniture(){
  this.objects=[];let serial=0;
  const canPlace=(r,c,w,h,blocking,overRug=false)=>{
   if(!this.valid(r,c)||!this.valid(r+h-1,c+w-1))return false;const room=this.layout[r][c];
   for(let rr=r;rr<r+h;rr++)for(let cc=c;cc<c+w;cc++){
    if(this.layout[rr][cc]!==room)return false;
    if(this.objectsAt(rr,cc).some(o=>!overRug||o.kind!=='rug'))return false;
    if(blocking&&this.solution.some(p=>p.row===rr&&p.col===cc))return false;
   }return true;
  };
  const place=(kind,w,h,blocking,room=null,preferred=null,overRug=false)=>{
   let candidates=[];
   for(let r=0;r<this.size;r++)for(let c=0;c<this.size;c++)if((!room||this.layout[r][c]===room)&&canPlace(r,c,w,h,blocking,overRug))candidates.push({row:r,col:c});
   if(preferred){const near=candidates.filter(p=>this.covers({...p,w,h},preferred.row,preferred.col));if(near.length)candidates=near;}
   if(!candidates.length)return null;
   const o={...pick(candidates),id:`${kind}_${serial++}`,kind,w,h,blocking};this.objects.push(o);return o;
  };
  if(!place('display',1,1,true,this.theftRoom))throw Error('No space for the empty display.');
  const rooms=[...new Set(this.layout.flat())];
  if(this.size>=5)for(const room of rooms)place('rug',2,2,false,room);
  for(const room of rooms){
   const main=room==='bedroom'?'bed':room==='living'?'sofa':room==='dining'?'table':room==='bathroom'?'bath':'shelf';
   const footprint=main==='table'||main==='sofa'?[2,1]:main==='bed'||main==='bath'?[1,2]:[1,1];
   place(main,...footprint,main!=='bed',room,null,true);
   if(this.size>=7)place('shelf',1,1,true,room,null,true);
   place('plant',1,1,true,room,null,true);
  }
  for(const person of shuffle(this.solution).slice(0,pick([1,2,Math.max(2,Math.floor(this.size/2))])))place('chair',1,1,false,this.roomAt(person),person,true);
  if(this.size>=6){place('tv',1,1,true,'living',null,true);place('table',2,1,true,null,null,true);}
  if(this.size>=8)for(let i=0;i<3;i++)place('chair',1,1,false,null,null,true);
 }
 reset(){
  this.size=this.sizeForProgress();this.people=clone(PEOPLE.slice(0,this.size));this.makeLayout();
  let eligible=[];
  for(let attempt=0;attempt<100&&!eligible.length;attempt++){
   const cols=shuffle(Array.from({length:this.size},(_,i)=>i));
   this.solution=shuffle(this.people).map((p,row)=>({personId:p.id,row,col:cols[row]}));
   eligible=this.solution.filter(p=>this.solution.filter(q=>this.roomAt(q)===this.roomAt(p)).length===1);
  }
  if(!eligible.length){this.layout=Array.from({length:this.size},(_,r)=>Array(this.size).fill(r===0?'bathroom':'living'));eligible=this.solution.filter(p=>this.solution.filter(q=>this.roomAt(q)===this.roomAt(p)).length===1);}
  const thief=pick(eligible);this.theftRoom=this.roomAt(thief);this.thiefId=thief.personId;this.stolenItem=pick(ITEMS);
  this.addFurniture();this.makeClues();
  this.board=Array.from({length:this.size},()=>Array(this.size).fill(null));
  this.crosses=Array.from({length:this.size},()=>Array(this.size).fill(false));
  this.selectedPersonId=null;this.attempts=0;this.maxAttempts=3;this.completed=false;this.failed=false;this.wrongAccusations=[];this.history=[];
  this.save();return this.getState();
 }
 makeClues(){
  const pool=[],seen=new Set(),positions=new Map(this.solution.map(p=>[p.personId,p]));
  const labels={bed:'a bed',chair:'a chair',rug:'a carpet',table:'a table',shelf:'a shelf',plant:'a plant',tv:'the TV',sofa:'a sofa',bath:'the bath',display:'the empty display'};
  const kinds=[...new Set(this.objects.map(o=>o.kind))],rooms=[...new Set(this.layout.flat())];
  const add=(personId,rule,text,family=rule.type)=>{
   const key=personId+JSON.stringify(rule)+family;if(seen.has(key))return;
   const c={personId,rule,text,family};if(this.matchesClue(this.solution,c)){pool.push(c);seen.add(key);}
  };
  for(const person of this.people){
   const id=person.id,p=positions.get(id),room=this.roomAt(p),otherPeople=this.people.filter(q=>q.id!==id);
   add(id,{type:'room',roomId:room},`In the ${ROOM_NAMES[room].toLowerCase()}.`);
   for(const r of rooms)if(r!==room)add(id,{type:'notRoom',roomId:r},`Not in the ${ROOM_NAMES[r].toLowerCase()}.`);
   if(p.row===0||p.row===this.size-1)add(id,{type:'row',value:p.row},`In the ${p.row===0?'top':'bottom'} row.`,'edge');
   if(p.col===0||p.col===this.size-1)add(id,{type:'col',value:p.col},`In the ${p.col===0?'first':'last'} column.`,'edge');
   for(const kind of kinds){
    const on={type:'on',kind},near={type:'beside',kind};
    if(['chair','bed','rug'].includes(kind)){
     add(id,on,kind==='chair'?'Sitting in a chair.':`On ${labels[kind]}.`);
     add(id,{type:'notOn',kind},kind==='chair'?'Not sitting in a chair.':`Not on ${labels[kind]}.`);
     add(id,{type:'onlyOn',kind},kind==='chair'?'The only person sitting in a chair.':`The only person on ${labels[kind]}.`,'only');
    }
    add(id,near,`Beside ${labels[kind]}.`);
    add(id,{type:'notBeside',kind},`Not beside ${kind==='tv'?'the TV':`any ${labels[kind].replace(/^a /,'').replace(/^the /,'')}`}.`);
    add(id,{type:'all',rules:[{type:'room',roomId:room},{type:'notBeside',kind}]},`In the ${ROOM_NAMES[room].toLowerCase()}. Not beside ${labels[kind]}.`,'compound');
   }
   if(kinds.length>1){
    const pairs=shuffle(kinds).slice(0,4);
    for(let i=0;i<pairs.length-1;i++){
     const first=pairs[i],second=pairs[i+1];
     add(id,{type:'any',rules:[{type:'beside',kind:first},{type:'beside',kind:second}]},`Beside ${labels[first]} or ${labels[second]} (possibly both).`,'either');
    }
   }
   add(id,{type:'all',rules:[{type:'room',roomId:room},{type:'roomCount',count:0}]},`Alone in the ${ROOM_NAMES[room].toLowerCase()}.`,'alone');
   for(const other of otherPeople){
    const q=positions.get(other.id);
    for(const direction of ['north','south','east','west'])add(id,{type:direction,otherId:other.id},`${direction[0].toUpperCase()+direction.slice(1)} of ${other.name}.`,'direction');
    add(id,{type:'sameRoom',otherId:other.id},`In the same room as ${other.name}.`,'with');
    add(id,{type:'differentRoom',otherId:other.id},`Not in the same room as ${other.name}.`,'without');
    add(id,{type:'notAdjacentColumn',otherId:other.id},`My column was not next to ${other.name}'s column.`,'columnGap');
    if(Math.abs(p.row-q.row)===1)add(id,{type:'rowDelta',otherId:other.id,value:p.row-q.row},`Exactly one row ${p.row>q.row?'south':'north'} of ${other.name}.`,'distance');
    const sameRole=this.people.filter(v=>v.role===other.role);
    if(sameRole.length===1)add(id,{type:'sameRoom',otherId:other.id},`In the same room as the ${other.role.toLowerCase()}.`,'role');
   }
   if(otherPeople.length>=2){
    const pair=shuffle(otherPeople).slice(0,2),[a,b]=pair;
    add(id,{type:'all',rules:pair.map(q=>({type:'differentRoom',otherId:q.id}))},`Not in the same room as ${a.name} or ${b.name}.`,'compound');
    add(id,{type:'withSeated',targetIds:pair.map(q=>q.id)},`Sharing a room with ${a.name} sitting in a chair, or ${b.name} sitting in a chair (or both).`,'seatedEither');
   }
   for(const gender of ['f','m'])for(const group of ['resident','staff']){
    const filter={gender,group},targets=this.people.filter(q=>this.inGroup(q,filter));
    if(targets.length===1&&targets[0].id!==id)add(id,{type:'withUnique',filter},`In the same room as the only ${gender==='f'?'woman':'man'} among the ${group==='staff'?'staff members':'residents'}.`,'uniqueRole');
   }
   for(const [filter,name,singular] of [[{group:'staff'},'staff members','a staff member'],[{group:'resident'},'residents','a resident'],[{gender:'f'},'women','a woman'],[{gender:'m'},'men','a man']]){
    const members=otherPeople.filter(q=>this.inGroup(q,filter));if(!members.length)continue;
    add(id,{type:'withGroup',filter},`In the same room as ${singular}.`,'group');
    add(id,{type:'rowDeltaGroup',filter,value:1},`Exactly one row south of ${singular}.`,'groupDistance');
    if(members.length>=2)for(const direction of ['south','west']){
     const count=members.filter(q=>this.pair(positions.get(q.id),p,direction)).length;
     add(id,{type:'countRelative',filter,direction,count},`Exactly ${count} ${name} were ${direction} of me.`,'count');
    }
   }
  }
  this.clues=[];const used=new Set();
  for(const p of shuffle(this.people)){
   const own=shuffle(pool.filter(c=>c.personId===p.id)),fresh=own.filter(c=>!used.has(c.family));
   const chosen=pick(fresh.length?fresh:own);this.clues.push(chosen);used.add(chosen.family);
  }
  let check=this.solve(this.clues,{maxNodes:700});
  const remaining=shuffle(pool.filter(c=>!this.clues.includes(c))).sort((a,b)=>Number(used.has(a.family))-Number(used.has(b.family)));
  for(const c of remaining.slice(0,this.size)){
   if(!check.exhausted&&check.solutions.length===1)break;
   this.clues.push(c);check=this.solve(this.clues,{maxNodes:700});
  }
  const anchors=shuffle(this.solution.flatMap(p=>[
   {personId:p.personId,rule:{type:'row',value:p.row},text:`In row ${p.row+1}.`,family:'row'},
   {personId:p.personId,rule:{type:'col',value:p.col},text:`In column ${p.col+1}.`,family:'col'}
  ]));
  for(const c of anchors){if(!check.exhausted&&check.solutions.length===1)break;this.clues.push(c);check=this.solve(this.clues,{maxNodes:700});}
  if(check.exhausted||check.solutions.length!==1)throw Error('Thiefdoku uniqueness check failed.');
  for(let i=this.clues.length-1;i>=0;i--){
   const c=this.clues[i];if(this.clues.filter(q=>q.personId===c.personId).length<=1)continue;
   const reduced=this.clues.filter((_,j)=>j!==i),result=this.solve(reduced,{maxNodes:400});
   if(!result.exhausted&&result.solutions.length===1)this.clues=reduced;
  }
 }
 checkpoint(){this.history.push({board:clone(this.board),crosses:clone(this.crosses),selectedPersonId:this.selectedPersonId});if(this.history.length>40)this.history.shift();}
 selectPerson(id){if(this.completed||this.failed||!this.people.some(p=>p.id===id))return false;this.selectedPersonId=id;this.save();return true;}
 clearSelection(){this.selectedPersonId=null;this.save();}
 autoCrosses(){
  const rows=new Set(),cols=new Set();for(const p of this.getPlacedPeople()){rows.add(p.row);cols.add(p.col);}
  return Array.from({length:this.size},(_,r)=>Array.from({length:this.size},(_,c)=>!this.board[r][c]&&!this.isBlocked(r,c)&&(rows.has(r)||cols.has(c))));
 }
 placePerson(r,c){
  if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||!this.selectedPersonId)return false;
  this.checkpoint();const id=this.selectedPersonId;
  for(const line of this.board)for(let i=0;i<this.size;i++)if(line[i]===id)line[i]=null;
  this.board[r][c]=id;this.crosses[r][c]=false;this.selectedPersonId=null;this.save();return true;
 }
 removePerson(r,c){
  if(this.completed||this.failed||!this.valid(r,c)||(!this.board[r][c]&&!this.crosses[r][c]))return false;
  this.checkpoint();this.board[r][c]=null;this.crosses[r][c]=false;this.save();return true;
 }
 toggleCross(r,c){
  if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||this.board[r][c])return false;
  this.checkpoint();this.crosses[r][c]=!this.crosses[r][c];this.save();return true;
 }
 undo(){if(this.completed||this.failed||!this.history.length)return false;Object.assign(this,this.history.pop());this.save();return true;}
 isFixedCell(){return false;}
 getPlacedPeople(){return this.board.flatMap((line,row)=>line.flatMap((personId,col)=>personId?[{personId,row,col}]:[]));}
 allPlaced(){const placed=this.getPlacedPeople();return placed.length===this.people.length&&new Set(placed.map(p=>p.personId)).size===this.people.length&&this.people.every(p=>placed.some(q=>q.personId===p.id));}
 validateBoard(){
  const p=this.getPlacedPeople();if(!this.allPlaced())return{valid:false,reason:'Not everyone is placed.'};
  if(new Set(p.map(q=>q.row)).size!==this.size||new Set(p.map(q=>q.col)).size!==this.size)return{valid:false,reason:'One person per row and column.'};
  if(p.some(q=>this.isBlocked(q.row,q.col))||p.filter(q=>this.roomAt(q)===this.theftRoom).length!==1||!this.clues.every(c=>this.matchesClue(p,c)))return{valid:false,reason:'The statements do not match.'};
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
  else{this.wrongAccusations.push(id);this.failed=this.attempts>=3;result={status:this.failed?'failed':'wrong',message:this.failed?'The thief escaped. Your paperwork was magnificent.':`Wrong suspect. ${3-this.attempts} accusations left.`};}
  this.save();return result;
 }
 getPersonName(id){return this.people.find(p=>p.id===id)?.name||'Unknown';}
 getState(){return clone({size:this.size,people:this.people,layout:this.layout,objects:this.objects,board:this.board,crosses:this.crosses,autoCrosses:this.autoCrosses(),allPlaced:this.allPlaced(),placedCount:this.getPlacedPeople().length,
  roomNames:ROOM_NAMES,theftRoom:this.theftRoom,stolenItem:this.stolenItem,clues:this.clues,selectedPersonId:this.selectedPersonId,
  attempts:this.attempts,maxAttempts:3,completed:this.completed,failed:this.failed,wrongAccusations:this.wrongAccusations,
  solved:this.solved,nextSize:this.sizeForProgress(),canUndo:this.history.length>0,saveError:this.saveError});}
 save(){if(!this.storage)return;try{this.storage.setItem(this.storageKey,JSON.stringify({version:2,...this.getState(),solution:this.solution,thiefId:this.thiefId}));this.saveError=false;}catch(_){this.saveError=true;}}
 restore(){
  if(!this.storage)return false;try{
   const s=JSON.parse(this.storage.getItem(this.storageKey));if(!s||![1,2].includes(s.version)||!Number.isInteger(s.size)||s.size<4||s.size>10)return false;
   if(Number.isInteger(this.options.size)&&s.size!==this.options.size)return false;
   const n=s.size,people=PEOPLE.slice(0,n),ids=new Set(people.map(p=>p.id));
   if(![s.layout,s.board,s.crosses].every(a=>Array.isArray(a)&&a.length===n&&a.every(r=>Array.isArray(r)&&r.length===n)))return false;
   if(s.layout.flat().some(r=>!ROOM_NAMES[r])||s.board.flat().some(id=>id!==null&&!ids.has(id))||s.crosses.flat().some(v=>typeof v!=='boolean'))return false;
   if(!Array.isArray(s.solution)||s.solution.length!==n||!Array.isArray(s.objects)||!Array.isArray(s.clues)||!Array.isArray(s.wrongAccusations))return false;
   this.size=n;this.people=clone(people);this.layout=s.layout;this.objects=s.objects;
   if(this.objects.some(o=>!Number.isInteger(o.w)||!Number.isInteger(o.h)||o.w<1||o.h<1||!this.valid(o.row,o.col)||!this.valid(o.row+o.h-1,o.col+o.w-1)))return false;
   this.solution=s.solution;this.clues=s.clues;this.theftRoom=s.theftRoom;this.thiefId=s.thiefId;
   if(this.solution.some(p=>!ids.has(p.personId)||!this.valid(p.row,p.col)||this.isBlocked(p.row,p.col)))return false;
   if(new Set(this.solution.map(p=>p.personId)).size!==n||new Set(this.solution.map(p=>p.row)).size!==n||new Set(this.solution.map(p=>p.col)).size!==n)return false;
   const thieves=this.solution.filter(p=>this.roomAt(p)===this.theftRoom);if(thieves.length!==1||thieves[0].personId!==this.thiefId)return false;
   if(!this.clues.every(c=>this.matchesClue(this.solution,c)))return false;
   const result=this.solve(this.clues,{maxNodes:5000});if(result.exhausted||result.solutions.length!==1)return false;
   this.board=s.board;this.crosses=s.crosses;const placed=this.getPlacedPeople();
   if(new Set(placed.map(p=>p.personId)).size!==placed.length||placed.some(p=>this.isBlocked(p.row,p.col)))return false;
   if(!Number.isInteger(s.solved)||s.solved<0||!Number.isInteger(s.attempts)||s.attempts<0||s.attempts>3)return false;
   this.stolenItem=String(s.stolenItem);this.selectedPersonId=ids.has(s.selectedPersonId)?s.selectedPersonId:null;
   this.attempts=s.attempts;this.maxAttempts=3;this.completed=Boolean(s.completed);this.failed=Boolean(s.failed);
   this.wrongAccusations=s.wrongAccusations.filter(id=>ids.has(id));this.solved=s.solved;this.history=[];return true;
  }catch(_){return false;}
 }
}
export {SIZE,PEOPLE,ROOM_NAMES};
