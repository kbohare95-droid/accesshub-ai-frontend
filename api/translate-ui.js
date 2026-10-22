const allowed=new Set(["en","hi","bn","mr","ta","te","gu","kn","ml","pa","ur","or","as","ne","sa","es","fr","de","ar","pt","ja","ko","zh"]);
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"})}
 const {language,strings}=req.body||{};
 const lang=String(language||"").split("-")[0];
 if(!allowed.has(lang)||!Array.isArray(strings)||strings.length>90||strings.some(s=>typeof s!=="string"||s.length>450))return res.status(400).json({error:"Invalid translation request"});
 if(lang==="en")return res.status(200).json({translations:strings});
 const key=process.env.GEMINI_API_KEY;
 if(!key)return res.status(503).json({error:"Translation service not configured. Set GEMINI_API_KEY in Vercel."});
 try{
  const prompt="Translate each of these user-interface strings into "+lang+". Return a JSON array of strings in exactly the same order and length. Preserve product names AccessHub AI, keyboard shortcuts, URLs, placeholders, numbers, and code. Do not add commentary. Strings: "+JSON.stringify(strings);
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}})});
  if(!response.ok)return res.status(502).json({error:"Translation provider failed"});
  const body=await response.json();
  const raw=body.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("");
  const translations=JSON.parse(raw);
  if(!Array.isArray(translations)||translations.length!==strings.length||translations.some(t=>typeof t!=="string"))throw Error("Invalid translation response");
  res.setHeader("Cache-Control","private, max-age=3600");
  return res.status(200).json({translations});
 }catch{return res.status(502).json({error:"Could not translate interface"})}
}
