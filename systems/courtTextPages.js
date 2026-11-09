// Measurement is supplied by Phaser; no estimated character limits and no discarded text.
export function paginateCourtText(value,measure,maxHeight){
 const source=String(value??'');if(!source.trim())return [''];
 if(typeof measure!=='function'||!Number.isFinite(maxHeight)||maxHeight<=0)throw new Error('Invalid court pagination configuration.');
 const chars=Array.from(source),pages=[];let offset=0;
 while(offset<chars.length){
  if(!chars.slice(offset).join('').trim())break;
  let lo=1,hi=chars.length-offset,best=0;
  while(lo<=hi){const mid=Math.floor((lo+hi)/2),candidate=chars.slice(offset,offset+mid).join('').trim();
   if(measure(candidate)<=maxHeight){best=mid;lo=mid+1;}else hi=mid-1;
  }
  if(!best)throw new Error('Court text cannot fit even one character at the selected font size.');
  let count=best;
  if(offset+count<chars.length&&!/\s/u.test(chars[offset+count])&&!/\s/u.test(chars[offset+count-1])){
   let boundary=count-1;while(boundary>0&&!/\s/u.test(chars[offset+boundary]))boundary--;
   if(boundary>0)count=boundary+1;
  }
  const page=chars.slice(offset,offset+count).join('').trim();if(page)pages.push(page);offset+=count;
 }
 return pages.length?pages:[''];
}
