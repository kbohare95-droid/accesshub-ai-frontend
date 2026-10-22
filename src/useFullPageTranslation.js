import {useEffect} from "react";
import {uiText} from "./uiTranslations";

// Translate interface text without replacing React-managed DOM nodes.
// Restores originals before React updates; skips user data and editable content.
export function useFullPageTranslation(language){
 useEffect(()=>{
  const locale=String(language||"en").split("-")[0];
  document.documentElement.lang=language||"en";
  const root=document.getElementById("root");
  if(!root||locale==="en")return;
  let cancelled=false,processing=false,timeout;
  const originals=new Map(),translated=new Map();
  const skip=el=>!el||el.closest('textarea,input,select,option,[contenteditable],pre,code,[data-no-translate],.user-message,.ai-response');
  const collect=()=>{
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const entries=[];let node;
   while((node=walker.nextNode())){
    if(!node.parentElement||skip(node.parentElement))continue;
    const value=node.nodeValue;
    if(!value||!value.trim()||value.trim().length>450)continue;
    if(!originals.has(node))originals.set(node,value);
    const source=originals.get(node);
    if(node.nodeValue!==source&&node.nodeValue!==translated.get(node)){originals.set(node,node.nodeValue);translated.delete(node)}
    const text=originals.get(node).trim();
    if(!text||!/[A-Za-z]/.test(text))continue;
    const local=uiText(language,text);
    if(local!==text){const leading=originals.get(node).match(/^\s*/)[0],trailing=originals.get(node).match(/\s*$/)[0];translated.set(node,leading+local+trailing);node.nodeValue=translated.get(node)}
    else entries.push({node,text,original:originals.get(node)});
   }
   return entries;
  };
  const cache=new Map();let active=null;
  const translate=async()=>{
   if(processing||cancelled)return;processing=true;
   try{
    const entries=collect().slice(0,200);
    const missing=[...new Set(entries.map(x=>x.text))].filter(x=>!cache.has(x)).slice(0,90);
    if(missing.length){
     // Public translation endpoint is optional. Fail closed to the original English text.
     try{
      active=new AbortController();
      const response=await fetch("/api/translate-ui",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language,strings:missing}),signal:active.signal});
      if(response.ok){const data=await response.json();if(Array.isArray(data.translations))missing.forEach((v,i)=>{if(typeof data.translations[i]==="string")cache.set(v,data.translations[i])})}
     }catch{}
    }
    if(cancelled)return;
    for(const entry of entries){const value=cache.get(entry.text);if(value&&entry.node.isConnected&&entry.node.nodeValue===entry.original){const lead=entry.original.match(/^\s*/)[0],tail=entry.original.match(/\s*$/)[0];translated.set(entry.node,lead+value+tail);entry.node.nodeValue=translated.get(entry.node)}}
   }finally{processing=false}
  };
  const observer=new MutationObserver(()=>{if(cancelled)return;clearTimeout(timeout);timeout=setTimeout(translate,150)});
  observer.observe(root,{subtree:true,childList:true,characterData:true});
  translate();
  return()=>{cancelled=true;active?.abort();clearTimeout(timeout);observer.disconnect();for(const [node,original] of originals)if(node.isConnected&&node.nodeValue===translated.get(node))node.nodeValue=original};
 },[language]);
}
