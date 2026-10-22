import React,{useState,useEffect} from 'react';
import {availableVoices} from './speech';
import {languageInfo} from './languages';
export function VoicePicker({lang}){
 const [voices,setVoices]=useState([]),[voice,setVoice]=useState(''),[pitch,setPitch]=useState(()=>Number(localStorage.getItem('ah-pitch')||1));
 const code=languageInfo(lang).code;
 useEffect(()=>{let alive=true;const load=()=>availableVoices().then(v=>{if(alive)setVoices(v.filter(x=>x.lang.replace('_','-').split('-')[0]===code))});load();setVoice(localStorage.getItem('ah-voice-'+code)||'');window.speechSynthesis?.addEventListener('voiceschanged',load);return()=>{alive=false;window.speechSynthesis?.removeEventListener('voiceschanged',load)}},[code]);
 return <><label className="hub-label">Voice<select value={voice} onChange={e=>{setVoice(e.target.value);localStorage.setItem('ah-voice-'+code,e.target.value)}}><option value="">Automatic matching voice</option>{voices.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></label>{!voices.length&&<p role="status">No {languageInfo(lang).name} voice detected on this device.</p>}<label className="hub-label">Pitch · {pitch}<input type="range" min=".5" max="2" step=".1" value={pitch} onChange={e=>{setPitch(+e.target.value);localStorage.setItem('ah-pitch',e.target.value)}}/></label></>;
}
