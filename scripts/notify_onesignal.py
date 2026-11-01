import json, os, requests
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    p=ROOT/"data"/name
    return json.loads(p.read_text()) if p.exists() else []

jobs=load("new_alerts.json")
intel=load("new_intelligence_alerts.json")
spont=load("new_spontaneous_alerts.json")
fashion=load("new_fashion_alerts.json")
market=load("new_market_alerts.json")
test_cfg_path=ROOT/"config"/"push_test.json"
test_cfg=json.loads(test_cfg_path.read_text()) if test_cfg_path.exists() else {}
sent_path=ROOT/"data/push_notified.json"
sent=set(json.loads(sent_path.read_text())) if sent_path.exists() else set()
app_id=os.getenv("ONESIGNAL_APP_ID")
api_key=os.getenv("ONESIGNAL_REST_API_KEY")

if not app_id or not api_key:
    print("OneSignal push skipped: secret not configured")
    raise SystemExit(0)

def send(prefix,key,title,body,url,data=None):
    token=prefix+":"+str(key)
    if not key or token in sent:return
    payload={"app_id":app_id,"target_channel":"push","included_segments":["Subscribed Users"],"headings":{"it":title,"en":title},"contents":{"it":body,"en":body},"url":url or "https://giuliagrimaldi135-wq.github.io/HUNT-/","data":{"hunt_type":prefix,**(data or {})}}
    r=requests.post("https://api.onesignal.com/notifications",headers={"Authorization":f"Bearer {api_key}","Content-Type":"application/json"},json=payload,timeout=20)
    if r.ok and r.json().get("id"):
        sent.add(token);print("HUNT push sent:",title)
    else:print("OneSignal push failed",r.status_code,r.text[:300])

if test_cfg.get("enabled"):
    test_id=str(test_cfg.get("id") or "manual-test")
    send("test",test_id,"✅ HUNT · Notifiche attive","Test riuscito: HUNT può inviarti notifiche anche quando l’app è chiusa.","https://giuliagrimaldi135-wq.github.io/HUNT-/",{"test":True})

for a in jobs:
    published=a.get("published_at");pub=published[:10] if published else "data da verificare"
    send("job",a.get("key"),f"🔥 HUNT · {a.get('brand','Nuova opportunità')}",f"{a.get('title','Nuova posizione')} · {a.get('location','')} · {a.get('score','?')}% match · pubblicata {pub}",a.get("url"),{"brand":a.get("brand"),"score":a.get("score")})
for s in intel[:6]:
    send("intel",s.get("key"),f"👀 HUNT Hidden · {s.get('brand','Brand')}",s.get("headline","Nuovo segnale")[:160],s.get("url"),{"brand":s.get("brand"),"signal_type":s.get("signal_type")})
for x in spont[:5]:
    send("spont",x.get("key"),f"🎯 HUNT · {x.get('brand')}",f"{x.get('action','Candidatura spontanea')} consigliata · score {x.get('score')} · "+", ".join((x.get("reasons") or [])[:2]),x.get("url"),{"brand":x.get("brand"),"score":x.get("score")})
for n in fashion[:6]:
    send("fashion",n.get("key"),"📰 HUNT Fashion Now",n.get("headline","Novità moda")[:180],n.get("url"),{"topic":n.get("topic")})
for m in market[:4]:
    send("market",m.get("key"),"📈 HUNT Market Pulse",m.get("headline","Movimento di mercato")[:180],m.get("url"),{"topic":m.get("topic")})

sent_path.write_text(json.dumps(sorted(sent),indent=2))
