"use strict";
const core=AccessHubCore;
const $=id=>document.getElementById(id);
let resultLanguage="en";
let currentTab=null,formScan=null,answers={},pendingFill=null,settings=null;
const defaultSettings=()=>({size:100,spacing:1.5,letter:0,contrast:false,dark:false,motion:false,links:false,images:false,ruler:false,focus:false,theme:'original',colorMode:'none',hue:0,strength:100,customColors:false,textColor:'#14532d',backgroundColor:'#fffdf5',linkColor:'#1d4ed8',fontFamily:'original'});
function notice(message,isError=false){
 const box=$("alert");box.textContent=String(message);box.hidden=false;box.dataset.type=isError?"error":"info";
 $("state-foot").textContent=isError?"● Needs attention":"● Ready";
}
function error(e){notice(e?.message||String(e),true)}
function text(el,value){el.textContent=String(value??"")}
function tabOrigin(){if(!currentTab?.url)return null;try{const u=new URL(currentTab.url);return ["https:","http:"].includes(u.protocol)?u.origin:null}catch{return null}}
async function getTab(){
 const [t]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!t||!t.id||!/^(https?:)/.test(t.url||""))throw Error("Open a regular website first. Browser settings and Web Store pages are restricted.");
 return t;
}
async function pageAction(fn,args=[]){
 const t=await getTab();
 const result=await chrome.scripting.executeScript({target:{tabId:t.id},func:fn,args});
 return result?.[0]?.result;
}
async function currentSettings(){
 const json=await pageAction(()=>document.documentElement.dataset.accesshubPrefs||"");
 try{return json?JSON.parse(json):defaultSettings()}catch{return defaultSettings()}
}
function syncSettings(s){
 settings=s||defaultSettings();
 for(const id of ["theme","colorMode","hue","strength","textColor","backgroundColor","linkColor","fontFamily"])if(settings[id]!==undefined)$(id).value=settings[id];
 $("customColors").checked=!!settings.customColors;
 text($("hue-value"),$("hue").value+"°");text($("strength-value"),$("strength").value+"%");
 for(const b of document.querySelectorAll("[data-toggle]")){
  const on=!!settings[b.dataset.toggle];b.setAttribute("aria-pressed",String(on));
  b.classList.toggle("on",on);
 }
 $("spacing").value=Number(settings.spacing||1.5);
 $("letter").value=Number(settings.letter||0);
 text($("spacing-value"),$("spacing").value);
 text($("letter-value"),$("letter").value);
}
async function apply(input){
 try{settings=await pageAction(ahApplySettings,[input]);syncSettings(settings);notice("Applied to the current tab. Site layouts may vary.");}
 catch(e){error(e)}
}
function setTab(name){
 for(const b of document.querySelectorAll("[data-tab]"))b.setAttribute("aria-selected",String(b.dataset.tab===name));
 for(const panel of document.querySelectorAll("section.panel"))panel.hidden=panel.id!=="tab-"+name;
 $("alert").hidden=true;
}
async function connectView(){
 const s=await core.session().catch(()=>null);
 $("signin-box").hidden=!!s;$("signedin-box").hidden=!s;
 text($("connection"),s?"Account signed in":"Local tools");
 if(s)text($("signed-email"),s.user.email||"AccessHub account");
 return s;
}
async function syncDevice(){
 await core.ping();
 text($("last-sync"),"Device synced · "+new Date().toLocaleTimeString());
 notice("Extension activity is now visible in your dashboard connection center.");
}
async function login(e){
 e.preventDefault();
 $("signin").disabled=true;
 try{await core.login($("email").value,$("password").value);$("password").value="";await connectView();await syncDevice()}
 catch(e){error(e)}
 finally{$("signin").disabled=false}
}
async function signout(){
 try{await core.logout();await connectView();notice("Signed out. Local website tools still work.")}
 catch(e){error(e)}
}
async function saveSite(){
 try{
  const origin=tabOrigin();if(!origin)throw Error("Cannot save this site");
  const all=(await chrome.storage.local.get("ah_sites")).ah_sites||{};
  all[origin]=await currentSettings();
  await chrome.storage.local.set({ah_sites:all});
  notice("Saved page preferences for this site. Apply them manually on future visits.");
 }catch(e){error(e)}
}
async function forgetSite(){
 try{
  const origin=tabOrigin();if(!origin)throw Error("Open a regular website first.");
  const all=(await chrome.storage.local.get("ah_sites")).ah_sites||{};
  delete all[origin];
  await chrome.storage.local.set({ah_sites:all});
  notice("Saved settings for this site have been cleared.");
 }catch(e){error(e)}
}
async function applySite(){
 try{
  const origin=tabOrigin();const all=(await chrome.storage.local.get("ah_sites")).ah_sites||{};
  if(!all[origin])return notice("No saved settings for this site.",true);
  await apply({action:"set",settings:all[origin]});
 }catch(e){error(e)}
}
async function applyDefault(){
 try{
  const list=await core.profiles();
  if(!list?.length)throw Error("No default dashboard profile found. Save one in Accessibility Profiles.");
  const p=list[0].settings||{};
  await apply({action:"set",settings:{
   ...(p.visual||{}),size:p.visual?.size||p.fontSize||100,letter:p.visual?.letter??p.letterSpacing??0,spacing:p.visual?.spacing??p.lineSpacing??1.5,
   contrast:p.visual?.contrast??(p.contrast==="high"),dark:p.visual?.dark??(p.theme==="dark"),motion:p.visual?.motion??(p.motion==="reduced")
  }});
  await core.ping();notice("Your saved default AccessHub profile is applied on this tab.");
 }catch(e){error(e)}
}
async function selected(){
 try{
  const t=await getTab();
  const content=await pageAction(ahReadSelection);
  if(!content)throw Error("Select text on the page, then click Get selected text.");
  $("selected-text").value=content;
  currentTab=t;notice("Selection loaded locally. Nothing was sent to AI.");
 }catch(e){error(e)}
}
async function analyze(){
 const content=$("selected-text").value.trim();
 if(!content)return notice("Select or paste some text first.",true);
 if(!$("cloud-consent").checked)return notice("Tick the cloud-processing consent checkbox first.",true);
 $("analyze").disabled=true;$("answer-panel").hidden=true;
 try{
  const requestedLanguage=$("language").value;
  const r=await core.ai(content,$("operation").value,requestedLanguage);
  resultLanguage=requestedLanguage;
  text($("ai-answer"),r.text||"The AI returned an empty response.");
  $("answer-panel").hidden=false;
  $("cloud-consent").checked=false;
  notice("Gemini response received. Check accuracy against the original text.");
 }catch(e){error(e)}finally{$("analyze").disabled=false}
}
async function saveNote(){
 const value=$("ai-answer").textContent||"";
 if(!value.trim())return notice("No AI result to save",true);
 try{await core.saveNote("Extension insight: "+$("operation").selectedOptions[0].text,value);notice("Saved in your private AccessHub notes.")}
 catch(e){error(e)}
}
async function explainField(field){
 if(!$("form-cloud-consent").checked)return notice("Approve sending this field label to Gemini first.",true);
 try{
  const label="Explain the purpose and expected answer for this form field, with one short example: "+field.label+". Input type: "+field.type+". Never request sensitive details.";
  const d=await core.ai(label,"explain","en");
  text($("form-explanation"),d.text||"No explanation returned");
  $("form-explanation").hidden=false;
  $("form-cloud-consent").checked=false;
  notice("Field explanation ready. Verify instructions against the original form.");
 }catch(e){error(e)}
}
function addAnswerField(field){
 const row=document.createElement("div");row.className="form-row";
 const label=document.createElement("label");label.className="stack";
 const title=document.createElement("span");title.textContent=field.label+(field.required?" · Required":" · Optional");
 label.appendChild(title);
 let input;
 if(field.type==="select-one"){
  input=document.createElement("select");
  const first=document.createElement("option");first.value="";first.textContent="Choose a value";input.appendChild(first);
  for(const item of field.options){
   const option=document.createElement("option");option.value=item.value;option.textContent=item.label;input.appendChild(option);
  }
 }else{input=document.createElement("input");input.type=field.type==="textarea"?"text":field.type;input.placeholder=field.placeholder||"Enter your answer";}
 input.value=answers[field.id]||"";
 input.addEventListener("input",()=>{answers[field.id]=input.value;pendingFill=null;$("fill-preview").hidden=true;$("confirm-fill").hidden=true});
 label.appendChild(input);
 const button=document.createElement("button");button.className="ghost fill-one";button.textContent="Preview fill";
 button.addEventListener("click",()=>{
  if(!input.value.trim()&&field.required)return notice("Enter an answer for this required field.",true);
  pendingFill={id:field.id,label:field.label,value:input.value,tabId:formScan.tabId,origin:formScan.origin};
  text($("fill-preview"),"Review before filling ONE field on "+new URL(formScan.origin).hostname+": "+field.label+" → "+(input.value||"(empty)")+". This does not intentionally submit the form, but the webpage may react to input.");
  $("fill-preview").hidden=false;$("confirm-fill").hidden=false;
 });
 const explain=document.createElement("button");explain.className="ghost fill-one";explain.textContent="Explain label with AI";explain.addEventListener("click",()=>explainField(field));row.append(label,button,explain);
 return row;
}
async function scan(){
 $("scan-form").disabled=true;
 try{
  const t=await getTab();
  const details=await pageAction(ahScanForm);
  if(!details?.fields?.length)throw Error("No supported visible fields found. Passwords, IDs, payment details and OTPs are excluded.");
  formScan={...details,tabId:t.id,origin:new URL(t.url).origin};
  answers={};pendingFill=null;
  const out=$("form-fields");out.replaceChildren();
  for(const f of details.fields)out.appendChild(addAnswerField(f));
  text($("form-summary"),details.count+" readable fields found on "+new URL(t.url).hostname+". Review every label and answer.");
  $("form-summary").hidden=false;$("fill-preview").hidden=true;$("confirm-fill").hidden=true;
  notice("Field labels only scanned. Existing answers were NOT read.");
 }catch(e){error(e)}finally{$("scan-form").disabled=false}
}
async function fill(){
 if(!pendingFill)return notice("Preview a field before filling.",true);
 $("confirm-fill").disabled=true;
 try{
  const t=await getTab();
  if(t.id!==pendingFill.tabId||new URL(t.url).origin!==pendingFill.origin)throw Error("The active tab changed. Rescan before filling.");
  const result=await pageAction(ahFillFormField,[{id:pendingFill.id,value:pendingFill.value}]);
  if(!result?.ok)throw Error(result?.message||"Field fill was blocked");
  notice(result.message);
  pendingFill=null;$("fill-preview").hidden=true;$("confirm-fill").hidden=true;
 }catch(e){error(e)}finally{$("confirm-fill").disabled=false}
}
async function saveDraft(){
 if(!formScan)return notice("Scan a form first",true);
 if(!$("draft-consent").checked)return notice("Approve cloud saving of answers first.",true);
 $("save-draft").disabled=true;
 try{
  const cleaned={};
  for(const f of formScan.fields)if(Object.prototype.hasOwnProperty.call(answers,f.id))cleaned[f.label]=answers[f.id];
  await core.saveDraft(formScan.fields,cleaned,formScan.title||"Extension form");
  $("draft-consent").checked=false;
  notice("The reviewed draft is saved privately in your AccessHub account.");
 }catch(e){error(e)}finally{$("save-draft").disabled=false}
}
async function loadVoices(){
 const voices=await chrome.tts.getVoices();const lang=$("language").value;
 $("voice").replaceChildren(new Option("Automatic matching voice",""));
 for(const v of voices.filter(v=>v.lang?.split(/[-_]/)[0]===lang))$("voice").appendChild(new Option(v.voiceName,v.voiceName));
}
async function speak(result=false){
 const value=(result?$("ai-answer").textContent:$("selected-text").value).trim();
 if(!value)return notice("No text to speak",true);
 const code=result?resultLanguage:$("language").value;
 const language=globalThis.AccessHubLanguages.find(x=>x.code===code);
 try{
  const voices=await chrome.tts.getVoices();
  const matching=voices.filter(v=>v.lang?.split(/[-_]/)[0]===code);
  const voice=matching.find(v=>v.voiceName===$("voice").value)||matching[0];
  if(!voice)throw Error("No "+language.name+" voice is installed. Add that language's speech voice in your operating system, then reopen the extension.");
  chrome.tts.speak(value.slice(0,15000),{rate:Number($("rate").value),pitch:Number($("pitch").value),lang:voice.lang,voiceName:voice.voiceName,enqueue:false,onEvent:e=>{if(e.type==='error')notice(e.errorMessage||'Speech failed',true)}},()=>{if(chrome.runtime.lastError)error(chrome.runtime.lastError)});
  notice("Reading "+(result?"AI result":"original text")+" with a "+language.name+" voice. Use Translate first to change the text language.");
 }catch(e){error(e)}
}
async function boot(){
 try{
  await core.init();
  const savedSpeech=(await chrome.storage.local.get("ah_speech")).ah_speech||{};
  for(const id of ["language","rate","pitch"])if(savedSpeech[id]!==undefined)$(id).value=savedSpeech[id];
  await loadVoices();if(savedSpeech.voice)$("voice").value=savedSpeech.voice;
  const [t]=await chrome.tabs.query({active:true,currentWindow:true});
  currentTab=t||null;
  text($("site-name"),t?.url&&/^https?:/.test(t.url)?new URL(t.url).hostname:"Open a normal webpage");
  await connectView();
  if(tabOrigin())try{syncSettings(await currentSettings())}catch{}
  notice("Ready. Open a feature tab to begin.");
 }catch(e){error(e)}
}
for(const b of document.querySelectorAll("[data-tab]"))b.addEventListener("click",()=>setTab(b.dataset.tab));
$("login-form").addEventListener("submit",login);
$("logout").addEventListener("click",signout);
$("sync-now").addEventListener("click",()=>syncDevice().catch(error));
$("larger").addEventListener("click",()=>apply({action:"size",delta:10}));
$("smaller").addEventListener("click",()=>apply({action:"size",delta:-10}));
$("reset").addEventListener("click",()=>apply({action:"reset"}));
for(const b of document.querySelectorAll("[data-toggle]"))b.addEventListener("click",()=>apply({action:"toggle",key:b.dataset.toggle}));
for(const id of ["spacing","letter"])$(id).addEventListener("change",async e=>{
 const current=settings||defaultSettings();
 await apply({action:"set",settings:{...current,[id]:Number(e.target.value)}});
});
$("save-site").addEventListener("click",saveSite);
$("apply-site").addEventListener("click",applySite);
$("forget-site").addEventListener("click",forgetSite);
$("default-profile").addEventListener("click",applyDefault);
$("get-selection").addEventListener("click",selected);
$("save-reading").addEventListener("click",async()=>{try{await core.saveReading($("selected-text").value);notice("Selected text saved to your private reading list.")}catch(e){error(e)}});
$("copy-selection").addEventListener("click",()=>navigator.clipboard.writeText($("selected-text").value).then(()=>notice("Copied to clipboard")).catch(error));
$("speak").addEventListener("click",()=>speak(false));
$("speak-answer").addEventListener("click",()=>speak(true));
$("language").addEventListener("change",()=>loadVoices().catch(error));
$("pause-speech").addEventListener("click",()=>{chrome.tts.pause();notice("Speech paused")});
$("resume-speech").addEventListener("click",()=>{chrome.tts.resume();notice("Speech resumed")});
$("stop-speech").addEventListener("click",()=>{chrome.tts.stop();notice("Speech stopped")});
$("analyze").addEventListener("click",analyze);
$("copy-answer").addEventListener("click",()=>navigator.clipboard.writeText($("ai-answer").textContent||"").then(()=>notice("AI result copied")).catch(error));
$("save-note").addEventListener("click",saveNote);
$("scan-form").addEventListener("click",scan);
$("confirm-fill").addEventListener("click",fill);
$("save-draft").addEventListener("click",saveDraft);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fill-preview").hidden){pendingFill=null;$("fill-preview").hidden=true;$("confirm-fill").hidden=true}});
for(const id of ["theme","colorMode","hue","strength","textColor","backgroundColor","linkColor","fontFamily","customColors"])$(id).addEventListener("change",()=>apply({action:"set",settings:{...(id==="colorMode"?{customColors:false,theme:"original"}:{}),...(id==="customColors"?{theme:$(id).checked?"custom":"original"}:{}),...( ["textColor","backgroundColor","linkColor"].includes(id)?{theme:"custom",customColors:true}:{}),[id]:id==="customColors"?$(id).checked:$(id).value}}));
$("easy-read").addEventListener("click",()=>apply({action:"set",settings:{size:130,theme:"cream",spacing:1.6,motion:true}}));
for(const id of ["language","rate","pitch","voice"])$(id).addEventListener("change",()=>chrome.storage.local.set({ah_speech:{language:$("language").value,rate:$("rate").value,pitch:$("pitch").value,voice:$("voice").value}}).catch(error));
boot();
