#!/usr/bin/env python3
"""Publish the local selection to GitHub Releases and GitHub Pages' main branch."""
import argparse, hashlib, json, mimetypes, os, ssl, subprocess, sys, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from prepare import ROOT, REPO, prepare, digest

def git(*args, capture=True):
    return subprocess.run(['git',*args],cwd=ROOT,check=True,text=True,capture_output=capture).stdout.strip() if capture else subprocess.run(['git',*args],cwd=ROOT,check=True).returncode

def credential():
    token=os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if token:return token
    result=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,check=True)
    fields=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    if not fields.get('password'):raise RuntimeError('Sign in to GitHub with your Git credential helper or set GH_TOKEN.')
    return fields['password']

class GitHub:
    def __init__(self):
        self.token=credential()
        # Some macOS Python distributions have no bundled CA path. Keep TLS verification on.
        self.context=ssl.create_default_context()
        if not ssl.get_default_verify_paths().cafile and Path('/etc/ssl/cert.pem').exists():self.context.load_verify_locations('/etc/ssl/cert.pem')
    def request(self,path,method='GET',data=None,file=None):
        url=path if path.startswith('https://') else 'https://api.github.com'+path
        if urllib.parse.urlsplit(url).hostname not in ['api.github.com','uploads.github.com']:raise ValueError('Unexpected authenticated API host')
        headers={'Authorization':'Bearer '+self.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'MASSIVE-catalogue-publisher'}
        body=None
        if file:
            headers['Content-Type']=mimetypes.guess_type(str(file))[0] or 'application/octet-stream';headers['Content-Length']=str(file.stat().st_size)
            body=file.open('rb')
        elif data is not None:body=json.dumps(data).encode();headers['Content-Type']='application/json'
        try:
            req=urllib.request.Request(url,method=method,headers=headers,data=body)
            with urllib.request.urlopen(req,context=self.context,timeout=900) as response:
                content=response.read();return json.loads(content) if content else None
        finally:
            if file and body:body.close()

    def release(self,tag):
        base=f'/repos/{REPO}/releases'
        try:return self.request(base+'/tags/'+urllib.parse.quote(tag,safe=''))
        except urllib.error.HTTPError as e:
            if e.code!=404:raise
        return self.request(base,'POST',{'tag_name':tag,'target_commitish':'main','name':'MASSIVE catalogue media','body':'Full-quality MP4 editions and original recordings for the MASSIVE visual catalogue. Asset filenames include content hashes; existing editions are preserved.','draft':False,'prerelease':False})
    def assets(self,release):
        items=[];page=1
        while True:
            batch=self.request(f'/repos/{REPO}/releases/{release["id"]}/assets?per_page=100&page={page}');items.extend(batch)
            if len(batch)<100:return {x['name']:x for x in items}
            page+=1

def verify_asset(remote,local):
    if remote.get('state')!='uploaded' or remote['size']!=local['bytes']:raise RuntimeError('Incomplete release asset: '+local['name'])
    if remote.get('digest') and remote['digest']!='sha256:'+local['sha256']:raise RuntimeError('Release digest mismatch: '+local['name'])
    if remote['browser_download_url']!=local['url']:raise RuntimeError('Unexpected public asset URL')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--library',type=Path);parser.add_argument('--release',default='catalogue-media');parser.add_argument('--ffmpeg');parser.add_argument('--prepared',action='store_true');parser.add_argument('--verify-only',action='store_true');a=parser.parse_args()
    if git('remote','get-url','origin').removesuffix('.git') not in ['https://github.com/'+REPO,'git@github.com:'+REPO]:raise RuntimeError('Wrong repository; expected '+REPO)
    if git('branch','--show-current')!='main':raise RuntimeError('Publish from main')
    if a.prepared or a.verify_only:plan=json.loads((ROOT/'.publish/upload-plan.json').read_text())
    else:
        if not a.library:parser.error('--library is required unless --prepared or --verify-only is used')
        plan=prepare(a.library,a.release,a.ffmpeg)
    if plan['repository']!=REPO:raise RuntimeError('Wrong upload plan repository')
    subprocess.run([sys.executable,str(ROOT/'tools/verify-public.py')],check=True)
    api=GitHub()
    # First publication needs a branch for the release tag; bootstrap with documentation only.
    head=subprocess.run(['git','rev-parse','--verify','HEAD'],cwd=ROOT,capture_output=True)
    if head.returncode:
        if a.verify_only:raise RuntimeError('No published commit')
        git('add','README.md','.gitignore');git('commit','-m','Initialize MASSIVE visual catalogue');git('push','-u','origin','main',capture=False)
    release=api.release(plan['release']);existing=api.assets(release)
    pending=[]
    for item in plan['assets']:
        remote=existing.get(item['name'])
        if remote and remote.get('state')=='starter' and not a.verify_only:
            api.request(f'/repos/{REPO}/releases/assets/{remote["id"]}','DELETE');remote=None
        if remote:verify_asset(remote,item)
        else:
            if a.verify_only:raise RuntimeError('Missing remote asset: '+item['name'])
            pending.append(item)
    complete=len(plan['assets'])-len(pending)
    print(f'{complete}/{len(plan["assets"])} existing assets verified; {len(pending)} to upload.',flush=True)
    def send(item):
        path=Path(item['source'])
        if digest(path)!=item['sha256']:raise RuntimeError('Local asset changed after preparation: '+item['name'])
        url=release['upload_url'].split('{')[0]+'?'+urllib.parse.urlencode({'name':item['name']})
        remote=api.request(url,'POST',file=path);verify_asset(remote,item)
        return item
    # Different content-addressed files are independent; never more than three in flight.
    with ThreadPoolExecutor(max_workers=3) as pool:
        tasks=[pool.submit(send,item) for item in pending]
        try:
            for result in as_completed(tasks):
                item=result.result();complete+=1
                print(f'{complete}/{len(plan["assets"])} uploaded and verified {item["name"]}',flush=True)
        except BaseException:
            for task in tasks:task.cancel()
            raise
    if a.verify_only:print('All release assets verified.');return
    subprocess.run(['node','--check',str(ROOT/'assets/app.js')],check=True)
    git('add','.nojekyll','index.html','assets','fonts','media','data','tools','README.md','.gitignore')
    changed=subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode
    if changed:git('commit','-m',f'Publish visual catalogue with {plan["clips"]} real game clips')
    git('push','origin','main',capture=False)
    print('Published commit '+git('rev-parse','HEAD'),flush=True)
    print('Pages source: main / (root). URL: https://jalulia.github.io/massive/',flush=True)

if __name__=='__main__':
    try:main()
    except urllib.error.HTTPError as e:raise SystemExit(f'GitHub API returned HTTP {e.code}; no credentials logged. Rerun after resolving the API error; completed uploads are reused.')
