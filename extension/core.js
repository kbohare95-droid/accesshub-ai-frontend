/* AccessHub extension: only the public Supabase publishable key is bundled. */
"use strict";
const AccessHubCore=(()=>{
 const BASE="https://eoagdssuvjzlsslriovv.supabase.co";
 const KEY="sb_publishable_KLtytjPkKq_-6WBiv8DuFA_SP3slzS4";
 const DASHBOARD="https://accesshub-ai-frontend.vercel.app";
 const version=chrome.runtime.getManifest().version;
 let cached=null;
 async function init(){
  if(chrome.storage.local.setAccessLevel)await chrome.storage.local.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"});
  const saved=await chrome.storage.local.get(["ah_session","ah_device"]);
  cached=saved.ah_session||null;
  return cached;
 }
 function explain(json,status){return json?.msg||json?.error_description||json?.message||json?.detail||json?.error||"Request failed (HTTP "+status+")";}
 async function request(path,{method="GET",body=null,token=null,prefer=null}={}){
  const headers={"apikey":KEY,"Content-Type":"application/json","Accept":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(prefer)headers.Prefer=prefer;
  let response;
  try{response=await fetch(BASE+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store"})}
  catch{throw Error("Network unavailable. Check your connection.");}
  let json=null;
  if(response.status!==204){try{json=await response.json()}catch{}}
  if(!response.ok)throw Error(explain(json,response.status));
  return json;
 }
 function validSession(token){
  return !!(token&&token.access_token&&token.refresh_token&&token.user?.id);
 }
 async function writeSession(session){
  if(!validSession(session))throw Error("Supabase returned an incomplete session");
  cached=session;
  await chrome.storage.local.set({ah_session:session});
  return session;
 }
 async function login(email,password){
  const e=email.trim();
  if(!e||!password)throw Error("Enter your email and password");
  const data=await request("/auth/v1/token?grant_type=password",{method:"POST",body:{email:e,password}});
  const s={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+Math.max(30,data.expires_in||3600)*1000,user:{id:data.user?.id,email:data.user?.email}};
  await writeSession(s);
  await ping();
  return s;
 }
 async function session(){
  if(!cached)await init();
  if(!cached)return null;
  if(cached.expires_at-Date.now()>90000)return cached;
  try{
   const result=await request("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:cached.refresh_token}});
   const next={access_token:result.access_token,refresh_token:result.refresh_token||cached.refresh_token,expires_at:Date.now()+Math.max(30,result.expires_in||3600)*1000,user:{id:result.user?.id||cached.user.id,email:result.user?.email||cached.user.email}};
   return writeSession(next);
  }catch(e){
   cached=null;
   await chrome.storage.local.remove("ah_session");
   throw Error("Your extension session expired. Sign in again.");
  }
 }
 async function authenticated(path,options={}){
  const s=await session();
  if(!s)throw Error("Sign in to AccessHub AI first");
  return request(path,{...options,token:s.access_token});
 }
 async function deviceId(){
  const stored=await chrome.storage.local.get("ah_device");
  if(stored.ah_device)return stored.ah_device;
  const id=crypto.randomUUID();
  await chrome.storage.local.set({ah_device:id});
  return id;
 }
 async function ping(){
  const s=await session();
  if(!s)return;
  const id=await deviceId();
  const agent=/Edg\//.test(navigator.userAgent)?"Microsoft Edge":"Google Chrome";
  await authenticated("/rest/v1/extension_devices?on_conflict=user_id%2Cdevice_id",{
   method:"POST",prefer:"resolution=merge-duplicates,return=minimal",
   body:{user_id:s.user.id,device_id:id,device_name:agent+" extension",extension_version:version,last_seen:new Date().toISOString()}
  });
 }
 async function logout(){
  const s=cached;
  if(s){
   try{
    const id=await deviceId();
    await request("/rest/v1/extension_devices?device_id=eq."+encodeURIComponent(id)+"&user_id=eq."+encodeURIComponent(s.user.id),{method:"DELETE",token:s.access_token});
   }catch{}
   try{await request("/auth/v1/logout",{method:"POST",token:s.access_token})}catch{}
  }
  cached=null;
  await chrome.storage.local.remove("ah_session");
 }
 async function ai(selected,operation,language){
  const source=String(selected||"").trim().slice(0,12000);
  if(!source)throw Error("Select or paste text first");
  const tasks={
   summarize:"Summarize this user-selected text in bullet points, preserving essential facts.",
   simplify:"Explain this selected text in simpler language.",
   translate:"Translate the selected text accurately.",
   explain:"Explain the meaning and important terms in the selected text."
  };
  if(!tasks[operation])throw Error("Unsupported AI operation");
  await ping();
  return authenticated("/functions/v1/accesshub-ai",{method:"POST",body:{
   action:"respond",operation,prompt:tasks[operation],
   context:source,language:language==="hi"?"Hindi":"English",consent:true
  }});
 }
 async function saveNote(title,body){
  const s=await session();if(!s)throw Error("Please sign in.");
  await authenticated("/rest/v1/notes",{method:"POST",body:{user_id:s.user.id,title:String(title).slice(0,150),body:String(body).slice(0,100000)}});
  await ping();
 }
 async function profiles(){
  const s=await session();if(!s)throw Error("Please sign in");
  return await authenticated("/rest/v1/accessibility_profiles?select=name,settings,is_default&is_default=eq.true&order=updated_at.desc&limit=1");
 }
 async function saveDraft(fields,answers,title){
  const s=await session();if(!s)throw Error("Please sign in");
  await authenticated("/rest/v1/form_sessions",{method:"POST",body:{
    user_id:s.user.id,title:String(title).slice(0,200)||"Extension form draft",
    fields:fields.map(f=>({label:f.label,type:f.type,required:f.required})).slice(0,60),
    answers,status:"draft"
  }});
  await ping();
 }
 return {BASE,DASHBOARD,init,session,login,logout,authenticated,ping,ai,saveNote,profiles,saveDraft,deviceId};
})();
