import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {collect,cleanState,labels} from './logic.mjs';
const root=new URL('.',import.meta.url),source=fs.readFileSync(new URL('game.js',root),'utf8').replace("import {collect,cleanState,labels} from './logic.mjs';",'const {collect,cleanState,labels}=logic;').replace(/^import .* from '.\/ar-runtime\.mjs[^']*';$/m,'const {createNFTTracker,configureARScene}=runtime;');
function fixture(saved=null,failFetch=false){
 const ids=new Map(),windows={},timers=new Map(),requests=[],scenes=[],storage=new Map(),session=new Map();let seq=0,reloads=0;
 if(saved)storage.set('sacre-coeur-posters-v2',JSON.stringify(saved));
 class Element{
  constructor(tag='div'){this.tag=tag;this.events={};this.attrs={};this.hidden=true;this.textContent='';this.firstChild={textContent:''};this.children=[];this.classList={toggle(){},add(){}}}
  setAttribute(k,v){this.attrs[k]=v}addEventListener(k,fn){this.events[k]=fn}querySelector(){return this.marker??=new Element('a-nft')}showModal(){this.open=true}close(){this.open=false}
 }
 const $=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)};
 $('inventory').children=[new Element(),new Element(),new Element()];
 const doc={getElementById:$,head:{append(s){queueMicrotask(()=>s.onload())}},body:{classList:{add(){}},append(s){scenes.push(s);s.events.loaded?.()}},createElement:t=>new Element(t),querySelectorAll:()=>[],addEventListener(){}};
 const win={addEventListener:(k,f)=>windows[k]=f};const location={href:'https://example.github.io/tesoro/',reload:()=>reloads++};
 const context={logic:{collect,cleanState,labels},runtime:{createNFTTracker(){},configureARScene(){return {dispose(){},pause(){},resume(){}}}},document:doc,window:win,location,navigator:{mediaDevices:{getUserMedia(){}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq},clearTimeout:id=>timers.delete(id),setInterval(){},URL,Date,console,confirm:()=>true,fetch:async path=>{requests.push(path);return {ok:!failFetch,arrayBuffer:async()=>new ArrayBuffer(0)}}};
 vm.runInNewContext(source,context,{filename:'game.js'});
 return {$,requests,scenes,windows,storage,session,start:()=>$('start').onclick(),get reloads(){return reloads},fire(){const item=[...timers].find(([,v])=>v.ms===400);assert.ok(item,'temporizador de confirmación');timers.delete(item[0]);item[1].fn()},dwellCount:()=>[...timers.values()].filter(t=>t.ms===400).length};
}
let a=fixture();await a.start();assert.equal(a.scenes.length,1);let scene=a.scenes[0];assert.match(scene.innerHTML,/<a-nft /);assert.equal((scene.innerHTML.match(/<a-nft /g)||[]).length,1);assert.ok(!scene.innerHTML.includes('<a-marker'));assert.match(scene.innerHTML,/https:\/\/example.github.io\/tesoro\/assets\/targets\/ludus/);assert.equal(a.requests.length,3);
scene.marker.events.markerFound();scene.marker.events.markerLost();assert.equal(a.dwellCount(),0);assert.equal(a.$('progress').textContent,'0 / 3 fragmentos');
scene.marker.events.markerFound();a.fire();assert.equal(a.$('progress').textContent,'1 / 3 fragmentos');assert.equal(a.$('next').hidden,false);scene.marker.events.markerFound();assert.equal(a.dwellCount(),0);assert.equal(a.$('progress').textContent,'1 / 3 fragmentos');assert.match(a.$('status').textContent,/Cámara en pausa/);a.$('next').onclick();assert.equal(a.reloads,1);assert.equal(a.session.get('sacre-autostart'),'1');
const first=JSON.parse(a.storage.get('sacre-coeur-posters-v2'));
a=fixture(first);await a.start();assert.match(a.scenes[0].innerHTML,/targets\/pastoral/);a.scenes[0].marker.events.markerFound();a.fire();assert.equal(a.$('progress').textContent,'2 / 3 fragmentos');const second=JSON.parse(a.storage.get('sacre-coeur-posters-v2'));
a=fixture(second);await a.start();assert.match(a.scenes[0].innerHTML,/targets\/bienestar/);a.scenes[0].marker.events.markerFound();a.fire();assert.equal(a.$('progress').textContent,'3 / 3 fragmentos');assert.equal(a.$('win').open,true);assert.ok(JSON.parse(a.storage.get('sacre-coeur-posters-v2')).finished>0);a.$('continue').onclick();assert.equal(a.$('win').open,false);a.$('reset').onclick();assert.equal(a.reloads,1);assert.deepEqual(JSON.parse(a.storage.get('sacre-coeur-posters-v2')).found,[]);
a=fixture(null,true);await a.start();assert.equal(a.scenes.length,0);assert.equal(a.$('retry').hidden,false);assert.match(a.$('clue-text').textContent,/Falta un archivo/);
assert.equal(collect([],1).kind,'locked');assert.equal(collect([0],0).kind,'repeat');assert.equal(collect([0,1],2).kind,'complete');assert.deepEqual(cleanState({found:[2],started:1,finished:0}).found,[]);assert.deepEqual(cleanState({found:[0],started:1,finished:NaN}).found,[]);
for(const id of ['ludus','pastoral','bienestar'])for(const ext of ['iset','fset','fset3','jpg','png'])assert.ok(fs.statSync(new URL(`assets/targets/${id}.${ext}`,root)).size>100);
for(const file of ['index.html','preparar.html']){const html=fs.readFileSync(new URL(file,root),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const path=match[1];if(path==='./'||/^https?:/.test(path))continue;assert.ok(fs.existsSync(new URL(path,root)),`${file}: ${path}`)}}
console.log('PASS: tres etapas NFT, rutas GitHub Pages, pérdida/hallazgo, duplicados, reanudación, reinicio, final y error de recursos.');
