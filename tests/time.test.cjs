const { test }=require('node:test');
const assert=require('node:assert/strict');
const {timeline,smooth}=require('../src/time.js');
const project=(mode,I=7,O=10)=>({intro:{durationSec:I,audioStart:mode},outro:{durationSec:O}});
test('music starts with intro',()=>{const t=timeline(project('with_intro'),190);assert.equal(t.total,190);assert.equal(t.offset,0);assert.equal(t.scene(0),'intro');assert.equal(t.scene(8),'main');assert.equal(t.scene(180),'outro');assert.equal(t.audioAt(180),180);assert.equal(t.valid,true);});
test('music starts after intro',()=>{const t=timeline(project('after_intro'),190);assert.equal(t.total,197);assert.equal(t.offset,7);assert.equal(t.scene(7),'main');assert.equal(t.scene(187),'outro');assert.equal(t.audioAt(7),0);assert.equal(t.audioAt(197),190);assert.equal(t.valid,true);});
test('short tracks fail validation',()=>{assert.equal(timeline(project('with_intro',7,10),13).valid,false);assert.equal(timeline(project('after_intro',7,10),8).valid,false);});
test('smooth steps respect bounds',()=>{assert.equal(smooth(2,3,1),0);assert.equal(smooth(2,3,4),1);assert.equal(smooth(0,1,.5),.5);});
