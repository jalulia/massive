"""Check the public full-spectrum feature and its intentionally limited source bundle."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1]
base=root/'media/explorations/full-spectrum-v2'
m=json.loads((base/'manifest.json').read_text())
assert m['study']=='full-spectrum-v2'
for item in m['assets'].values():
 if 'path' in item:
  p=root/item['path'];assert p.is_file(),p
  assert p.stat().st_size==item['bytes'],p
  assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],p
 else:
  assert item['url'].startswith('https://github.com/jalulia/massive/releases/download/catalogue-media/')
class Links(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.times=[];self.video=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if 'data-spectrum-time' in a:self.times.append(int(a['data-spectrum-time']))
  if a.get('id')=='spectrum-player':self.video=all(k in a for k in ['controls','playsinline','poster']) and 'autoplay' not in a
  for k in ['src','href','poster']:
   v=a.get(k,'')
   if v and not v.startswith(('#','https:')):
    target=root/v.split('?')[0]
    assert target.is_file() or (target/'index.html').is_file(),v
p=Links();p.feed((root/'index.html').read_text())
assert len(p.ids)==len(set(p.ids));assert 'latest' in p.ids and 'source-review-2026-10-05' in p.ids
assert p.times==[0,12,23,30,39,46,57,67] and p.video
for f in [root/'index.html',root/'assets/spectrum.js',base/'review.txt',base/'manifest.json']:
 assert not re.search(r'/Users/|/private/|C:\\Users\\|file_000|libfile_|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|BEGIN .*PRIVATE KEY',f.read_text()),f
allowed={'README.txt','timeline.json','study/FullSpectrumStudy.cs','study/SpectrumMix.shader','study/encode-spectrum.swift','input/input-contract.js','input/test-input.cjs'}
with zipfile.ZipFile(root/m['assets']['review']['path']) as z:
 assert set(z.namelist())==allowed;assert z.testzip() is None
 for n in z.namelist():
  text=z.read(n).decode();assert not re.search(r'/Users/|/private/|C:\\Users\\|file_000|libfile_|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|BEGIN .*PRIVATE KEY',text),n
 assert json.loads(z.read('timeline.json'))['duration']==80
print('PASS: hashed media, all local links, eight chapters, accessible video controls, unique anchors, public-source allowlist and privacy scan.')
