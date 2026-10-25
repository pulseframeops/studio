const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
async function mainMock(){
  const registered=new Map();
  const answers=[];
  const messages=[];
  let win;
  class FakeWindow extends EventEmitter {
    constructor(){super();this.closed=false;this.webContents={setWindowOpenHandler:()=>{},send:(...args)=>messages.push(args)};win=this;}
    loadFile(){}
    close(){let stopped=false;this.emit('close',{preventDefault(){stopped=true;}});if(!stopped)this.closed=true;}
  }
  const electron={
    app:{whenReady:()=>Promise.resolve(),on:()=>{},getPath:()=>'/tmp'},
    BrowserWindow: Object.assign(FakeWindow,{getAllWindows:()=>win&&!win.closed?[win]:[]}),
    dialog:{showMessageBoxSync:()=>answers.shift()},
    ipcMain:{on:(k,fn)=>registered.set(k,fn),handle:(k,fn)=>registered.set(k,fn)},
    protocol:{registerSchemesAsPrivileged:()=>{},handle:()=>{}},
    shell:{}
  };
  const customRequire=(key)=>key==='electron'?electron:require(key);
  const code=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
  vm.runInNewContext(code,{require:customRequire,process,__dirname:path.join(root,'electron'),Buffer,console,URL,Response,setTimeout,clearTimeout}, {filename:'main.cjs'});
  await new Promise(resolve=>setImmediate(resolve));
  return {win,answers,messages,registered,markDirty(value){registered.get('app:dirty')({sender:win.webContents},value);},finishClose(){return registered.get('app:finish-close')({sender:win.webContents});}};
}
test('title-bar X closes clean window immediately',async()=>{
 const env=await mainMock();env.win.close();assert.equal(env.win.closed,true);
});
test('title-bar X on dirty project offers cancel',async()=>{
 const env=await mainMock();env.markDirty(true);env.answers.push(2);env.win.close();assert.equal(env.win.closed,false);
});
test('title-bar X permits explicit discard',async()=>{
 const env=await mainMock();env.markDirty(true);env.answers.push(1);env.win.close();assert.equal(env.win.closed,true);
});
test('save and exit requests renderer save, then closes on success',async()=>{
 const env=await mainMock();env.markDirty(true);env.answers.push(0);env.win.close();
 assert.equal(env.win.closed,false);
 assert.equal(env.messages[0][0],'app:save-and-close');
 assert.equal(env.finishClose(),false,'unsaved state cannot bypass confirmation');
 env.markDirty(false);assert.equal(env.finishClose(),true);
 assert.equal(env.win.closed,true);
});
