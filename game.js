import {collect,cleanState,labels} from './logic.mjs';
import {createNFTTracker,configureARScene} from './ar-runtime.mjs?v=20261027-visual1';
const $=id=>document.getElementById(id),key='sacre-coeur-posters-v2';let state;try{state=cleanState(JSON.parse(localStorage.getItem(key)))}catch{state=cleanState(null)}let audio,sound=true,active=false,scanned=false;
const targets=[{id:'ludus',name:'Cursos de docencia · LUDUS',width:600,height:850},{id:'pastoral',name:'Pastoral Universitaria',width:540,height:800},{id:'bienestar',name:'Bienestar Estudiantil',width:540,height:800}];
const stage=Math.min(state.found.length,2);
let arRuntime;
let treasureRevealed=state.found.length===3;
const discoveries=[
 {image:'compass',name:'Brújula del conocimiento',text:'La curiosidad te muestra el camino. La brújula ya forma parte de tu inventario.'},
 {image:'key',name:'Llave del ingenio',text:'Cada pregunta abre una puerta. La llave ya forma parte de tu inventario.'},
 {image:'crystal',name:'Cristal de la colaboración',text:'La última pieza está contigo. Reuniste las tres claves: ahora puedes abrir el tesoro.'}
];

function showDiscovery(index){const item=discoveries[index];$('discovery-image').src=`assets/items/${item.image}.svg`;$('discovery-image').alt=item.name;$('discovery-name').textContent=item.name;$('discovery-text').textContent=item.text;$('discovery').hidden=false;$('scan-help').hidden=true;document.body.classList.add('has-discovery');}
function openTreasure(){if(state.found.length!==3)return;treasureRevealed=true;render();$('status').textContent='Tesoro abierto · Enfoca Bienestar para ver el cofre';$('result').textContent=`3 fragmentos encontrados · Tiempo: ${time()}`;arRuntime?.pause();$('win').showModal();chime(true)}

