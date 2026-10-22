import {languageInfo} from './languages';
export const speechNotice=message=>window.dispatchEvent(new CustomEvent('ah-notice',{detail:message}));
export async function availableVoices(){
 if(!window.speechSynthesis)return [];
 if(speechSynthesis.getVoices().length)return speechSynthesis.getVoices();
 return new Promise(resolve=>{const done=()=>{clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',done);resolve(speechSynthesis.getVoices())};const timer=setTimeout(done,1800);speechSynthesis.addEventListener('voiceschanged',done)})
}
export async function speakText(text,rate=1,lang='en-IN'){
 if(!text?.trim())return speechNotice('Enter text to read first.');
 if(!window.speechSynthesis)return speechNotice('Speech is unavailable in this browser.');
 const language=languageInfo(lang);const voices=await availableVoices();
 const matching=voices.filter(v=>v.lang.replace('_','-').split('-')[0]===language.code);
 const voice=matching.find(v=>v.name===localStorage.getItem('ah-voice-'+language.code))||matching[0];
 if(!voice)return speechNotice('No '+language.name+' voice is available. Install that language’s speech voice in your device settings and reload.');
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=voice.lang;u.voice=voice;u.rate=rate;u.pitch=Number(localStorage.getItem('ah-pitch')||1);u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))speechNotice('Speech failed: '+e.error)};speechSynthesis.speak(u);
}
