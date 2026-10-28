/* Keep old presentation and catalogue bookmarks useful. */
if (/^#\d+$/.test(location.hash)) location.replace('momi.html'+location.hash);
if (/^#capture\//.test(location.hash)) location.replace('archive/'+location.hash);
const search=document.querySelector('#search'), kind=document.querySelector('#kind');
const files=document.querySelector('#files'), clear=document.querySelector('#clear');
const rows=[...document.querySelectorAll('.file-row')], cards=[...document.querySelectorAll('.card')];
function filter(){
  const words=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=el=>words.every(word=>el.dataset.search.includes(word));
  let fileCount=0,cardCount=0;
  for(const el of rows){el.hidden=!(matches(el)&&(!kind.value||el.dataset.kind===kind.value));if(!el.hidden)fileCount++;}
  for(const el of cards){el.hidden=!matches(el);if(!el.hidden)cardCount++;}
  for(const section of document.querySelectorAll('.collection'))section.hidden=![...section.querySelectorAll('.card')].some(el=>!el.hidden);
  const archive=document.querySelector('.archive-versions');
  if(words.length&&archive.querySelector('.card:not([hidden])'))archive.open=true;
  clear.hidden=!search.value;
  document.querySelector('#empty').hidden=fileCount>0;
  const status=document.querySelector('#status');status.hidden=!words.length&&!kind.value;
  status.textContent=`${cardCount} ${cardCount===1?"entry":"entries"} · ${fileCount} files`;
  if(words.length||kind.value)files.open=true;
  const url=new URL(location.href);
  if(search.value)url.searchParams.set('q',search.value);else url.searchParams.delete('q');
  if(kind.value)url.searchParams.set('type',kind.value);else url.searchParams.delete('type');
  history.replaceState(null,'',url);
}
search.addEventListener('input',filter);kind.addEventListener('change',filter);
clear.addEventListener('click',()=>{search.value='';kind.value='';filter();search.focus();});
function openFiles(){if(location.hash==='#files')files.open=true;}
addEventListener('hashchange',openFiles);
document.querySelector('a[href="#files"]').addEventListener('click',()=>files.open=true);
const params=new URLSearchParams(location.search);search.value=params.get('q')||'';
if([...kind.options].some(o=>o.value===params.get('type')))kind.value=params.get('type');
filter();openFiles();
