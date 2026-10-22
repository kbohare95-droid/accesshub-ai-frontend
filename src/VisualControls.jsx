import React,{useState,useEffect} from 'react';
import '../extension/page-actions.js';
export function VisualControls(){
 const [open,setOpen]=useState(false);
 const [prefs,setPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem('ah-visual')||'{}')}catch{return {}}});
 const [status,setStatus]=useState('');
 useEffect(()=>{const s=globalThis.ahApplySettings({action:'set',settings:prefs});setPrefs(s);const handler=()=>{try{setPrefs(JSON.parse(localStorage.getItem('ah-visual')||'{}'))}catch{}};window.addEventListener('ah-visual',handler);return()=>window.removeEventListener('ah-visual',handler)},[]);
 function apply(p){const s=globalThis.ahApplySettings({action:'set',settings:p});setPrefs(s);localStorage.setItem('ah-visual',JSON.stringify(s));setStatus('Applied and saved on this device.');}
 function reset(){const s=globalThis.ahApplySettings({action:'reset'});setPrefs(s);localStorage.removeItem('ah-visual');setStatus('Original appearance restored.');}
 const range=(key,label,min,max,step=1)=><label>{label} · {prefs[key]}<input type="range" min={min} max={max} step={step} value={prefs[key]??min} onChange={e=>apply({[key]:+e.target.value})}/></label>;
 return <aside data-ah-controls className="ah-customizer"><button className="primary" aria-expanded={open} aria-controls="ah-visual-panel" onClick={()=>setOpen(!open)}>Aa · Customize</button>{open&&<section id="ah-visual-panel" aria-label="Appearance customization"><div className="hub-row"><h2>Your visual preferences</h2><button aria-label="Close customization" onClick={()=>setOpen(false)}>×</button></div><button className="primary" onClick={()=>apply({size:150,customColors:true,textColor:'#14532d',backgroundColor:'#fffdf5',linkColor:'#1d4ed8',spacing:1.8,motion:true})}>One-click large green text</button>
 {range('size','Text size (%)',80,250,5)}{range('spacing','Line spacing',1.1,3,.1)}{range('letter','Letter spacing (px)',0,8,.5)}
 <label>Font family<select value={prefs.fontFamily||'original'} onChange={e=>apply({fontFamily:e.target.value})}>{[['original','Original'],['sans','Sans serif'],['serif','Serif'],['mono','Monospace']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
 <label>Colour assistance<select value={prefs.colorMode||'none'} onChange={e=>apply({colorMode:e.target.value,customColors:false})}>{[['none','Original spectrum'],['protan','Red distinction aid'],['deutan','Green distinction aid'],['tritan','Blue / yellow distinction aid'],['custom','Custom spectrum shift'],['gray','Grayscale']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
 {range('hue','Spectrum rotation (degrees)',-180,180)}{range('strength','Effect strength (%)',0,100)}
 <label className="hub-check"><input type="checkbox" checked={!!prefs.customColors} onChange={e=>apply({customColors:e.target.checked})}/>Use exact custom colours</label>
 <div className="hub-row">{[['textColor','Text','#14532d'],['backgroundColor','Background','#fffdf5'],['linkColor','Links','#1d4ed8']].map(([k,n,c])=><label key={k}>{n}<input type="color" value={prefs[k]||c} onChange={e=>apply({[k]:e.target.value,customColors:true})}/></label>)}</div>
 <p>Custom colours override spectrum shifts. Colour aids are adjustable visual preferences, not a vision correction.</p>
 <div className="hub-row">{[['motion','Reduce motion'],['links','Mark links'],['contrast','High contrast'],['ruler','Reading ruler'],['images','Hide images']].map(([k,n])=><label className="hub-check" key={k}><input type="checkbox" checked={!!prefs[k]} onChange={e=>apply({[k]:e.target.checked})}/>{n}</label>)}</div>
 <button className="secondary" onClick={reset}>Reset all appearance</button><p role="status">{status}</p></section>}</aside>
}
