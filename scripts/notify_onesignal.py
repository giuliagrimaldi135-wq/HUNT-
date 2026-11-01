import json, os, requests
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
alerts=json.loads((ROOT/"data/new_alerts.json").read_text()) if (ROOT/"data/new_alerts.json").exists() else []
sent_path=ROOT/"data/push_notified.json"
sent=set(json.loads(sent_path.read_text())) if sent_path.exists() else set()
app_id=os.getenv("ONESIGNAL_APP_ID")
api_key=os.getenv("ONESIGNAL_REST_API_KEY")

if not app_id or not api_key:
    print("OneSignal push skipped: secret not configured")
    raise SystemExit(0)

for a in alerts:
    key=a.get("key")
    if not key or key in sent:
        continue
    title=f"🔥 HUNT · {a.get('brand','Nuova opportunità')}"
    published=a.get("published_at")
    pub_text=(published[:10] if published else "data da verificare")
    body=f"{a.get('title','Nuova posizione')} · {a.get('location','Italia')} · {a.get('score','?')}% match · pubblicata {pub_text}"
    payload={
        "app_id":app_id,
        "target_channel":"push",
        "included_segments":["Subscribed Users"],
        "headings":{"it":title,"en":title},
        "contents":{"it":body,"en":body},
        "url":a.get("url") or "https://giuliagrimaldi135-wq.github.io/HUNT-/",
        "data":{"hunt_job_key":key,"brand":a.get("brand"),"score":a.get("score")}
    }
    r=requests.post("https://api.onesignal.com/notifications",
        headers={"Authorization":f"Key {api_key}","Content-Type":"application/json"},
        json=payload,timeout=20)
    if r.ok and r.json().get("id"):
        sent.add(key)
        print("HUNT push sent:",title)
    else:
        print("OneSignal push failed",r.status_code,r.text[:300])

sent_path.write_text(json.dumps(sorted(sent),indent=2))
