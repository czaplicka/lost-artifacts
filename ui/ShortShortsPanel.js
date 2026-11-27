const PIXEL='"Press Start 2P","PressStart2P",monospace',TEXT='"Special Elite","SpecialElite",monospace';
export class ShortShortsPanel{
  constructor(scene){
    this.scene=scene;this.destroyed=false;this.revision=0;this.pendingAction=false;
    this.root=document.createElement('section');this.root.setAttribute('aria-label','Who Wears Short Shorts?');
    Object.assign(this.root.style,{position:'fixed',zIndex:'9000',overflow:'auto',background:'rgba(17,14,10,0.98)',color:'#eee3cd',padding:'clamp(12px,3vw,32px)',boxSizing:'border-box',fontFamily:TEXT,border:'3px solid #d4af37',boxShadow:'inset 0 0 0 4px #17110a, inset 0 0 0 5px #7d6620',colorScheme:'dark'});
    this.resize=()=>{if(!this.root||this.destroyed)return;const r=scene.game.canvas.getBoundingClientRect();Object.assign(this.root.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
    this.shutdown=()=>this.destroy();
    document.body.append(this.root);this.resize();
    scene.scale.on('resize',this.resize);scene.events.once('shutdown',this.shutdown);scene.events.once('destroy',this.shutdown);
  }
  render(title,body,choices=[]){
    if(this.destroyed||!this.root)return;
    const revision=++this.revision;this.pendingAction=false;
    this.root.setAttribute('aria-busy','false');this.root.replaceChildren();this.root.scrollTop=0;
    const content=document.createElement('div');
    Object.assign(content.style,{width:'100%',maxWidth:'1120px',minHeight:'100%',margin:'0 auto',display:'flex',flexDirection:'column',gap:'22px'});this.root.append(content);
    const heading=document.createElement('h1');heading.textContent=title;
    Object.assign(heading.style,{fontFamily:PIXEL,fontSize:'clamp(12px,2vw,20px)',color:'#f0c75e',lineHeight:'1.8',margin:'0',overflowWrap:'anywhere',fontWeight:'normal'});content.append(heading);
    const text=document.createElement('p');text.textContent=body;
    Object.assign(text.style,{whiteSpace:'pre-wrap',fontSize:'clamp(17px,2.2vw,22px)',lineHeight:'1.55',width:'100%',maxWidth:'950px',margin:'0',padding:'clamp(12px,2vw,22px)',boxSizing:'border-box',overflowWrap:'anywhere',background:'#201c17',color:'#dfcfac',border:'1px solid #776953',borderRadius:'8px'});content.append(text);
    const row=document.createElement('div');
    Object.assign(row.style,{display:'flex',flexDirection:'column',gap:'12px',width:'100%',maxWidth:'680px',alignSelf:'flex-end',paddingBottom:'8px'});content.append(row);
    const buttons=[];
    for(const [label,action,disabled] of choices){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!!disabled;
      Object.assign(b.style,{fontFamily:TEXT,fontSize:'clamp(16px,2vw,20px)',lineHeight:'1.45',padding:'12px 18px',minHeight:'46px',width:'100%',textAlign:'left',boxSizing:'border-box',whiteSpace:'normal',overflowWrap:'anywhere',borderRadius:'6px',background:b.disabled?'#20231d':'#263729',color:b.disabled?'#8b907d':'#e3f0d7',border:'1px solid '+(b.disabled?'#555b48':'#88b589'),cursor:b.disabled?'not-allowed':'pointer'});
      buttons.push({b,disabled:!!disabled});
      b.onclick=async()=>{
        if(b.disabled||this.destroyed||this.pendingAction||this.revision!==revision)return;
        this.pendingAction=true;this.root.setAttribute('aria-busy','true');
        for(const e of buttons)e.b.disabled=true;
        try{await action();}
        catch(error){console.error('[ShortShorts]',error);if(!this.destroyed&&this.revision===revision)this.render('Could not continue',error?.message||'The action could not be completed.',[['BACK',()=>this.scene.menu?.()]]);}
        finally{if(!this.destroyed&&this.revision===revision){this.pendingAction=false;this.root.setAttribute('aria-busy','false');for(const e of buttons)e.b.disabled=e.disabled;}}
      };
      row.append(b);
    }
  }
  destroy(){
    if(this.destroyed)return;
    this.destroyed=true;this.revision++;
    this.scene.scale.off('resize',this.resize);this.scene.events.off('shutdown',this.shutdown);this.scene.events.off('destroy',this.shutdown);
    this.root?.remove();this.root=null;
  }
}
