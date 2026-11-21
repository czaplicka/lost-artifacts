import { TableForThreeNotebook } from './TableForThreeNotebook.js';
const PIXEL_FONT = '"Press Start 2P", "PressStart2P", monospace';
const TEXT_FONT = '"Special Elite", "SpecialElite", monospace';
const NPC_TITLES = new Set(['Reception', 'Caretaker']);
export class TableForThreePanel {
  constructor(scene) {
    this.scene = scene; this.destroyed = false; this.revision = 0; this.pendingAction = false; this.notebookOpen = false;
    this.root = document.createElement('section'); this.root.setAttribute('aria-label', 'Table for Three');
    Object.assign(this.root.style, {
      position: 'fixed', zIndex: '9000', overflow: 'auto', background: 'rgba(17, 14, 10, 0.98)', color: '#eee3cd',
      padding: 'clamp(12px, 3vw, 32px)', boxSizing: 'border-box', fontFamily: TEXT_FONT, border: '3px solid #d4af37',
      boxShadow: 'inset 0 0 0 4px #17110a, inset 0 0 0 5px #7d6620', colorScheme: 'dark'
    });
    this.resize = () => {
      if (!this.root || this.destroyed) return;
      const r = scene.game.canvas.getBoundingClientRect();
      Object.assign(this.root.style, { left: r.left+'px', top: r.top+'px', width: r.width+'px', height: r.height+'px' });
    };
    this.shutdown = () => this.destroy();
    this.notebook = new TableForThreeNotebook(this);
    document.body.append(this.root); this.resize();
    scene.scale.on('resize', this.resize); scene.events.once('shutdown', this.shutdown); scene.events.once('destroy', this.shutdown);
  }
  render(title, body, choices = []) {
    if (this.destroyed || !this.root) return;
    this.notebook.abandon();
    const revision = ++this.revision; this.pendingAction = false;
    this.root.setAttribute('aria-busy','false'); this.root.replaceChildren(); this.root.scrollTop = 0;
    const isNpc = NPC_TITLES.has(title), content = document.createElement('div');
    Object.assign(content.style, { width:'100%', maxWidth:'1120px', minHeight:'100%', margin:'0 auto', display:'flex', flexDirection:'column', gap:'22px' }); this.root.append(content);
    const heading = document.createElement('h1'); heading.textContent = title;
    Object.assign(heading.style, { fontFamily:PIXEL_FONT, fontSize:'clamp(12px, 2vw, 20px)', color:'#f0c75e', lineHeight:'1.8', margin:'0', overflowWrap:'anywhere', fontWeight:'normal' }); content.append(heading);
    const text = document.createElement('p'); text.textContent = body;
    Object.assign(text.style, { whiteSpace:'pre-wrap', fontSize:'clamp(17px, 2.2vw, 22px)', lineHeight:'1.55', width:isNpc?'88%':'100%', maxWidth:'950px', minWidth:'0', alignSelf:'flex-start', margin:'0', padding:'clamp(12px, 2vw, 22px)', boxSizing:'border-box', overflowWrap:'anywhere', background:isNpc?'#2a2012':'#201c17', color:isNpc?'#f3e7c4':'#dfcfac', border:`1px solid ${isNpc?'#b58a42':'#776953'}`, borderRadius:'8px', boxShadow:'3px 4px 0 rgba(0,0,0,0.25)' }); content.append(text);
    const row = document.createElement('div');
    Object.assign(row.style, { display:'flex', flexDirection:'column', gap:'12px', width:'100%', maxWidth:'680px', alignSelf:'flex-end', paddingBottom:'8px' }); content.append(row);
    const buttons = [];
    for (const [label, action, disabled] of choices) {
      const b = document.createElement('button'); b.type='button'; b.textContent=label; b.disabled=!!disabled;
      Object.assign(b.style, { fontFamily:TEXT_FONT, fontSize:'clamp(16px, 2vw, 20px)', lineHeight:'1.45', padding:'12px 18px', minHeight:'46px', width:'100%', textAlign:'left', boxSizing:'border-box', whiteSpace:'normal', overflowWrap:'anywhere', borderRadius:'6px', boxShadow:'2px 3px 0 rgba(0,0,0,0.25)' });
      let hovered=false, focused=false;
      const paint = () => {
        b.style.background=b.disabled?'#20231d':hovered||focused?'#354b36':'#263729'; b.style.color=b.disabled?'#8b907d':'#e3f0d7';
        b.style.border=`1px solid ${b.disabled?'#555b48':hovered||focused?'#d4af37':'#88b589'}`;
        b.style.cursor=b.disabled?'not-allowed':'pointer'; b.style.outline=focused&&!b.disabled?'2px solid #d4af37':''; b.style.outlineOffset=focused?'2px':'';
      };
      buttons.push({b,disabled:!!disabled,paint});paint();
      b.onpointerenter=()=>{hovered=true;paint();};b.onpointerleave=()=>{hovered=false;paint();};b.onfocus=()=>{focused=true;paint();};b.onblur=()=>{focused=false;paint();};
      b.onclick=async()=>{
        if(b.disabled||this.destroyed||this.pendingAction||this.notebookOpen||this.revision!==revision)return;
        this.pendingAction=true;this.root.setAttribute('aria-busy','true');
        for(const entry of buttons){entry.b.disabled=true;entry.paint();}
        try{await action();}
        catch(error){
          console.error('[TableForThree]',error);
          if(!this.destroyed&&this.revision===revision)this.render('Could not continue',error?.message||'The action could not be completed.',[['BACK',()=>this.scene.menu?.()]]);
        }finally{
          if(!this.destroyed&&this.revision===revision){this.pendingAction=false;this.root.setAttribute('aria-busy','false');for(const entry of buttons){entry.b.disabled=entry.disabled;entry.paint();}}
        }
      };
      row.append(b);
    }
    this.notebook.addButton();
  }
  destroy() {
    if(this.destroyed)return;
    this.notebook.abandon();this.destroyed=true;this.revision++;
    this.scene.scale.off('resize',this.resize);this.scene.events.off('shutdown',this.shutdown);this.scene.events.off('destroy',this.shutdown);
    this.root?.remove();this.root=null;
  }
}
