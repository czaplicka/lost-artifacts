let closeActiveViewer=null;
const attachments=new WeakMap();
export function evidenceViewerDescription(kind){
  if(kind==='romance')return {title:'Original meeting',note:'Observed before the investigator intervened.'};
  if(kind==='ring')return {title:'Investigator-arranged dessert',note:'The investigator supplied the ring. This is not evidence of a genuine proposal.'};
  if(kind==='face')return {title:'Companion identification',note:'A clear view of the companion. Identification belongs to the client.'};
  return {title:'Evidence photograph',note:'Saved observation crop.'};
}
export function openTableForThreeEvidenceViewer(source,kind){
  if(!source?.isConnected||!Number.isFinite(source.width)||!Number.isFinite(source.height)||source.width<1||source.height<1)return null;
  closeActiveViewer?.();
  const previousFocus=document.activeElement,description=evidenceViewerDescription(kind);
  const overlay=document.createElement('div');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',description.title);
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'12000',display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(8px,2vw,24px)',boxSizing:'border-box',background:'rgba(0,0,0,.88)',fontFamily:'"Special Elite",SpecialElite,monospace',color:'#eee3cd'});
  const panel=document.createElement('section');Object.assign(panel.style,{width:'min(1100px,100%)',maxHeight:'95vh',display:'flex',flexDirection:'column',gap:'12px',padding:'18px',boxSizing:'border-box',background:'#201c17',border:'2px solid #d4af37',overflow:'auto'});overlay.append(panel);
  const add=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;panel.append(node);return node;};
  const title=add('h2',description.title);title.style.margin='0';
  add('p',description.note);
  const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',gap:'10px',flexWrap:'wrap'});panel.append(controls);
  const viewport=document.createElement('div');Object.assign(viewport.style,{overflow:'auto',width:'100%',minHeight:'120px',maxHeight:'58vh',background:'#10100e',border:'1px solid #776953'});
  const image=document.createElement('canvas');image.width=source.width;image.height=source.height;
  image.setAttribute('role','img');image.setAttribute('aria-label',description.title+' — saved crop');
  const context=image.getContext('2d');if(!context)return null;
  context.imageSmoothingEnabled=false;context.drawImage(source,0,0);
  Object.assign(image.style,{display:'block',imageRendering:'pixelated',maxWidth:'none'});viewport.append(image);panel.append(viewport);
  const status=add('p','');status.setAttribute('role','status');
  add('p','Zoom changes display size only. Same pixels, bigger confidence.');
  let closed=false,observer=null;const buttons=[];
  const close=()=>{
    if(closed)return;closed=true;observer?.disconnect();document.removeEventListener('keydown',keys,true);overlay.remove();
    if(closeActiveViewer===close)closeActiveViewer=null;
    const focus=previousFocus?.isConnected?previousFocus:source.isConnected?source:null;
    focus?.focus?.({preventScroll:true});
  };
  const zoom=amount=>{
    image.style.width=Math.max(1,Math.round(image.width*amount))+'px';image.style.height=Math.max(1,Math.round(image.height*amount))+'px';
    status.textContent=Math.round(amount*100)+'% — original '+image.width+' × '+image.height+' pixels';
  };
  const button=(label,action)=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;
    Object.assign(b.style,{padding:'10px 16px',fontFamily:'inherit',fontSize:'18px',background:'#263729',color:'#e3f0d7',border:'1px solid #88b589',cursor:'pointer'});
    b.onclick=()=>{if(!closed)action();};buttons.push(b);controls.append(b);return b;
  };
  button('FIT',()=>zoom(Math.min(1,Math.max(1,viewport.clientWidth-16)/image.width)));
  for(const amount of [1,2,4])button(amount+'×',()=>zoom(amount));
  const closeButton=button('CLOSE',close);
  function keys(event){
    if(closed)return;
    // Keep game-level keyboard shortcuts out of this modal. Button defaults remain available.
    event.stopImmediatePropagation();
    if(event.key==='Escape'){event.preventDefault();close();}
    else if(event.key==='Tab'){
      event.preventDefault();let index=buttons.indexOf(document.activeElement);
      index=index<0?(event.shiftKey?buttons.length-1:0):(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
      buttons[index].focus();
    }
  }
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  for(const type of ['pointerdown','pointerup','click'])overlay.addEventListener(type,event=>event.stopPropagation());
  document.body.append(overlay);closeActiveViewer=close;
  document.addEventListener('keydown',keys,true);zoom(Math.min(1,Math.max(1,viewport.clientWidth-16)/image.width));closeButton.focus({preventScroll:true});
  if(typeof MutationObserver!=='undefined'){
    observer=new MutationObserver(()=>{if(!source.isConnected)close();});observer.observe(document.body,{childList:true,subtree:true});
  }
  return {close};
}
export function attachTableForThreeEvidenceViewer(canvas,record){
  const previous=attachments.get(canvas);previous?.();
  const kind=record?.kind,description=evidenceViewerDescription(kind);
  canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','Open larger view: '+description.title);
  canvas.style.cursor='zoom-in';
  const click=()=>openTableForThreeEvidenceViewer(canvas,kind);
  const key=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();click();}};
  canvas.addEventListener('click',click);canvas.addEventListener('keydown',key);
  const dispose=()=>{canvas.removeEventListener('click',click);canvas.removeEventListener('keydown',key);};attachments.set(canvas,dispose);
  return dispose;
}
