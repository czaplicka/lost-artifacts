import {BaseScene} from './BaseScene.js';
import {gameState} from '../GameData.js';
import {TableForThreePanel} from '../ui/TableForThreePanel.js';
import {TableForThreeOfficeDesk} from '../ui/TableForThreeOfficeDesk.js';
import {showTableForThreeOfficeLock} from '../ui/TableForThreeOfficeLock.js';
import {readTableForThreeOfficeLock} from '../managers/TableForThreeLockService.js';
import {tableForThreeCompanyReturnView} from '../managers/TableForThreeCompanyView.js';
import {readTableForThree,dispatchTableForThree} from '../managers/TableForThreeService.js';
import {TABLE_FOR_THREE_CONTENT as C} from '../assets/data/tableForThreeContent.js';
import {TABLE_FOR_THREE_LOCATIONS as L} from '../config/TableForThreeLocations.js';
import {getTown} from '../config/RoadTripTowns.js';
import {getCurrentTownId} from '../managers/RoadTripManager.js';
import {piInventoryManager} from '../managers/PIInventoryManager.js';
import {visitTableForThreeRestaurant,returnTableForThreeHome} from '../managers/TableForThreeLocations.js';
export class TableForThreeCompanyScene extends BaseScene{
 constructor(){super({key:L.company.sceneKey});this.sort=[];this.desk=null;}
 create(){super.create();this.sort=[];this.panel=new TableForThreePanel(this);const cleanup=()=>{this.disposeDesk();this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);};this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);this.menu();}
 disposeDesk(){const desk=this.desk;this.desk=null;desk?.destroy();}
 screen(title,text,choices=[]){this.disposeDesk();this.panel.render(title,text,choices);}
 act(type,extra={},context={}){
  if(getCurrentTownId()!==L.company.townId){this.screen('Wrong location','The company is in Home Town.',[['RETURN HOME BY CAR',()=>this.home()]]);return false;}
  const result=dispatchTableForThree({type,...extra},context);if(!result.ok){this.screen('Not yet',result.reason,[['BACK',()=>this.menu()]]);return false;}return true;
 }
 menu(){
  const s=readTableForThree(),town=getTown(L.restaurant.townId).name;
  if(getCurrentTownId()!==L.company.townId){this.screen('Wrong location',L.company.name+' is in Home Town. Return by car before visiting.',[['RETURN HOME BY CAR',()=>this.home()]]);return;}
  if(!s){this.screen(L.company.name,'Accept Table for Three through your office computer first.',[['BACK TO HOME TOWN',()=>this.home()]]);return;}
  if(!s.briefingRead){this.screen('Client briefing',C.briefing.join('\n\n'),[['READ AND CONTINUE',()=>{if(this.act('READ_BRIEFING'))this.menu();}],['BACK TO HOME TOWN',()=>this.home()]]);return;}
  if(s.stage==='company'){
   const watched=readTableForThreeOfficeLock()?.status==='caught';
   this.screen(L.company.name+' — Home Town','Reception, a service corridor and the employee’s locked office. Choose how to get inside.'+(watched?'\n\nSecurity is watching the office corridor. Use another entry route.':''),[
    ['TALK TO RECEPTION',()=>this.reception()],['HELP THE CARETAKER',()=>this.maintenance()],
    [watched?'CORRIDOR UNDER WATCH':'WAIT UNTIL RECEPTION CLOSES',()=>{if(this.act('WAIT_FOR_RECEPTION_TO_LEAVE'))this.lock();},watched],['BACK TO HOME TOWN',()=>this.home()]
   ]);return;
  }
  if(s.stage==='office'){
   this.screen('Employee’s office','Inspect the objects on the desk, or use the buttons below. A calendar entry may explain where she goes after work.',[['READ CALENDAR',()=>this.inspect('calendar')],['EXAMINE BUSINESS CARD',()=>this.inspect('card')],['LOOK THROUGH LATER APPOINTMENTS',()=>this.inspect('appointments')],['BACK TO HOME TOWN',()=>this.home()]]);
   this.desk=new TableForThreeOfficeDesk(this.panel,s,id=>this.inspect(id));return;
  }
  const view=tableForThreeCompanyReturnView(s,L.restaurant.name,town),choices=[['BACK TO HOME TOWN',()=>this.home()]];
  if(view.canTravel)choices.unshift(['DRIVE TO '+town.toUpperCase(),()=>this.drive()]);this.screen(view.title,view.body,choices);
 }
 inspect(id){
  const s=readTableForThree();if(s?.stage!=='office'){this.menu();return;}
  if(id==='calendar'){if(!s.calendarRead&&!this.act('READ_CALENDAR'))return;this.screen('Calendar','Previous appointment:\n\n'+C.calendar.oldEntry,[['BACK TO DESK',()=>this.menu()]]);}
  else if(id==='card'){if(!s.venueIdentified&&!this.act('INSPECT_BUSINESS_CARD'))return;this.screen('Business card',L.restaurant.name+'\n'+getTown(L.restaurant.townId).name+'\n\nA handwritten “6” appears on the reverse.',[['BACK TO DESK',()=>this.menu()]]);}
  else if(id==='appointments')this.calendar();
 }
 reception(){const s=readTableForThree();if(!s)return;if(!s.receptionTalked&&!this.act('TALK_RECEPTION'))return;
  this.screen('Reception','“What is the purpose of your visit?”',[
   ['I NEED A CONSULTATION.',()=>{if(this.act('BOOK_APPOINTMENT'))this.appointment();}],
   ['I AM INVESTIGATING YOUR EMPLOYEE.',()=>this.screen('Reception','“Then I suggest you investigate our appointment policy first.”',[['BACK',()=>this.reception()]])],['BACK',()=>this.menu()]
  ]);
 }
 appointment(){this.screen('Consultation','You are shown into the employee’s office. She apologises and steps out to collect the new-client forms.',[['LOOK AT THE DESK',()=>{if(this.act('EMPLOYEE_STEPS_OUT')&&this.act('ENTER_OFFICE',{route:'appointment'}))this.menu();}],['LEAVE',()=>this.menu()]]);}
 maintenance(){const s=readTableForThree();if(!s)return;if(s.maintenanceHelped){this.screen('Caretaker',C.maintenanceTask.completion,[['TAKE THE BOX TO THE OFFICE',()=>{if(this.act('ACCEPT_DELIVERY')&&this.act('ENTER_OFFICE',{route:'maintenance'}))this.menu();}],['BACK',()=>this.menu()]]);return;}this.sort=[];this.sorting();}
 sorting(){const labels=['ARCHIVE','CLEANING','ELECTRICAL'];this.screen('Sort replacement cabinet labels','Put the labels in alphabetical order.\n\n'+(this.sort.join(' → ')||'No labels selected.'),[
  ...['ELECTRICAL','ARCHIVE','CLEANING'].map(label=>[label,()=>{
   if(this.sort.includes(label))return;this.sort.push(label);
   if(this.sort.length===3){if(this.sort.every((v,i)=>v===labels[i])){if(this.act('HELP_MAINTENANCE',{}, {maintenancePuzzleSolved:true}))this.maintenance();}else{this.sort=[];this.screen('Caretaker','“Alphabetical. Not emotional.”',[['TRY AGAIN',()=>this.sorting()],['BACK',()=>this.menu()]]);}}
   else this.sorting();
  },this.sort.includes(label)]),['BACK',()=>this.menu()]
 ]);}
 lock(){
  if(readTableForThreeOfficeLock()?.status==='caught'){showTableForThreeOfficeLock(this);return;}
  const id=L.lockpicksItemId;
  if(!id||!piInventoryManager.hasItem(id)){this.screen('Locked office',id?'Bring your lockpick set from the Spy Shop.':'The lockpick route is not configured in this build.',[['BACK',()=>this.menu()]]);return;}
  showTableForThreeOfficeLock(this);
 }
 calendar(){const s=readTableForThree();if(!s?.calendarRead||!s.venueIdentified){this.screen('Loose ends','First inspect the earlier appointment and its business card.',[['BACK',()=>this.menu()]]);return;}
  this.screen('Later appointments','Find the appointment matching the earlier entry.',[...C.calendar.distractions.map(text=>[text,()=>this.screen('Not this appointment','It does not match the restaurant entry.',[['BACK',()=>this.calendar()]])]),[C.calendar.nextEntry,()=>{if(this.act('FIND_NEXT_APPOINTMENT',{entryId:C.calendar.nextEntryId}))this.menu();}],['BACK',()=>this.menu()]]);
 }
 async drive(){const result=await visitTableForThreeRestaurant(this);if(!result.ok)this.screen('Cannot travel',result.message||result.reason,[['BACK',()=>this.menu()]]);}
 async home(){if(getCurrentTownId()!==L.company.townId){const result=await returnTableForThreeHome(this);if(!result.ok)this.screen('Cannot travel',result.message||result.reason,[['BACK',()=>this.menu()]]);return;}const moved=await this.goto('HomeCityScene',{entryPoint:L.company.buildingId,gameState});if(moved===false)this.screen('Could not leave','The transition was cancelled.',[['BACK',()=>this.menu()]]);}
}
