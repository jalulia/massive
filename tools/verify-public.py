"""Verify portable paths and public media references without contacting a browser."""
from pathlib import Path
import json,re
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'data/catalogue.json').read_text())
plan=json.loads((ROOT/'.publish/upload-plan.json').read_text())
urls={x['url']:x for x in plan['assets']}
assert len({a['id'] for a in catalog['assets']})==len(catalog['assets'])
assert not re.search(r'/Users/|/private/|127\.0\.0\.1|localhost|X-Catalog-Token', (ROOT/'data/catalogue.json').read_text())
count=0
for a in catalog['assets']:
 assert a['stage']!='PULSAR'
 for p in [a['poster'],a['preview']]:
  assert (ROOT/p).is_file() and not p.startswith('/')
 for k,f in a['formats'].items():
  assert k in ['portrait','square','landscape'] and set(f['variants'])=={'clean','text'}
  for v in f['variants'].values():
   assert v['url'] in urls and urls[v['url']]['sha256']==v['sha256']
   assert (ROOT/v['preview']).is_file()
   count+=1
 assert a['originalFootage']['url'] in urls
 for s in a['provenance'].get('sources',[]):assert s['url'] in urls
assert catalog['batch']['url'] in urls
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ['src','href'] and v and not v.startswith(('#','https:')):
    assert not v.startswith('/'),v
    target=ROOT/v
    assert target.is_file() or (target/'index.html').is_file(),v
Links().feed((ROOT/'index.html').read_text())
assert '/api/' not in (ROOT/'assets/app.js').read_text()
assert max(x['bytes'] for x in plan['assets'])<2*1024**3
size=sum(p.stat().st_size for p in (ROOT/'media').rglob('*') if p.is_file())
assert size<1024**3
print(f"{len(catalog['assets'])} public clips / {count} MP4 editions / {sum(a.get('isLoop',False) for a in catalog['assets'])} loops")
print(f"Public previews: {size/1048576:.1f} MB. Relative paths and all release references verified.")
