import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONTS } from './ComputerSearchShared.js';
import { computerUiCanInteract, playComputerUiClick } from './ComputerUiAudio.js';
import { prepareComputerNotebookAudio, playComputerNotebookAudio } from './ComputerNotebookAudio.js';

export class ComputerSearchNotebook {
    renderNotebook() {
        if (!this.data) return;
        const ui = this.ui;
        prepareComputerNotebookAudio(ui.scene);
        const token=ui.viewToken,caseId=this.definition?.id;
        const live=()=>!this.dead&&computerUiCanInteract(ui)&&!ui.booting&&ui.app==='search'&&ui.viewToken===token&&this.definition?.id===caseId;
        const { width, height } = ui.scene.scale;
        const wide = width >= 1000;
        const paperWidth = wide ? Math.min(310, width * 0.27) : Math.min(340, width - 24);
        if (wide) {
            const available = width - paperWidth - 30;
            const scale = Math.max(0.01, Math.min((available - 12) / 1120, (height - 16) / 800));
            ui.content.setScale(scale).setPosition((available - 1120 * scale) / 2, (height - 800 * scale) / 2);
        }
        if (!wide) {
            const button = ui.scene.add.text(width - 112, 12, this.notesOpen ? __dialogueText("ui/pi-computer/ComputerSearchNotebook.js", "t_ddfd5a25cb0ac6c19923") : __dialogueText("ui/pi-computer/ComputerSearchNotebook.js", "t_8a7525b1492fb84833f5"), {
                fontFamily: 'SpecialElite, monospace', fontSize: '15px', color: '#fff1c6',
                backgroundColor: '#374540', padding: { x: 8, y: 8 }
            }).setInteractive({ useHandCursor: true });
            ui.root.add(button);
            button.on('pointerdown', () => {
                if(!live()||button.active===false||!button.scene)return;
                this.notesOpen = !this.notesOpen;
                if(this.notesOpen)playComputerNotebookAudio(ui,'paper');else playComputerUiClick(ui);
                this.refresh();
            });
        }
        if (!wide && !this.notesOpen) return;
        const paperHeight = Math.min(height - 72, 620), paperX = width - paperWidth - 14;
        const paperY = Math.max(52, (height - paperHeight) / 2);
        const root = ui.scene.add.container(paperX, paperY);ui.root.add(root);
        const rectangle = (x,y,w,h,color,alpha=1) => {
            const object=ui.scene.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);root.add(object);return object;
        };
        const text = (x,y,value,size=16,color='#3d4034') => {
            const object=ui.scene.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color});root.add(object);return object;
        };
        rectangle(5,7,paperWidth,paperHeight,0,0.3);
        rectangle(0,0,paperWidth,paperHeight,0xeee3b8).setInteractive();
        rectangle(34,12,1,paperHeight-24,0xbc7466,0.55);
        for(let y=65;y<paperHeight-32;y+=25)rectangle(12,y,paperWidth-24,1,0x9baf9a,0.35);
        for(let y=30;y<paperHeight-20;y+=48)root.add(ui.scene.add.circle(12,y,4,0x6b6a56,0.7));
        text(46,20,__dialogueText("ui/pi-computer/ComputerSearchNotebook.js", "t_12c42506eefd4f2c93f3"),19);
        if(this.data.cases.length>1){
            const title=text(46,43,this.definition.title,12).setInteractive({useHandCursor:true});
            title.on('pointerdown',()=>{
                if(!live()||title.active===false||!title.scene)return;
                const before=this.definition.id;
                const nextIndex=(this.data.cases.indexOf(this.definition)+1)%this.data.cases.length;
                this.selectCase(this.data.cases[nextIndex].id);
                if(this.definition?.id!==before)playComputerNotebookAudio(ui,'page');
            });
        }
        const lines=[];let line=0;
        const keywords=this.definition.keywords.filter(keyword=>this.progress.known.includes(keyword.id));
        for(const keyword of keywords){
            const maxCharacters=Math.max(10,Math.floor((paperWidth-65)/9));let label='';const wrapped=[];
            for(const word of keyword.label.split(' ')){
                if(label&&(label+' '+word).length>maxCharacters){wrapped.push(label);label=word;}
                else label=label?label+' '+word:word;
            }
            if(label)wrapped.push(label);
            for(const part of wrapped)lines.push({label:part,id:keyword.id,line:line++});
        }
        const rows=Math.max(1,Math.floor((paperHeight-116)/25)),pages=Math.max(1,Math.ceil(line/rows));
        this.notePage=Math.min(this.notePage,pages-1);
        for(const item of lines.filter(entry=>Math.floor(entry.line/rows)===this.notePage)){
            const label=text(46,70+(item.line%rows)*25,item.label,16,this.terms.includes(item.id)?'#a14d35':'#384b43')
                .setInteractive({useHandCursor:true});
            label.on('pointerdown',()=>{
                if(!live()||label.active===false||!label.scene)return;
                const selected=this.terms.includes(item.id);
                this.selectKeyword(item.id);
                if(this.terms.includes(item.id)!==selected)playComputerUiClick(ui);
            });
        }
        if(pages>1){
            const turn=direction=>{
                if(!live()||root.active===false||!root.scene)return;
                const before=this.notePage;this.notePage=(this.notePage+direction+pages)%pages;
                if(this.notePage!==before){playComputerNotebookAudio(ui,'page');this.refresh();}
            };
            text(46,paperHeight-31,'<',18).setInteractive({useHandCursor:true}).on('pointerdown',()=>turn(-1));
            text(paperWidth/2-15,paperHeight-28,`${this.notePage+1}/${pages}`,13);
            text(paperWidth-38,paperHeight-31,'>',18).setInteractive({useHandCursor:true}).on('pointerdown',()=>turn(1));
        }
    }
    paginate(blocks,width,height){
        const probe=this.ui.scene.add.text(0,0,'',{fontFamily:'SpecialElite, "Special Elite", monospace',fontSize:'16px'}).setVisible(false);
        const measure=value=>{probe.setText(value);return probe.width;};
        const pages=[[]];let x=0,y=0;
        const nextLine=()=>{x=0;y+=25;if(y+22>height){pages.push([]);y=0;}};
        try{
            for(const block of blocks){
                for(const part of block){
                    const id=typeof part==='object'?part.keywordId:null;
                    const value=id?(part.text||this.definition.keywords.find(keyword=>keyword.id===id).label):part;
                    for(const token of value.split(/(\s+)/).filter(Boolean)){
                        if(/^\s+$/.test(token)){if(x)x+=measure(' ');continue;}
                        const emit=chunk=>{
                            const textWidth=measure(chunk);if(x&&x+textWidth>width)nextLine();
                            pages[pages.length-1].push({text:chunk,keywordId:id,x,y});x+=textWidth;
                        };
                        let word='';
                        for(const character of token){
                            if(word&&measure(word+character)>width){emit(word);nextLine();word='';}
                            word+=character;
                        }
                        if(word)emit(word);
                    }
                }
                nextLine();if(y)nextLine();
            }
        }finally{probe.destroy();}
        if(pages.length>1&&!pages[pages.length-1].length)pages.pop();return pages;
    }
}
