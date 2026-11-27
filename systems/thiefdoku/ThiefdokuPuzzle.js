import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function thiefdokuColumnLabel(col){
 return String.fromCharCode(65+col);
}
export function thiefdokuCellLabel(row,col){
 return `${thiefdokuColumnLabel(col)}${row+1}`;
}
// Fills {name} placeholders in catalogue templates.
export function fillThiefdokuText(template,params={}){
 return String(template).replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
// Storage identifiers are technical, never catalogue text.
const STORAGE_KEY='lost-artifacts.thiefdoku.illustrated.v1';
const MIGRATION_BACKUP_SUFFIX='.backup.before-room-rule-v3';
const REJECTED_BACKUP_SUFFIX='.backup.rejected';
const SAVE_VERSION=4;
const MAX_GENERATION_ATTEMPTS=8;
const SIZE = 4;
const PEOPLE = [
 {id:'curator',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6c00e6ff6ea6bcc6ac12"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_61c91d99533e1b870bc9"),short:'VIC',gender:'m',group:'resident',skin:0xd6a070,hair:0x654431,shirt:0xd7854e},
 {id:'guard',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_886ff287563268e7b001"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_755c7f36b06987837546"),short:'DOR',gender:'m',group:'staff',skin:0xe1af83,hair:0x46342f,shirt:0x9962a2},
 {id:'assistant',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c8ccf6c9714f85c0da64"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_391e405152779acc6b0f"),short:'NORA',gender:'f',group:'staff',skin:0xe8bd91,hair:0xe7cd6a,shirt:0x5b8ebc},
 {id:'cleaner',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_e6010c936f6175dd77f7"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8fdf1a9b6d5e1d051964"),short:'BER',gender:'f',group:'staff',skin:0xb97f66,hair:0x2e303b,shirt:0x60a47e},
 {id:'cook',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f6b6aad7a7690810466c"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_7f4a1e5bff2d56e523ee"),short:'FEL',gender:'m',group:'staff',skin:0xdba882,hair:0x54382d,shirt:0xb96061},
 {id:'gardener',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_830449e3d5d3711c5312"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_494ee23c96b623b7c5d9"),short:'MINA',gender:'f',group:'staff',skin:0x9b694e,hair:0x352d2b,shirt:0x69944c},
 {id:'butler',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_877f4b9feda2945eb505"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_676e2d10c4e5403d984a"),short:'EDG',gender:'m',group:'staff',skin:0xe2b58d,hair:0x734d36,shirt:0x4e667f},
 {id:'guest',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_108040ac289a13952927"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_411e3b7fd51829ba1fbb"),short:'RUBY',gender:'f',group:'resident',skin:0xeac3a0,hair:0xa65036,shirt:0xd89e54},
 {id:'driver',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c06770b58143dcc98a29"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9fe4c68ec20dda7c6b1d"),short:'DAN',gender:'m',group:'staff',skin:0xb9805d,hair:0x37302d,shirt:0x537e93},
 {id:'neighbour',name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_65003c7a186430e894ca"),role:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_860af946e6d5a87a183c"),short:'IRIS',gender:'f',group:'resident',skin:0xd2a185,hair:0xb4b6bd,shirt:0x957da9}
];
const THEMES={
 house:{name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0185d274e74a4d060def"),rooms:['bathroom','kitchen','bedroom','living','study','dining','guest_room','laundry','conservatory','attic'],items:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_4740d93d142c1ab89282"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_dba2e890acb79c7e4e0d"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1867c92816b95dfd1b70"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_27660190109f8610e2de")],roles:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9d0081a4f3d631b3cff6"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_755c7f36b06987837546"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_391e405152779acc6b0f"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8fdf1a9b6d5e1d051964"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_7f4a1e5bff2d56e523ee"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_494ee23c96b623b7c5d9"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_676e2d10c4e5403d984a"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_411e3b7fd51829ba1fbb"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9fe4c68ec20dda7c6b1d"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_860af946e6d5a87a183c")]},
 museum:{name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_75ffd5be2e1ec51352c4"),rooms:['gallery','sculpture_hall','archive','restoration_lab','museum_reception','gift_shop','security','exhibit_hall','museum_kitchen','museum_bathroom'],items:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_45e12e30fc10f9304a21"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8f92ef93d61283f7873d"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_2a351a3844fef43c7ac1"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_28f2c635ce3254270573")],roles:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_61c91d99533e1b870bc9"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0913d0c7ec91701de9d1"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_918fcd73c354a24535c2"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8fdf1a9b6d5e1d051964"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8cb8002e5cd0ea0f3611"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8919a27248eb4d853509"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a25a9d5330f3a6d61289"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_49c83f2ff4fa9abf2bfd"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_bbc5df524d41b1e3bf11"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_cf9f5896322a37400475")]},
 office:{name:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9af0ff0f58a463fe73ff"),rooms:['reception','open_office','conference','office_kitchen','ceo_office','library','copy_room','accounts','break_room','office_bathroom'],items:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_89e7880208390282c999"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a3302ee85135b6c421c1"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9a856b261de9fef715c8"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d31414c880615a9e0d05")],roles:[__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_57f0df0e3d01f3f2b0aa"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0913d0c7ec91701de9d1"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0ac10a3e7437697e7f42"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8fdf1a9b6d5e1d051964"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f2036d5672342c5396df"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6c1253fe5e28dd2b6093"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d346c372ce5d2eb259de"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ea540ffea2e0d7a53de5"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_bbc5df524d41b1e3bf11"),__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0c77fe09ab336a3e57cc")]}
};
const ROOM_NAMES={
 bathroom:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ba2e970dc00f4a1de1bc"),kitchen:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6095fd85b9a8a55cedb0"),bedroom:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_2f030a5c28279beec64a"),living:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_aae766ae6dcb0ffd54e7"),study:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c022e98ff6f1422c4259"),dining:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b7e97c6c181f49e31ad3"),guest_room:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_546ae3d1975c5cf2dde3"),laundry:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f70f1b7b460f75de275f"),conservatory:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0187f77240f254c0b5ad"),attic:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_4c0b97033375f9eff927"),
 gallery:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d60ddf9e147d2c1616fe"),sculpture_hall:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6bf3d7ade95c1dba77c8"),archive:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b22a9799327ae5c2ede9"),restoration_lab:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_63a009f8c89980fe4f90"),museum_reception:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_41c80c952ac361186179"),gift_shop:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_5963094613fc830a4218"),security:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c19a83035cd77f1ea4c5"),exhibit_hall:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_31e39d7cce93e1e68d88"),museum_kitchen:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d843165309cac21a3d45"),museum_bathroom:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_3b204df16f4baa747815"),
 reception:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f850633979e8f94cb2e2"),open_office:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_5e696ec8a6a12d4335db"),conference:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b7d5808cddbab2dfe47d"),office_kitchen:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f432916409f1db597488"),ceo_office:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c23d74c9e32620dfcbab"),library:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d77982267d9699c2a57b"),copy_room:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0ab657667dc697a255c1"),accounts:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_681649696598cced9230"),break_room:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a8f448b6605d7598ad9b"),office_bathroom:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6993e4ee44821a013668")
};
const FURNITURE={
 rug:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f5b524f9087cf7ad5cc4"),w:2,h:2,blocking:false,on:true},bed:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1c3e4841315ea957362f"),w:1,h:2,blocking:false,on:true},chair:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c47923ffc381bc1ea418"),w:1,h:1,blocking:false,on:true},bench:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_5662797c6d4c27f9f770"),w:2,h:1,blocking:false,on:true},
 sofa:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_3004c7535b17ffb4f964"),w:2,h:1,blocking:true},table:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ad875d4bcb7fa0fef5d2"),w:2,h:1,blocking:true},shelf:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_71f9beb098553feea3dd"),w:1,h:1,blocking:true},plant:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1f29e774e9002f2637eb"),w:1,h:1,blocking:true},tv:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a4ebb1f3ce47332e3ede"),w:1,h:1,blocking:true},bath:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_052fe3e8e9f972d17a2f"),w:1,h:2,blocking:true},
 display:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c331a2528dbc1a9ce537"),w:1,h:1,blocking:true},toilet:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_75aae65cb330a7e27a9f"),w:1,h:1,blocking:true},sink:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8cb7aa529233e42a4dce"),w:1,h:1,blocking:true},fridge:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a741c068c2874f84d774"),w:1,h:1,blocking:true},stove:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_195341b5dd1b9f77f3c2"),w:1,h:1,blocking:true},
 statue:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_e6e11d07eee3d322878c"),w:1,h:1,blocking:true},exhibit:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_3741a5ff0635ec0d007b"),w:1,h:1,blocking:true},desk:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_06725498923ef5ba1888"),w:2,h:1,blocking:true},computer:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1dd35a09dd836a07773a"),w:1,h:1,blocking:true},cabinet:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a1d6bc6d8dea4c1b72ac"),w:1,h:1,blocking:true},trash:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_51e08953aea6709635d2"),w:1,h:1,blocking:true},copier:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_71f005f019d5e327b3d9"),w:1,h:1,blocking:true},washer:{label:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_fed919bc3454f8726047"),w:1,h:1,blocking:true}
};
const ROOM_FURNITURE={
 bathroom:['toilet','sink','bath'],museum_bathroom:['toilet','sink'],office_bathroom:['toilet','sink'],
 kitchen:['fridge','stove','sink'],museum_kitchen:['fridge','stove','sink'],office_kitchen:['fridge','stove','sink'],
 bedroom:['bed','cabinet'],guest_room:['bed','plant'],living:['sofa','tv','plant'],study:['shelf','desk','plant'],dining:['table','plant'],laundry:['washer','sink'],conservatory:['plant','bench'],attic:['cabinet','shelf'],
 gallery:['statue','exhibit','bench'],sculpture_hall:['statue','bench','plant'],archive:['shelf','cabinet'],restoration_lab:['exhibit','computer','sink'],museum_reception:['computer','plant'],gift_shop:['exhibit','shelf'],security:['computer','cabinet'],exhibit_hall:['exhibit','statue','bench'],
 reception:['computer','plant'],open_office:['computer','cabinet','trash'],conference:['table','computer'],ceo_office:['desk','cabinet','plant'],library:['shelf','bench'],copy_room:['copier','cabinet','trash'],accounts:['computer','cabinet'],break_room:['sofa','trash','plant']
};
// Whole-sentence templates keep word order translatable.
const CLUE_TEXT={
 unavailable:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9ae0f733f2f0d761f406"),
 room:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1d250a54f8d9cdd54446"),notRoom:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_939d0a3c33180f77a9ca"),
 row:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_03989393eb5aed2084c4"),col:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b3912586d79a61d03ae9"),
 on:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c97c6dd6bf198369dff9"),onChair:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9afeef7e1dc11b54fcd4"),onBench:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_659c6a476241353a0f9e"),
 notOn:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_60cdc7b747692724b120"),notOnChair:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f433c6bdb1df9ea5a3cd"),
 onlyOn:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_27361e820958b3423eb1"),onlyOnChair:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_903b837399108dc4c796"),
 beside:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1a47266b36fc1d6efda5"),notBeside:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_52d811800192d87f8997"),
 either:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_bf5747fa5e18aa8a733e"),
 north:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9dc4871e6b42553c9fa7"),south:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_04d3b1c3b26cad055d8c"),west:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_568fbb0dc12a7209d991"),east:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1d0c2d01caacfad31106"),
 roleTarget:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_471a3be65ed6c23923bf"),
 uniqueWoman:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c2e43c45e02106ac4653"),uniqueMan:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ce1ea3e115453b4d4235"),
 notAdjacentColumn:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0d7bd4fb648785f062f6"),
 rowBelowOne:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_264f5593db290cda8b9f"),rowAboveOne:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_aea2e9fd70347f25d253"),
 rowBelowMany:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_1d5d657e6e2cb6b57491"),rowAboveMany:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_22c6da7217dbdc253281"),
 groupBelowOne:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0fe9ef67b04e2715cae7"),groupAboveOne:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a3e87a4e8b08c17d1324"),
 groupBelowMany:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_609483436c8d348327d4"),groupAboveMany:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_62af979c9242ac25fc7e")
};
const COUNT_TEXT={
 south:{one:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_028ec614f2be57d49d0d"),many:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_d4e0856b011f6d511a78")},
 north:{one:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_7e569bce7be60b357229"),many:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_3ee64ba4d29898a03e8d")},
 west:{one:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9b728fd7dd8432852ba5"),many:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_09c27051e32eb0045e22")},
 east:{one:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ede078241c91c1e18a04"),many:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_4272ba0163e965927e8b")}
};
const NOUN_A={woman:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6e79e0125d8dd6e02bd9"),man:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_87e45dcde1a748c130df"),staff:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b145b7893a59cd2d93e2"),resident:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_e94fc8e3335fe227792b"),visitor:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_042597c48a1cd477db97"),person:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_df381eb4bb572dafc91d")};
const NOUN_ONE={woman:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_cf2e5bff1ef03dcd20d1"),man:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_48b676e2b107da679512"),staff:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_6793ebcac1ef86ba0576"),resident:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_84816ff383c826e9c11e"),visitor:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_5f14f9e6d80f802a6526"),person:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_38a81e87e79631e602bf")};
const NOUN_MANY={woman:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0ef49a3c92f37310f483"),man:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_08e3c4c91ca5c58e479e"),staff:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_f6d8d45d1f7854af0932"),resident:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_50286229439eccf54660"),visitor:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_fe9919df44cbe9afdb66"),person:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c9022680f888674e2b22")};
const GROUP_PLURAL={staff:NOUN_MANY.staff,resident:NOUN_MANY.resident,visitor:NOUN_MANY.visitor};
const clone=x=>JSON.parse(JSON.stringify(x));
const deepFreeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))deepFreeze(v);}return x;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function storageDefault(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch(_){return null;}}
const all=values=>values.some(v=>v===false)?false:values.every(v=>v===true)?true:null;
const any=values=>values.some(v=>v===true)?true:values.every(v=>v===false)?false:null;

