const {test}=require('node:test');
const assert=require('node:assert/strict');
const s=require('../src/shorts.js');
test('10-30 seconds is a hard limit',()=>{
 assert.equal(s.limits({start:0,duration:1},120).duration,10);
 assert.equal(s.limits({start:0,duration:80},120).duration,30);
 assert.equal(s.limits({start:115,duration:20},120).start,100);
 assert.equal(s.limits({start:0,duration:20},9.9).valid,false);
 assert.equal(s.limits({start:0,duration:20},12).duration,12);
});
test('short is vertical and the intro/outro stay inside selected audio',()=>{
 const p={canvas:{aspect:'16:9'},intro:{audioStart:'after_intro',durationSec:7},outro:{durationSec:10},montage:{musicTrim:{start:0,end:0}},shorts:{start:52,duration:15,introDuration:4,outroDuration:4}};
 const {project,info}=s.makeRenderProject(p,180);
 assert.equal(project.canvas.aspect,'9:16');assert.equal(project.intro.audioStart,'with_intro');
 assert.equal(project.montage.musicTrim.start,52);assert.equal(project.montage.musicTrim.end,67);
 assert.equal(info.total,15);assert.equal(info.outroStart,11);
});
test('date or soon on outro',()=>{
 assert.equal(s.outroLabel({releaseDate:''}),'СКОРО');
 assert.equal(s.outroLabel({releaseDate:'2027-01-05'}),'05.01.2027');
 assert.equal(s.outroLabel({releaseDate:'2027-02-30'}),'СКОРО');
});
test('effect timestamps cannot overflow 30-second clip',()=>{
 const e=s.activeEffects([{time:12,kind:'flash',strength:.8}],12.2,15);
 assert.equal(e.length,1);assert.equal(s.activeEffects([{time:12,kind:'flash'}],12.5,15).length,0);
});
