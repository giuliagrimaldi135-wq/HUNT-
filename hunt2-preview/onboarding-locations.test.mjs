import test from "node:test";
import assert from "node:assert/strict";
import {addChosenCity,findCitySuggestions,LOCATION_SUGGESTIONS} from "./onboarding-locations.mjs";
test("city suggestions appear before typing and can be searched",()=>{
 assert.ok(LOCATION_SUGGESTIONS.length>100);
 assert.ok(findCitySuggestions("",18).length>0);
 assert.ok(findCitySuggestions("Milano").includes("Milano"));
 assert.ok(findCitySuggestions("zurigo").includes("Zurigo"));
});
test("any city can be added; duplicate city spelling is not added twice",()=>{
 assert.deepEqual(addChosenCity([],"Tallinn"),["Tallinn"]);
 assert.deepEqual(addChosenCity(["Milano"]," milano "),["Milano"]);
 assert.deepEqual(addChosenCity(["Torino"],"<img src=x>"),["Torino"]);
 assert.deepEqual(addChosenCity(["Lugano"],"Lugano"),["Lugano"]);
 assert.deepEqual(addChosenCity(["Roma"],"Miami"),["Roma","Miami"]);
});
