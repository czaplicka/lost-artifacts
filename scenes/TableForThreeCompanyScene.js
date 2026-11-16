import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { TableForThreePanel } from '../ui/TableForThreePanel.js';
import { readTableForThree, dispatchTableForThree } from '../managers/TableForThreeService.js';
import { TABLE_FOR_THREE_CONTENT as C } from '../assets/data/tableForThreeContent.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { getCurrentTownId } from '../managers/RoadTripManager.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { visitTableForThreeRestaurant } from '../managers/TableForThreeLocations.js';

export class TableForThreeCompanyScene extends BaseScene {
  constructor(){super({key:L.company.sceneKey});this.sort=[];this.pins=[];}
  create(){super.create();this.panel=new TableForThreePanel(this);this.menu();}
  act(type,extra={},context={}){
    if(getCurrentTownId()!==L.company.townId){this.panel.render('Wrong location','The company is in Home Town.',[['BACK',()=>this.menu()]]);return false;}
    const result=dispatchTableForThree({type,...extra},context);
    if(!result.ok){this.panel.render('Not yet',result.reason,[['BACK',()=>this.menu()]]);return false;}
    return true;
  }
  menu(){
    const s=readTableForThree();
    if(!s){this.panel.render(L.company.name,'Accept Table for Three through your office computer first.',[['BACK TO HOME TOWN',()=>this.home()]]);return;}
    if(getCurrentTownId()!==L.company.townId){this.panel.render('Wrong location','XYZ Consulting is in Home Town. Return by car before visiting.',[]);return;}
    if(!s.briefingRead){this.panel.render('Client briefing',C.briefing.join('\n\n'),[['READ AND CONTINUE',()=>{if(this.act('READ_BRIEFING'))this.menu();}],['BACK TO HOME TOWN',()=>this.home()]]);return;}
    if(s.stage==='company'){
      this.panel.render(L.company.name+' — Home Town','Reception, a service corridor and the employee’s locked office. Choose how to get inside.',[
        ['TALK TO RECEPTION',()=>this.reception()],['HELP THE CARETAKER',()=>this.maintenance()],['WAIT UNTIL RECEPTION CLOSES',()=>{if(this.act('WAIT_FOR_RECEPTION_TO_LEAVE'))this.lock();}],['BACK TO HOME TOWN',()=>this.home()]
      ]);return;
    }
    if(s.stage==='office'){
      this.panel.render('Employee’s office','A desk calendar, a restaurant business card and enough unread internal memos to insulate the building.',[
        ['READ CALENDAR',()=>{if(this.act('READ_CALENDAR'))this.panel.render('Calendar','Previous appointment:\n\nM. — Table 6. No calls.',[['BACK',()=>this.menu()]]);}],
        ['EXAMINE BUSINESS CARD',()=>{if(this.act('INSPECT_BUSINESS_CARD'))this.panel.render('Business card',L.restaurant.name+'\nWhateverVille\n\nA handwritten “6” appears on the reverse.',[['BACK',()=>this.menu()]]);}],
        ['LOOK THROUGH LATER APPOINTMENTS',()=>this.calendar()],['BACK TO HOME TOWN',()=>this.home()]
      ]);return;
    }
    this.panel.render('Lead recorded',L.restaurant.name+' — WhateverVille.\nThe next matching appointment is recorded in your case. Travel by car to investigate.',[
      ['DRIVE TO WHATEVERVILLE',()=>this.drive()],['BACK TO HOME TOWN',()=>this.home()]
    ]);
  }
  reception(){
    const s=readTableForThree();
    if(!s.receptionTalked&&!this.act('TALK_RECEPTION'))return;
    this.panel.render('Reception','“What is the purpose of your visit?”',[
      ['I NEED A CONSULTATION.',()=>{if(this.act('BOOK_APPOINTMENT'))this.appointment();}],
      ['I AM INVESTIGATING YOUR EMPLOYEE.',()=>this.panel.render('Reception','“Then I suggest you investigate our appointment policy first.”',[['BACK',()=>this.reception()]])],
      ['BACK',()=>this.menu()]
    ]);
  }
  appointment(){
    this.panel.render('Consultation','You are shown into the employee’s office. She apologises and steps out to collect the new-client forms.',[
      ['LOOK AT THE DESK',()=>{if(this.act('EMPLOYEE_STEPS_OUT')&&this.act('ENTER_OFFICE',{route:'appointment'}))this.menu();}],['LEAVE',()=>this.menu()]
    ]);
  }
  maintenance(){
    const s=readTableForThree();
    if(s.maintenanceHelped){
      this.panel.render('Caretaker',C.maintenanceTask.completion,[['TAKE THE BOX TO THE OFFICE',()=>{if(this.act('ACCEPT_DELIVERY')&&this.act('ENTER_OFFICE',{route:'maintenance'}))this.menu();}],['BACK',()=>this.menu()]]);return;
    }
    this.sort=[];this.sorting();
  }
  sorting(){
    const labels=['ARCHIVE','CLEANING','ELECTRICAL'];
    this.panel.render('Sort replacement cabinet labels','Put the labels in alphabetical order.\n\n'+(this.sort.join(' → ')||'No labels selected.'),[
      ...['ELECTRICAL','ARCHIVE','CLEANING'].map(label=>[label,()=>{
        if(this.sort.includes(label))return;
        this.sort.push(label);
        if(this.sort.length===3){
          if(this.sort.every((v,i)=>v===labels[i])){if(this.act('HELP_MAINTENANCE',{}, {maintenancePuzzleSolved:true}))this.maintenance();}
          else{this.sort=[];this.panel.render('Caretaker','“Alphabetical. Not emotional.”',[['TRY AGAIN',()=>this.sorting()],['BACK',()=>this.menu()]]);}
        }else this.sorting();
      },this.sort.includes(label)]),['BACK',()=>this.menu()]
    ]);
  }
  lock(){
    const id=L.lockpicksItemId;
    if(!id||!piInventoryManager.hasItem(id)){
      this.panel.render('Locked office',id?'You need your lockpicks.':'Lockpick equipment ID is not configured in this build. The consultation and caretaker routes are available.',[['BACK',()=>this.menu()]]);return;
    }
    this.pins=[];this.pinStep();
  }
  pinStep(){
    const sequence=['middle','left','right'];
    this.panel.render('Office lock','The next loose pin is '+sequence[this.pins.length]+'. Lift the pins without forcing the lock.',[
      ...['left','middle','right'].map(pin=>[pin.toUpperCase(),()=>{
        if(pin!==sequence[this.pins.length]){this.pins=[];this.panel.render('A footstep in the corridor','You stop before the lock is damaged.',[['TRY AGAIN',()=>this.pinStep()],['BACK',()=>this.menu()]]);return;}
        this.pins.push(pin);
        if(this.pins.length===sequence.length){
          if(this.act('ENTER_OFFICE',{route:'lockpick'},{hasLockpicks:true,lockPuzzleSolved:true}))this.menu();
        }else this.pinStep();
      }]),['BACK',()=>this.menu()]
    ]);
  }
  calendar(){
    const s=readTableForThree();
    if(!s.calendarRead||!s.venueIdentified){this.panel.render('Loose ends','First inspect the earlier appointment and its business card.',[['BACK',()=>this.menu()]]);return;}
    this.panel.render('Later appointments','Find the appointment matching the earlier entry.',[
      ...C.calendar.distractions.map(text=>[text,()=>this.panel.render('Not this appointment','It does not match the restaurant entry.',[['BACK',()=>this.calendar()]])]),
      ['M. — Table 6. No calls.',()=>{if(this.act('FIND_NEXT_APPOINTMENT',{entryId:'next_m_table_6'}))this.menu();}],['BACK',()=>this.menu()]
    ]);
  }
  async drive(){const r=await visitTableForThreeRestaurant(this);if(!r.ok)this.panel.render('Cannot travel',r.message||r.reason,[['BACK',()=>this.menu()]]);}
  async home(){await this.goto('HomeCityScene',{entryPoint:'business-center',gameState});}
}
