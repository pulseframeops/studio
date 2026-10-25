const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const PF=require('../src/shorts.js');
const root=path.join(__dirname,'..');

test('teaser fade-in/out audio envelope stays between 0 and 1',()=>{
 const s=PF.limits({duration:20,introDuration:3,outroDuration:4,start:0},32);
 assert.equal(PF.audioGain(0,s),0);
 assert.ok(Math.abs(PF.audioGain(1.5,s)-.5)<1e-8);
 assert.equal(PF.audioGain(8,s),1);
 assert.ok(Math.abs(PF.audioGain(18,s)-.5)<1e-8);
 assert.equal(PF.audioGain(20,s),0);
});
test('shorts preserves 10–30 seconds and remains portrait',()=>{
 const project={canvas:{aspect:'16:9'},intro:{durationSec:8},outro:{durationSec:10},montage:{musicTrim:{start:0,end:0}},shorts:{...PF.defaults(),duration:55,start:5}};
 const {project:short,info}=PF.makeRenderProject(project,80);
 assert.equal(info.total,30);assert.equal(short.canvas.aspect,'9:16');
 assert.equal(project.canvas.aspect,'16:9');assert.equal(short.shorts.render,true);
});
test('no release date uses COMING TO PLATFORMS layout sentinel',()=>{
 assert.equal(PF.outroLabel(PF.defaults()),'СКОРО');
 assert.equal(PF.outroLabel({releaseDate:'2026-12-31'}),'31.12.2026');
});
test('watermark video support and signature are in renderer',()=>{
 const src=fs.readFileSync(path.join(root,'src/render.js'),'utf8');
 assert.ok(src.includes('Visual by PulseFrame'));
 assert.ok(src.includes("mode==='system'"));
 assert.ok(src.includes("['image','video'].includes(mode)"));
 assert.ok(src.includes("watermark(ctx,canvas.width,canvas.height,proj,assets)"));
});
test('preview-only quality controls do not replace full export size',()=>{
 const src=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.ok(src.includes('previewSizes={low:[640,360],medium:[960,540],high:[1280,720]}'));
 assert.ok(src.includes('const width=portrait?1080:1920,height=portrait?1920:1080'));
});
test('social and interface raster assets are packaged as valid PNGs',()=>{
 for(const name of ['telegram','x','github','save','play','film','languages','download']){
  const f=fs.readFileSync(path.join(root,'src/assets/icons',name+'.png'));
  assert.equal(f.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
