import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX } from './PhoneConfig.js';
import { savedPhoneContacts } from '../pi-computer/AlibiContactBook.js';
function directoryContacts(phone){
 const contacts=new Map((phone.contacts||[]).filter(c=>c.listed===true).map(c=>[c.number,c]));
 for(const contact of savedPhoneContacts())if(!contacts.has(contact.number))contacts.set(contact.number,contact);
 return [...contacts.values()];
}
export const PhoneDirectory={
 openDirectory(){if(!this.isOpen||this.state==='dialling')return;this.directoryOpen=true;this.playOnce(SFX.paper,.5);this.renderDirectory();this.dir.setVisible(true);},
 closeDirectory(){this.directoryOpen=false;this.dir.setVisible(false);},
 turnDirectory(direction){const pages=Math.max(1,Math.ceil(directoryContacts(this).length/7));this.directoryPage=(this.directoryPage+direction+pages)%pages;this.playOnce(SFX.page,.5);this.renderDirectory();},
 pickContact(contact){this.sticky={number:contact.number,name:contact.name};this.updateSticky(true);if(this.state==='on_hook')this.status=`Noted: ${contact.number} - ${contact.name}.\n\nPick up the receiver and dial.`;else if(this.state==='ready')this.status=`Noted: ${contact.number} - ${contact.name}.\n\nDial it.`;this.closeDirectory();this.render();},
 renderDirectory(){
  const s=this.scene;this.dir.removeAll(true);
  const blocker=s.add.rectangle(0,0,DW,DH,0,.8).setOrigin(0).setInteractive();blocker.on('pointerdown',()=>this.closeDirectory());
  const book=s.add.graphics();book.fillStyle(0,.45);book.fillRoundedRect(258,58,780,620,18);book.fillStyle(0x2a1a10,1);book.fillRoundedRect(250,50,780,620,18);book.lineStyle(3,0x8b6914,1);book.strokeRoundedRect(250,50,780,620,18);book.fillStyle(0xe9dfc2,1);book.fillRoundedRect(274,74,732,572,8);book.lineStyle(1,0xb8a678,.6);for(let y=214;y<620;y+=58)book.lineBetween(290,y,990,y);book.lineStyle(1,0xb04040,.55);book.lineBetween(296,74,296,646);
  const hit=s.add.rectangle(250,50,780,620,0xffffff,0).setOrigin(0).setInteractive();this.dir.add([blocker,book,hit]);
  this.t(this.dir,318,92,'LOCAL DIRECTORY',34,'#2a2118',FONT_TEXT);
  this.t(this.dir,320,138,'Public listings and your saved contacts.',15,'#6b5a3a',FONT_TEXT);
  this.t(this.dir,884,88,'[ CLOSE ]',14,'#7a1f1f',FONT_PIXEL).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.sfxClick();this.closeDirectory();});
  const contacts=directoryContacts(this),pages=Math.max(1,Math.ceil(contacts.length/7));this.directoryPage=Math.max(0,Math.min(this.directoryPage||0,pages-1));
  contacts.slice(this.directoryPage*7,(this.directoryPage+1)*7).forEach((contact,index)=>{
   const y=160+index*58;
   const row=s.add.rectangle(300,y+6,690,50,0xfff2a8,.3).setOrigin(0).setInteractive({useHandCursor:true});
   row.on('pointerover',()=>row.setFillStyle(0xfff2a8,.6));row.on('pointerout',()=>row.setFillStyle(0xfff2a8,.3));row.on('pointerdown',()=>{this.sfxClick();this.pickContact(contact);});this.dir.add(row);
   const number=this.t(this.dir,318,y+10,contact.number,30,'#2a2118',FONT_TEXT);
   const name=this.t(this.dir,980,y+14,contact.name,22,'#2a2118',FONT_TEXT).setOrigin(1,0);
   if(name.width>540)name.setScale(540/name.width);
   const g=s.add.graphics();g.fillStyle(0x6b5a3a,.7);for(let x=number.x+number.width+14;x<name.x-name.displayWidth-14;x+=9)g.fillCircle(x,y+34,1.4);this.dir.add(g);
  });
  if(!contacts.length)this.t(this.dir,318,190,'No listed contacts.',22,'#2a2118',FONT_TEXT);
  this.t(this.dir,318,600,'<',24,'#2a2118',FONT_PIXEL).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.turnDirectory(-1));
  this.t(this.dir,380,604,`${this.directoryPage+1} / ${pages}`,18,'#2a2118',FONT_TEXT);
  this.t(this.dir,470,600,'>',24,'#2a2118',FONT_PIXEL).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.turnDirectory(1));
  this.t(this.dir,980,606,'Click a name to note its number.\nUnlisted numbers can be dialled manually.',14,'#5a4a30',FONT_TEXT).setOrigin(1,0).setAlign('right');
 }
};
