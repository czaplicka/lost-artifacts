export function evaluateTypewriter(data, selected) {
  if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.length!==data.correctIds.length)
    return{ok:false,message:'Mark exactly three characters with structural differences.'};
  const wrong=selected.find(id=>!data.correctIds.includes(id));
  if(wrong){const item=data.characters.find(item=>item.id===wrong);return{ok:false,characterId:wrong,message:item?.hint||'That selection is not supported.'};}
  return{ok:true,message:data.success};
}
