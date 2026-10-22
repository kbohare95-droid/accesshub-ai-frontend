import React from 'react';
import {createRoot} from 'react-dom/client';
import {ReadingWorkspace,CommunicationBoard} from '../src/AccessibilityTools';
import {VisualControls} from '../src/VisualControls';
import {useFullPageTranslation} from '../src/useFullPageTranslation';
import '../src/styles.css';
window.requests=[];
const query={select(){return this},order(){return this},limit(){return Promise.resolve({data:[]})}};
const db={from:()=>query,functions:{invoke:async(name,{body})=>{window.requests.push(body);return {data:{text:'नमस्ते दुनिया'}}}}};
function HindiTest(){const [language,setLanguage]=React.useState('en-IN');useFullPageTranslation(language);return <><button id="test-hindi" onClick={()=>setLanguage('hi-IN')}>Switch to Hindi</button><button id="test-english" onClick={()=>setLanguage('en-IN')}>Switch to English</button><p id="test-localize">Start by typing or speaking a request. You'll review it before any cloud processing.</p><button id="test-action-label">Get help</button><input id="test-placeholder" aria-label="Your task" placeholder="e.g. Explain my admission notice…" /></>}
createRoot(document.getElementById('root')).render(<><p id="fixed" style={{fontSize:20,color:'rgb(20, 30, 40)'}}>Fixed pixel text <span id="nested">Nested text</span></p><a id="sample-link" href="#root">Example link</a><ReadingWorkspace db={db} notify={s=>{window.lastNotice=s}}/><CommunicationBoard db={db} notify={s=>{window.lastNotice=s}}/><VisualControls/><HindiTest/></>);
