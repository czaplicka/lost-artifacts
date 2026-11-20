export class TableForThreeRingTransaction {
  constructor(adapter){this.a=adapter;this.busy=false;}
  buy(price,item){
    if(this.busy)return {ok:false,message:'Please wait.'};
    this.busy=true;
    try{
      const a=this.a,s=a.state();
      if(!s||!['ring','kitchen'].includes(s.stage)||s.ringHandedOver)return {ok:false,message:'You do not need another ring.'};
      if(s.ringPurchased&&a.inventory.hasItem(item.id))return {ok:true,message:'You already have the ring.'};
      if(s.ringPurchased&&!a.inventory.hasItem(item.id))return {ok:false,message:'The recorded quest ring is missing. Restore a save from before it was discarded.'};
      let j=a.journal();
      if(!j){
        if(s.ringPurchased)return {ok:false,message:'The purchased ring is missing. Check your inventory or restore a save.'};
        const capacity=a.inventory.getCapacity();
        if(capacity.current>=capacity.max)return {ok:false,message:'Free a PI inventory slot before buying the ring.'};
        j={id:a.makeId(),price,status:'pending'};a.writeJournal(j);
      }
      if(!Number.isInteger(j.price)||j.price<=0)throw new Error('Invalid ring price.');
      let paid=j.status==='paid'||j.status==='delivered'||!!a.findPayment(j.id);
      if(!paid){
        const capacity=a.inventory.getCapacity();
        if(!a.inventory.hasItem(item.id)&&capacity.current>=capacity.max)return {ok:false,message:'Free a PI inventory slot before paying.'};
        let result;
        try{result=a.spend(j.price,j.id);}catch(error){if(!a.findPayment(j.id))throw error;}
        if(result?.ok!==true&&!a.findPayment(j.id))return {ok:false,message:'Not enough cash for the ring. Nothing has been delivered.'};
        paid=true;a.writeJournal({...j,status:'paid'});
      }
      if(!a.inventory.hasItem(item.id)){
        try{a.inventory.addItem(item);}catch(error){if(!a.inventory.hasItem(item.id))throw error;}
        if(!a.inventory.hasItem(item.id))return {ok:false,message:'Payment is recorded. Free a PI inventory slot, then collect the ring here without paying again.'};
      }
      a.writeJournal({...j,status:'delivered'});
      if(!a.state().ringPurchased){
        const result=a.commitPurchase();
        if(!result.ok)return {ok:false,message:result.reason||'Ring delivered. Reopen this purchase to finish recording it.'};
      }
      return {ok:true,message:'Ring added to PI inventory. Ziggy: “Previously used. Very briefly.”'};
    }catch(error){return {ok:false,message:'Purchase interrupted. Reopen the offer to recover the recorded payment or item. '+error.message};}
    finally{this.busy=false;}
  }
}
