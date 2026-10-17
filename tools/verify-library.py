"""Check inventory coverage and portable links after rebuilding the library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import json, subprocess
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/library.json').read_text())
actual=set(subprocess.check_output(['git','-C',str(ROOT),'ls-files','--cached','--others','--exclude-standard'],text=True).splitlines())
listed={f['path'] for f in data['files'] if f['location']=='Repository'}
assert listed==actual, f'Inventory mismatch: missing {actual-listed}, stale {listed-actual}'
assert len({f['url'] for f in data['files']})==len(data['files']), 'Duplicate file URLs'
releases=json.loads((ROOT/'data/library-releases.json').read_text())
assert {f['url'] for f in data['files'] if f['location']=='Release'}=={r['url'] for r in releases}
masters=json.loads((ROOT/'video-assets/manifest.json').read_text())
assert {f['url'] for f in data['files'] if f['location']=='Drive master'}=={m['master_url'] for m in masters if m.get('master_url')}
class Links(HTMLParser):
    def __init__(self,path):
        super().__init__();self.path=path;self.base=path.parent;self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='base':
            self.base=(self.path.parent/attrs['href']).resolve()
            return
        for attr in ('href','src','poster'):
            if attrs.get(attr):self.links.append(attrs[attr])
    def verify(self):
        for link in self.links:
            url=urlparse(link)
            if url.scheme or url.netloc:continue
            target=(self.base/unquote(url.path)) if url.path else self.path
            if target.is_dir():target=target/'index.html'
            assert target.is_file(),f'{self.path.relative_to(ROOT)}: broken link {link}'
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:continue
    parser=Links(path);parser.feed(path.read_text());parser.verify()
for section in data['sections']:
    for card in section[2]:assert (ROOT/card['image']).is_file(),card['image']
for f in data['files']:
    if f.get('image'):assert (ROOT/f['image']).is_file(),f['image']
print(f'PASS: {len(actual)} repository files, {len(releases)} release assets, {sum(bool(m.get("master_url")) for m in masters)} masters; all HTML links and inventory previews resolve.')
