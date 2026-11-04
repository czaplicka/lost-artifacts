export function canAccessUpperOffice(state) {
  const solved=Number(state?.casesSolved??0);
  return Number.isFinite(solved)&&solved>=4;
}

export class OfficeElevatorAccess {
  constructor(scene){
    this.scene=scene;this.busy=false;this.disposed=false;
    this.zone=scene.hotspotManager?.findById('brokenElevator')??null;
    this.originalAction=this.zone?.hotspotData?.action;
    this.originalLabel=this.zone?.hotspotData?.label;
    if(this.zone?.hotspotData){
      this.action=()=>{void this.travelUp();};
      this.zone.hotspotData.action=this.action;
      this.zone.hotspotData.label='Elevator';
    }else console.error('[OfficeElevatorAccess] Missing brokenElevator hotspot.');
    this.refresh();
  }
  refresh(){
    if(this.disposed)return;
    const scene=this.scene,bg=scene.elevatorBackground;
    const unlocked=canAccessUpperOffice(scene.gameState),key=unlocked?'elevator_open':'elevator_close';
    if(bg?.active&&scene.textures.exists(key)&&bg.texture?.key!==key){
      bg.setTexture(key).setDisplaySize(scene.rooms.elevator.width,scene.scale.height);
    }
    if(this.zone?.hotspotData)this.zone.hotspotData.label=unlocked?'Elevator / upper floor':'Elevator / access requires four solved cases';
  }
  async travelUp(){
    const scene=this.scene;
    if(this.disposed||this.busy||!scene.isOfficeActive()||scene.uiLocked||scene.navigation?.isMoving||scene._officePanelRequest)return;
    if(!canAccessUpperOffice(scene.gameState)){
      scene.showOfficeStatusMessage('Upper-floor access is granted after four successfully solved cases.');return;
    }
    this.busy=true;scene.refreshPanelLock();scene.navigation?.hideHint();
    try{
      await scene.flushOfficeAutosave();
      if(this.disposed||!scene.isOfficeActive())return;
      const{openMediumOffice}=await import('../../mediumOfficeLauncher.js');
      if(this.disposed||!scene.isOfficeActive())return;
      const opened=openMediumOffice(scene.game);
      if(!opened)throw new Error('The upper-floor scene is already open.');
    }catch(error){
      console.error('[OfficeElevatorAccess]',error);
      if(!this.disposed&&scene.isOfficeActive())scene.showOfficeStatusMessage('The upper floor could not be opened. Check the medium office files.');
    }finally{
      if(!this.disposed){this.busy=false;scene.refreshPanelLock();}
    }
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    if(this.zone?.hotspotData?.action===this.action){
      this.zone.hotspotData.action=this.originalAction;this.zone.hotspotData.label=this.originalLabel;
    }
    this.zone=null;this.scene=null;
  }
}
