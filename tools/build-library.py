"""Rebuild the static library and exhaustive file index. Python standard library only.
Run with --refresh-releases to refresh the GitHub release inventory first.
"""
from pathlib import Path
from collections import Counter
from html import escape as esc
from urllib.parse import quote, urlparse
import json, re, subprocess, sys, urllib.request

ROOT = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()

def refresh_releases():
    releases, page = [], 1
    while True:
        url = f'https://api.github.com/repos/jalulia/massive/releases?per_page=100&page={page}'
        with urllib.request.urlopen(url, timeout=30) as response:
            batch = json.load(response)
        releases.extend(batch)
        if len(batch) < 100: break
        page += 1
    data = []
    for release in releases:
        # The release response can truncate assets; use the paginated assets endpoint.
        page, assets = 1, []
        while True:
            with urllib.request.urlopen(release['assets_url'] + f'?per_page=100&page={page}', timeout=30) as response:
                batch = json.load(response)
            assets.extend(batch)
            if len(batch) < 100: break
            page += 1
        for a in assets:
            data.append(dict(path=a['name'], url=a['browser_download_url'], size=a['size'],
                             date=a['updated_at'][:10], version=release['tag_name']))
    (ROOT/'data/library-releases.json').write_text(json.dumps(data, indent=2)+'\n')

if '--refresh-releases' in sys.argv: refresh_releases()
releases = json.loads((ROOT/'data/library-releases.json').read_text())
GDD = 'https://mattfryed.notion.site/MASSIVE-11e617c6d8ae4eeda7f0424645db5203'
GH = 'https://github.com/jalulia/massive'
meta_cache = {}
def metadata(path):
    if path == 'momi.html' and (ROOT/path).read_text().strip() == git('show','0b93497:index.html'):
        return git('log','-1','--format=%cs|%h','0b93497','--','index.html').split('|')
    if path not in meta_cache:
        result = git('log','-1','--format=%cs|%h','--',path)
        meta_cache[path] = result.split('|') if result else ['', '']
    return meta_cache[path]

def card(title, url, image, detail, source, links=(), version=None):
    date, rev = metadata(source) if source else ('', '')
    return dict(title=title,url=url,image=image,detail=detail,date=date,
                version=version or (rev and 'rev '+rev),links=links)

sections = [
('presentations', 'Presentations', [
card('MOMI presentation','momi.html#1','presentation-assets/C18_COSMOS_GAMEPLAY_HUD.png','26 slides · HTML', 'momi.html', [('Speaker notes','Speaker-notes.md'),('Deck notes','explorations/momi-notes.html')]),
card('Visual directions','presentation-directions/','presentation-directions/Directions-overview.jpg','3 directions · 27 screens','presentation-directions/index.html'),
card('Field Study','presentation-directions/#1-1','assets/library-previews/field-study.png','Direction 01 · 9 screens','presentation-directions/MASSIVE-01-Field-Study.pptx',[('PPTX','presentation-directions/MASSIVE-01-Field-Study.pptx'),('PDF','presentation-directions/MASSIVE-01-Field-Study.pdf')]),
card('Cosmic Atlas','presentation-directions/#2-1','assets/library-previews/cosmic-atlas.png','Direction 02 · 9 screens','presentation-directions/MASSIVE-02-Cosmic-Atlas.pptx',[('PPTX','presentation-directions/MASSIVE-02-Cosmic-Atlas.pptx')]),
card('Big / Small','presentation-directions/#3-1','assets/library-previews/big-small.png','Direction 03 · 9 screens','presentation-directions/MASSIVE-03-Big-Small.pptx',[('PPTX','presentation-directions/MASSIVE-03-Big-Small.pptx'),('PDF','presentation-directions/MASSIVE-03-Big-Small.pdf')]),
card('MOMI presentation notes','explorations/momi-notes.html','presentation-assets/C12_PLANE_DIAGRAM.png','Slide notes · HTML','explorations/momi-notes.html'),
]),
('libraries', 'Libraries & sets', [
card('MOMI video library','video-assets/','video-assets/posters/S10_RESONANCE_REFERENCE_MODEL_SIDE_BY_SIDE.jpg','28 MP4s · 3 GIFs · 4 stills','video-assets/index.html',[('Drive masters','https://drive.google.com/drive/folders/1by-HCurNXxV2FKz6TZM3ak8g1Qdbi2m2'),('Source notes','video-assets/Source-notes.txt')]),
card('Presentation assets','?q=presentation-assets/#files','presentation-assets/C05_ORBITAL.png','Footage, stills & fonts','presentation-assets/manifest.json',[('Manifest','presentation-assets/manifest.json')]),
card('Visual catalogue','archive/','media/MS-022/poster-1888ac075f1517e8.jpg','22 captures · 132 MP4 editions','data/catalogue.json',[('Manifest','data/catalogue.json'),('All release downloads','?q=catalogue-media#files')]),
card('Powers of Ten','reference-motion/','reference-motion/stills/P02_EARTH.jpg','8 excerpts · full-frame & square','reference-motion/index.html',[('Source notes','reference-motion/Source-notes.md')]),
card('Flatland / Sagan','reference-motion/sagan/','reference-motion/sagan/stills/01_ABSOLUTELY_FLAT.jpg','5 gestures · silent, sound & GIF','reference-motion/sagan/index.html',[('ZIP','reference-motion/sagan/Gesture-cuts.zip'),('Edit notes','reference-motion/sagan/Edit-notes.md')]),
card('Attract cabinet','screensavers/','screensavers/posters/level-nova.jpg','18 recordings · 20 generative presets','screensavers/index.html',[('Windows & browser packages','?q=screensavers-v#files'),('Sources','screensavers/sources.json')],version='v4'),
]),
('studies', 'Studies & sources', [
card('Full Spectrum','explorations/full-spectrum.html','media/explorations/full-spectrum-v2/poster-21226a146853.jpg','80-second study · 8 worlds','media/explorations/full-spectrum-v2/manifest.json',[('Visual board','media/explorations/full-spectrum-v2/visual-board-5251186ea02f.jpg'),('Study files','?q=full-spectrum-v2/#files')],version='Study 02 / v2'),
card('Explorations','explorations/','media/explorations/full-spectrum-v2/visual-board-5251186ea02f.jpg','6 studies · HTML','explorations/index.html'),
card('Game design document',GDD,'assets/library-previews/gdd.png','Matt Fry · Notion',None,version='GDD'),
card('Unity source','https://github.com/mattfryed/massive','presentation-assets/C01_PLAY.png','Unity repository · mattfryed/massive',None,version='GitHub'),
])]

