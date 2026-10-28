const assert=require('node:assert/strict');
const test=require('node:test');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','src');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const render=fs.readFileSync(path.join(root,'render.js'),'utf8');
const arcade=fs.readFileSync(path.join(root,'arcade.js'),'utf8');
const starfall=fs.readFileSync(path.join(root,'starfall.js'),'utf8');
function getArcade(){
 const sandbox={Image:class{set src(v){this._src=v;}},Audio:class{play(){return Promise.resolve()}pause(){}set src(v){}},performance:{now:()=>1000},window:{},setTimeout,Math,console};
 sandbox.window.PFEmbeddedAssets={};sandbox.window.Audio= sandbox.Audio;
 vm.createContext(sandbox);vm.runInContext(arcade,sandbox);
 return sandbox.window.PFArcade;
}
test('retro TV has unique intro, TV scene, configurable outro paths',()=>{
 assert.match(render,/function drawRetroTV\(/);
 assert.match(render,/function drawRetroOutro\(/);
 assert.match(render,/TOSHIBA/);
 assert.match(render,/outroMode\|\|'recommendations'/);
 assert.match(render,/retroScene\(ctx,sw,sh/);
 assert.match(render,/const length=Math\.floor\(Math\.max\(0,elapsed-2\.4\)\*17\)/);
});
test('retro controls are bound and old schema remains v2',()=>{
 for(const id of ['retro-intro-reveal','retro-outro-mode','retro-thanks','retro-outro-footer','retro-platform-footer'])
   assert.match(html,new RegExp(`id="${id}"`));
 for(const key of ['introReveal','outroMode','thanksText','outroFooter','platformFooter'])
   assert.match(app,new RegExp(key));
 assert.match(app,/schemaVersion:2/);
 assert.doesNotMatch(app,/schemaVersion:3/);
});
test('three unique levels, enemies, checkpoints and on-surface collectibles',()=>{
 const engine=getArcade(),stages=engine._test.stages;
 assert.equal(stages.length,3);
 assert.equal(new Set(stages.map(x=>x.name)).size,3);
 for(const stage of stages){
  assert.ok(stage.w>3000);assert.ok(stage.enemies.length>=10);assert.ok(stage.checkpoints.length>=2);
  assert.ok(stage.spikes.length>=5);assert.ok(stage.coins.length>=30);
  for(const coin of stage.coins){
   const surfaces=stage.surfaces.filter(s=>coin.x>=s.x&&coin.x<=s.x+s.w);
   assert.ok(surfaces.length>0,`coin ${coin.id} must be above solid ground or platform`);
   assert.ok(surfaces.every(s=>coin.y<s.y-13 || coin.y>s.y+s.h+13),`coin ${coin.id} overlaps platform`);
  }
 }
});
test('sprite animations, music files and game controls exist',()=>{
 assert.match(arcade,/jessica_\$\{i\}\.png/);
 assert.match(arcade,/double jump|p\.jumps<2/);
 assert.match(arcade,/Shift/);
 assert.match(arcade,/function hurt/);
 assert.match(starfall,/PFArcade\?\.start/);
 for(const track of ['neon_city','circuit_factory','sky_gardens'])
   assert.ok(fs.existsSync(path.join(root,'assets','music',track+'.wav')));
 for(let i=0;i<10;i++)assert.ok(fs.existsSync(path.join(root,'assets','arcade',`jessica_${i}.png`)));
});
test('previous presets and screenshot export logic still present',()=>{
 for(const id of ['neon_wave','montagem','retro'])assert.ok(render.includes(id));
 assert.ok(render.includes('drawPlatformLogos'));
 assert.ok(render.includes('watermark(ctx,w,h,proj,assets)'));
 assert.ok(fs.readFileSync(path.join(root,'montage.js'),'utf8').includes('resolve'));
});
