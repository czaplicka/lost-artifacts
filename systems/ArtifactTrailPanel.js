import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { trailSummary, trailChoices, trailConfirmation } from './artifactTrailModel.js';
export function renderTrailPanel(host, record, { onClose, onVerify, onContinue = null,
  notice = '', selection = { contact: 0, reference: 0 }, onSelection = () => {}, footer = '' } = {}) {
  const { width, height } = host.scale, scale = Math.min(width / 900, height / 760);
  const root = host.add.container((width - 900 * scale) / 2, (height - 760 * scale) / 2).setScale(scale).setDepth(65000).setScrollFactor(0);
  root.add(host.add.rectangle(450,380,width/scale,height/scale,0x000000,0.85).setInteractive());
  root.add(host.add.rectangle(450,380,900,760,0x201913).setStrokeStyle(2,0xcba564).setInteractive());
  const text = (y, value, size = 22, maxHeight = 90, color = '#f4e6cd') => {
    const t = host.add.text(450,y,value,{fontFamily:'SpecialElite',fontSize:`${size}px`,color,
      align:'center',wordWrap:{width:820}}).setOrigin(0.5,0);
    while(t.height>maxHeight && parseInt(t.style.fontSize,10)>12)t.setFontSize(parseInt(t.style.fontSize,10)-1);
    root.add(t); return t;
  };
  const button = (y,label,callback) => {
    const bg = host.add.rectangle(450,y,820,48,0x4d3828).setStrokeStyle(1,0xcba564).setInteractive({useHandCursor:true});
    root.add(bg);text(y-13,label,21,30,'#ffdda1');bg.on('pointerdown',callback);
  };
  text(18,__dialogueText("systems/ArtifactTrailPanel.js", "t_d39ca33f716a788e5591"),28,40,'#ffcf78');
  text(72,trailSummary(record.plan),22,105);
  if(record.status==='verified') {
    text(205,__dialogueText("systems/ArtifactTrailPanel.js", "t_fa5a600ccd7ee7b74b47"),26,45,'#d9edb2');
    text(270,trailConfirmation(record.plan),23,230);
    text(515,footer,19,70);
    if(onContinue)button(610,__dialogueText("systems/ArtifactTrailPanel.js", "t_44d9a22808399d738119"),onContinue);
    button(680,'CLOSE',onClose);
  } else {
    text(205,__dialogueText("systems/ArtifactTrailPanel.js", "t_96625136929a70ea2db6"),21,80);
    const choices=trailChoices(record.plan);
    const ci=((selection.contact%3)+3)%3, ri=((selection.reference%3)+3)%3;
    button(325,`${__dialogueText("systems/ArtifactTrailPanel.js", "t_ba7927813424abfa9e04")}${choices.contacts[ci].name}${__dialogueText("systems/ArtifactTrailPanel.js", "t_2681ad1de4cbec953893")}`,()=>onSelection({contact:(ci+1)%3,reference:ri}));
    button(400,`${__dialogueText("systems/ArtifactTrailPanel.js", "t_c2c036108672a73b29f4")}${choices.references[ri]}${__dialogueText("systems/ArtifactTrailPanel.js", "t_2681ad1de4cbec953893")}`,()=>onSelection({contact:ci,reference:(ri+1)%3}));
    button(485,__dialogueText("systems/ArtifactTrailPanel.js", "t_eb6e72450e9277b5c000"),()=>onVerify(choices.contacts[ci].id,choices.references[ri]));
    button(680,'CLOSE',onClose);
  }
  text(580,notice,18,65,'#ffb4a1');
  return root;
}
