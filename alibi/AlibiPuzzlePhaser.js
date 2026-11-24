import {createPuzzle,getResult} from './AlibiPuzzleModel.js';
import {mountPuzzle} from './AlibiPuzzleView.js';
export function openAlibiPuzzle(scene,{state,caseKey,suspects,suspectCatalog,save,onComplete,onClose}){
 if(typeof save!=='function'||typeof onComplete!=='function')throw Error('Explicit persistence and completion callbacks are required.');
 if(!Array.isArray(suspectCatalog))throw Error('Pass the loaded suspects.json catalogue.');
 const old=state.caseData?.alibiPuzzles?.[caseKey];
 const ids=suspects.map(s=>s.id).sort();
 if(old&&(old.caseKey!==caseKey||old.people.map(s=>s.id).sort().join('|')!==ids.join('|')))throw Error('Saved puzzle belongs to another candidate set.');
 const puzzle=old||createPuzzle({caseKey,suspects,crimeWindow:state.caseData?.crimeWindow,accents:suspectCatalog.map(s=>s.accent),features:suspectCatalog.map(s=>s.features)});
 function persist(){state.caseData??={};state.caseData.alibiPuzzles??={};const previous=state.caseData.alibiPuzzles[caseKey];state.caseData.alibiPuzzles[caseKey]=structuredClone(puzzle);try{if(save()!==true)throw Error('Save did not confirm success.');}catch(e){if(previous===undefined)delete state.caseData.alibiPuzzles[caseKey];else state.caseData.alibiPuzzles[caseKey]=previous;throw e;}}
 persist();
 const host=document.createElement('section');Object.assign(host.style,{width:'100%',height:'100%',overflow:'auto',pointerEvents:'auto'});
 const dom=scene.add.dom(0,0,host).setOrigin(0).setScrollFactor(0).setDepth(9000);
 const resize=()=>{dom.node.style.width=scene.scale.width+'px';dom.node.style.height=scene.scale.height+'px';};
 const view=mountPuzzle(host,puzzle,{save:persist,onComplete,onClose:()=>{destroy();onClose?.();}});
 function destroy(){scene.scale.off('resize',resize);scene.events.off('shutdown',destroy);view.destroy();dom.destroy();}
 scene.scale.on('resize',resize);scene.events.once('shutdown',destroy);resize();
 return {destroy,result:()=>getResult(puzzle)};
}
