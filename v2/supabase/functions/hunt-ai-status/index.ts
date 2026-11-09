const origin="https://giuliagrimaldi135-wq.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
Deno.serve(req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405,headers:cors});
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==origin)return Response.json({error:"Forbidden origin"},{status:403,headers:cors});
 // Returns availability only; never return or log the private credential.
 const enabled=Boolean(Deno.env.get("OPENAI_API_KEY"));
 return Response.json({enabled,capabilities:{cover_letter_generation:enabled,cover_letter_refinement:enabled,cv_interpretation:enabled}}, {headers:cors});
});