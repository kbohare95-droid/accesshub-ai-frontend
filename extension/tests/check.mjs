import assert from "node:assert/strict";
import{readFileSync,existsSync}from"node:fs";
import{resolve,dirname}from"node:path";
import{fileURLToPath}from"node:url";
import vm from"node:vm";
const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=rel=>readFileSync(resolve(base,rel),"utf8");
const manifest=JSON.parse(read("manifest.json"));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,"0.3.0");
assert.deepEqual(manifest.host_permissions,["https://eoagdssuvjzlsslriovv.supabase.co/*"]);
assert(["activeTab","scripting","storage","tts"].every(p=>manifest.permissions.includes(p)));
assert(!manifest.permissions.some(p=>["history","webRequest","tabs","debugger"].includes(p)));
assert(!JSON.stringify(manifest).includes("<all_urls>"));
const html=read("popup.html");
for(const asset of["popup.css","core.js","page-actions.js","popup.js"])
 assert(existsSync(resolve(base,asset)),"Missing "+asset);
assert(html.includes('id="cloud-consent"'));
assert(html.includes('id="confirm-fill"'));
assert(html.includes('id="draft-consent"'));
assert(html.includes('id="theme"'));
assert(read('page-actions.js').includes("[['size',100,140]"));
assert(!read('page-actions.js').includes('80,250'));
assert(read("page-actions.js").includes("rulerY()"),"Ruler must track a fixed reading line");
assert(!read("page-actions.js").includes("pointermove"),"Reading magnification must not depend on mouse movement");
assert(read("page-actions.js").includes("window.addEventListener(\'scroll\',requestUpdate"),"Ruler must update when scrolling");
for(const file of["core.js","page-actions.js","popup.js"]){
 new vm.Script(read(file),{filename:file});
 console.log("✓ Script syntax:",file);
}
const page=read("page-actions.js");
assert(!page.includes("fetch("),"In-page script must not access network");
assert(!page.includes(".submit("),"In-page script must never submit forms");
class MockElement{constructor(){this.dataset={};this.disabled=false;this.readOnly=false;this.maxLength=300}}
class MockInput extends MockElement{
 constructor(type,label,attributes={}){super();this.type=type;this.tagName="INPUT";this._label=label;this._value="";this.labels=[{textContent:label}];this.attributes=attributes;this.required=!!attributes.required;this.id=attributes.id||"";this.name=attributes.name||"";}
 get value(){if(this.throwOnRead)throw Error("Reading existing input values is forbidden");return this._value}
 set value(v){this._value=v}
 getAttribute(name){return this.attributes[name]??null}
 getClientRects(){return[{}]}
 dispatchEvent(){this.dispatched=true}
}
class MockArea extends MockInput{}
class MockSelect extends MockInput{}
const normal=new MockInput("text","Full name",{required:true,name:"full-name"});
normal.throwOnRead=true;
const sensitive=new MockInput("password","Password",{name:"password"});
const payment=new MockInput("text","Card number",{name:"cc-number"});
const otp=new MockInput("text","OTP",{name:"otp"});
const email=new MockInput("email","Email address",{name:"email"});
const elements=[normal,sensitive,payment,otp,email];
const mockDocument={title:"Test page",querySelectorAll:()=>elements};
const mockContext=vm.createContext({
 document:mockDocument,HTMLElement:MockElement,HTMLInputElement:MockInput,HTMLTextAreaElement:MockArea,HTMLSelectElement:MockSelect,
 getComputedStyle:()=>({visibility:"visible"}),crypto:{randomUUID:()=>String(Math.random())},
 Event:class{constructor(name){this.type=name}},
 window:{getSelection:()=>({toString:()=>""})}
});
vm.runInContext(page,mockContext);
const scan=vm.runInContext("ahScanForm()",mockContext);
assert.equal(scan.count,2);
assert.equal(scan.fields[0].label,"Full name");
assert.equal(scan.fields[1].label,"Email address");
assert(scan.fields.every(x=>!["password","Card number","OTP"].includes(x.label)));
normal.throwOnRead=false;
const filled=vm.runInContext('ahFillFormField({id:'+JSON.stringify(scan.fields[0].id)+',value:"Test person"})',mockContext);
assert(filled.ok===true,"Safe field should fill");
assert.equal(normal.value,"Test person");
const blocked=vm.runInContext('ahFillFormField({id:"missing",value:"test"})',mockContext);
assert.equal(blocked.ok,false);
console.log("✓ Excludes protected fields and existing field values; one-field fill checked");
console.log("Extension static and mocked-DOM checks passed.");
