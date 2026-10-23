export const labels=['Brújula','Llave','Cristal'];
export function collect(found,index){if(index<0||index>2||!Number.isInteger(index))return {found,kind:'invalid'};if(found.includes(index))return {found,kind:'repeat'};if(index!==found.length)return {found,kind:'locked'};return {found:[...found,index],kind:index===2?'complete':'new'};}
export function cleanState(raw){return raw&&Array.isArray(raw.found)&&raw.found.length<=3&&raw.found.every((v,i)=>v===i)&&Number.isFinite(raw.started)?raw:{found:[],started:0,finished:0};}
