import {useState,useEffect} from "react";
import "../extension/languages.js";
export const languages=globalThis.AccessHubLanguages;
export const languageInfo=code=>languages.find(x=>x.code===code||x.locale===code)||languages[0];

export function useLanguage(){
 const [language,setLanguage]=useState(()=>languageInfo(localStorage.getItem('ah-language')||'en-IN').locale);
 useEffect(()=>{const change=()=>setLanguage(languageInfo(localStorage.getItem('ah-language')).locale);window.addEventListener('ah-language',change);return()=>window.removeEventListener('ah-language',change)},[]);
 return [language,value=>{const locale=languageInfo(value).locale;setLanguage(locale);localStorage.setItem('ah-language',locale);window.dispatchEvent(new Event('ah-language'))}];
}