function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
function time(){const secs=Math.max(0,Math.floor(((state.finished||Date.now())-state.started)/1000));return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`}
function render(){ $('progress').textContent=`${state.found.length} / 3 fragmentos`;[...$('inventory').children].forEach((li,i)=>li.classList.toggle('found',state.found.includes(i)));if(state.started)$('timer').textContent=time();const n=state.found.length;$('chapter').textContent=n===3?(treasureRevealed?'EL TESORO ESTÁ ABIERTO':'LAS TRES CLAVES ESTÁN REUNIDAS'):`ETAPA ${n+1} DE 3`;$('clue-title').textContent=['Encuentra la brújula','La brújula despertó','La llave es tuya',treasureRevealed?'El corazón del conocimiento':'El cristal es tuyo'][n];$('clue-text').textContent=['Empieza en el piso 1 del edificio Sacré Coeur, pasando Admisiones. Busca el póster violeta de cursos de docencia junto al letrero Centro LUDUS y enfócalo completo.','Sigue en el piso 1, pasando Admisiones. Busca la cartelera y el póster verde de Pastoral Universitaria, con una fotografía grupal, para descubrir la llave.','En esa misma cartelera del piso 1, busca el póster de Bienestar Estudiantil con encabezado azul. Enfócalo para reunir el último fragmento.',treasureRevealed?'Enfoca de nuevo el póster de Bienestar para ver el cofre en AR. También puedes volver a abrir la imagen del tesoro.':'La brújula, la llave y el cristal están contigo. Pulsa Abrir el tesoro para revelar el final de la historia.'][n];$('open-treasure').hidden=n!==3;$('open-treasure').textContent=treasureRevealed?'Volver a abrir el tesoro':'Abrir el tesoro';document.querySelectorAll('.treasure').forEach(e=>e.setAttribute('visible',n===3&&treasureRevealed));document.querySelectorAll('.crystal').forEach(e=>e.setAttribute('visible',!treasureRevealed));}
function chime(final=false){if(!sound||!audio)return;audio.resume();[523,659,final?1047:784].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=f;const t=audio.currentTime+i*.14;g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.36)});navigator.vibrate?.(final?[100,50,150]:70)}
function found(index){if(scanned)return;const r=collect(state.found,index);if(r.kind==='locked'){ $('status').textContent=`Este símbolo espera. Encuentra primero: ${labels[state.found.length]}`;return}if(r.kind==='repeat')return;scanned=true;state.found=r.found;if(r.kind==='complete')state.finished=Date.now();save();render();showDiscovery(index);chime();$('status').textContent=`${labels[index]} encontrada · Mírala sobre el póster`;if(index===2)$('status').textContent='Cristal encontrado · Ya puedes abrir el tesoro';if(r.kind==='new'){$('next').hidden=false;$('next').textContent=index===0?'Continuar con Pastoral →':'Continuar con Bienestar →';}}
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)})}
const spin='animation="property: rotation; to: 0 360 0; dur: 6000; loop: true; easing: linear"';
const sway='animation="property: rotation; from: 0 0 -12; to: 0 0 12; dur: 2000; dir: alternate; loop: true; easing: easeInOutSine"';
const models=[`<a-entity position="0 .5 0" ${sway}><a-torus color="#e8c880" radius=".45" radius-tubular=".035"></a-torus><a-cone color="#e8c880" radius-bottom=".16" radius-top="0" height=".4" position="0 .2 0"></a-cone><a-cone color="#6edcca" radius-bottom=".16" radius-top="0" height=".4" position="0 -.2 0" rotation="180 0 0"></a-cone></a-entity>`,`<a-entity position="0 .5 0" ${sway}><a-torus color="#e8c880" radius=".2" radius-tubular=".07" position="0 .3 0"></a-torus><a-box color="#e8c880" width=".1" height=".65" depth=".1" position="0 -.15 0"></a-box><a-box color="#e8c880" width=".3" height=".1" depth=".1" position=".1 -.4 0"></a-box></a-entity>`,`<a-entity class="crystal" position="0 .6 0" ${spin}><a-octahedron color="#69e3d0" radius=".4" material="metalness: .4; roughness: .2"></a-octahedron></a-entity><a-entity class="treasure" visible="false"><a-box color="#805631" position="0 .25 0" width="1" height=".5" depth=".7"></a-box><a-box color="#e8c880" width="1.08" height=".15" depth=".75" position="0 .65 -.18" rotation="-35 0 0"></a-box><a-octahedron color="#e8c880" radius=".3" position="0 1 0" ${spin}></a-octahedron><a-torus color="#e8c880" radius=".65" radius-tubular=".015"></a-torus></a-entity>`];
async function start(){
 if(active)return;active=true;document.body.classList.add('playing');$('hud').hidden=false;$('start').disabled=true;
 try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}
 if(!state.started){state.started=Date.now();save()}render();
 if(state.found.length===3){scanned=true;showDiscovery(2)}
 $('target-name').textContent=targets[stage].name;$('target-preview').src=`assets/targets/${targets[stage].id}.jpg`;
 $('status').textContent='Cargando reconocimiento del póster…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Necesitas un navegador compatible y una conexión HTTPS.');
  // Comprobar que los tres archivos binarios del objetivo existen antes de pedir cámara.
  await Promise.all(['iset','fset','fset3'].map(async ext=>{const r=await fetch(`assets/targets/${targets[stage].id}.${ext}`);if(!r.ok)throw Error('Falta un archivo de reconocimiento. Vuelve a subir la carpeta assets completa.');await r.arrayBuffer()}));
  await script('assets/aframe.min.js');
  window.SacreAR={createNFTTracker};
  await script('assets/aframe-ar-nft.js?v=20261027-visual1');
  const scene=document.createElement('a-scene');scene.setAttribute('embedded','');scene.setAttribute('vr-mode-ui','enabled: false');scene.setAttribute('renderer','alpha: true; antialias: false; logarithmicDepthBuffer: false; maxCanvasWidth: 1280; maxCanvasHeight: 1280');
  scene.setAttribute('arjs','sourceType: webcam; sourceWidth: 640; sourceHeight: 480; canvasWidth: 320; canvasHeight: 240; maxDetectionRate: 12; cameraParametersUrl: assets/camera_para.dat; debugUIEnabled: false; trackingMethod: best;');
  arRuntime=configureARScene(scene);
  // NFT usa milímetros. AR.js orienta el plano del marcador sobre X / -Z.
  const t=targets[stage],x=t.width/72*25.4/2,y=t.height/72*25.4/2;
  scene.innerHTML=`<a-nft type="nft" url="${new URL('assets/targets/'+t.id,location.href).href}" emitevents="true" smooth="true" smooth-count="5" smooth-tolerance="0.01" smooth-threshold="2"><a-entity class="item-model" position="${x} 0 ${-y}" rotation="-90 0 0" scale="65 65 65">${models[stage]}</a-entity></a-nft><a-entity camera></a-entity>`;
  const marker=scene.querySelector('a-nft');let dwell;
  marker.addEventListener('markerFound',()=>{if(scanned){$('status').textContent=treasureRevealed?'Tesoro abierto · Cofre sobre el póster':`${labels[stage]} en AR · Fragmento guardado`;return}clearTimeout(dwell);$('status').textContent='Póster localizado · Mantén la cámara quieta';dwell=setTimeout(()=>found(stage),400)});
  marker.addEventListener('markerLost',()=>{clearTimeout(dwell);$('status').textContent=scanned?'Fragmento guardado · Vuelve a enfocar para verlo en AR':'Enfoca el póster completo, sin reflejos'});
  scene.addEventListener('loaded',render);document.body.append(scene);
  setTimeout(()=>{if(!nftReady)error('El reconocimiento está tardando. Revisa la conexión o vuelve a intentar.')},45000);
 }catch(e){arRuntime?.dispose();error(e.message||'No se pudieron cargar los recursos AR. Revisa tu conexión.')}
}
let nftReady=false;
window.addEventListener('arjs-nft-loaded',()=>{nftReady=true;$('status').textContent=`Listo · Enfoca ${targets[stage].name}`;$('retry').hidden=true});

function error(message){arRuntime?.dispose();$('status').textContent='No se pudo iniciar el reconocimiento AR';$('clue-title').textContent='Vamos a intentarlo de nuevo';$('clue-text').textContent=message;$('retry').hidden=false}
window.addEventListener('arjs-nft-error',()=>error('Se interrumpió el reconocimiento. Vuelve a intentar.'));
window.addEventListener('camera-error',()=>error('Permite el acceso a la cámara en los ajustes del navegador. Cierra otras apps que la estén usando y vuelve a intentar.'));window.addEventListener('arjs-video-loaded',()=>{$('status').textContent=nftReady?'Cámara lista · Enfoca el póster':'Cámara lista · Preparando reconocimiento…'});
$('start').onclick=start;$('retry').onclick=()=>location.reload();$('exit').onclick=()=>location.reload();$('continue').onclick=()=>{$('win').close();if(!active)start()};$('win').addEventListener('close',()=>{if(active)arRuntime?.resume()});$('open-treasure').onclick=openTreasure;$('saved-treasure').onclick=openTreasure;$('saved-treasure').hidden=state.found.length!==3;$('sound').onclick=()=>{audio?.resume().catch(()=>{});sound=!sound;$('sound').textContent=`Sonido: ${sound?'sí':'no'}`;$('sound').setAttribute('aria-pressed',sound)};$('reset').onclick=()=>{if(confirm('¿Borrar los fragmentos encontrados y comenzar de nuevo?')){state={found:[],started:0,finished:0};save();sessionStorage.removeItem('sacre-autostart');location.reload()}};setInterval(()=>{if(active&&state.started)$('timer').textContent=time()},1000);if(state.found.length){$('start').firstChild.textContent='Continuar expedición ';$('resume').textContent=`Tienes ${state.found.length} de 3 fragmentos guardados.`}

$('next').onclick=()=>{arRuntime?.dispose();sessionStorage.setItem('sacre-autostart','1');location.reload()};
document.addEventListener('pointerdown',()=>audio?.resume().catch(()=>{}));
if(sessionStorage.getItem('sacre-autostart')){sessionStorage.removeItem('sacre-autostart');start()}
