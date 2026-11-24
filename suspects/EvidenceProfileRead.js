// UI readers are tolerant; puzzle validation is strict by default.
const warned=new Set();
export function readEvidenceProfileIds(profile,{registry,field,kind,module,strict=true}){
  if(!profile||profile.schemaVersion!==1||profile.complete!==true||!Array.isArray(profile[field]))return null;
  const result=[],seen=new Set();
  for(const id of profile[field]){
    if(typeof id!=='string'||!Object.hasOwn(registry,id)){
      const label=typeof id==='string'?id:`<${id===null?'null':typeof id}>`;
      if(strict)throw Error(`Unknown ${kind}: ${label}`);
      const key=`${module}:${kind}:${label}`;
      if(!warned.has(key)){warned.add(key);console.warn(`[${module}] Skipping unknown ${kind} in dossier UI:`,label);}
      continue;
    }
    if(!seen.has(id)){seen.add(id);result.push(id);}
  }
  return result;
}
