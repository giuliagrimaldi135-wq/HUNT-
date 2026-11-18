// A country may be copied from an official schema.org JobPosting only when
// it is explicitly present in the jobLocation PostalAddress. City-only data
// and multi-country positions must not be converted to a guessed country.
const ISO_NAMES=new Map([
 ["italy","IT"],["italia","IT"],["france","FR"],["germany","DE"],["deutschland","DE"],
 ["spain","ES"],["españa","ES"],["portugal","PT"],["united kingdom","GB"],["great britain","GB"],["uk","GB"],
 ["united states","US"],["united states of america","US"],["usa","US"],["canada","CA"],
 ["switzerland","CH"],["austria","AT"],["netherlands","NL"],["belgium","BE"],["ireland","IE"],
 ["poland","PL"],["denmark","DK"],["sweden","SE"],["norway","NO"],["finland","FI"],
 ["greece","GR"],["turkey","TR"],["türkiye","TR"],["japan","JP"],["china","CN"],
 ["hong kong","HK"],["taiwan","TW"],["south korea","KR"],["republic of korea","KR"],
 ["singapore","SG"],["malaysia","MY"],["indonesia","ID"],["vietnam","VN"],
 ["philippines","PH"],["thailand","TH"],["india","IN"],["australia","AU"],["new zealand","NZ"],
 ["united arab emirates","AE"],["saudi arabia","SA"],["mexico","MX"],["brazil","BR"],
 ["argentina","AR"],["south africa","ZA"]
]);
export function explicitOfficialCountry(value){
 const source=typeof value==="object"&&value!==null?value.name:value;
 if(typeof source!=="string")return null;
 const text=source.trim();
 const code=text.toUpperCase();
 if(/^[A-Z]{2}$/.test(code)&&!["EU","UN","ZZ","XX","WW"].includes(code))return code==="UK"?"GB":code;
 return ISO_NAMES.get(text.toLocaleLowerCase("en-US"))||null;
}
export function jobPostingCountryCode(job){
 const raw=job?.jobLocation;
 if(!raw)return null;
 const places=Array.isArray(raw)?raw:[raw];
 if(!places.length)return null;
 const codes=places.map(place=>explicitOfficialCountry(place?.address?.addressCountry??place?.addressCountry));
 return codes[0]&&codes.every(v=>v===codes[0])?codes[0]:null;
}
