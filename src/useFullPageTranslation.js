import {useEffect} from "react";
import {uiText} from "./uiTranslations";

// Translate visible UI labels and accessible descriptions, without changing editable user input.
// Bundled dictionary is applied immediately; missing labels may use the server-side translator.
export function useFullPageTranslation(language){
 useEffect(()=>{
  const lang=String(language||"en").split("-")[0];
  document.documentElement.lang=language||"en";
  document.documentElement.dir=["ar","ur"].includes(lang)?"rtl":"ltr";
  if(lang==="en")return;
  const roots=[document.getElementById("root"),...document.querySelectorAll("[data-ah-controls]")].filter(Boolean);
  if(!roots.length)return;
  const originals=new Map(),applied=new Map(),translationCache=new Map();
  const attributeNames=["placeholder","aria-label","title","aria-description"];
  const excluded="[contenteditable],pre,code,script,style,[data-no-translate],.user-message,.ai-response,[data-private]";
  const isExcluded=el=>!el||!!el.closest(excluded);
  const pending=new Map();
  let active=true,queued=false,running=false,controller=null,revision=0;
  const record=(node,key,current)=>{
   let o=originals.get(node);if(!o){o=new Map();originals.set(node,o)}
   let a=applied.get(node);if(!a){a=new Map();applied.set(node,a)}
   const previous=a.get(key);
   if(!o.has(key)||current!==previous&&current!==o.get(key)){o.set(key,current);a.delete(key)}
   return o.get(key);
  };
  const setTranslated=(node,key,value)=>{
   if(!active)return;
   if(key==="text")node.nodeValue=value;
   else node.setAttribute(key,value);
   applied.get(node)?.set(key,value);
  };
  const translateField=(node,key,value)=>{
   if(!value||!value.trim()||value.length>450||!/[A-Za-z]/.test(value))return;
   const original=record(node,key,value);
   const trimmed=original.trim();
   if(!trimmed)return;
   const translated=uiText(language,trimmed);
   if(translated!==trimmed){
    const leading=original.match(/^\\s*/)?.[0]||"";
    const trailing=original.match(/\\s*$/)?.[0]||"";
    const next=leading+translated+trailing;
    if(value!==next)setTranslated(node,key,next);
   }else if(translationCache.has(trimmed)){
    const translatedValue=translationCache.get(trimmed);
    if(translatedValue&&translatedValue!==trimmed&&value!==translatedValue)setTranslated(node,key,translatedValue);
   }else{
    if(!pending.has(trimmed))pending.set(trimmed,[]);
    pending.get(trimmed).push([node,key,original]);
   }
  };
  const scan=()=>{
   pending.clear();
   const elements=new Set();
   for(const root of [document.getElementById("root"),...document.querySelectorAll("[data-ah-controls]")]){
    if(!root)continue;
    const tree=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=tree.nextNode())){
     const parent=node.parentElement;
     if(!parent||isExcluded(parent)||parent.closest("textarea,option"))continue;
     // Never translate what users type or what AI returned.
     translateField(node,"text",node.nodeValue||"");
    }
    elements.add(root);
    for(const el of root.querySelectorAll("[placeholder],[aria-label],[title],[aria-description]"))elements.add(el);
   }
   for(const el of elements){
    if(isExcluded(el))continue;
    for(const key of attributeNames)if(el.hasAttribute(key))translateField(el,key,el.getAttribute(key));
   }
  };
  const fetchMissing=async()=>{
   if(!active||running||!pending.size)return;
   const missing=[...pending.keys()].slice(0,80);
   if(!missing.length)return;
   running=true;
   const revisionAtStart=revision;
   controller=new AbortController();
   try{
    const response=await fetch("/api/translate-ui",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language,strings:missing}),signal:controller.signal});
    if(!response.ok)throw Error("UI translation service unavailable");
    const result=await response.json();
    if(!Array.isArray(result.translations)||result.translations.length!==missing.length)return;
    for(let i=0;i<missing.length;i++){
     const value=result.translations[i];
     if(typeof value==="string"&&value.trim())translationCache.set(missing[i],value);
    }
    if(active&&revisionAtStart===revision)schedule();
   }catch{/* Static translations continue working without the API. */}
   finally{running=false}
  };
  const flush=()=>{
   queued=false;
   if(!active)return;
   scan();
   if(pending.size)void fetchMissing();
  };
  const schedule=()=>{
   if(!active||queued)return;
   queued=true;
   queueMicrotask(flush);
  };
  const observer=new MutationObserver(records=>{
   if(records.some(r=>{
    if(r.type==="characterData")return r.target.nodeValue!==applied.get(r.target)?.get("text");
    if(r.type==="attributes")return r.target.getAttribute(r.attributeName)!==applied.get(r.target)?.get(r.attributeName);
    return r.addedNodes.length||r.removedNodes.length;
   }))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributeNames});
  schedule();
  return()=>{
   active=false;revision++;controller?.abort();observer.disconnect();
   for(const [node,fields] of originals){
    for(const [key,original] of fields){
     if(key==="text"){if(node.isConnected&&node.nodeValue===applied.get(node)?.get(key))node.nodeValue=original}
     else if(node.isConnected&&node.getAttribute(key)===applied.get(node)?.get(key))node.setAttribute(key,original);
    }
   }
  };
 },[language]);
}
