"""Check inventory coverage and portable links, including sparse checkouts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote, urljoin
import argparse, json, subprocess

ROOT=Path(__file__).resolve().parents[1]
arguments=argparse.ArgumentParser(description=__doc__)
arguments.add_argument('--all-html',action='store_true',help='Also read omitted HTML sources from Git; partial clones may need network access.')
options=arguments.parse_args()

def git(*args):
    return subprocess.check_output(['git','-C',str(ROOT),*args],text=True)

tracked=set(git('ls-files','--cached','-z').split('\0'))-{''}
actual=set(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0'))-{''}

def exists(path):
    """A linked file may be omitted from disk by sparse checkout."""
    path=path.resolve()
    try: relative=path.relative_to(ROOT).as_posix()
    except ValueError: return False
    return path.is_file() or relative in tracked

def read_source(path):
    path=path.resolve()
    if path.is_file(): return path.read_text()
    relative=path.relative_to(ROOT).as_posix()
    assert relative in tracked, f'Missing source: {relative}'
    return git('show',f':{relative}')

data=json.loads(read_source(ROOT/'data/library.json'))
listed={f['path'] for f in data['files'] if f['location']=='Repository'}
assert listed==actual, f'Inventory mismatch: missing {actual-listed}, stale {listed-actual}'
assert len({f['url'] for f in data['files']})==len(data['files']), 'Duplicate file URLs'
releases=json.loads(read_source(ROOT/'data/library-releases.json'))
assert {f['url'] for f in data['files'] if f['location']=='Release'}=={r['url'] for r in releases}
masters=json.loads(read_source(ROOT/'video-assets/manifest.json'))
assert {f['url'] for f in data['files'] if f['location']=='Drive master'}=={m['master_url'] for m in masters if m.get('master_url')}

class Links(HTMLParser):
    def __init__(self,path):
        super().__init__()
        self.path=path
        self.base='/'+path.relative_to(ROOT).as_posix()
        self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='base' and attrs.get('href'):
            self.base=urljoin(self.base,attrs['href'])
            return
        for attr in ('href','src','poster'):
            if attrs.get(attr): self.links.append(attrs[attr])
    def verify(self):
        for link in self.links:
            url=urlparse(urljoin(self.base,link))
            if url.scheme or url.netloc: continue
            target=ROOT/unquote(url.path).lstrip('/')
            # A directory URL must resolve to an actual index file, even when
            # the directory itself is absent from the sparse checkout.
            candidates=[target/'index.html'] if url.path.endswith('/') else [target,target/'index.html']
            assert any(exists(p) for p in candidates),f'{self.path.relative_to(ROOT)}: broken link {link}'

html_paths=sorted(p for p in actual if p.endswith('.html'))
checked_html=[p for p in html_paths if options.all_html or (ROOT/p).is_file()]
local_html=0
for relative in checked_html:
    path=ROOT/relative
    local_html+=path.is_file()
    parser=Links(path)
    parser.feed(read_source(path))
    parser.verify()

sections={section[0]:section[2] for section in data['sections']}
presentations=sections.get('presentations',[])
assert len(presentations)==6, 'Expected all six archived presentation cards'
assert all(c.get('status')=='archived' and c.get('approval')=='not-approved' for c in presentations), 'Every presentation card must be archived and not approved'
stats=sections.get('stats',[])
assert len(stats)==3, 'Expected three Stats options'
def normalized_page(url):
    path=urlparse(url).path
    return path+'index.html' if path.endswith('/') else path
assert {normalized_page(c['url']) for c in stats}=={'Stats/index.html','Stats/v02.html','Stats/v03/index.html'}, 'Stats must link to V01, V02 and V03'

archived_paths={
    'momi.html','presentation-directions/index.html','explorations/momi-notes.html','Speaker-notes.md',
    'presentation-directions/MASSIVE-01-Field-Study.pdf',
    'presentation-directions/MASSIVE-01-Field-Study.pptx',
    'presentation-directions/MASSIVE-02-Cosmic-Atlas.pptx',
    'presentation-directions/MASSIVE-03-Big-Small.pdf',
    'presentation-directions/MASSIVE-03-Big-Small.pptx',
}
repository_files={f['path']:f for f in data['files'] if f['location']=='Repository'}
assert all(repository_files[p].get('status')=='archived' and repository_files[p].get('approval')=='not-approved' for p in archived_paths), 'Presentation files must retain archive status in All files'

for section in data['sections']:
    for card in section[2]:
        assert exists(ROOT/card['image']),card['image']
        parser=Links(ROOT/'index.html')
        parser.links=[card['url'],*(link[1] for link in card.get('links',[]))]
        parser.verify()
for f in data['files']:
    if f.get('image'): assert exists(ROOT/f['image']),f['image']
print(f'PASS: {len(actual)} repository files, {len(releases)} release assets, {sum(bool(m.get("master_url")) for m in masters)} masters; {len(checked_html)}/{len(html_paths)} HTML sources checked ({local_html} local, {len(checked_html)-local_html} from Git). Links and inventory previews resolve against disk or tracked files; six archived presentations and three Stats options verified.')
if len(checked_html)<len(html_paths):
    print(f'Coverage: {len(html_paths)-len(checked_html)} omitted HTML sources were not parsed. Use --all-html to read them from Git.')