tracked = set(git('ls-files','--cached','--others','--exclude-standard').splitlines())
# These generated outputs are part of the inventory, including on the first build.
tracked.update(['index.html','data/library.json'])
images = sorted(p for p in tracked if Path(p).suffix.lower() in ('.jpg','.png'))
catalogue = json.loads((ROOT/'data/catalogue.json').read_text())
clip_titles = {a['id']:a['title'] for a in catalogue['assets']}
clip_posters = {a['id']:a['poster'] for a in catalogue['assets']}

def kind(path):
    ext = Path(path).suffix.lower()
    for label, extensions in [('Pages',['.html']),('Presentations',['.pptx','.pdf']),('Videos',['.mp4','.gif']),('Images',['.png','.jpg','.svg']),('Downloads',['.zip']),('Fonts',['.ttf','.woff2']),('Notes',['.md','.txt'])]:
        if ext in extensions: return label
    return 'Source'

def preview(path):
    if path in images: return path
    if path.endswith('.svg'): return path
    if path == 'momi.html': return 'presentation-assets/C18_COSMOS_GAMEPLAY_HUD.png'
    match = re.search(r'MS-\d{3}',path)
    if match and match[0] in clip_posters: return clip_posters[match[0]]
    stem = Path(path).stem.replace('_clean','').replace('_silent','').replace('_sound','')
    for p in images:
        if Path(p).stem == stem: return p
    for c in [c for _,_,cards in sections for c in cards]:
        if path == c['url'].split('#')[0]: return c['image']
    return ''

def human(path):
    match = re.search(r'MS-\d{3}',path)
    if match and match[0] in clip_titles: return clip_titles[match[0]]
    return Path(path).stem.replace('_',' ').replace('-',' ')

files=[]
for p in sorted(tracked):
    date, rev = metadata(p)
    hidden = p.startswith('.')
    files.append(dict(path=p,url=GH+'/blob/main/'+quote(p) if hidden else quote(p),
                      kind=kind(p),location='Repository',date=date,version=rev,
                      image=preview(p),title=human(p)))
for a in releases:
    files.append(dict(a,kind=kind(a['path']),location='Release',image=preview(a['path']),title=human(a['path'])))
for a in json.loads((ROOT/'video-assets/manifest.json').read_text()):
    if a.get('master_url'):
        files.append(dict(path=a['file'],url=a['master_url'],kind=kind(a['file']),location='Drive master',
                         date='2026-10-16',version='MOMI master',image=preview('video-assets/media/'+a['file']),title=human(a['file'])))

