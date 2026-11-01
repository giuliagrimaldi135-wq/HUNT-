import os,json,requests
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];alerts=json.loads((ROOT/"data/new_alerts.json").read_text());notified=json.loads((ROOT/"data/notified.json").read_text());known=set(notified);token=os.getenv("GITHUB_TOKEN");repo=os.getenv("GITHUB_REPOSITORY");owner=os.getenv("GITHUB_REPOSITORY_OWNER")
if not token or not repo:raise SystemExit(0)
for a in alerts:
 if a["key"] in known:continue
 title=f"🔥 HUNT {a['score']}% — {a['brand']} · {a['title']}"[:240];body=f"""## New high-priority opportunity

**{a['brand']} — {a['title']}**
- Match: **{a['score']}/100**
- Location: {a.get('location','n/a')}
- First seen: {a.get('first_seen_at','n/a')}
- Why: {' · '.join(a.get('reasons',[]))}
- Recommended CV: {a.get('recommended_cv','merch_buying')}

[Open source]({a.get('url','#')})

_Automatically detected by HUNT from a public career source._
"""
 r=requests.post(f"https://api.github.com/repos/{repo}/issues",headers={"Authorization":f"Bearer {token}","Accept":"application/vnd.github+json"},json={"title":title,"body":body,"assignees":[owner]},timeout=20)
 if r.ok:known.add(a["key"]);print("Alert issue created:",title)
 else:print("Issue notification failed",r.status_code,r.text[:120])
(ROOT/"data/notified.json").write_text(json.dumps(sorted(known),indent=2))