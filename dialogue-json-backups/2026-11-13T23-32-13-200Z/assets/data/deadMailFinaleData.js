export const OPERATION_EVENTS=[
 {time:'21:00',title:'A DIFFERENT NIGHT. THE SAME ROUTE.',text:'On the next arranged delivery evening, Tessa and the police team record parcel DM-114, its seal and its contents. The courier takes the normal route. You monitor the handover and shed approach.',facts:['chain']},
 {time:'21:10',title:'THE HANDOVER',text:'A hooded collector takes DM-114 at gate B. The parcel code and unbroken seal are visible on the recording. Nobody is identified by costume alone.',facts:['handover']},
 {time:'21:12',title:'THE HOOD COMES OFF',text:'The collector enters the maintenance shed and lowers the hood in the camera’s unobstructed view. It is Edwin Vale. The continuous recording follows the same person and marked parcel from the handover.',facts:['identity']},
 {time:'21:14',title:'OPENED, NOT MERELY CARRIED',text:'Vale opens DM-114 and checks its contents. The observer team records the act before officers secure the parcel. The operation establishes his handling of this parcel; earlier orders still require separate records.',facts:['opened']},
 {time:'21:16',title:'OFFICERS TAKE OVER',text:'The officers secure the scene and preserve the recordings. Vale protests that this is administrative work. Tessa asks which form authorises opening a dead woman’s camera kit. No such form is produced.',facts:['secured']}
];
export const FINAL_FACTS={
 chain:['DM-114 / preparation record','The fictional courier/police operation records the marked parcel, its contents and seal before handover.','Controlled operation record'],
 handover:['Marked parcel collected','The continuous operation recording shows a hooded person accepting DM-114 at gate B.','Operation recording / 21:10'],
 identity:['Edwin Vale identified','The uninterrupted recording follows the collector and parcel to the shed, where Edwin Vale lowers his hood with his face visible.','Operation recording / 21:12'],
 opened:['Vale opens DM-114','Vale opens the marked parcel in the shed before officers secure it. This documents his control of this delivery, not by itself all previous orders.','Operation recording / 21:14'],
 secured:['Evidence preserved','In the story, the police secure the parcel, recordings and operation notes.','Police operation summary'],
 orders:['Earlier orders linked to Vale','A later police disclosure in the story links the earlier orders to Vale’s supplier account and the same delivery references found in the cemetery and courier records.','Fictional police disclosure / order records'],
 resale:['Resale and debt records','The disclosed resale ledger links the lens-kit serials from earlier consignments to sales arranged by Vale. Recorded proceeds were used for his personal debts.','Fictional police disclosure / ledger'],
 marker:['The intimidation marker','A display-marker order supplied in the police disclosure names Florence Finch and was paid by Vale. Florence’s correct birth date appeared in her earlier written complaint to cemetery administration.','Fictional police disclosure / marker order and complaint']
};
export const DISCLOSURES={
 orders:{title:'POLICE DISCLOSURE / ORDER CROSS-REFERENCE',text:'Cemetery references match courier references.\nThose references match orders on Vale’s supplier account.\n\nRecipients: Ada Bell, Victor Moss, Elsie Pike.\nLater recipient: Florence Finch.\nDelivery instruction: SERVICE GATE B.\n\nThe earlier route sheets alone did not identify a buyer. These additional order records provide that link.'},
 resale:{title:'POLICE DISCLOSURE / RESALE LEDGER',text:'Lens-kit serials match earlier delivered goods.\nResale entries identify Vale as the seller.\nRecorded proceeds went towards his personal debts.\n\nThe abandoned carton was a lead, not proof.\nThe serial-number comparison supplies the missing connection.'},
 marker:{title:'POLICE DISCLOSURE / DISPLAY MARKER',text:'ORDER: Florence Finch / display marker / plot 114.\nPAYER: Edwin Vale.\n\nAn earlier complaint from Florence to cemetery administration included her date of birth.\n\nThe display order carries the later death date.\nFlorence was never entered in the burial register.'}
};
export const REPORT_FIELDS=[
 {id:'who',title:'WHO ORGANISED THE DELIVERIES?',options:['Edwin Vale','Tessa Ward','Rose Thorne'],answer:0},
 {id:'method',title:'HOW DID THE SCHEME WORK?',options:['Parcels were buried for a ghost to collect.','Vale used deceased recipients’ names and collected parcels through gate B.','The florist substituted flowers for cameras.'],answer:1},
 {id:'motive',title:'WHAT DOES THE FINANCIAL EVIDENCE SUPPORT?',options:['A paid supernatural performance.','A donation programme for the cemetery.','Reselling the goods to cover Vale’s personal debts.'],answer:2},
 {id:'proof',title:'WHAT LINKS THE COLLECTOR TO THE EARLIER SCHEME?',options:['Only access to a key and a grey cloak.','Only Florence’s suspicion.','Continuous collection footage plus the disclosed order and resale records.'],answer:2}
];
export const PHONE_MESSAGES=[
 ['FLORENCE FINCH','“They removed my headstone. I asked to keep it. Marble is expensive.”'],
 ['TESSA WARD','“My next assignment is a warehouse. No costumes. I have asked for that in writing.”'],
 ['MILO GRAVES','“The foam skulls are accounted for. The real ones remain unhelpfully quiet.”'],
 ['UNLISTED NUMBER','The receiver crackles. A voice whispers: “Wrong plot.”\n\nThe phone is not connected to a line. Probably a feature.']
];
export const DEAD_MAIL_REWARD={id:'dead_mail_last_ringtone',name:'The Last Ringtone',icon:'☎',type:'collectible',quantity:1,stackable:false,
 description:'A cemetery-black souvenir telephone. Its exclusive epilogue messages can be replayed from the completed Dead Mail case.',
 metadata:{source:'dead_mail',developmentPreview:true,consumable:false,useMessage:'The receiver whispers: “Please hold. Eternity has a queue.” Replay its messages in the completed Dead Mail finale.'}};
