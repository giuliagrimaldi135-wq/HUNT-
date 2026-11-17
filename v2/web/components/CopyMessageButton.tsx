"use client";

import {useState} from "react";

export function CopyMessageButton({text}:{text:string}){
 const [copied,setCopied]=useState(false);
 return <button className="btn primary" type="button" onClick={async()=>{
  try{
   await navigator.clipboard.writeText(text);
   setCopied(true);
  }catch{setCopied(false);}
 }}>{copied?"Copiato":"Copia il messaggio"}</button>;
}
