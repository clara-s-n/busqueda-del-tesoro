import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayClock,formatElapsed,cleanState} from './logic.mjs';

test('counts active play, excluding time paused, closed or in the background',()=>{
 let now=0;
 const clock=createPlayClock(1200,()=>now);
 now=60_000;
 assert.equal(clock.value(),1200);
 clock.start();now+=2300;
 assert.equal(clock.value(),3500);
 clock.start();now+=500;
 clock.pause();clock.pause();
 assert.equal(clock.value(),4000);
 now+=14*60*60*1000;
 assert.equal(clock.value(),4000);
 const resumed=createPlayClock(clock.value(),()=>now);
 resumed.start();now+=1000;resumed.pause();
 assert.equal(resumed.value(),5000);
 resumed.reset();
 assert.equal(resumed.value(),0);
});

test('keeps legacy progress without treating its start timestamp as elapsed play',()=>{
 const progress=cleanState({found:[0,1],started:1,finished:0});
 assert.deepEqual(progress.found,[0,1]);
 assert.equal(progress.elapsedMs,undefined);
 const clock=createPlayClock(progress.elapsedMs||0,()=>900_000);
 assert.equal(formatElapsed(clock.value()),'00:00');
 const damaged=cleanState({...progress,elapsedMs:-100});
 assert.deepEqual(damaged.found,[0,1]);
 assert.equal(damaged.elapsedMs,0);
});

test('formats short and long sessions without a huge minutes field',()=>{
 assert.equal(formatElapsed(0),'00:00');
 assert.equal(formatElapsed(59_999),'00:59');
 assert.equal(formatElapsed(60_000),'01:00');
 assert.equal(formatElapsed(3_601_000),'1:00:01');
});