snapshot = git('rev-parse','HEAD')
manifest = dict(schemaVersion=1,sourceCommit=snapshot,sections=sections,files=files)
(ROOT/'data/library.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')

def date_label(date):
    if not date: return ''
    y,m,d=date.split('-'); return f'{int(d):02} '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(m)-1]+' '+y

def card_html(c):
    links=''.join(f'<a href="{esc(u)}">{esc(t)} ↗</a>' for t,u in c['links'])
    meta=' · '.join(x for x in [date_label(c['date']),c['version']] if x)
    search=' '.join(str(c[k]) for k in ['title','url','detail','version'])
    return f'''<article class="card" data-search="{esc(search.lower())}"><a class="card-main" href="{esc(c['url'])}"><div class="frame"><img src="{esc(c['image'])}" alt="" loading="lazy" width="640" height="360"></div><h3>{esc(c['title'])}<span aria-hidden="true">↗</span></h3></a><p class="detail">{esc(c['detail'])}</p><p class="meta">{esc(meta)}</p><div class="links">{links}</div></article>'''

def row_html(f):
    img=f'<img src="{esc(f["image"])}" alt="" loading="lazy" width="80" height="45">' if f['image'] else f'<span class="file-icon">{esc(Path(f["path"]).suffix[1:].upper() or "↗")}</span>'
    meta=' · '.join(x for x in [f['location'],date_label(f['date']),f['version']] if x)
    search=' '.join(str(f[k]) for k in ['path','title','kind','location','version'])
    return f'<li class="file-row" data-kind="{f["kind"]}" data-search="{esc(search.lower())}"><a href="{esc(f["url"])}">{img}<span class="file-info"><span class="filename">{esc(f["path"])}</span><span class="meta">{esc(meta)}</span></span><span class="file-type">{f["kind"]} ↗</span></a></li>'

cards_html=''.join(f'<section class="collection" id="{sid}"><h2><span>0{i}</span>{title}<span class="section-count">{len(cards):02}</span></h2><div class="grid">'+''.join(card_html(c) for c in cards)+'</div></section>' for i,(sid,title,cards) in enumerate(sections,1))
counts=Counter(f['location'] for f in files)
options=''.join(f'<option value="{x}">{x}</option>' for x in ['Pages','Presentations','Videos','Images','Downloads','Fonts','Notes','Source'])
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080808"><title>MASSIVE / Library</title><meta name="description" content="MASSIVE library: presentations, films, asset sets, studies and the game design document."><link rel="icon" href="assets/favicon.svg"><link rel="stylesheet" href="assets/library.css"><script src="assets/library.js" defer></script></head>
<body><a class="skip" href="#content">Skip to library</a><main id="content"><header><div><h1>MASSIVE <span class="library-title">/ Library</span></h1></div><div class="header-meta"><p>{sum(len(c) for _,_,c in sections)} entries</p><p>{counts['Repository']} repository files<br>{counts['Release']} release downloads · {counts['Drive master']} Drive masters</p><a href="{GH}">Repository ↗</a></div></header>
<div class="tools"><nav aria-label="Library sections"><a href="#presentations">Presentations</a><a href="#libraries">Libraries & sets</a><a href="#studies">Studies & sources</a><a href="#files">All files</a></nav><div class="search"><label class="sr" for="search">Search library</label><input id="search" type="search" placeholder="Search library…" autocomplete="off"><button id="clear" type="button" aria-label="Clear search" hidden>×</button></div></div><p id="status" class="status" role="status" aria-live="polite" hidden></p>
{cards_html}
<details id="files"><summary><span>04</span>All files<span class="section-count">{len(files)}</span></summary><div class="file-tools"><p>Repository files, release downloads and Drive masters.</p><label for="kind">Show <select id="kind"><option value="">All types</option>{options}</select></label></div><ul class="file-list">{''.join(row_html(f) for f in files)}</ul><p id="empty" hidden>No matching files. Try another search or file type.</p></details>
<footer><span>Dates: repository revision / release update. External documents are live.</span><div><a href="data/library.json">Full inventory ↗</a><a href="data/library-releases.json">Release inventory ↗</a><a href="{GH}/tree/{snapshot}">Source snapshot ↗</a></div></footer></main></body></html>'''
(ROOT/'index.html').write_text(html)
print(f'Indexed {len(files)} entries: {dict(counts)}; {sum(len(c) for _,_,c in sections)} collection cards.')
