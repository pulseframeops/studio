const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const shorts=require('../src/shorts.js'),montage=require('../src/montage.js');
const root=path.join(__dirname,'..');
test('teaser does not use montage edits, and does not mutate original project',()=>{
 const project={canvas:{aspect:'16:9'},shorts:{...shorts.defaults(),start:10,duration:20},intro:{durationSec:5},outro:{durationSec:10},montage:{enabled:true,clips:[{id:'a',role:'cut',start:0,duration:1,transition:'pull_in'}]}};
 const original=JSON.stringify(project);
 const teaser=shorts.makeRenderProject(project,60);
 assert.equal(teaser.project.montage.enabled,false);assert.equal(project.montage.enabled,true);
 assert.equal(teaser.project.canvas.aspect,'9:16');assert.equal(teaser.info.start,10);
 assert.equal(JSON.stringify(project),original);
});
test('legacy saved transitions retain precise duration values',()=>{
 const clips=[{id:'p',role:'primary',start:0,duration:2},{id:'c',role:'cut',start:2,duration:1,transition:'fade',transitionDuration:.35}];
 const p={montage:{clips}};const snap=JSON.stringify(clips);const t=montage.transition(p,2.1);
 assert.equal(t.kind,'fade');assert.equal(t.previous.id,'p');assert.equal(JSON.stringify(clips),snap);
});
test('new Pull In, Pull Out, Shake, Spin have renderer implementations',()=>{
 const render=fs.readFileSync(path.join(root,'src/render.js'),'utf8');
 for(const kind of ['pull_in','pull_out','shake','spin'])assert.ok(render.includes(`tx.kind==='${kind}'`));
 assert.match(render,/visualizationOpacity/);
});
test('UI settings moved from toolbar and night mode present',()=>{
 const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
 const toolbar=html.match(/<div class="toolbar">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(!toolbar.includes('id="ui-language"'));
 assert.ok(html.includes('id="settings-view"'));assert.ok(html.includes('value="night"'));assert.ok(html.includes('id="ui-language"'));
});
test('five selectable, bundled raster platform icons',()=>{
 const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
 for(const [key,file] of Object.entries({spotify:'spotify.png',youtubeMusic:'youtube-music.png',appleMusic:'apple-music.png',vkMusic:'vk-music.png',yandexMusic:'yandex-music.png'})){
  assert.ok(html.includes('data-platform="'+key+'"'));
  const png=fs.readFileSync(path.join(root,'src/assets/platforms',file));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
test('clip transform numeric controls and draggable timeline are available',()=>{
 const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
 for(const id of ['montage-clip-duration','montage-source-in','montage-transform-x','montage-transform-y','montage-transform-scale','montage-transform-rotate','montage-transform-opacity'])assert.ok(html.includes(`id="${id}"`));
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.match(app,/setPointerCapture/);assert.match(app,/canvasTransformDrag/);
});
