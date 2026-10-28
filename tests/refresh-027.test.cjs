const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const dir=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
test('Retro preset is selectable and pixel scene controls exist',()=>{
 const html=read('src/index.html'),app=read('src/app.js'),render=read('src/render.js');
 assert.match(html,/data-preset="retro"/);assert.match(html,/value="retro"/);assert.match(html,/id="retro-scene"/);
 for(const p of ['city','beach','mountains','room','space'])assert.match(html,new RegExp(`value="${p}"`));
 assert.match(app,/applyRetroTheme/);assert.match(render,/function retroBackdrop/);assert.match(render,/retroMain/);
});
test('New effect selectors omit pull transitions but renderer accepts existing projects',()=>{
 const html=read('src/index.html'),render=read('src/render.js');
 for(const id of ['montage-transition','montage-effect']){
  const select=html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)<\\/select>`))?.[1]||'';
  for(const kind of ['pull_in','pull_out'])assert.ok(!select.includes(`value="${kind}"`));
 }
 assert.match(render,/tx.kind==='pull_in'/);assert.match(render,/tx.kind==='pull_out'/);
 assert.match(read('src/app.js'),/Legacy \/ сохранённый:/);
});
test('Keyboard Ctrl+B handler captures before Chromium defaults and respects fields',()=>{
 const s=read('src/app.js');assert.match(s,/document.addEventListener\('keydown',[\s\S]*?splitSelected\(\);\s*\},true\)/);
 assert.match(s,/c.duration<.45/);assert.match(s,/dt=c.duration\/2/);
 assert.match(s,/Math.max\(-initial.sourceIn,-initial.start\)/);
});
test('Starfall milestones and fullscreen secret are available',()=>{
 const html=read('src/index.html'),s=read('src/starfall.js'),app=read('src/app.js');
 assert.match(html,/data-view="starfall"/);assert.match(html,/id="starfall-canvas"/);
 assert.match(s,/state.regular>=5&&state.gold>=2/);assert.match(s,/code==='027'/);
 for(const t of ['fullscreen','flscrn'])assert.ok(app.includes(t));
 assert.match(app,/document.fullscreenElement.id==='canvas-box'/);
 assert.match(read('electron/main.cjs'),/app:set-fullscreen/);
});
test('Creator artwork and support panel are bundled and linked',()=>{
 for(const p of ['src/assets/branding/pulseframe-app.png','src/assets/branding/kofi-support.png','src/assets/icons/book-open.png']){
  const bytes=fs.readFileSync(path.join(dir,p));assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
 }
 const html=read('src/index.html');assert.match(html,/data-help-page="support"/);assert.match(html,/ko-fi.com\/tihsmile/);assert.match(html,/assets\/icons\/book-open.png/);
 const main=read('electron/main.cjs');assert.match(main,/ko-fi.com\/tihsmile/);
});
test('Version banner derives from app version',()=>{
 assert.match(read('electron/main.cjs'),/app.getVersion\(\)/);assert.match(read('src/app.js'),/desktop.appVersion/);assert.match(read('src/index.html'),/name="pulseframe-version"/);
});
