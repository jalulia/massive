#!/usr/bin/env python3
"""Prepare public files from the local capture library; no network writes."""
import argparse, hashlib, json, re, shutil, subprocess, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
REPO = 'jalulia/massive'

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def prepare(library, release, ffmpeg=None):
    library=Path(library).resolve()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*',release): raise ValueError('Invalid release tag')
    ffmpeg=ffmpeg or shutil.which('ffmpeg') or str(library/'tools/ffmpeg')
    assets=json.loads((library/'data/catalog.json').read_text())['assets']
    assets=[a for a in assets if a.get('role')=='clip' and a.get('sitePreview') and a.get('status') not in ['Archived','On hold']]
    if not assets: raise ValueError('No selected clips')
    staging=ROOT/'.publish';staging.mkdir(exist_ok=True)
    (ROOT/'data').mkdir(exist_ok=True)
    uploads={}; selected=[]; preview_files=[]
    def source(path):
        p=(library/path).resolve()
        if not p.is_relative_to(library) or not p.is_file(): raise ValueError(f'Invalid media path: {path}')
        return p
    def upload(p, name, expected=None):
        sha=digest(p)
        if expected and sha!=expected: raise ValueError(f'Changed media hash: {p.name}')
        for existing in uploads.values():
            if existing['sha256']==sha:return {k:existing[k] for k in ['url','bytes','sha256']}
        name=f'{name}-{sha[:16]}{p.suffix.lower()}'
        info={'url':f'https://github.com/{REPO}/releases/download/{release}/{name}','bytes':p.stat().st_size,'sha256':sha}
        uploads[name]={'name':name,'source':str(p),**info}
        return info
    for a in assets:
        if not re.fullmatch(r'[A-Z]+-\d+',a['id']): raise ValueError('Invalid asset ID')
        item={k:a[k] for k in ['id','title','stage','collection','description','shotLogic','duration','fps','silent','tags','sourceSummary'] if k in a}
        item['provenance']={k:v for k,v in a.get('provenance',{}).items() if k in ['repository','commit','scene','capture','control','players','goalEffect','acceptedEvent','edit','audio','loop','isolation','compatibility']}
        p=source(a['poster']); relative=f'media/{a["id"]}/poster-{digest(p)[:16]}{p.suffix}'
        dest=ROOT/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest);item['poster']=relative;preview_files.append(relative)
        item['formats']={}
        for key,f in a['formats'].items():
            if key not in ['portrait','square','landscape']: continue
            spec={k:f[k] for k in ['label','ratio','width','height','composition'] if k in f};spec['variants']={}
            for variant,v in f['variants'].items():
                if variant not in ['clean','text']:continue
                p=source(v['path']);info=upload(p,f'{a["id"]}-{key}-{variant}',v.get('sha256'))
                relative=f'media/{a["id"]}/{key}-{variant}-{info["sha256"][:16]}-preview.mp4'
                dest=ROOT/relative
                if not dest.exists():
                    scale={'portrait':'504:896','square':'640:640','landscape':'960:540'}[key]
                    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(p),'-vf',f'scale={scale}:flags=lanczos','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','25','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True)
                info['preview']=relative;spec['variants'][variant]=info;preview_files.append(relative)
            item['formats'][key]=spec
        item['preview']=item['formats']['portrait']['variants']['clean']['preview']
        raw=a['originalFootage'];p=source(raw['path']);item['originalFootage']={**upload(p,'source-'+p.stem,raw.get('sha256')),'label':raw.get('label','Full source take')}
        item['isLoop']='loop' in a.get('tags',[]) or 'wrap dissolve' in a.get('provenance',{}).get('loop','').lower()
        if a.get('provenance',{}).get('sources'):
            item['provenance']['sources']=[]
            for cut in a['provenance']['sources']:
                take=source(cut['source']);file=upload(take,'source-'+take.stem,cut.get('sha256'))
                item['provenance']['sources'].append({**file,**{k:cut[k] for k in ['startFrame','frames','note']}})
        selected.append(item);print('Prepared',a['id'],a['title'],flush=True)
    # Deterministic archive contains only approved clips and public provenance.
    batch=staging/'MASSIVE-portrait-batch.zip'
    with zipfile.ZipFile(batch,'w',compression=zipfile.ZIP_STORED,allowZip64=True) as z:
        for a in selected:
            for name,v in a['formats']['portrait']['variants'].items():
                file=next(Path(x['source']) for x in uploads.values() if x['url']==v['url'])
                zi=zipfile.ZipInfo(f'{a["id"]}-{name}.mp4');zi.external_attr=0o644<<16
                with file.open('rb') as f, z.open(zi,'w',force_zip64=True) as out: shutil.copyfileobj(f,out)
        z.writestr(zipfile.ZipInfo('clip-sources.json'),json.dumps(selected,ensure_ascii=False,indent=2)+'\n')
    batch_info=upload(batch,'MASSIVE-portrait-batch')
    catalogue={'schemaVersion':1,'title':'MASSIVE Visual catalogue','assets':selected,'batch':batch_info}
    (ROOT/'data/catalogue.json').write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+'\n')
    plan={'repository':REPO,'release':release,'assets':list(uploads.values()),'publicFiles':preview_files,'clips':len(selected)}
    (staging/'upload-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    # Remove obsolete PUBLIC previews only. Full-resolution histories remain in releases.
    keep=set(preview_files)
    for p in (ROOT/'media').rglob('*'):
        if p.is_file() and p.relative_to(ROOT).as_posix() not in keep:p.unlink()
    print(f'{len(selected)} clips, {len(uploads)} release assets, {sum(x["bytes"] for x in uploads.values())/1048576:.0f} MB to account for.',flush=True)
    return plan

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--library',required=True,type=Path);p.add_argument('--release',default='catalogue-media');p.add_argument('--ffmpeg');a=p.parse_args();prepare(a.library,a.release,a.ffmpeg)
