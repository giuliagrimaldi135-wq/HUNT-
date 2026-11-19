// User-facing infrastructure messages: do not mistake a provider 402 for
// invalid credentials or a missing onboarding profile.
export function serviceErrorMessage(error){
 const message=String(error?.message||error||"");
 const status=Number(error?.status||error?.statusCode||0);
 if(status===402||/exceed_egress_quota|service for this project is restricted/i.test(message))
  return "HUNT è temporaneamente non disponibile per un limite tecnico del servizio. Non devi registrarti di nuovo né ricaricare il curriculum: i dati del tuo account restano salvati. Le scansioni riprenderanno dopo il ripristino del servizio.";
 return message||"Non siamo riusciti a collegarci. Riprova più tardi.";
}
export function radarFreshness(latestVerification,nowMs=Date.now()){
 const ms=Date.parse(String(latestVerification||""));
 if(!Number.isFinite(ms)||ms>nowMs+86400000)
  return {stale:true,text:"Ultimo aggiornamento del radar non disponibile: non considerare aggiornato l'elenco."};
 const hours=Math.max(0,(nowMs-ms)/3600000);
 const display=new Date(ms).toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
 if(hours>=6)return {stale:true,text:"Ultima verifica del radar: "+display+". La raccolta potrebbe essere ferma; controlla sempre l'annuncio originale."};
 return {stale:false,text:"Ultima verifica del radar: "+display+"."};
}
