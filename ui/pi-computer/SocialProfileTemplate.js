export function createSocialPage({id,keyword,name,bio,about,contact=[]}) {
 return {id:`social_${id}`,title:`${name} | FaceSpace`,brand:'FaceSpace',theme:'social',
 address:`www.facespace.local/people/${id.replaceAll('_','-')}`,
 snippet:`${name} on FaceSpace. Public profile preview. Log in to see more.`,
 socialProfile:{name,bio,about},
 blocks:[['FaceSpace — familiar faces, unfamiliar privacy settings.'],[{keywordId:keyword}],
 [bio],[about],...contact,['Log in to see more. Your password remains more interesting to us than your hobbies.']],links:[]};
}
export function renderSocialPage(ui,search,page) {
 const b=ui.window,d=ui.drawing,x=b.x+24,y=b.y+60,w=b.w-48,h=b.h-115;
 d.rectangle(x,y,w,h,0xe9eef5);d.rectangle(x,y,w,52,0x344f77);
 d.text(x+18,y+12,'FaceSpace',25,'#ffffff');
 d.button(x+w-160,y+10,'LOG IN',()=>{search.tip='Preview only. No login is required to solve this case.';ui.render();});
 d.button(x+16,y+66,'< BACK',()=>search.back());
 d.rectangle(x+18,y+112,72,72,0x7fa8ec);
 d.text(x+34,y+124,page.socialProfile.name.split(' ').map(n=>n[0]).join(''),30,'#ffffff');
 d.text(x+108,y+114,page.socialProfile.name,24,'#243955',w-135);
 d.text(x+108,y+150,page.socialProfile.bio,15,'#44536a',w-135);
 const lines=[page.socialProfile.about,'Public preview. Log in to see friends, photos and regrettable opinions.'];
 if(search.tip)lines.push(search.tip);
 d.text(x+20,y+205,lines.join('\n\n'),16,'#344055',w-40);
 return true;
}
