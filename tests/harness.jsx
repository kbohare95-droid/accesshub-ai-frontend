import React from 'react';
import {createRoot} from 'react-dom/client';
import {ReadingWorkspace,CommunicationBoard} from '../src/AccessibilityTools';
import {VisualControls} from '../src/VisualControls';
import '../src/styles.css';
window.requests=[];
const query={select(){return this},order(){return this},limit(){return Promise.resolve({data:[]})}};
const db={from:()=>query,functions:{invoke:async(name,{body})=>{window.requests.push(body);return {data:{text:'नमस्ते दुनिया'}}}}};
createRoot(document.getElementById('root')).render(<><p id="fixed" style={{fontSize:20,color:'rgb(20, 30, 40)'}}>Fixed pixel text <span id="nested">Nested text</span></p><a id="sample-link" href="#root">Example link</a><ReadingWorkspace db={db} notify={s=>{window.lastNotice=s}}/><CommunicationBoard db={db} notify={s=>{window.lastNotice=s}}/><VisualControls/></>);
