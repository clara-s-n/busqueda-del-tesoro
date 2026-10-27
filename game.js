import {collect,cleanState,labels} from './logic.mjs';
import {createNFTTracker,configureARScene} from './ar-runtime.mjs?v=20261026-android1';
const $=id=>document.getElementById(id),key='sacre-coeur-posters-v2';let state;try{state=cleanState(JSON.parse(localStorage.getItem(key)))}catch{state=cleanState(null)}let audio,sound=true,active=false,scanned=false;
const targets=[{id:'ludus',name:'Cursos de docencia · LUDUS',width:600,height:850},{id:'pastoral',name:'Pastoral Universitaria',width:540,height:800},{id:'bienestar',name:'Bienestar Estudiantil',width:540,height:800}];
const stage=Math.min(state.found.length,2);
let arRuntime;

function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
function time(){const secs=Math.max(0,Math.floor(((state.finished||Date.now())-state.started)/1000));return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`}
function render(){ $('progress').textContent=`${state.found.length} / 3 fragmentos`;[...$('inventory').children].forEach((li,i)=>li.classList.toggle('found',state.found.includes(i)));if(state.started)$('timer').textContent=time();const n=state.found.length;$('chapter').textContent=n===3?'EL TESORO ESTÁ ABIERTO':`ETAPA ${n+1} DE 3`;$('clue-title').textContent=['Encuentra la brújula','La brújula despertó','La llave es tuya','El corazón del conocimiento'][n];$('clue-text').textContent=['Busca el póster violeta de cursos de docencia de LUDUS, junto al letrero Centro LUDUS. Enfoca el póster completo.','Busca la cartelera y el póster verde de Pastoral Universitaria, con una fotografía grupal. Enfoca ese póster para descubrir la llave.','En la cartelera, busca el póster de Bienestar Estudiantil con encabezado azul. Enfócalo para reunir el último fragmento.','Reuniste las tres claves. Enfoca el póster de Bienestar Estudiantil para ver el tesoro en realidad aumentada.'][n];document.querySelectorAll('.treasure').forEach(e=>e.setAttribute('visible',n===3));document.querySelectorAll('.crystal').forEach(e=>e.setAttribute('visible',n!==3));}
function chime(final=false){if(!sound||!audio)return;audio.resume();[523,659,final?1047:784].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=f;const t=audio.currentTime+i*.14;g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.36)});navigator.vibrate?.(final?[100,50,150]:70)}
function found(index){if(scanned)return;const r=collect(state.found,index);$('status').textContent=`Póster detectado: ${targets[index].name}`;if(r.kind==='locked'){ $('status').textContent=`Este símbolo espera. Encuentra primero: ${labels[state.found.length]}`;return}if(r.kind==='repeat')return;scanned=true;state.found=r.found;if(r.kind==='complete')state.finished=Date.now();save();render();chime(r.kind==='complete');if(r.kind==='new'){arRuntime?.dispose();$('status').textContent='Fragmento guardado · Cámara en pausa';$('next').hidden=false;$('next').textContent=index===0?'Continuar con Pastoral →':'Continuar con Bienestar →';}if(r.kind==='complete'){arRuntime?.pause();$('result').textContent=`3 fragmentos encontrados · Tiempo: ${time()}`;$('win').showModal()}}
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)})}
const spin='animation="property: rotation; to: 0 360 0; dur: 6000; loop: true; easing: linear"';
const models=[`<a-entity ${spin}><a-torus color="#e8c880" radius=".45" radius-tubular=".035" rotation="90 0 0"></a-torus><a-cone color="#e8c880" radius-bottom=".16" radius-top="0" height=".5" position="0 .4 0"></a-cone><a-cone color="#6edcca" radius-bottom=".16" radius-top="0" height=".5" position="0 .1 0" rotation="180 0 0"></a-cone></a-entity>`,`<a-entity position="0 .5 0" ${spin}><a-torus color="#e8c880" radius=".2" radius-tubular=".07" position="0 .3 0"></a-torus><a-box color="#e8c880" width=".1" height=".65" depth=".1" position="0 -.15 0"></a-box><a-box color="#e8c880" width=".3" height=".1" depth=".1" position=".1 -.4 0"></a-box></a-entity>`,`<a-entity class="crystal" position="0 .6 0" ${spin}><a-octahedron color="#69e3d0" radius=".4" material="metalness: .4; roughness: .2"></a-octahedron></a-entity><a-entity class="treasure" visible="false"><a-box color="#805631" position="0 .25 0" width="1" height=".5" depth=".7"></a-box><a-box color="#e8c880" width="1.08" height=".15" depth=".75" position="0 .65 -.18" rotation="-35 0 0"></a-box><a-octahedron color="#e8c880" radius=".3" position="0 1 0" ${spin}></a-octahedron><a-torus color="#e8c880" radius=".65" radius-tubular=".015" rotation="90 0 0"></a-torus></a-entity>`];
async function start(){
 if(active)return;active=true;document.body.classList.add('playing');$('hud').hidden=false;$('start').disabled=true;
 try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}
 if(!state.started){state.started=Date.now();save()}render();
 $('target-name').textContent=targets[stage].name;$('target-preview').src=`assets/targets/${targets[stage].id}.jpg`;
 $('status').textContent='Cargando reconocimiento del póster…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Necesitas un navegador compatible y una conexión HTTPS.');
  // Comprobar que los tres archivos binarios del objetivo existen antes de pedir cámara.
  await Promise.all(['iset','fset','fset3'].map(async ext=>{const r=await fetch(`assets/targets/${targets[stage].id}.${ext}`);if(!r.ok)throw Error('Falta un archivo de reconocimiento. Vuelve a subir la carpeta assets completa.');await r.arrayBuffer()}));
  await script('assets/aframe.min.js');
  window.SacreAR={createNFTTracker};
  await script('assets/aframe-ar-nft.js?v=20261026-android1');
  const scene=document.createElement('a-scene');scene.setAttribute('embedded','');scene.setAttribute('vr-mode-ui','enabled: false');scene.setAttribute('renderer','alpha: true; antialias: false; logarithmicDepthBuffer: false; maxCanvasWidth: 1280; maxCanvasHeight: 1280');
  scene.setAttribute('arjs','sourceType: webcam; sourceWidth: 640; sourceHeight: 480; canvasWidth: 320; canvasHeight: 240; maxDetectionRate: 12; cameraParametersUrl: assets/camera_para.dat; debugUIEnabled: false; trackingMethod: best;');
  arRuntime=configureARScene(scene);
  // NFT usa milímetros (píxeles / 72 dpi * 25.4), no las unidades de los antiguos patrones.
  const t=targets[stage],x=t.width/72*25.4/2,y=t.height/72*25.4/2;
  scene.innerHTML=`<a-nft type="nft" url="${new URL('assets/targets/'+t.id,location.href).href}" emitevents="true" smooth="true" smooth-count="5" smooth-tolerance="0.01" smooth-threshold="2"><a-entity position="${x} ${y} 0" rotation="-90 0 0" scale="65 65 65">${models[stage]}</a-entity></a-nft><a-entity camera></a-entity>`;
  const marker=scene.querySelector('a-nft');let dwell;
  marker.addEventListener('markerFound',()=>{if(scanned)return;clearTimeout(dwell);$('status').textContent='Póster localizado · Mantén la cámara quieta';dwell=setTimeout(()=>found(stage),400)});
  marker.addEventListener('markerLost',()=>{clearTimeout(dwell);if(!scanned)$('status').textContent='Enfoca el póster completo, sin reflejos'});
  scene.addEventListener('loaded',render);document.body.append(scene);
  setTimeout(()=>{if(!nftReady)error('El reconocimiento está tardando. Revisa la conexión o vuelve a intentar.')},45000);
 }catch(e){arRuntime?.dispose();error(e.message||'No se pudieron cargar los recursos AR. Revisa tu conexión.')}
}
let nftReady=false;
window.addEventListener('arjs-nft-loaded',()=>{nftReady=true;$('status').textContent=`Listo · Enfoca ${targets[stage].name}`;$('retry').hidden=true});

function error(message){arRuntime?.dispose();$('status').textContent='No se pudo iniciar el reconocimiento AR';$('clue-title').textContent='Vamos a intentarlo de nuevo';$('clue-text').textContent=message;$('retry').hidden=false}
window.addEventListener('arjs-nft-error',()=>error('Se interrumpió el reconocimiento. Vuelve a intentar.'));
window.addEventListener('camera-error',()=>error('Permite el acceso a la cámara en los ajustes del navegador. Cierra otras apps que la estén usando y vuelve a intentar.'));window.addEventListener('arjs-video-loaded',()=>{$('status').textContent=nftReady?'Cámara lista · Enfoca el póster':'Cámara lista · Preparando reconocimiento…'});
$('start').onclick=start;$('retry').onclick=()=>location.reload();$('exit').onclick=()=>location.reload();$('continue').onclick=()=>{$('win').close();arRuntime?.resume()};$('sound').onclick=()=>{audio?.resume().catch(()=>{});sound=!sound;$('sound').textContent=`Sonido: ${sound?'sí':'no'}`;$('sound').setAttribute('aria-pressed',sound)};$('reset').onclick=()=>{if(confirm('¿Borrar los fragmentos encontrados y comenzar de nuevo?')){state={found:[],started:0,finished:0};save();sessionStorage.removeItem('sacre-autostart');location.reload()}};setInterval(()=>{if(active&&state.started)$('timer').textContent=time()},1000);if(state.found.length){$('start').firstChild.textContent='Continuar expedición ';$('resume').textContent=`Tienes ${state.found.length} de 3 fragmentos guardados.`}

$('next').onclick=()=>{sessionStorage.setItem('sacre-autostart','1');location.reload()};
document.addEventListener('pointerdown',()=>audio?.resume().catch(()=>{}));
if(sessionStorage.getItem('sacre-autostart')){sessionStorage.removeItem('sacre-autostart');start()}
