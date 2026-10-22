/* Functions below execute in a user-invoked tab. No external networking. */
"use strict";
function ahApplySettings(command){
 const root=document.documentElement;
 const id="accesshub-extension-override";
 const rulerId="accesshub-extension-ruler";
 const base={size:100,spacing:1.5,letter:0,contrast:false,dark:false,motion:false,links:false,images:false,ruler:false,focus:false};
 let state=base;
 try{state={...base,...JSON.parse(root.dataset.accesshubPrefs||"{}")}}catch{}
 const action=command?.action;
 if(action==="set"){
  const proposed=command.settings||{};
  const bools=["contrast","dark","motion","links","images","ruler","focus"];
  for(const k of bools)if(typeof proposed[k]==="boolean")state[k]=proposed[k];
  if(Number.isFinite(+proposed.size))state.size=Math.max(80,Math.min(175,Math.round(+proposed.size)));
  if(Number.isFinite(+proposed.spacing))state.spacing=Math.max(1.1,Math.min(2.5,+proposed.spacing));
  if(Number.isFinite(+proposed.letter))state.letter=Math.max(0,Math.min(4,+proposed.letter));
 }else if(action==="toggle"&&["contrast","dark","motion","links","images","ruler","focus"].includes(command.key)){
  state[command.key]=!state[command.key];
 }else if(action==="size")state.size=Math.min(175,Math.max(80,state.size+Number(command.delta||0)));
 else if(action==="reset")state={...base};
 let style=document.getElementById(id);
 if(!style){style=document.createElement("style");style.id=id;document.documentElement.appendChild(style)}
 const rules=[
  "html{font-size:"+state.size+"%!important;}",
  "body{line-height:"+state.spacing+"!important;letter-spacing:"+state.letter+"px!important;}",
  state.contrast?"html{filter:contrast(1.3)!important;}":"",
  state.dark?"html{color-scheme:dark!important;}body{background:#1c2027!important;color:#f6f0e6!important;}":"",
  state.motion?"html *,html *::before,html *::after{animation-duration:0.001ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important;}":"",
  state.links?"a[href]{outline:2px solid #d28433!important;outline-offset:3px!important;text-decoration:underline!important;}":"",
  state.images?"img,video,picture,canvas{visibility:hidden!important;}":"",
  state.focus?"main,article,[role=main]{max-width:min(100%,850px)!important;margin-inline:auto!important;}":"",
  state.ruler?"#"+rulerId+"{display:block!important;}":"#"+rulerId+"{display:none!important;}"
 ];
 style.textContent=rules.join("\n");
 let ruler=document.getElementById(rulerId);
 if(state.ruler&&!ruler){
  ruler=document.createElement("div");ruler.id=rulerId;
  ruler.setAttribute("aria-hidden","true");
  ruler.style.cssText="pointer-events:none;position:fixed;z-index:2147483646;top:44vh;left:0;width:100%;height:2.6rem;border-top:2px solid #d39452;border-bottom:2px solid #d39452;background:rgba(255,240,174,.15)";
  document.documentElement.appendChild(ruler);
 }
 if(action==="reset"){style.remove();ruler?.remove();delete root.dataset.accesshubPrefs;}
 else root.dataset.accesshubPrefs=JSON.stringify(state);
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
