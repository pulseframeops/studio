const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve,cycleDuration,cutSequence,transition}=require('../src/montage.js');
const make=clips=>({montage:{clips}});
const main={id:'primary',role:'primary',start:0,duration:2,sourceIn:.5};
const cut={id:'cut',role:'cut',start:2,duration:3,sourceIn:1,transition:'fade',transitionDuration:.5};
test('the two main videos are played ONLY once, cuts loop to end',()=>{
  const p=make([main,cut]);
  assert.equal(cycleDuration(p),3);
  assert.equal(resolve(p,1).clip.id,'primary');
  assert.equal(resolve(p,4).clip.id,'cut');
  assert.equal(resolve(p,6).clip.id,'cut');
  assert.equal(resolve(p,12).clip.id,'cut');
  assert.equal(resolve(p,112).clip.id,'cut');
  assert.equal(resolve(p,6).cycle,1);
  assert.equal(resolve(p,12).cycle,3);
  assert.equal(resolve(p,6).sourceTime,2);
});
test('two primary videos never repeat when multiple cuts repeat',()=>{
  const second={id:'primary2',role:'primary',start:2,duration:2,sourceIn:0};
  const cut2={...cut,id:'cut1',start:4,duration:1,transition:'cut'};
  const cut3={...cut,id:'cut2',start:5,duration:1,transition:'cut'};
  const p=make([main,second,cut2,cut3]);
  assert.equal(cutSequence(p).start,4);
  assert.equal(cycleDuration(p),2);
  assert.equal(resolve(p,0.5).clip.id,'primary');
  assert.equal(resolve(p,2.5).clip.id,'primary2');
  for(const t of [4.5,6.5,8.5,80.5])assert.equal(resolve(p,t).clip.id,'cut1');
  for(const t of [5.5,7.5,19.5,55.5])assert.equal(resolve(p,t).clip.id,'cut2');
});
test('no cuts means the primary video holds its last frame, but never restarts',()=>{
  const p=make([main]);
  assert.equal(cycleDuration(p),0);
  assert.equal(resolve(p,20).clip.id,'primary');
  assert.ok(Math.abs(resolve(p,20).sourceTime-2.47)<1e-9);
  assert.equal(resolve(p,20).cycle,0);
});
test('no media returns no clip',()=>assert.equal(resolve(make([]),10),null));
test('gap between primary and first cut holds primary final frame',()=>{
  const p=make([{...main,duration:1},{...cut,start:4}]);
  assert.equal(resolve(p,2.5).clip.id,'primary');
  assert.equal(resolve(p,5).clip.id,'cut');
  assert.equal(resolve(p,8).clip.id,'cut');
});
test('cut overlays an overlapping primary and repeats independently',()=>{
  const p=make([{...main,duration:10},{...cut,start:2,duration:3}]);
  assert.equal(resolve(p,1).clip.id,'primary');
  assert.equal(resolve(p,3).clip.id,'cut');
  assert.equal(resolve(p,8).clip.id,'cut');
});
test('first cut fades from primary only the first time',()=>{
  const p=make([main,cut]);
  assert.equal(transition(p,2.2).previous.id,'primary');
  assert.equal(transition(p,5.2),null); // same cut cannot crossfade with itself
});
test('repeat boundary transition connects last cut to first cut, not to primary',()=>{
  const first={...cut,id:'first',start:3,duration:2};
  const last={...cut,id:'last',start:5,duration:2,transition:'cut'};
  const p=make([main,first,last]);
  assert.equal(transition(p,3.2).previous.id,'primary');
  assert.equal(transition(p,7.2).previous.id,'last');
});
test('project beginning with cuts only repeats cuts',()=>{
  const p=make([{...cut,id:'c1',start:0,duration:2,transition:'cut'}]);
  assert.equal(resolve(p,0.5).clip.id,'c1');
  assert.equal(resolve(p,40.5).clip.id,'c1');
  assert.equal(resolve(p,40.5).cycle,20);
});
test('gaps between cut clips show held cut image, not primary',()=>{
  const p=make([main,{...cut,id:'c1',start:2,duration:1}, {...cut,id:'c2',start:5,duration:1}]);
  assert.equal(resolve(p,4).clip.id,'c1');
  assert.equal(resolve(p,8).clip.id,'c1');
});
