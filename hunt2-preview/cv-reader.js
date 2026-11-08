
/* HUNT CV reader: browser-side PDF text, OCR for image-only PDFs, DOCX and images.
   Only the OCR language models and JavaScript libraries are downloaded.
   File bytes stay inside the authenticated browser until the user saves extracted text. */
const scripts=new Map();
function loadScript(url,key){
 if(window[key])return Promise.resolve(window[key]);
 if(scripts.has(key))return scripts.get(key);
 const pending=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=url;script.async=true;script.crossOrigin="anonymous";
  script.onload=()=>window[key]?resolve(window[key]):reject(new Error("Libreria "+key+" non caricata."));
  script.onerror=()=>reject(new Error("Impossibile caricare la libreria "+key+". Controlla la connessione."));
  document.head.appendChild(script);
 });
 scripts.set(key,pending);
 return pending;
}
async function pdfjs(){
 const lib=await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js","pdfjsLib");
 lib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
 return lib;
}
async function createOcrWorker(language){
 const lib=await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js","Tesseract");
 return lib.createWorker(language,1,{});
}
function normalized(text){
 return String(text||"").replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
async function extractPdf(blob,language,onStatus){
 const lib=await pdfjs();
 const pdf=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),useSystemFonts:true}).promise;
 const total=pdf.numPages;
 const limit=Math.min(total,12);
 const blocks=[];let usedOcr=false,worker=null;
 try{
  for(let n=1;n<=limit;n++){
   onStatus("Analisi pagina "+n+" di "+total+"…");
   const page=await pdf.getPage(n);
   const content=await page.getTextContent();
   let text=(content.items||[]).map(x=>(x.str||"")+(x.hasEOL?"\n":" ")).join("");
   if(text.trim().length<70){
    if(!worker){onStatus("Avvio lettura visuale OCR nel browser…");worker=await createOcrWorker(language)}
    onStatus("Lettura visuale della pagina "+n+" di "+total+"…");
    const initial=page.getViewport({scale:1});
    const scale=Math.min(2.2,2400/Math.max(initial.width,initial.height));
    const viewport=page.getViewport({scale});
    const canvas=document.createElement("canvas");
    canvas.width=Math.ceil(viewport.width);
    canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("Questo browser non supporta la lettura visuale.");
    await page.render({canvasContext:ctx,viewport}).promise;
    try{
      const result=await worker.recognize(canvas);
      text=result.data?.text||"";
      usedOcr=true;
    }finally{canvas.width=0;canvas.height=0}
   }
   blocks.push(normalized(text));
   page.cleanup?.();
  }
 }finally{
  if(worker)await worker.terminate();
  await pdf.destroy();
 }
 return {text:normalized(blocks.join("\n\n")),pages:total,pages_processed:limit,method:usedOcr?"ocr":"pdf_text",partial:total>limit};
}
async function extractImage(blob,language,onStatus){
 onStatus("Lettura visuale dell'immagine…");
 const worker=await createOcrWorker(language);
 try{
  const result=await worker.recognize(blob);
  return {text:normalized(result.data?.text||""),pages:1,pages_processed:1,method:"ocr",partial:false};
 }finally{await worker.terminate()}
}
export async function extractCvText(blob,filename,language="eng+ita",onStatus=()=>{}){
 const ext=String(filename||"").split(".").pop().toLowerCase();
 if(ext==="pdf"||blob.type==="application/pdf")return extractPdf(blob,language,onStatus);
 if(ext==="docx"){
  onStatus("Lettura del documento Word…");
  const mammoth=await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.10.0/mammoth.browser.min.js","mammoth");
  const result=await mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()});
  return {text:normalized(result.value),pages:null,pages_processed:null,method:"docx_text",partial:false};
 }
 if(ext==="doc")throw new Error("Il vecchio formato .doc va convertito in .docx o PDF prima della lettura. Il file originale resta salvato.");
 if(["png","jpg","jpeg"].includes(ext)||blob.type.startsWith("image/"))return extractImage(blob,language,onStatus);
 if(ext==="txt"||blob.type==="text/plain")return {text:normalized(await blob.text()),pages:null,pages_processed:null,method:"text",partial:false};
 throw new Error("Formato non supportato. Usa PDF, DOCX, TXT, PNG o JPG.");
}
