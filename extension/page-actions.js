/* Functions below execute in a user-invoked tab. No external networking. */
"use strict";
function ahApplySettings(command){
 const root=document.documentElement;
 const base={size:100,spacing:1.5,letter:0,contrast:false,dark:false,motion:false,links:false,images:false,ruler:false,focus:false,colorMode:'none',hue:0,strength:100,theme:'original',customColors:false,textColor:'#14532d',backgroundColor:'#fffdf5',linkColor:'#1d4ed8',fontFamily:'original'};
 const runtime=globalThis.__ahRuntime||(globalThis.__ahRuntime={originals:new Map(),observer:null,timer:null,state:base});
 let state={...base,...runtime.state};
 const action=command?.action;
 const proposed=command?.settings||{};
 if(action==='reset')state={...base};
 if(action==='set'){
  for(const k of ['contrast','dark','motion','links','images','ruler','focus','customColors'])if(typeof proposed[k]==='boolean')state[k]=proposed[k];
  for(const [k,min,max] of [['size',100,140],['spacing',1.2,2.2],['letter',0,3],['hue',-180,180],['strength',0,100]])if(proposed[k]!==undefined&&Number.isFinite(Number(proposed[k])))state[k]=Math.min(max,Math.max(min,Number(proposed[k])));
  for(const k of ['textColor','backgroundColor','linkColor'])if(/^#[0-9a-f]{6}$/i.test(proposed[k]||''))state[k]=proposed[k];
  if(['none','protan','deutan','tritan','custom','gray'].includes(proposed.colorMode))state.colorMode=proposed.colorMode;
  const themes={
   original:null,cream:{textColor:'#14532d',backgroundColor:'#fffdf5',linkColor:'#1d4ed8'},
   dark:{textColor:'#f7f5ed',backgroundColor:'#1c2027',linkColor:'#99c5ff'},
   contrast:{textColor:'#ffff00',backgroundColor:'#080808',linkColor:'#78d4ff'},
   blue:{textColor:'#152447',backgroundColor:'#fff9db',linkColor:'#064bab'},
   mono:{textColor:'#111111',backgroundColor:'#ffffff',linkColor:'#003399'}
  };
  if(typeof proposed.theme==='string'&&Object.hasOwn(themes,proposed.theme)){
   state.theme=proposed.theme;state.customColors=proposed.theme!=='original';
   state.colorMode='none';state.dark=false;
   if(themes[proposed.theme])Object.assign(state,themes[proposed.theme]);
  }
  if(proposed.theme==='custom'){state.theme='custom';state.customColors=true;}
  if(['textColor','backgroundColor','linkColor'].some(k=>typeof proposed[k]==='string')&&!proposed.theme)state.theme='custom';
  if(proposed.customColors===false&&proposed.theme!=='original')state.theme='original';
  if(['original','sans','serif','mono'].includes(proposed.fontFamily))state.fontFamily=proposed.fontFamily;
 }
 if(action==='toggle'&&typeof base[command.key]==='boolean')state[command.key]=!state[command.key];
 if(action==='size')state.size=Math.max(100,Math.min(140,state.size+(Number(command.delta)||0)));
 runtime.observer?.disconnect();clearTimeout(runtime.timer);
 // Restore only properties owned by AccessHub; preserve unrelated page edits.
 for(const [el,props] of runtime.originals){for(const [key,old] of Object.entries(props)){if(el.style.getPropertyValue(key)===old.applied){if(old.value)el.style.setProperty(key,old.value,old.priority);else el.style.removeProperty(key)}}}
 runtime.originals.clear();
 document.getElementById('accesshub-extension-override')?.remove();
 document.getElementById('accesshub-extension-ruler')?.remove();
 document.getElementById('accesshub-reading-magnifier')?.remove();
 if(runtime.readingCleanup){runtime.readingCleanup();runtime.readingCleanup=null;}
 runtime.state=state;
 if(action==='reset'){delete root.dataset.accesshubPrefs;return state;}
 const set=(el,key,value)=>{let props=runtime.originals.get(el);if(!props){props={};runtime.originals.set(el,props)}props[key]={value:el.style.getPropertyValue(key),priority:el.style.getPropertyPriority(key),applied:''};el.style.setProperty(key,value,'important');props[key].applied=el.style.getPropertyValue(key)};
 const elements=[...document.querySelectorAll('body,body *')].filter(el=>el instanceof HTMLElement&&!['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','OPTION'].includes(el.tagName)&&!el.closest('[data-ah-controls],#accesshub-extension-ruler,#accesshub-reading-magnifier'));
 // Measure all sizes before writing so nested elements do not multiply scaling.
 const measured=elements.map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
 for(const [el,size] of measured){
  if(state.size!==100&&Number.isFinite(size)&&size>=10&&size<=36){
   const control=el.matches('button,input,select,textarea,[role=button]');
   const limit=control?22:38;
   const enlarged=Math.max(size,Math.min(limit,size*state.size/100));
   if(enlarged>size)set(el,'font-size',enlarged+'px');
  }
  if(state.spacing!==base.spacing)set(el,'line-height',String(state.spacing));
  if(state.letter)set(el,'letter-spacing',state.letter+'px');
  if(state.fontFamily!=='original')set(el,'font-family',{sans:'Arial, sans-serif',serif:'Georgia, serif',mono:'monospace'}[state.fontFamily]);
  if(state.customColors||state.dark){set(el,'color',state.customColors?(el.closest('a[href]')?state.linkColor:state.textColor):'#f6f0e6');set(el,'background-color',state.customColors?state.backgroundColor:'#1c2027');}
 }
 const angle={protan:45,deutan:-45,tritan:90,custom:state.hue}[state.colorMode]||0;
 const filters=[];
 // Custom colours retain their exact selected values; spectrum modes affect originals.
 if(!state.customColors){if(state.colorMode==='gray')filters.push('grayscale('+state.strength/100+')');else if(angle)filters.push('hue-rotate('+angle*state.strength/100+'deg)');}
 if(state.contrast)filters.push('contrast(1.3)');
 if(filters.length&&document.body)set(document.body,'filter',filters.join(' '));
 const style=document.createElement('style');style.id='accesshub-extension-override';
 style.textContent=[state.motion?'*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}':'',state.links?'a[href]{outline:2px solid #d28433!important;outline-offset:3px!important;text-decoration:underline!important}':'',state.images?'img,video,picture,canvas{visibility:hidden!important}':'',state.focus?'main,article,[role=main]{max-width:min(100%,850px)!important;margin-inline:auto!important}':''].join('\n');root.appendChild(style);
 if(state.ruler){
  // A fixed reading band: its contents come from the page at its vertical position, NOT the pointer.
  const band=document.createElement('div');
  band.id='accesshub-extension-ruler';
  band.setAttribute('aria-hidden','true');
  band.style.cssText='position:fixed;top:44vh;left:0;right:0;min-height:3.2rem;z-index:2147483646;pointer-events:none;border-block:2px solid #d39452;background:rgba(255,240,174,.18);box-sizing:border-box';
  root.appendChild(band);
  const lens=document.createElement('div');
  lens.id='accesshub-reading-magnifier';
  lens.setAttribute('aria-hidden','true');
  lens.style.cssText='display:none;box-sizing:border-box;margin:auto;padding:9px 14px;max-width:min(96vw,1100px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;background:#fffdf5;color:#152447;font:600 22px/1.5 Arial,sans-serif;box-shadow:0 2px 12px #0002';
  band.appendChild(lens);
  const rulerY=()=>Math.min(innerHeight-8,Math.max(8,innerHeight*.44+25));
  const visibleLine=(textNode,y)=>{
   const text=textNode?.textContent||'';
   if(!text.trim()||text.length>8000)return '';
   const range=document.createRange();
   const spans=[];let begun=false;
   // Text ranges identify the visual row, including lines created by wrapping.
   for(let i=0;i<Math.min(text.length,1500);i++){
    range.setStart(textNode,i);range.setEnd(textNode,i+1);
    const rect=range.getBoundingClientRect();
    const match=rect.height>0&&y>=rect.top-4&&y<=rect.bottom+4;
    if(match){spans.push(text[i]);begun=true}
    else if(begun)break;
   }
   return spans.join('').replace(/\s+/g,' ').trim().slice(0,260);
  };
  const readAt=(x,y)=>{
   const caret=document.caretPositionFromPoint?.(x,y);
   const range=caret?null:document.caretRangeFromPoint?.(x,y);
   let node=caret?.offsetNode||range?.startContainer;
   if(node?.nodeType!==Node.TEXT_NODE){
    const el=document.elementFromPoint(x,y);
    if(!el||el.closest('input,textarea,select,[contenteditable=true],button,nav,[role=navigation],[data-ah-controls],#accesshub-extension-ruler,#accesshub-reading-magnifier'))return '';
    const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    node=walk.nextNode();
   }
   if(!node||node.nodeType!==Node.TEXT_NODE||node.parentElement?.closest('input,textarea,select,[contenteditable=true],script,style,nav,[role=navigation],[data-ah-controls],#accesshub-extension-ruler,#accesshub-reading-magnifier'))return '';
   return visibleLine(node,y);
  };
  let frame=0,previous='';
  const update=()=>{
   frame=0;
   const y=rulerY();
   // Probe the horizontal band, not the mouse position.
   const positions=[.5,.35,.65,.2,.8].map(f=>innerWidth*f);
   const lines=positions.map(x=>readAt(x,y)).filter(Boolean);
   const line=lines.sort((a,b)=>b.length-a.length)[0]||'';
   if(line!==previous){lens.textContent=line;previous=line}
   lens.style.display=line?'block':'none';
  };
  const requestUpdate=()=>{if(!frame)frame=requestAnimationFrame(update)};
  document.addEventListener('scroll',requestUpdate,{passive:true,capture:true});
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate,{passive:true});
  window.addEventListener('wheel',requestUpdate,{passive:true});
  window.addEventListener('touchmove',requestUpdate,{passive:true});
  window.addEventListener('keydown',requestUpdate);
  runtime.readingCleanup=()=>{
   document.removeEventListener('scroll',requestUpdate,true);
   window.removeEventListener('scroll',requestUpdate);
   window.removeEventListener('resize',requestUpdate);
   window.removeEventListener('wheel',requestUpdate);
   window.removeEventListener('touchmove',requestUpdate);
   window.removeEventListener('keydown',requestUpdate);
   if(frame)cancelAnimationFrame(frame);
  };
  requestUpdate();
 }
 root.dataset.accesshubPrefs=JSON.stringify(state);
 runtime.observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length)){clearTimeout(runtime.timer);runtime.timer=setTimeout(()=>ahApplySettings({action:'set',settings:runtime.state}),80)}});
 runtime.observer.observe(document.body,{childList:true,subtree:true});
 return state;
}
function ahReadSelection(){
 const active=document.activeElement;
 const hidden=active&&["password","one-time-code"].includes(String(active.type||"").toLowerCase());
 let value=String(window.getSelection()?.toString()||"");
 if(!value&&!hidden&&(active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement)&&typeof active.selectionStart==="number"){
  value=active.value.slice(active.selectionStart,active.selectionEnd);
 }
 return value.trim().slice(0,12000);
}
function ahScanForm(){
 const inputs=[...document.querySelectorAll("form input,form select,form textarea,[role=form] input,[role=form] select,[role=form] textarea")].slice(0,120);
 const safeTypes=new Set(["text","email","tel","url","date","number","search","textarea","select-one"]);
 const deny=/password|passcode|pin\b|otp\b|one.time.code|card|cvv|cvc|bank|account.number|routing|iban|aadhaar|aadhar|social.security|ssn|tax.id|passport|pan.number|upi/i;
 const fields=[];
 for(const el of inputs){
  if(!(el instanceof HTMLElement))continue;
  const type=el.tagName==="TEXTAREA"?"textarea":el.tagName==="SELECT"?"select-one":String(el.type||"text").toLowerCase();
  if(!safeTypes.has(type)||el.disabled||el.readOnly)continue;
  const visible=el.getClientRects().length>0&&getComputedStyle(el).visibility!=="hidden";
  if(!visible)continue;
  const auto=String(el.getAttribute("autocomplete")||"");
  let label=(el.labels&&el.labels[0]?.textContent)||el.getAttribute("aria-label")||el.getAttribute("placeholder")||el.getAttribute("name")||"Field "+(fields.length+1);
  label=String(label).replace(/\s+/g," ").trim().slice(0,125);
  if(deny.test(label+" "+auto+" "+el.getAttribute("name")+" "+el.getAttribute("id")))continue;
  if(!el.dataset.accesshubField)el.dataset.accesshubField="af_"+crypto.randomUUID();
  fields.push({id:el.dataset.accesshubField,label,type,required:!!el.required,placeholder:String(el.getAttribute("placeholder")||"").slice(0,100),hint:type==="select-one"?"Select one option manually when unsupported":"",options:type==="select-one"?[...el.options].slice(0,30).map(o=>({label:o.textContent?.trim().slice(0,100)||"",value:o.value})):[]});
  if(fields.length>=60)break;
 }
 return {title:document.title.slice(0,120),count:fields.length,fields};
}
function ahFillFormField(input){
 const fieldId=String(input?.id||"");
 const text=String(input?.value??"").slice(0,5000);
 const controls=[...document.querySelectorAll("[data-accesshub-field]")];
 const el=controls.find(x=>x.dataset.accesshubField===fieldId);
 if(!el)return{ok:false,message:"Field no longer exists. Scan the form again."};
 const type=el.tagName==="TEXTAREA"?"textarea":el.tagName==="SELECT"?"select-one":String(el.type||"text").toLowerCase();
 const safe=new Set(["text","email","tel","url","date","number","search","textarea","select-one"]);
 const deny=/password|passcode|pin\b|otp\b|one.time.code|card|cvv|cvc|bank|account.number|routing|iban|aadhaar|aadhar|social.security|ssn|tax.id|passport|pan.number|upi/i;
 const labels=String(el.labels?.[0]?.textContent||el.getAttribute("aria-label")||"");
 if(!safe.has(type)||deny.test(labels+" "+el.getAttribute("autocomplete")+" "+el.name+" "+el.id))return{ok:false,message:"Sensitive or unsupported field blocked."};
 if(el.disabled||el.readOnly)return{ok:false,message:"Field is disabled or read-only."};
 if(el instanceof HTMLSelectElement){
   if(![...el.options].some(o=>o.value===text))return{ok:false,message:"Please select an option from the form."};
 }
 if(type==="email"&&text&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return{ok:false,message:"Invalid email format"};
 if(type==="number"&&text&&!Number.isFinite(Number(text)))return{ok:false,message:"Invalid number"};
 if(el.maxLength>=0&&text.length>el.maxLength)return{ok:false,message:"Answer exceeds field length limit"};
 const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
 if(!setter)return{ok:false,message:"Cannot edit field."};
 setter.call(el,text);
 el.dispatchEvent(new Event("input",{bubbles:true}));
 el.dispatchEvent(new Event("change",{bubbles:true}));
 return {ok:true,message:"Filled one field. Review the form before submitting."};
}

globalThis.ahApplySettings=ahApplySettings;
