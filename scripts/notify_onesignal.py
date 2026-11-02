import json, os, requests, csv, gzip, io, time
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    p=ROOT/"data"/name
    return json.loads(p.read_text()) if p.exists() else []

jobs=load("new_alerts.json")
intel=load("new_intelligence_alerts.json")
spont=load("new_spontaneous_alerts.json")
fashion=load("new_fashion_alerts.json")
market=load("new_market_alerts.json")
chatgpt=load("chatgpt_alerts.json")
test_cfg_path=ROOT/"config"/"push_test.json"
test_cfg=json.loads(test_cfg_path.read_text()) if test_cfg_path.exists() else {}
sent_path=ROOT/"data/push_notified.json"
sent=set(json.loads(sent_path.read_text())) if sent_path.exists() else set()
app_id=os.getenv("ONESIGNAL_APP_ID")
api_key=os.getenv("ONESIGNAL_REST_API_KEY")

if not app_id or not api_key:
    print("OneSignal push skipped: secret not configured")
    raise SystemExit(0)

def active_subscription_ids():
    headers={"Authorization":f"Key {api_key}","Content-Type":"application/json"}
    try:
        r=requests.post(
            f"https://api.onesignal.com/players/csv_export?app_id={app_id}",
            headers=headers,
            json={"extra_fields":["notification_types","unsubscribed_at"]},
            timeout=20
        )
        r.raise_for_status()
        url=r.json().get("csv_file_url")
        if not url:return []
        raw=None
        for _ in range(10):
            rr=requests.get(url,timeout=20)
            if rr.status_code==200:
                raw=rr.content;break
            time.sleep(1)
        if raw is None:return []
        rows=list(csv.DictReader(io.StringIO(gzip.decompress(raw).decode("utf-8-sig"))))
        push_types={"5","7","8","12","17"}
        ids=[]
        for row in rows:
            if str(row.get("device_type","")) not in push_types:continue
            invalid=str(row.get("invalid_identifier","")).strip().lower()
            if invalid not in ("","f","false","0","none"):continue
            if row.get("id"):ids.append(row["id"])
        return ids
    except Exception as e:
        print("OneSignal subscription lookup failed:",str(e)[:180])
        return []

SUBSCRIPTION_IDS=active_subscription_ids()
print("OneSignal active push subscriptions:",len(SUBSCRIPTION_IDS))

def send(prefix,key,title,body,url,data=None):
    token=prefix+":"+str(key)
    if not key or token in sent:return
    if not SUBSCRIPTION_IDS:return
    payload={"app_id":app_id,"target_channel":"push","include_subscription_ids":SUBSCRIPTION_IDS,"headings":{"it":title,"en":title},"contents":{"it":body,"en":body},"url":url or "https://giuliagrimaldi135-wq.github.io/HUNT-/","data":{"hunt_type":prefix,**(data or {})}}
    r=requests.post("https://api.onesignal.com/notifications",headers={"Authorization":f"Key {api_key}","Content-Type":"application/json"},json=payload,timeout=20)
    if r.ok and r.json().get("id"):
        sent.add(token);print("HUNT push sent:",title)
    else:print("OneSignal push failed",r.status_code,r.text[:300])

if test_cfg.get("enabled"):
    test_id=str(test_cfg.get("id") or "manual-test")
    send("test",test_id,"✅ HUNT · Notifiche attive","Test riuscito: HUNT può inviarti notifiche anche quando l’app è chiusa.","https://giuliagrimaldi135-wq.github.io/HUNT-/",{"test":True})

# ChatGPT HUNT feed: push only recent, unsent alerts so the app mirrors the chat radar without spamming old backlog.
def _age_hours(v):
    if not v:return 9999
    try:
        dt=datetime.fromisoformat(v.replace("Z","+00:00"))
        if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc)-dt.astimezone(timezone.utc)).total_seconds()/3600
    except:return 9999

recent_chat=sorted(
    [a for a in chatgpt if _age_hours(a.get("detected_at") or a.get("first_seen_at"))<=3 and (a.get("score") or 0)>=75],
    key=lambda a:a.get("detected_at") or a.get("first_seen_at") or "",
    reverse=True
)[:6]
for a in recent_chat:
    pub=(a.get("published_at") or "")[:10] or "data da verificare"
    send("chatjob",a.get("key"),f"🔥 HUNT · {a.get('brand','Nuova opportunità')}",f"{a.get('title','Nuova posizione')} · {a.get('location','')} · {a.get('score','?')}% match · pubblicata {pub}",a.get("url"),{"brand":a.get("brand"),"score":a.get("score"),"source":"ChatGPT HUNT"})

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
