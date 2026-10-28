const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..');
const shorts=require('../src/shorts.js'),motion=require('../src/particle-time.js'),montage=require('../src/montage.js');
test('shorts choose actual source position, not video timeline zero',()=>{
  const p={shorts:{...shorts.defaults(),start:36,duration:20},canvas:{aspect:'16:9'},intro:{durationSec:7},outro:{durationSec:10},montage:{enabled:true,clips:[]}};
  const r=shorts.makeRenderProject(p,99);assert.equal(shorts.montageSourceTime(r.info,0),36);
  assert.equal(shorts.montageSourceTime(r.info,2.4),38.4);
  assert.equal(shorts.montageSourceTime(r.info,20),56);
  assert.equal(r.project.canvas.aspect,'9:16');assert.equal(p.canvas.aspect,'16:9');
});
test('transitions in existing montage projects remain unchanged',()=>{
 const clips=[{id:'a',role:'primary',start:0,duration:2,transition:'fade'},
 {id:'b',role:'cut',start:2,duration:1,transition:'wipe',transitionDuration:.65,effect:'shake'},
 {id:'c',role:'cut',start:3,duration:1,transition:'blur',transitionDuration:.4,effect:'rgb'}];
 const project={shorts:{...shorts.defaults()},canvas:{aspect:'16:9'},intro:{},outro:{},montage:{enabled:true,clips}};
 const snapshot=JSON.stringify(clips);const converted=shorts.makeRenderProject(project,50);
 assert.equal(JSON.stringify(clips),snapshot);assert.equal(converted.project.montage.clips,clips);
 assert.equal(montage.transition(project,2.2)?.kind,'wipe');
 assert.equal(montage.transition(project,3.1)?.kind,'blur');
});
test('particle movement freezes smoothly and resumes; frame-order independent',()=>{
 const analysis={markers:[{t:1,strength:1}]};const t=x=>motion.motionTime(x,analysis,[],300);
 assert.ok(Math.abs((t(.999)-t(.998))-.001)<1e-5);
 assert.ok((t(1.151)-t(1.149)) < .00005);
 assert.ok((t(1.301)-t(1.299)) > .001);
 assert.equal(t(1.2),t(1.2));
 assert.ok(t(2)>t(1.3));
});
test('legacy transitions remain render-compatible but are hidden from new creation menu',()=>{
 const html=fs.readFileSync(path.join(dir,'src/index.html'),'utf8');
 const select=html.match(/<select id="montage-transition">([\s\S]*?)<\/select>/)?.[1]||'';
 for(const kind of ['cut','shake','spin'])assert.ok(select.includes(`value="${kind}"`));
 for(const kind of ['fade','wipe','blur','echo','pull_in','pull_out'])assert.ok(!select.includes(`value="${kind}"`));
 const engine=fs.readFileSync(path.join(dir,'src/render.js'),'utf8');
 for(const kind of ['fade','wipe','blur','echo','pull_in','pull_out'])assert.ok(engine.includes(`'${kind}'`));
 const app=fs.readFileSync(path.join(dir,'src/app.js'),'utf8');
 assert.match(app,/Legacy \/ сохранённый:/);
});
test('default logo is valid bundled raster asset',()=>{
 const p=fs.readFileSync(path.join(dir,'src/assets/branding/pulseframe-system.png'));
 assert.equal(p.subarray(1,4).toString('ascii'),'PNG');
 assert.ok(p.length>10000);
});
test('new faster export remains optional and PNG transfer is available',()=>{
 const src=fs.readFileSync(path.join(dir,'electron/main.cjs'),'utf8');
 const app=fs.readFileSync(path.join(dir,'src/app.js'),'utf8');
 assert.match(src,/frameFormat==='jpeg'\?'mjpeg':'png'/);assert.match(app,/toDataURL\('image\/png'\)/);
 assert.match(app,/toDataURL\('image\/jpeg',\.98\)/);
});
