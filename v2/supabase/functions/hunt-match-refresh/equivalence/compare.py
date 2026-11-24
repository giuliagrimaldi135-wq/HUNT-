import json,sys
o={m:json.load(open(f))['steps'] for m,f in zip(['incremental','full','legacy'],sys.argv[1:4])}
bad=0
for i,st in enumerate(o['incremental']):
    f=o['full'][i]; l=o['legacy'][i] if o['legacy'] else None
    eqf=st['snapshot']==f['snapshot']; eql=(l is None) or st['snapshot']==l['snapshot']
    bad+= (not eqf) or (not eql) or st['status']!=200
    b=st['body']; pr=sorted(m['p'] for m in st['snapshot']['matches'])
    print(f"{st['name']:38} eqFull={eqf} eqLegacy={eql} n={len(pr)} prio={pr} {b.get('mode')}/{b.get('modeReason')} eval={b.get('jobsEvaluated')} desc={b.get('descriptionsRead')} prioOnly={b.get('priorityOnlyRefreshes')}")
sys.exit(1 if bad else 0)
