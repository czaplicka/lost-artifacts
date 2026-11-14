import { searchAction } from './ComputerSearchActions.js';
const navigationState=new WeakMap();
export function drawWebsiteNavigation(search,page,{
 x,y,width,button,background=0xe5dac5,minimumWidth=125,rowHeight=31
}){
 const links=(Array.isArray(page.links)?page.links:[]).filter(link=>link&&typeof link.pageId==='string'&&link.pageId);
 if(!links.length)return 0;
 const safeWidth=Math.max(1,Number(width)||1),gap=4,height=Math.max(28,Number(rowHeight)||31)+4,buttonHeight=height-9;
 const labels=links.map(link=>String(link.label||link.pageId));
 const widths=labels.map(label=>Math.max(Math.min(72,Math.max(1,Number(minimumWidth)||125)),Array.from(label).length*8+18));
 const total=widths.reduce((sum,value)=>sum+value+gap,gap),overflow=total>safeWidth;
 const arrowWidth=Math.min(28,Math.max(1,(safeWidth-16)/4)),inset=overflow?arrowWidth+gap*2:gap,available=Math.max(1,safeWidth-inset*2);
 const groups=[];let group=[],used=0;
 links.forEach((link,index)=>{
  const itemWidth=Math.min(available,widths[index]),extra=group.length?gap:0;
  if(group.length&&used+extra+itemWidth>available){groups.push(group);group=[];used=0;}
  used+=(group.length?gap:0)+itemWidth;group.push({link,index,width:itemWidth});
 });
 if(group.length)groups.push(group);
 const key=JSON.stringify([page.id,safeWidth,labels,links.map(link=>link.pageId)]);
 let state=navigationState.get(search);
 if(!state||state.key!==key){
  const activeGroup=groups.findIndex(items=>items.some(item=>item.link.pageId===page.id));
  state={key,index:Math.max(0,activeGroup)};navigationState.set(search,state);
 }
 state.index=Math.max(0,Math.min(groups.length-1,state.index));
 search.ui.drawing.rectangle(x,y,safeWidth,height,background);
 // Template buttons own their feedback: do not add a second sound here.
 const guarded=callback=>searchAction(search,null,callback,{enabled:()=>navigationState.get(search)===state&&search.pageId===page.id});
 const changeGroup=delta=>{
  const next=Math.max(0,Math.min(groups.length-1,state.index+delta));
  if(next===state.index)return;state.index=next;search.refresh();
 };
 if(overflow){
  button(x+gap,y+3,arrowWidth,buttonHeight,'<',guarded(()=>changeGroup(-1)),state.index>0);
  button(x+safeWidth-gap-arrowWidth,y+3,arrowWidth,buttonHeight,'>',guarded(()=>changeGroup(1)),state.index<groups.length-1);
 }
 let cursor=x+inset;
 for(const item of groups[state.index]){
  const active=item.link.pageId===page.id;
  button(cursor,y+3,item.width,buttonHeight,labels[item.index],guarded(()=>{if(!active)search.openPage(item.link.pageId);}),true,active);
  cursor+=item.width+gap;
 }
 return height;
}