export class ThiefdokuPuzzle {
 constructor(options={}){
  this.options=options;this.storage=options.storage===undefined?storageDefault():options.storage;
  this.storageKey=options.storageKey||STORAGE_KEY;
  this.solved=0;this.saveError=false;this.history=[];this.migrated=false;
  // Set when a saved case existed but could not be loaded (see restore()).
  this.restoreRejected=false;this.restoreRejectReason=null;
  this.staticState=null;this.targetCache=new WeakMap();
  if(!this.restore())this.reset();
 }
 sizeForProgress(){return Number.isInteger(this.options.size)?clamp(this.options.size,4,10):clamp(4+Math.floor(this.solved/3),4,10);}
 makePeople(){
  this.targetCache=new WeakMap();
  return clone(PEOPLE.slice(0,this.size)).map((p,i)=>({...p,role:THEMES[this.theme].roles[i],group:this.theme==='house'?p.group:['guest','driver','neighbour'].includes(p.id)?'visitor':'staff'}));
 }
 get stolenItem(){const items=THEMES[this.theme]?.items||[];return items[this.stolenItemIndex]??items[0]??'';}
 valid(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&c>=0&&r<this.size&&c<this.size;}
 roomAt(p){return this.layout[p.row][p.col];}
 covers(o,r,c){return r>=o.row&&r<o.row+o.h&&c>=o.col&&c<o.col+o.w;}
 objectsAt(r,c){return this.objects.filter(o=>this.covers(o,r,c));}
 isBlocked(r,c){return this.objectsAt(r,c).some(o=>o.blocking);}
 beside(p,o){
  if(this.roomAt(p)!==this.layout[o.row][o.col]||this.covers(o,p.row,p.col))return false;
  return Math.max(o.row-p.row,0,p.row-o.row-o.h+1)+Math.max(o.col-p.col,0,p.col-o.col-o.w+1)===1;
 }
 unary(p,c){
  switch(c.type){
   case 'room':return this.roomAt(p)===c.roomId;
   case 'notRoom':return this.roomAt(p)!==c.roomId;
   case 'row':return p.row===c.value;case 'col':return p.col===c.value;
   case 'on':return this.objects.some(o=>o.kind===c.kind&&this.covers(o,p.row,p.col));
   case 'notOn':return !this.objects.some(o=>o.kind===c.kind&&this.covers(o,p.row,p.col));
   case 'beside':return this.objects.some(o=>o.kind===c.kind&&this.beside(p,o));
   case 'notBeside':return !this.objects.some(o=>o.kind===c.kind&&this.beside(p,o));
   default:return false;
  }
 }
 pair(a,b,type,value=1){
  switch(type){
   case 'north':return a.row<b.row;case 'south':return a.row>b.row;
   case 'west':return a.col<b.col;case 'east':return a.col>b.col;
   case 'rowDelta':return a.row-b.row===value;
   case 'notAdjacentColumn':return Math.abs(a.col-b.col)!==1;
   default:return false;
  }
 }
 inGroup(person,filter={}){for(const key in filter)if(person[key]!==filter[key])return false;return true;}
 // The solver evaluates group clues thousands of times; people never change
 // during a case, so the target list per rule and subject is cached.
 targets(c,id){
  let bySubject=this.targetCache.get(c);
  if(!bySubject){bySubject=new Map();this.targetCache.set(c,bySubject);}
  let list=bySubject.get(id);
  if(!list){list=this.people.filter(p=>p.id!==id&&this.inGroup(p,c.filter||{}));bySubject.set(id,list);}
  return list;
 }
 evaluateRule(c,assigned,subject){
  const id=c.subjectId||subject;
  if(c.type==='all')return all(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='any')return any(c.rules.map(r=>this.evaluateRule(r,assigned,id)));
  if(c.type==='not'){const v=this.evaluateRule(c.rule,assigned,id);return v===null?null:!v;}
  const a=assigned.get(id);if(!a)return null;
  if(c.otherId){const b=assigned.get(c.otherId);return b?this.pair(a,b,c.type,c.value):null;}
  if(c.type==='onlyOn'){
   if(!this.unary(a,{type:'on',kind:c.kind}))return false;
   let unknown=false;
   for(const p of this.people)if(p.id!==id){const b=assigned.get(p.id);if(!b)unknown=true;else if(this.unary(b,{type:'on',kind:c.kind}))return false;}
   return unknown?null:true;
  }
  if(c.type==='countRelative'){
   let yes=0,unknown=0;
   for(const p of this.targets(c,id)){const b=assigned.get(p.id);if(!b)unknown++;else if(this.pair(b,a,c.direction))yes++;}
   if(yes>c.count||yes+unknown<c.count)return false;
   return unknown?null:yes===c.count;
  }
  if(c.type==='rowDeltaGroup'){
   let unknown=false;
   for(const p of this.targets(c,id)){const b=assigned.get(p.id);if(!b)unknown=true;else if(a.row-b.row===c.value)return true;}
   return unknown?null:false;
  }
  return this.unary(a,c);
 }
 evaluate(clue,assigned){return this.evaluateRule(clue.rule||clue,assigned,clue.personId);}
 matchesClue(solution,c){return this.evaluate(c,new Map(solution.map(p=>[p.personId,p])))===true;}
 dependencies(clue){
  const found=new Set();
  const visit=(c,subject)=>{
   const id=c.subjectId||subject;found.add(id);
   if(c.type==='all'||c.type==='any'){c.rules.forEach(r=>visit(r,id));return;}
   if(c.type==='not'){visit(c.rule,id);return;}
   if(c.otherId)found.add(c.otherId);
   if(c.type==='onlyOn')this.people.forEach(p=>found.add(p.id));
   if(c.type==='countRelative'||c.type==='rowDeltaGroup')this.targets(c,id).forEach(p=>found.add(p.id));
  };visit(clue.rule||clue,clue.personId);return found;
 }
 solve(clues=this.clues,{limit=2,maxNodes=4000}={}){
  const n=this.size,rooms=[...new Set(this.layout.flat())],roomIndex=new Map(rooms.map((r,i)=>[r,i])),cells=[],assigned=new Map();
  if(rooms.length!==n)return{solutions:[],exhausted:false,nodes:0};
  for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(!this.isBlocked(row,col))cells.push({row,col,roomBit:1<<roomIndex.get(this.layout[row][col])});
  const records=clues.map(c=>({clue:c,deps:this.dependencies(c)}));
  const domains=this.people.map(person=>{
   const own=records.filter(r=>r.deps.size===1&&r.deps.has(person.id));
   return cells.filter(p=>{assigned.set(person.id,p);const ok=own.every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(person.id);return ok;});
  });
  const affected=this.people.map(p=>records.filter(r=>r.deps.size>1&&r.deps.has(p.id))),chosen=Array(n).fill(null),solutions=[];
  let nodes=0,exhausted=false;
  const compatible=(i,p)=>{const id=this.people[i].id;assigned.set(id,p);const ok=affected[i].every(r=>this.evaluate(r.clue,assigned)!==false);assigned.delete(id);return ok;};
  const bits=v=>{let k=0;while(v){v&=v-1;k++;}return k;};
  const walk=(usedRows,usedCols,usedRooms,depth)=>{
   if(exhausted||solutions.length>=limit)return;
   if(++nodes>maxNodes){exhausted=true;return;}
   if(depth===n){if(clues.every(c=>this.evaluate(c,assigned)===true))solutions.push(chosen.map((p,i)=>({personId:this.people[i].id,row:p.row,col:p.col})));return;}
   let best=-1,values=null,possibleRows=0,possibleCols=0,possibleRooms=0;
   for(let i=0;i<n;i++)if(!chosen[i]){
    const avail=domains[i].filter(p=>!(usedRows&(1<<p.row))&&!(usedCols&(1<<p.col))&&!(usedRooms&p.roomBit)&&compatible(i,p));
    if(!avail.length)return;
    for(const p of avail){possibleRows|=1<<p.row;possibleCols|=1<<p.col;possibleRooms|=p.roomBit;}
    if(values===null||avail.length<values.length){best=i;values=avail;}
   }
   if(bits(possibleRows)<n-depth||bits(possibleCols)<n-depth||bits(possibleRooms)<n-depth)return;
   for(const p of values){
    const id=this.people[best].id;chosen[best]=p;assigned.set(id,p);
    walk(usedRows|(1<<p.row),usedCols|(1<<p.col),usedRooms|p.roomBit,depth+1);
    chosen[best]=null;assigned.delete(id);if(exhausted||solutions.length>=limit)return;
   }
  };walk(0,0,0,0);return{solutions,exhausted,nodes};
 }
 neighbours(row,col){return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].filter(([r,c])=>this.valid(r,c));}
 makeLayout(){
  const n=this.size,roomIds=shuffle(THEMES[this.theme].rooms.slice(0,n));
  const cols=shuffle(Array.from({length:n},(_,i)=>i));
  this.solution=shuffle(this.people).map((p,row)=>({personId:p.id,row,col:cols[row]}));
  for(let attempt=0;attempt<60;attempt++){
   const layout=Array.from({length:n},()=>Array(n).fill(null)),regions=this.solution.map((p,i)=>({id:roomIds[i],cells:[[p.row,p.col]]}));
   this.solution.forEach((p,i)=>{layout[p.row][p.col]=roomIds[i];});
   let remaining=n*n-n;
   while(remaining){
    const choices=regions.map(region=>{
     const edge=new Map();for(const [r,c] of region.cells)for(const [rr,cc] of this.neighbours(r,c))if(layout[rr][cc]===null)edge.set(`${rr},${cc}`,[rr,cc]);
     return{region,edge:[...edge.values()]};
    }).filter(q=>q.edge.length);
    if(!choices.length)break;
    const minimum=Math.min(...choices.map(q=>q.region.cells.length)),small=choices.filter(q=>q.region.cells.length<=minimum+(minimum<2?0:1)),choice=pick(small),[r,c]=pick(choice.edge);
    layout[r][c]=choice.region.id;choice.region.cells.push([r,c]);remaining--;
   }
   if(!remaining&&regions.every(r=>r.cells.length>=2)){this.layout=layout;return;}
  }
  // Connected, valid fallback: one vertical room per seed column.
  const byCol=new Map(this.solution.map((p,i)=>[p.col,roomIds[i]]));
  this.layout=Array.from({length:n},()=>Array.from({length:n},(_,c)=>byCol.get(c)));
 }
 addFurniture(){
  this.objects=[];let serial=0;
  const rooms=[...new Set(this.layout.flat())];
  const canPlace=(kind,r,c,w,h,overRug)=>{
   const def=FURNITURE[kind];if(!this.valid(r,c)||!this.valid(r+h-1,c+w-1))return false;
   const room=this.layout[r][c];
   for(let rr=r;rr<r+h;rr++)for(let cc=c;cc<c+w;cc++){
    if(this.layout[rr][cc]!==room||this.objectsAt(rr,cc).some(o=>!overRug||o.kind!=='rug'))return false;
    if(def.blocking&&this.solution.some(p=>p.row===rr&&p.col===cc))return false;
   }
   if(def.blocking&&kind!=='display'){
    let open=0,total=0;for(let rr=0;rr<this.size;rr++)for(let cc=0;cc<this.size;cc++)if(this.layout[rr][cc]===room){total++;if(!this.isBlocked(rr,cc))open++;}
    if(open-w*h<Math.min(2,total-1))return false;
   }return true;
  };
  const place=(kind,room,preferred=null)=>{
   const def=FURNITURE[kind],shapes=def.w===def.h?[[def.w,def.h]]:[[def.w,def.h],[def.h,def.w]];
   let candidates=[];
   for(const [w,h] of shapes)for(let r=0;r<this.size;r++)for(let c=0;c<this.size;c++)if(this.layout[r][c]===room&&canPlace(kind,r,c,w,h,kind!=='rug'))candidates.push({row:r,col:c,w,h});
   if(preferred){const on=candidates.filter(o=>this.covers(o,preferred.row,preferred.col));if(on.length)candidates=on;}
   if(!candidates.length)return false;
   this.objects.push({...pick(candidates),id:`${kind}_${serial++}`,kind,blocking:def.blocking});return true;
  };
  if(!place('display',this.theftRoom))throw Error('No space for the empty display.');
  for(const room of rooms){if(this.size>=5)place('rug',room);}
  for(const room of rooms){
   const list=ROOM_FURNITURE[room]||['plant','shelf'];
   for(const kind of list)place(kind,room);
  }
  const seated=shuffle(this.solution).slice(0,pick([1,2,Math.max(2,Math.floor(this.size/2))]));
  for(const p of seated)place('chair',this.roomAt(p),p);
  if(this.size>=6)for(const room of shuffle(rooms).slice(0,Math.floor(this.size/3)))place('plant',room);
 }
 generate(){
  this.people=this.makePeople();this.makeLayout();
  const thief=pick(this.solution);this.theftRoom=this.roomAt(thief);this.thiefId=thief.personId;
  this.stolenItemIndex=Math.floor(Math.random()*THEMES[this.theme].items.length);
  this.addFurniture();this.makeClues();
  this.solution=this.canonicalSolution(this.solution);
 }
 // One fixed order (people order), the same as the solver returns after a
 // reload, so anything derived from the solution stays stable across saves.
 canonicalSolution(list){
  const order=new Map(this.people.map((p,i)=>[p.id,i]));
  return [...list].sort((a,b)=>order.get(a.personId)-order.get(b.personId)).map(({personId,row,col})=>({personId,row,col}));
 }
 reset(){
  // A failed generation must not leave a half-built case in memory.
  const fields=['size','theme','people','layout','solution','theftRoom','thiefId','stolenItemIndex','objects','clues','targetCache'];
  const previous=this.clues?Object.fromEntries(fields.map(key=>[key,this[key]])):null;
  this.size=this.sizeForProgress();
  this.theme=THEMES[this.options.theme]?this.options.theme:pick(Object.keys(THEMES).filter(id=>id!==this.theme));
  // Random layouts occasionally leave no room for the display or exhaust the
  // uniqueness budget; a fresh layout almost always succeeds.
  let lastError=null;
  for(let attempt=0;attempt<MAX_GENERATION_ATTEMPTS;attempt++){
   try{this.generate();lastError=null;break;}catch(error){lastError=error;}
  }
  if(lastError){if(previous)Object.assign(this,previous);throw lastError;}
  this.legacySolution=null;this.staticState=null;
  this.board=Array.from({length:this.size},()=>Array(this.size).fill(null));this.crosses=Array.from({length:this.size},()=>Array(this.size).fill(false));
  this.selectedPersonId=null;this.attempts=0;this.maxAttempts=3;this.completed=false;this.failed=false;this.wrongAccusations=[];this.history=[];
  this.save();return this.getState();
 }
 // Keep rule identifiers stable for saved games; only the wording comes from the catalogue.
 displayClueText(clue){
  return this.ruleDisplayText(clue.rule||clue,clue.family)||CLUE_TEXT.unavailable;
 }
 ruleDisplayText(rule,family){
  const groupKey=filter=>filter.gender==='f'?'woman':filter.gender==='m'?'man':filter.group||'person';
  const other=this.people.find(person=>person.id===rule.otherId);
  let target=other?.name;
  if(other&&family==='role')target=fillThiefdokuText(CLUE_TEXT.roleTarget,{role:other.role.toLowerCase()});
  if(other&&family==='uniqueRole'){
   target=fillThiefdokuText(other.gender==='f'?CLUE_TEXT.uniqueWoman:CLUE_TEXT.uniqueMan,{group:GROUP_PLURAL[other.group]||other.group});
  }
  const item=FURNITURE[rule.kind]?.label;
  switch(rule.type){
   case 'north':case 'south':case 'west':case 'east':return target?fillThiefdokuText(CLUE_TEXT[rule.type],{target}):null;
   case 'notAdjacentColumn':return target?fillThiefdokuText(CLUE_TEXT.notAdjacentColumn,{target}):null;
   case 'row':return fillThiefdokuText(CLUE_TEXT.row,{row:rule.value+1});
   case 'col':return fillThiefdokuText(CLUE_TEXT.col,{col:thiefdokuColumnLabel(rule.value)});
   case 'rowDelta':{
    if(!target)return null;const count=Math.abs(rule.value),below=rule.value>0;
    return fillThiefdokuText(count===1?(below?CLUE_TEXT.rowBelowOne:CLUE_TEXT.rowAboveOne):(below?CLUE_TEXT.rowBelowMany:CLUE_TEXT.rowAboveMany),{count,target});
   }
   case 'rowDeltaGroup':{
    const count=Math.abs(rule.value),below=rule.value>0,noun=NOUN_A[groupKey(rule.filter||{})];
    return fillThiefdokuText(count===1?(below?CLUE_TEXT.groupBelowOne:CLUE_TEXT.groupAboveOne):(below?CLUE_TEXT.groupBelowMany:CLUE_TEXT.groupAboveMany),{count,noun});
   }
   case 'countRelative':{
    const templates=COUNT_TEXT[rule.direction];if(!templates)return null;
    const key=groupKey(rule.filter||{}),one=rule.count===1;
    return fillThiefdokuText(one?templates.one:templates.many,{count:rule.count,noun:one?NOUN_ONE[key]:NOUN_MANY[key]});
   }
   case 'all':{
    const parts=rule.rules.map(part=>this.ruleDisplayText(part,family));
    return parts.every(Boolean)?parts.join(' '):null;
   }
   case 'any':{
    const items=rule.rules.map(part=>FURNITURE[part.kind]?.label);
    if(rule.rules.length!==2||!rule.rules.every(part=>part.type==='beside')||!items.every(Boolean))return null;
    return fillThiefdokuText(CLUE_TEXT.either,{first:items[0],second:items[1]});
   }
   case 'room':return ROOM_NAMES[rule.roomId]?fillThiefdokuText(CLUE_TEXT.room,{room:ROOM_NAMES[rule.roomId].toLowerCase()}):null;
   case 'notRoom':return ROOM_NAMES[rule.roomId]?fillThiefdokuText(CLUE_TEXT.notRoom,{room:ROOM_NAMES[rule.roomId].toLowerCase()}):null;
   case 'on':if(!item)return null;return rule.kind==='chair'?CLUE_TEXT.onChair:rule.kind==='bench'?CLUE_TEXT.onBench:fillThiefdokuText(CLUE_TEXT.on,{item});
   case 'notOn':if(!item)return null;return rule.kind==='chair'?CLUE_TEXT.notOnChair:fillThiefdokuText(CLUE_TEXT.notOn,{item});
   case 'onlyOn':if(!item)return null;return rule.kind==='chair'?CLUE_TEXT.onlyOnChair:fillThiefdokuText(CLUE_TEXT.onlyOn,{item});
   case 'beside':return item?fillThiefdokuText(CLUE_TEXT.beside,{item}):null;
   case 'notBeside':return item?fillThiefdokuText(CLUE_TEXT.notBeside,{item}):null;
   default:return null;
  }
 }
 // A negative furniture hint must exclude a walkable alternative in this room.
 furnitureClueUseful(rule,personId,cache=new Map(),context=[]){
  const subject=rule.subjectId||personId;
  if(rule.type==='all')return rule.rules.every((part,index)=>
   this.furnitureClueUseful(part,subject,cache,[...context,...rule.rules.filter((_,i)=>i!==index)]));
  if(rule.type==='any')return rule.rules.every(part=>this.furnitureClueUseful(part,subject,cache,context));
  if(rule.type!=='notBeside'&&rule.type!=='notOn')return true;
  const key=JSON.stringify([subject,rule,context]);
  if(cache.has(key))return cache.get(key);
  const position=this.solution.find(p=>p.personId===subject);
  if(!position)return false;
  const room=this.roomAt(position);
  let passes=false,fails=false;
  for(let row=0;row<this.size;row++)for(let col=0;col<this.size;col++){
   if(this.layout[row][col]!==room||this.isBlocked(row,col))continue;
   const cell={row,col},assigned=new Map([[subject,cell]]);
   if(context.some(part=>this.evaluateRule(part,assigned,subject)===false))continue;
   if(this.unary(cell,rule))passes=true;else fails=true;
   if(passes&&fails){cache.set(key,true);return true;}
  }
  cache.set(key,false);return false;
 }
 makeClues(){
  // The pool stores rules only. Wording is produced once, for the chosen clues.
  const pool=[],seen=new Set(),positions=new Map(this.solution.map(p=>[p.personId,p])),kinds=[...new Set(this.objects.map(o=>o.kind))],rooms=[...new Set(this.layout.flat())];
  const furnitureHintCache=new Map();
  const add=(personId,rule,family=rule.type)=>{
   const key=personId+JSON.stringify(rule)+family;if(seen.has(key))return;seen.add(key);
   if(!this.furnitureClueUseful(rule,personId,furnitureHintCache))return;
   const clue={personId,rule,family};if(this.matchesClue(this.solution,clue))pool.push(clue);
  };
  for(const person of this.people){
   const id=person.id,p=positions.get(id),room=this.roomAt(p),others=this.people.filter(q=>q.id!==id),roomRule={type:'room',roomId:room};
   add(id,roomRule);
   for(const r of rooms)if(r!==room)add(id,{type:'notRoom',roomId:r});
   if(p.row===0||p.row===this.size-1)add(id,{type:'row',value:p.row},'edge');
   if(p.col===0||p.col===this.size-1)add(id,{type:'col',value:p.col},'edge');
   for(const kind of kinds){
    const def=FURNITURE[kind];
    if(def.on){
     add(id,{type:'on',kind});
     add(id,{type:'notOn',kind});
     add(id,{type:'onlyOn',kind},'only');
    }
    add(id,{type:'beside',kind});
    add(id,{type:'notBeside',kind});
    add(id,{type:'all',rules:[roomRule,{type:'notBeside',kind}]},'compound');
    if(p.row===0||p.row===this.size-1)add(id,{type:'all',rules:[{type:'row',value:p.row},{type:'on',kind}]},'compound');
   }
   const alternate=shuffle(kinds).slice(0,5);
   for(let i=0;i<alternate.length-1;i++)add(id,{type:'any',rules:[{type:'beside',kind:alternate[i]},{type:'beside',kind:alternate[i+1]}]},'either');
   for(const other of others){
    const q=positions.get(other.id);
    for(const direction of ['north','south','east','west']){
     add(id,{type:direction,otherId:other.id},'direction');
     add(id,{type:direction,otherId:other.id},'role');
    }
    add(id,{type:'notAdjacentColumn',otherId:other.id},'columnGap');
    if(Math.abs(p.row-q.row)===1)add(id,{type:'rowDelta',otherId:other.id,value:p.row-q.row},'distance');
   }
   for(const filter of [{gender:'f'},{gender:'m'},{group:'staff'},{group:'resident'},{group:'visitor'}]){
    const members=others.filter(q=>this.inGroup(q,filter));if(!members.length)continue;
    add(id,{type:'rowDeltaGroup',filter,value:1},'groupDistance');
    if(members.length>=2)for(const direction of ['south','west']){
     const count=members.filter(q=>this.pair(positions.get(q.id),p,direction)).length;
     add(id,{type:'countRelative',filter,direction,count},'count');
    }
   }
   for(const gender of ['f','m'])for(const group of ['resident','staff','visitor']){
    const members=this.people.filter(q=>q.gender===gender&&q.group===group);if(members.length!==1||members[0].id===id)continue;
    for(const direction of ['north','south','east','west'])add(id,{type:direction,otherId:members[0].id},'uniqueRole');
   }
  }
  this.clues=[];const used=new Set();
  for(const p of shuffle(this.people)){
   const own=shuffle(pool.filter(c=>c.personId===p.id)),fresh=own.filter(c=>!used.has(c.family)),chosen=pick(fresh.length?fresh:own);
   this.clues.push(chosen);used.add(chosen.family);
  }
  let check=this.solve(this.clues,{maxNodes:600});
  const remaining=shuffle(pool.filter(c=>!this.clues.includes(c))).sort((a,b)=>Number(used.has(a.family))-Number(used.has(b.family)));
  for(const c of remaining.slice(0,this.size)){
   if(!check.exhausted&&check.solutions.length===1)break;this.clues.push(c);check=this.solve(this.clues,{maxNodes:600});
  }
  const anchors=shuffle(this.solution.flatMap(p=>[
   {personId:p.personId,rule:{type:'row',value:p.row},family:'row'},
   {personId:p.personId,rule:{type:'col',value:p.col},family:'col'}
  ]));
  for(const c of anchors){if(!check.exhausted&&check.solutions.length===1)break;this.clues.push(c);check=this.solve(this.clues,{maxNodes:600});}
  if(check.exhausted||check.solutions.length!==1)throw Error('Thiefdoku uniqueness check failed.');
  for(let i=this.clues.length-1;i>=0;i--){
   const c=this.clues[i];if(this.clues.filter(q=>q.personId===c.personId).length<=1)continue;
   const reduced=this.clues.filter((_,j)=>j!==i),result=this.solve(reduced,{maxNodes:350});
   if(!result.exhausted&&result.solutions.length===1)this.clues=reduced;
  }
  this.clues=this.clues.map(clue=>this.withClueText(clue));
 }
 withClueText(clue){return {personId:clue.personId,rule:clue.rule,family:clue.family,text:this.displayClueText(clue)};}
 checkpoint(){this.history.push({board:clone(this.board),crosses:clone(this.crosses),selectedPersonId:this.selectedPersonId});if(this.history.length>40)this.history.shift();}
 selectPerson(id){if(this.completed||this.failed||!this.people.some(p=>p.id===id))return false;this.selectedPersonId=id;this.save();return true;}
 clearSelection(){this.selectedPersonId=null;this.save();}
 autoCrosses(){
  const rows=new Set(),cols=new Set(),rooms=new Set();for(const p of this.getPlacedPeople()){rows.add(p.row);cols.add(p.col);rooms.add(this.roomAt(p));}
  return Array.from({length:this.size},(_,r)=>Array.from({length:this.size},(_,c)=>!this.board[r][c]&&!this.isBlocked(r,c)&&(rows.has(r)||cols.has(c)||rooms.has(this.layout[r][c]))));
 }
 placePerson(r,c){
  if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||!this.selectedPersonId)return false;
  this.checkpoint();const id=this.selectedPersonId;
  for(const line of this.board)for(let i=0;i<this.size;i++)if(line[i]===id)line[i]=null;
  this.board[r][c]=id;this.crosses[r][c]=false;this.selectedPersonId=null;this.save();return true;
 }
 removePerson(r,c){if(this.completed||this.failed||!this.valid(r,c)||(!this.board[r][c]&&!this.crosses[r][c]))return false;this.checkpoint();this.board[r][c]=null;this.crosses[r][c]=false;this.save();return true;}
 toggleCross(r,c){if(this.completed||this.failed||!this.valid(r,c)||this.isBlocked(r,c)||this.board[r][c])return false;this.checkpoint();this.crosses[r][c]=!this.crosses[r][c];this.save();return true;}
 undo(){if(this.completed||this.failed||!this.history.length)return false;Object.assign(this,this.history.pop());this.save();return true;}
 isFixedCell(){return false;}
 getPlacedPeople(){return this.board.flatMap((line,row)=>line.flatMap((personId,col)=>personId?[{personId,row,col}]:[]));}
 allPlaced(){const p=this.getPlacedPeople();return p.length===this.people.length&&new Set(p.map(q=>q.personId)).size===this.people.length&&this.people.every(q=>p.some(v=>v.personId===q.id));}
 validateBoard(){
  const p=this.getPlacedPeople();if(!this.allPlaced())return{valid:false,reason:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_a085df38d2dd119f3ac7")};
  if(new Set(p.map(q=>q.row)).size!==this.size||new Set(p.map(q=>q.col)).size!==this.size||new Set(p.map(q=>this.roomAt(q))).size!==this.size)return{valid:false,reason:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c59b0ac7af21c5e9c2c6")};
  if(p.some(q=>this.isBlocked(q.row,q.col))||!this.clues.every(c=>this.matchesClue(p,c)))return{valid:false,reason:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9a4d917b40f7099e54a9")};
  return{valid:true};
 }
 submitGuess(id){
  if(this.completed)return{status:'completed',message:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_9491627d8cd6be1b2557")};
  if(this.failed)return{status:'failed',message:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_2970b637523901bcdbc2")};
  if(!this.allPlaced())return{status:'incomplete',message:`${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_16ceaee483b74784c792")}${this.getPlacedPeople().length}${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_8a5edab282632443219e")}${this.people.length}${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_c4b2896a2081395e2823")}`};
  if(!this.people.some(p=>p.id===id))return{status:'invalid',message:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_81049d8e3dc9da6e3003")};
  if(this.wrongAccusations.includes(id))return{status:'invalid',message:__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_79d043972f5a3c08fc3b")};
  // An accusation only counts for a board that obeys every rule and statement;
  // otherwise random placements plus three guesses would farm medals.
  const board=this.validateBoard();
  if(!board.valid)return{status:'invalid_board',message:fillThiefdokuText(__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_280b51664213584c218d"),{reason:board.reason}),board};
  this.attempts++;let result;
  if(id===this.thiefId){this.completed=true;this.solved++;result={status:'success',message:`${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_633f9a3992edae9d19a0")}${this.getPersonName(id)}${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_115bdf4fb7756c4e9253")}${this.stolenItem}${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_cdb4ee2aea69cc6a8333")}`};}
  else{this.wrongAccusations.push(id);this.failed=this.attempts>=this.maxAttempts;result={status:this.failed?'failed':'wrong',message:this.failed?__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0cb00d4a1059944bbcf4"):`${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_ba1e26258a9d40d46c30")}${this.maxAttempts-this.attempts}${__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_0495a8533220a3fc5afa")}`};}
  this.save();return result;
 }
 getPersonName(id){return this.people.find(p=>p.id===id)?.name||__dialogueText("systems/thiefdoku/ThiefdokuPuzzle.js", "t_b764cdc0eab713746721");}
 // Case data that never changes while a case is open, cloned and frozen once.
 staticSnapshot(){
  if(!this.staticState)this.staticState=deepFreeze(clone({size:this.size,people:this.people,layout:this.layout,objects:this.objects,
   theme:this.theme,themeName:THEMES[this.theme].name,roomNames:ROOM_NAMES,theftRoom:this.theftRoom,stolenItem:this.stolenItem,clues:this.clues}));
  return this.staticState;
 }
 getState(){
  return {...this.staticSnapshot(),board:this.board.map(row=>row.slice()),crosses:this.crosses.map(row=>row.slice()),autoCrosses:this.autoCrosses(),
   allPlaced:this.allPlaced(),placedCount:this.getPlacedPeople().length,selectedPersonId:this.selectedPersonId,
   attempts:this.attempts,maxAttempts:this.maxAttempts,completed:this.completed,failed:this.failed,wrongAccusations:[...this.wrongAccusations],
   solved:this.solved,nextSize:this.sizeForProgress(),canUndo:this.history.length>0,saveError:this.saveError,migrated:this.migrated,restoreRejected:this.restoreRejected};
 }
 // Only what cannot be derived: no answer, no clue wording, no computed crosses.
 serialize(){
  return {version:SAVE_VERSION,solved:this.solved,size:this.size,theme:this.theme,layout:this.layout,
   objects:this.objects.map(({kind,row,col,w,h})=>({kind,row,col,w,h})),
   clues:this.clues.map(({personId,rule,family})=>({personId,rule,family})),
   theftRoom:this.theftRoom,stolenItemIndex:this.stolenItemIndex,board:this.board,crosses:this.crosses,selectedPersonId:this.selectedPersonId,
   attempts:this.attempts,completed:this.completed,failed:this.failed,wrongAccusations:this.wrongAccusations};
 }
 save(){if(!this.storage)return;try{this.storage.setItem(this.storageKey,JSON.stringify(this.serialize()));this.saveError=false;}catch(_){this.saveError=true;}}
 connectedRoom(room){
  const cells=[];for(let r=0;r<this.size;r++)for(let c=0;c<this.size;c++)if(this.layout[r][c]===room)cells.push([r,c]);
  if(cells.length<2)return false;const seen=new Set([cells[0].join(',')]),queue=[cells[0]];
  for(let i=0;i<queue.length;i++)for(const [r,c] of this.neighbours(...queue[i]))if(this.layout[r][c]===room&&!seen.has(`${r},${c}`)){seen.add(`${r},${c}`);queue.push([r,c]);}
  return seen.size===cells.length;
 }
 // A save that exists but cannot be used is kept as a backup and reported,
 // so a code change never discards a case without a trace.
 rejectSave(raw,reason){
  this.restoreRejected=true;this.restoreRejectReason=reason;
  console.warn('[Thiefdoku] Saved case rejected, a new case will be generated:',reason);
  try{this.storage.setItem(this.storageKey+REJECTED_BACKUP_SUFFIX,typeof raw==='string'?raw:JSON.stringify(raw));}catch(_){}
  return false;
 }
 restore(){
  if(!this.storage)return false;
  let raw;try{raw=this.storage.getItem(this.storageKey);}catch(_){return false;}
  if(raw===null||raw===undefined||raw==='')return false;
  let s;try{s=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){return this.rejectSave(raw,'unreadable');}
  if(!s||typeof s!=='object')return this.rejectSave(raw,'unreadable');
  if(!Number.isInteger(s.solved)||s.solved<0)return this.rejectSave(raw,'progress');
  this.solved=s.solved;
  if(s.version===1||s.version===2){
   this.migrated=true;
   try{const key=this.storageKey+MIGRATION_BACKUP_SUFFIX;if(!this.storage.getItem(key))this.storage.setItem(key,JSON.stringify(s));}catch(_){}
   return false;
  }
  if(s.version!==3&&s.version!==SAVE_VERSION)return this.rejectSave(raw,'version');
  // A save for different fixed options is not corrupt, just not this puzzle.
  if(Number.isInteger(this.options.size)&&s.size!==clamp(this.options.size,4,10))return false;
  if(this.options.theme&&s.theme!==this.options.theme)return false;
  let reason;
  try{reason=this.loadSaved(s);}catch(_){reason='invalid';}
  return reason?this.rejectSave(raw,reason):true;
 }
 // Returns null when the save was loaded, otherwise a short reason code.
 loadSaved(s){
  if(!Number.isInteger(s.size)||s.size<4||s.size>10||!THEMES[s.theme])return 'shape';
  const n=s.size;this.size=n;this.theme=s.theme;this.people=this.makePeople();const ids=new Set(this.people.map(p=>p.id));
  if(![s.layout,s.board,s.crosses].every(a=>Array.isArray(a)&&a.length===n&&a.every(r=>Array.isArray(r)&&r.length===n)))return 'grid';
  if(s.layout.flat().some(r=>!THEMES[s.theme].rooms.slice(0,n).includes(r))||s.board.flat().some(id=>id!==null&&!ids.has(id))||s.crosses.flat().some(v=>typeof v!=='boolean'))return 'grid';
  this.layout=s.layout;const rooms=[...new Set(this.layout.flat())];if(rooms.length!==n||!rooms.every(r=>this.connectedRoom(r)))return 'layout';
  if(!Array.isArray(s.objects)||!Array.isArray(s.clues)||!s.clues.length||!Array.isArray(s.wrongAccusations))return 'shape';
  if(s.objects.some(o=>!o||!FURNITURE[o.kind]||!Number.isInteger(o.w)||!Number.isInteger(o.h)||o.w<1||o.h<1||!this.valid(o.row,o.col)||!this.valid(o.row+o.h-1,o.col+o.w-1)))return 'furniture';
  this.objects=s.objects.map((o,i)=>({row:o.row,col:o.col,w:o.w,h:o.h,id:`${o.kind}_${i}`,kind:o.kind,blocking:FURNITURE[o.kind].blocking}));
  for(const o of this.objects)for(let r=o.row;r<o.row+o.h;r++)for(let c=o.col;c<o.col+o.w;c++)if(this.layout[r][c]!==this.layout[o.row][o.col])return 'furniture';
  if(!rooms.includes(s.theftRoom))return 'theft';this.theftRoom=s.theftRoom;
  if(this.objects.filter(o=>o.kind==='display').length!==1||!this.objects.some(o=>o.kind==='display'&&this.layout[o.row][o.col]===this.theftRoom))return 'theft';
  if(s.clues.some(c=>!c||!ids.has(c.personId)||!c.rule||typeof c.rule!=='object'))return 'clues';
  this.clues=s.clues.map(c=>({personId:c.personId,rule:c.rule,family:c.family}));
  // The answer is not stored: the clues must still lead to exactly one board.
  const result=this.solve(this.clues,{maxNodes:5000});if(result.exhausted||result.solutions.length!==1)return 'clues';
  this.solution=result.solutions[0];
  const thief=this.solution.find(p=>this.roomAt(p)===this.theftRoom);if(!thief)return 'theft';this.thiefId=thief.personId;
  if(s.version===3){
   const same=Array.isArray(s.solution)&&s.solution.length===n&&s.solution.every(p=>this.solution.some(q=>q.personId===p.personId&&q.row===p.row&&q.col===p.col));
   if(!same||s.thiefId!==this.thiefId)return 'answer';
   // The service's stored signature was computed from this older order.
   this.legacySolution=s.solution.map(({personId,row,col})=>({personId,row,col}));
  }
  this.board=s.board;this.crosses=s.crosses;const placed=this.getPlacedPeople();if(new Set(placed.map(p=>p.personId)).size!==placed.length||placed.some(p=>this.isBlocked(p.row,p.col)))return 'board';
  if(!Number.isInteger(s.attempts)||s.attempts<0||s.attempts>3)return 'attempts';
  const items=THEMES[this.theme].items;
  this.stolenItemIndex=Number.isInteger(s.stolenItemIndex)&&s.stolenItemIndex>=0&&s.stolenItemIndex<items.length?s.stolenItemIndex:Math.max(0,items.indexOf(String(s.stolenItem)));
  this.selectedPersonId=ids.has(s.selectedPersonId)?s.selectedPersonId:null;
  this.attempts=s.attempts;this.maxAttempts=3;this.completed=Boolean(s.completed);this.failed=Boolean(s.failed);this.wrongAccusations=s.wrongAccusations.filter(id=>ids.has(id));this.history=[];this.migrated=false;
  this.clues=this.clues.map(clue=>this.withClueText(clue));this.staticState=null;
  if(s.version!==SAVE_VERSION)this.save();
  return null;
 }
}
export {SIZE,PEOPLE,ROOM_NAMES,THEMES,FURNITURE};