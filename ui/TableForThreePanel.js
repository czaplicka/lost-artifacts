export class TableForThreePanel {
  constructor(scene){
    this.scene=scene;
    this.root=document.createElement('section');
    Object.assign(this.root.style,{position:'fixed',zIndex:'9000',overflow:'auto',background:'#15212d',color:'#eee3cd',padding:'24px',boxSizing:'border-box',fontFamily:'SpecialElite, monospace'});
    this.resize=()=>{const r=scene.game.canvas.getBoundingClientRect();Object.assign(this.root.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
    document.body.append(this.root);this.resize();scene.scale.on('resize',this.resize);
    scene.events.once('shutdown',()=>this.destroy());
  }
  render(title,body,choices=[]){
    this.root.replaceChildren();
    const heading=document.createElement('h1');heading.textContent=title;heading.style.fontSize='24px';
    const text=document.createElement('p');text.textContent=body;Object.assign(text.style,{whiteSpace:'pre-wrap',fontSize:'20px',lineHeight:'1.5',maxWidth:'950px'});
    this.root.append(heading,text);
    const row=document.createElement('div');Object.assign(row.style,{display:'flex',gap:'12px',flexWrap:'wrap'});this.root.append(row);
    for(const [label,action,disabled] of choices){
      const b=document.createElement('button');b.textContent=label;b.disabled=!!disabled;
      Object.assign(b.style,{fontFamily:'SpecialElite, monospace',fontSize:'18px',padding:'12px',background:'#324b5d',color:'#fff0d1',border:'1px solid #a99368',cursor:'pointer'});
      b.onclick=()=>{if(!b.disabled)Promise.resolve().then(action).catch(e=>{console.error('[TableForThree]',e);this.render('Could not continue',e.message,[['BACK',()=>this.scene.menu?.()]]);});};row.append(b);
    }
  }
  destroy(){this.scene.scale.off('resize',this.resize);this.root?.remove();this.root=null;}
}
