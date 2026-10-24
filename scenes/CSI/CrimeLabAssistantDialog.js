// scenes/CSI/CrimeLabAssistantDialog.js
// Independent text and choice pagination. Extensions retain their original API.
export class CrimeLabAssistantDialog {
  constructor(scene){
    this.scene=scene;this.container=this.overlay=this.panel=this.speakerText=this.bodyText=this.hintText=null;
    this.choiceObjects=[];this.pagerObjects=[];this.dialogue=null;this.currentNodeId=null;this.onClose=null;
    this.isClosing=false;this.destroyed=false;this.extension=null;this.choicePage=0;this.textPage=0;
    this.renderedNodeId=null;this.textPages=[];this.boundEscape=()=>this.close();
    this.boundResize=()=>this.close();this.boundShutdown=()=>this.destroy();
  }
  isOpen(){return Boolean(!this.destroyed&&this.container?.active&&this.container.scene);}
  open({dialogue,startNodeId=null,onClose=null}={}){
    if(this.destroyed||this.isOpen()||!this.scene||!dialogue?.nodes)return false;
    const start=startNodeId||dialogue.defaultNodeId;if(!start||!dialogue.nodes[start])return false;
    this.dialogue={...dialogue,nodes:Object.fromEntries(Object.entries(dialogue.nodes).map(([id,node])=>[
      id,{...node,choices:Array.isArray(node.choices)?node.choices.map(c=>({...c})):[]}
    ]))};
    this.currentNodeId=start;this.renderedNodeId=null;this.choicePage=0;this.textPage=0;
    this.onClose=typeof onClose==='function'?onClose:null;this.isClosing=false;
    this.createPanel();this.renderCurrentNode();return true;
  }
  createPanel(){
    const s=this.scene,{width,height}=s.scale;
    const w=Math.max(140,Math.min(width-24,940)),h=Math.max(140,Math.min(height-24,Math.max(300,Math.floor(height*.82))));
    const left=(width-w)/2,top=(height-h)/2;
    const choiceArea=Math.max(68,Math.min(190,h*.35));
    const bodyHeight=Math.max(20,h-54-36-choiceArea-18);
    this.layout={left,top,width:w,height:h,bodyHeight,choiceArea,choiceStart:top+54+bodyHeight+36};
    this.container=s.add.container(0,0).setDepth(3000).setScrollFactor(0);
    this.overlay=s.add.rectangle(width/2,height/2,width,height,0x000000,.65).setOrigin(.5).setInteractive();
    this.overlay.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    this.panel=s.add.rectangle(left,top,w,h,0x07111b,.98).setOrigin(0,0).setStrokeStyle(3,0x39ff14,.9).setInteractive();
    this.panel.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    this.speakerText=s.add.text(left+20,top+18,'',{fontFamily:'PressStart2P',fontSize:'9px',color:'#39ff14'}).setOrigin(0,0);
    this.bodyText=s.add.text(left+20,top+54,'',{
      fontFamily:'SpecialElite',fontSize:width<=700?'18px':'20px',color:'#fff4c7',
      wordWrap:{width:w-40,useAdvancedWrap:true},lineSpacing:4
    }).setOrigin(0,0);
    this.hintText=s.add.text(left+w-18,top+18,'[ CLOSE ]',{fontFamily:'PressStart2P',fontSize:'8px',color:'#ffcc00'})
      .setOrigin(1,0).setInteractive({useHandCursor:true});
    this.hintText.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();this.close();});
    this.container.add([this.overlay,this.panel,this.speakerText,this.bodyText,this.hintText]);
    s.input.keyboard?.on('keydown-ESC',this.boundEscape);s.scale.on('resize',this.boundResize);
    s.events.once('shutdown',this.boundShutdown);s.events.once('destroy',this.boundShutdown);
  }
  resolveNodeText(node){
    const base=String(node.text||'').trim(),dynamic=node.dynamic?this.resolveDynamicText(node.dynamic):'';
    return[base,dynamic].filter(Boolean).join('\n\n');
  }
  resolveDynamicText(key){if(key==='assistant_results')return this.getAssistantResultsText();if(key==='remaining_work')return this.getRemainingWorkText();return'';}
  getAssistantResultsText(){
    const summaries=this.scene?.getAssistantResultSummaries?.()||[];
    if(!summaries.length){
      const pending=this.scene?.getPendingAssistantCount?.()||0;
      return pending?'The delegated reports are not ready yet. No unverified findings will be read out.':'No completed delegated reports for this case. The workstations are yours.';
    }
    return summaries.map(r=>`• ${r.label}\n${r.text}`).join('\n\n');
  }
  getRemainingWorkText(){
    const remaining=this.scene?.getRemainingAnalysisCount?.()??0,pending=this.scene?.getPendingAssistantCount?.()??0;
    const text=remaining>1?`${remaining} analyses remain for you.`:remaining===1?'One analysis remains for you.':'Your assigned analyses are complete.';
    if(pending)return`${text}\n${pending} delegated report(s) are still pending.`;
    return remaining?`${text} Follow the active station labels.`:'All required reports are recorded. The evidence is ready for your review.';
  }
  paginateText(text){
    const tokens=String(text||'').match(/\S+\s*/g)||[];if(!tokens.length)return[''];
    const pages=[];let start=0;
    while(start<tokens.length){
      let low=start+1,high=tokens.length,best=start+1;
      while(low<=high){
        const mid=Math.floor((low+high)/2);this.bodyText.setText(tokens.slice(start,mid).join('').trim());
        if(this.bodyText.height<=this.layout.bodyHeight){best=mid;low=mid+1;}else high=mid-1;
      }
      pages.push(tokens.slice(start,best).join('').trim());start=best;
    }return pages;
  }
  renderCurrentNode(){
    const node=this.dialogue?.nodes?.[this.currentNodeId];if(!node||!this.isOpen()){this.close();return;}
    if(this.renderedNodeId!==this.currentNodeId){this.textPage=0;this.choicePage=0;this.renderedNodeId=this.currentNodeId;}
    this.clearChoices();this.clearPagers();
    this.speakerText.setText(node.speaker||'LAB ASSISTANT').setColor(node.color||'#39ff14');
    this.bodyText.setScale(1);this.textPages=this.paginateText(this.resolveNodeText(node));
    this.textPage=Math.max(0,Math.min(this.textPage,this.textPages.length-1));
    this.bodyText.setText(this.textPages[this.textPage]);
    if(this.bodyText.height>this.layout.bodyHeight)this.bodyText.setScale(this.layout.bodyHeight/this.bodyText.height);
    if(this.textPages.length>1){
      const y=this.layout.top+54+this.layout.bodyHeight+16,x=this.layout.left,w=this.layout.width;
      this.pager(x+20,y,'< TEXT',()=>{this.textPage--;this.renderCurrentNode();},this.textPage>0);
      this.pager(x+w/2,y,`${this.textPage+1}/${this.textPages.length}`,null,false,.5);
      this.pager(x+w-20,y,'TEXT >',()=>{this.textPage++;this.renderCurrentNode();},this.textPage<this.textPages.length-1,1);
    }
    const base=Array.isArray(node.choices)?node.choices:[];
    const choices=this.extension?.augmentChoices?this.extension.augmentChoices(this,base):base;
    this.createChoices(Array.isArray(choices)?choices:[]);
  }
  pager(x,y,text,callback,enabled,origin=0){
    const object=this.scene.add.text(x,y,text,{fontFamily:'SpecialElite',fontSize:'17px',color:enabled?'#7df9ff':'#788588'}).setOrigin(origin,.5);
    if(enabled&&callback)object.setInteractive({useHandCursor:true}).on('pointerdown',(p,px,py,event)=>{event?.stopPropagation();callback();});
    this.pagerObjects.push(object);this.container.add(object);return object;
  }
  createChoices(choices){
    if(!this.isOpen())return;
    const s=this.scene,L=this.layout,gap=8,choiceHeight=44;
    const perPage=Math.max(1,Math.min(3,Math.floor((L.choiceArea-30+gap)/(choiceHeight+gap))));
    const pages=Math.max(1,Math.ceil(choices.length/perPage));this.choicePage=Math.max(0,Math.min(this.choicePage,pages-1));
    choices.slice(this.choicePage*perPage,(this.choicePage+1)*perPage).forEach((choice,index)=>{
      const x=L.left+20,y=L.choiceStart+index*(choiceHeight+gap),w=L.width-40;
      const bg=s.add.rectangle(x,y,w,choiceHeight,0x102632,.95).setOrigin(0,0).setStrokeStyle(1,0x7df9ff,.7).setInteractive({useHandCursor:true});
      const label=s.add.text(x+12,y+choiceHeight/2,`> ${choice.text||'Continue'}`,{
        fontFamily:'PressStart2P',fontSize:'10px',color:'#fff4c7',wordWrap:{width:w-24,useAdvancedWrap:true}
      }).setOrigin(0,.5);
      const scale=Math.min(1,(choiceHeight-8)/Math.max(1,label.height),(w-24)/Math.max(1,label.width));label.setScale(scale);
      bg.on('pointerover',()=>{bg.setFillStyle(0x1d4552,1);label.setColor('#39ff14');});
      bg.on('pointerout',()=>{bg.setFillStyle(0x102632,.95);label.setColor('#fff4c7');});
      bg.on('pointerdown',(p,px,py,event)=>{event?.stopPropagation();this.choose(choice);});
      this.choiceObjects.push(bg,label);this.container.add([bg,label]);
    });
    if(pages>1){
      const y=L.top+L.height-18;
      this.pager(L.left+20,y,'< Answers',()=>{this.choicePage--;this.renderCurrentNode();},this.choicePage>0);
      this.pager(L.left+L.width/2,y,`${this.choicePage+1}/${pages}`,null,false,.5);
      this.pager(L.left+L.width-20,y,'Answers >',()=>{this.choicePage++;this.renderCurrentNode();},this.choicePage<pages-1,1);
    }
  }
  choose(choice={}){
    if(!this.isOpen()||this.isClosing)return;
    if(this.extension?.handleChoice?.(choice,this)===true)return;
    if(choice.action==='close'){this.close();return;}
    if(choice.next&&this.dialogue?.nodes?.[choice.next]){this.currentNodeId=choice.next;this.choicePage=0;this.textPage=0;this.renderCurrentNode();return;}
    console.warn('[CrimeLabAssistantDialog] Invalid choice:',choice);
  }
  clearChoices(){const objects=this.choiceObjects;this.choiceObjects=[];objects.forEach(o=>{o?.removeAllListeners?.();o?.destroy?.();});}
  clearPagers(){const objects=this.pagerObjects;this.pagerObjects=[];objects.forEach(o=>{o?.removeAllListeners?.();o?.destroy?.();});}
  removeInputListeners(){
    this.scene?.input?.keyboard?.off('keydown-ESC',this.boundEscape);
    this.scene?.scale.off('resize',this.boundResize);this.scene?.events.off('shutdown',this.boundShutdown);this.scene?.events.off('destroy',this.boundShutdown);
  }
  releasePanel(){
    this.removeInputListeners();this.clearChoices();this.clearPagers();
    this.container?.destroy?.(true);
    this.container=this.overlay=this.panel=this.speakerText=this.bodyText=this.hintText=null;
    this.dialogue=null;this.currentNodeId=null;this.renderedNodeId=null;this.textPages=[];this.choicePage=0;this.textPage=0;
  }
  close(){
    if(this.isClosing)return;this.isClosing=true;
    const callback=this.onClose;this.onClose=null;this.releasePanel();this.isClosing=false;callback?.();
  }
  finishClose(){this.close();}
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.onClose=null;this.releasePanel();this.extension=null;this.scene=null;this.isClosing=false;
  }
}
