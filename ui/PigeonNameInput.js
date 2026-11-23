import { pigeonNamingText as t } from '../dialogues/PigeonNamingText.js';
import { PIGEON_NAME_LIMIT, validatePigeonName } from '../managers/PigeonNaming.js';

export function openPigeonNameInput(scene,{initialValue='',onConfirm,onCancel}={}){
  const root=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.68);color:#f4ecd8;font-family:SpecialElite,monospace;';
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;width:min(480px,100%);max-height:90vh;overflow:auto;padding:26px;background:#201409;border:3px solid #d4af37;box-shadow:0 8px 32px #000;';
  form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label',t('title'));
  root.append(form);
  function node(tag,text){const value=document.createElement(tag);if(text!==undefined)value.textContent=text;return value;}
  const heading=node('h2',t('title'));heading.style.cssText='font-family:PressStart2P,monospace;font-size:13px;line-height:1.8;margin:0 0 20px;color:#ffd86b;';
  const label=node('label',t('label'));
  const input=node('input');input.type='text';input.maxLength=PIGEON_NAME_LIMIT;input.value=initialValue;
  input.placeholder=t('suggestion');input.autocomplete='off';input.setAttribute('aria-label',t('label'));
  input.style.cssText='box-sizing:border-box;display:block;width:100%;padding:12px;margin:8px 0 12px;background:#f4ecd8;border:2px solid #8a6d1f;color:#201409;font:20px SpecialElite,monospace;';
  label.append(input);
  const hint=node('p',t('hint'));hint.style.cssText='font-size:17px;line-height:1.5;';
  const error=node('p');error.setAttribute('role','alert');error.style.color='#ff7a6b';
  const actions=node('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px;';
  function button(text,type='button'){
    const button=node('button',text);button.type=type;
    button.style.cssText='padding:12px;border:1px solid #d4af37;background:#35230f;color:#ffd86b;font:11px PressStart2P,monospace;line-height:1.6;cursor:pointer;';
    actions.append(button);return button;
  }
  const suggestion=button(t('useSuggestion')),confirm=button(t('confirm'),'submit'),cancel=button(t('cancel'));
  form.append(heading,label,hint,error,actions);
  let dead=false,submitting=false,composing=false;
  const keyboard=scene.input?.keyboard,previousEnabled=keyboard?.enabled;
  const previousFocus=document.activeElement;
  if(keyboard)keyboard.enabled=false;
  function destroy(){
    if(dead)return;dead=true;root.remove();
    if(keyboard)keyboard.enabled=previousEnabled;
    if(previousFocus?.isConnected)previousFocus.focus?.();
  }
  function cancelInput(){if(dead||submitting)return;destroy();onCancel?.();}
  suggestion.onclick=()=>{input.value=t('suggestion');error.textContent='';input.focus();input.select();};
  cancel.onclick=cancelInput;
  input.addEventListener('compositionstart',()=>{composing=true;});
  input.addEventListener('compositionend',()=>{composing=false;});
  input.addEventListener('input',()=>{error.textContent='';});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(dead||submitting||composing)return;
    const checked=validatePigeonName(input.value);
    if(!checked.ok){error.textContent=checked.message;input.focus();return;}
    submitting=true;confirm.disabled=true;
    try{
      const result=onConfirm?.(checked.name);
      if(result?.ok)destroy();
      else error.textContent=result?.message||t('failed');
    }catch(err){console.error('[PigeonNameInput]',err);error.textContent=t('failed');}
    finally{submitting=false;confirm.disabled=false;}
  });
  root.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();cancelInput();return;}
    if(event.key!=='Tab')return;
    const controls=[input,suggestion,confirm,cancel].filter(control=>!control.disabled);
    const current=controls.indexOf(document.activeElement);
    if(event.shiftKey&&current<=0){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&(current<0||current===controls.length-1)){event.preventDefault();controls[0].focus();}
  });
  for(const type of ['pointerdown','pointerup','click','wheel','keyup'])root.addEventListener(type,event=>event.stopPropagation());
  document.body.append(root);input.focus();if(initialValue)input.select();
  return {destroy};
}
