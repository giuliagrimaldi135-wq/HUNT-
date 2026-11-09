// HUNT CV evidence interpreter (client-side, no API). Drafts are never confirmed automatically.
// Preserve the language of the source CV and only extract text that appears in that document.
const norm=s=>String(s??"").replace(/\s+/g," ").trim();
const rows=text=>String(text??"").split(/\r?\n/).map(norm).filter(Boolean);
const stripBullet=s=>norm(s.replace(/^[+*•«▪–-]\s*/,""));
const levelPart=s=>{
 const m=s.match(/^\s*\((avanzat[oa]|advanced|intermedi[oa]|intermediate|base|basic|elementary|expert)\)/i);
 return m?m[1]:null;
};
const tools=[
 ["Excel",/\b(?:ms |microsoft )?excel\b/i],
 ["PowerPoint",/\b(?:ms |microsoft )?power\s*point\b/i],
 ["Word",/\b(?:ms |microsoft )?word\b/i],
 ["Adobe Photoshop",/\b(?:adobe\s+)?photoshop\b/i],
 ["Canva",/\bcanva\b/i],
 ["Power BI",/\bpower\s*bi\b/i],
 ["Tableau",/\btableau\b/i],
 ["SAP",/\bSAP\b/],
 ["InDesign",/\bindesign\b/i],
 ["Illustrator",/\billustrator\b/i]
];
const headings={
 experience:/^(esperienza lavorativa|esperienze professionali|esperienza professionale|work experience|professional experience|employment history)$/i,
 education:/^(formazione|istruzione|education|educational background)$/i,
 skills:/^(competenze|skills|software|technical skills|competenze informatiche)$/i,
 languages:/^(lingue|languages)$/i,
 end:/^(certificazioni|certifications|interessi|interests|privacy|references)$/i
};
const isHeader=(s)=>Object.values(headings).some(re=>re.test(s));
const findHeader=(lines,re)=>lines.findIndex(v=>re.test(v));
const nextHeader=(lines,i)=>{for(let j=i+1;j<lines.length;j++)if(isHeader(lines[j]))return j;return lines.length;};
const isRoleLine=s=>/\b(?:\d{2}\/\d{4}|\d{4}\s*[-–]\s*(?:\d{4}|present|oggi)|(?:intern|internship|stagista|assistente|segretaria|camerier[ao]|analyst|assistant|specialist|manager|trainee|buyer|merchandiser))\b/i.test(s)&&(/\d{2}\/\d{4}/.test(s)||/stagista|intern|assistente|segretaria|camerier|analyst|manager|trainee|assistant/i.test(s));
function getExperiences(lines){
 const i=findHeader(lines,headings.experience);
 if(i<0)return [];
 const end=nextHeader(lines,i),section=lines.slice(i+1,end),out=[];
 let record=null;
 for(let j=0;j<section.length;j++){
  const line=section[j],next=section[j+1]||"";
  if(!isRoleLine(line)&&isRoleLine(next)&&line.length<140){
   if(record)out.push(record);
   record={company:line,role:norm(next.replace(/\s*\d{2}\/\d{4}\s*[-–]\s*\d{2}\/\d{4}.*/,"")),evidence:[]};
   j++;continue;
  }
  if(record&&/^[+*•«▪–-]\s*\S/.test(line)&&!isHeader(line)){
   const item=stripBullet(line);if(item.length>=18)record.evidence.push(item);
  }else if(record&&record.evidence.length&&line.length>30&&
    !/\b\d{2}\/\d{4}\b/.test(line)&&!isHeader(line)){
   // Line wrap of the preceding source bullet; never create a new assertion.
   const prev=record.evidence.length-1;record.evidence[prev]+=" "+line;
  }
 }
 if(record)out.push(record);
 return out.filter(x=>x.evidence.length).slice(0,12);
}
function getProjects(lines){
 const i=lines.findIndex(x=>/^\s*[+*•«▪–-]?\s*(progetti accademici|academic projects|projects)\s*:?$/i.test(x));
 if(i<0)return [];
 const out=[];let current=null;
 for(let j=i+1;j<lines.length;j++){
  const s=lines[j];
  if(/^(principali aree di studio|main subjects|liceo|competenze|skills|lingue|languages|certificazioni|software)\b/i.test(s)||isHeader(s))break;
  const body=stripBullet(s);
  const m=body.match(/^([^:]{2,85}?)\s*:\s*(.{14,})$/);
  if(m&&/\s[-–]\s/.test(m[1])){
   if(current)out.push(current);
   current={name:norm(m[1]),evidence:[norm(m[2])]};
  }else if(current&&s.length>15&&out.length<12){
   current.evidence[current.evidence.length-1]+=" "+body;
  }
 }
 if(current)out.push(current);
 return out.slice(0,10);
}
function getEducation(lines){
 const i=findHeader(lines,headings.education);
 if(i<0)return [];
 const section=lines.slice(i+1,nextHeader(lines,i)),out=[];
 for(let j=0;j<section.length-1;j++){
  const school=section[j],program=section[j+1];
  if(/(?:marangoni|universit|university|college|istituto|academy|liceo|school)/i.test(school)&&
    /\b(?:diploma|degree|fashion management|bachelor|laurea|master|msc|high school)/i.test(program)&&!/^\s*[+*•«▪–-]/.test(program)){
   out.push({school,program:norm(program.replace(/\s*\d{2}\/\d{4}\s*[-–]\s*\d{2}\/\d{4}.*/,""))});
   j++;
  }
 }
 return out.slice(0,5);
}
function getTools(lines){
 const annotated=[];
 // Read only clearly labelled digital-skills rows, not mentions in job descriptions.
 for(const line of lines){
  if(!/^(software|technical skills|digital skills|competenze informatiche|strumenti|tools)\s*:/i.test(line))continue;
  const body=line.split(":").slice(1).join(":");
  for(const [name,re] of tools){
   const m=re.exec(body);if(!m||annotated.some(x=>x.name===name))continue;
   const level=levelPart(body.slice(m.index+m[0].length));
   annotated.push({name,level,source_quote:line});
  }
 }
 return annotated;
}
function getLanguages(lines){
 const i=findHeader(lines,headings.languages);
 if(i<0)return [];
 const section=lines.slice(i+1,Math.min(lines.length,i+4)).join(" ");
 const result=[];
 for(const [name,re] of [["Italiano",/\bitaliano\b/i],["Inglese",/\binglese\b/i],["French",/\b(?:francese|french)\b/i],["English",/\benglish\b/i]]){
  const m=re.exec(section);if(!m)continue;
  const after=section.slice(m.index+m[0].length, m.index+m[0].length+23);
  const lvl=after.match(/\b(C[12]|B[12]|A[12]|avanzat[oa]|advanced|intermedi[oa]|intermediate|madrelingua|native)\b/i);
  result.push(name+(lvl?" ("+lvl[0]+")":""));
 }
 return [...new Set(result)];
}
export function interpretCvText(text){
 const lines=rows(text);
 const italian=lines.filter(x=>/\b(?:profilo professionale|esperienza lavorativa|formazione|competenze|lingue|diploma|stagista|progetti accademici)\b/i.test(x)).length;
 const english=lines.filter(x=>/\b(?:professional summary|work experience|education|skills|languages|internship|bachelor)\b/i.test(x)).length;
 const toolEvidence=getTools(lines);
 return {
  source_language:italian>=english?"it":"en",
  tools:toolEvidence.map(t=>t.name+(t.level?" ("+t.level+")":"")),
  tool_evidence:toolEvidence,
  languages:getLanguages(lines),
  experience:getExperiences(lines),
  education:getEducation(lines),
  projects:getProjects(lines),
  extracted_chars:String(text||"").length,
  interpretation_version:"source_evidence_v1"
 };
}
