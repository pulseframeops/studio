const { test } = require('node:test');
const assert = require('node:assert/strict');
const { timeline } = require('../src/time.js');
function p(audioStart, trimStart, trimEnd){return {intro:{durationSec:3,audioStart},outro:{durationSec:2},montage:{musicTrim:{start:trimStart,end:trimEnd}}};}
test('timeline respects trimmed audio in with-intro mode',()=>{
 const tl=timeline(p('with_intro',5,20),30);
 assert.equal(tl.total,15);
 assert.equal(tl.audioStart,5);
 assert.equal(tl.audioEnd,20);
 assert.equal(tl.audioAt(7),12);
 assert.equal(tl.outroStart,13);
 assert.equal(tl.valid,true);
});
test('after-intro mode includes silent video intro before trimmed music',()=>{
 const tl=timeline(p('after_intro',4,18),30);
 assert.equal(tl.total,17);
 assert.equal(tl.audioAt(0),4);
 assert.equal(tl.audioAt(3),4);
 assert.equal(tl.audioAt(8),9);
 assert.equal(tl.valid,true);
});
test('short trimmed segment is rejected',()=>{
 const tl=timeline(p('with_intro',5,8),30);
 assert.equal(tl.valid,false);
});
