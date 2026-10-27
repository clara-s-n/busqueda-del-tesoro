export const labels=['Brújula','Llave','Cristal'];
export function collect(found,index){if(index<0||index>2||!Number.isInteger(index))return {found,kind:'invalid'};if(found.includes(index))return {found,kind:'repeat'};if(index!==found.length)return {found,kind:'locked'};return {found:[...found,index],kind:index===2?'complete':'new'};}
export function cleanState(raw){
 const empty={found:[],started:0,finished:0,elapsedMs:0};
 if(!raw||!Array.isArray(raw.found)||raw.found.length>3||!raw.found.every((v,i)=>v===i)||!Number.isFinite(raw.started)||raw.started<0||!Number.isFinite(raw.finished)||raw.finished<0)return empty;
 if(raw.found.length&&raw.started===0)return empty;
 if(raw.finished&&(raw.found.length!==3||raw.finished<raw.started))return empty;
 if('elapsedMs' in raw)return {...raw,elapsedMs:Number.isFinite(raw.elapsedMs)&&raw.elapsedMs>=0?raw.elapsedMs:0};
 return raw; // Legacy progress remains valid; its wall-clock duration is unknown.
}

export function createPlayClock(initialMs=0,now=()=>performance.now()){
 let elapsed=initialMs,runningSince=null;
 const value=()=>elapsed+(runningSince===null?0:Math.max(0,now()-runningSince));
 return {
  value,
  start(){if(runningSince===null)runningSince=now()},
  pause(){elapsed=value();runningSince=null},
  reset(){elapsed=0;runningSince=null}
 };
}

export function formatElapsed(milliseconds){
 const total=Math.max(0,Math.floor(milliseconds/1000)),seconds=String(total%60).padStart(2,'0'),minutes=Math.floor(total/60);
 return minutes<60?`${String(minutes).padStart(2,'0')}:${seconds}`:`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:${seconds}`;
}
