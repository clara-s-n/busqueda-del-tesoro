export const labels=['Brújula','Llave','Cristal'];
export function collect(found,index){if(index<0||index>2||!Number.isInteger(index))return {found,kind:'invalid'};if(found.includes(index))return {found,kind:'repeat'};if(index!==found.length)return {found,kind:'locked'};return {found:[...found,index],kind:index===2?'complete':'new'};}
export function cleanState(raw){
 const empty={found:[],started:0,finished:0};
 if(!raw||!Array.isArray(raw.found)||raw.found.length>3||!raw.found.every((v,i)=>v===i)||!Number.isFinite(raw.started)||raw.started<0||!Number.isFinite(raw.finished)||raw.finished<0)return empty;
 if(raw.found.length&&raw.started===0)return empty;
 if(raw.finished&&(raw.found.length!==3||raw.finished<raw.started))return empty;
 return raw;
}
