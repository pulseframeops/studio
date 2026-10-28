const { app, BrowserWindow, dialog, ipcMain, protocol, shell, Menu } = require('electron');
const { Readable } = require('node:stream');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');

protocol.registerSchemesAsPrivileged([
  { scheme: 'pulseframe-media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);
const assetPaths = new Map();
const allowedPaths = new Set();
const sessions = new Map();
const tempFiles = new Set();
let window;
let projectDirty = false;
let allowClose = false;
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function getSettings() { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } }
function ffmpegPath() { return getSettings().ffmpeg || 'ffmpeg'; }
function ffprobePath() { const f = getSettings().ffmpeg; return f ? path.join(path.dirname(f), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe') : 'ffprobe'; }


function authorize(filename) {
  const resolved = path.resolve(filename);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  const key = randomUUID();
  assetPaths.set(key, resolved);
  allowedPaths.add(resolved);
  return { path: resolved, url: `pulseframe-media://asset/${key}`, name: path.basename(resolved) };
}
function probe(filename) {
  return new Promise((resolve) => {
    execFile(ffprobePath(), ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filename],
      { maxBuffer: 1024 * 1024 * 2 }, (err, stdout) => {
        if (err) return resolve(null);
        try { resolve(JSON.parse(stdout)); } catch { resolve(null); }
      });
  });
}
function execTool(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => err ? reject(Error(stderr || err.message)) : resolve(stdout));
  });
}
function createWindow() {
  Menu?.setApplicationMenu?.(null); // Hide File / Edit / View, compatible with mocked Electron tests.
  window = new BrowserWindow({
    width: 1500, height: 920, minWidth: 980, minHeight: 680,
    title: 'PulseFrame Studio', backgroundColor: '#050506', icon:process.platform==='win32'?path.join(__dirname,'pulseframe.ico'):path.join(__dirname,'..','src','assets','branding','pulseframe-app.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true
    }
  });
  window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  projectDirty = false;
  allowClose = false;
  window.on('close', (event) => {
    if (allowClose) return;
    // Always let a clean and idle window close immediately.
    if (sessions.size === 0 && !projectDirty) return;
    event.preventDefault();
    if (sessions.size) {
      const choice = dialog.showMessageBoxSync(window, {
        type:'warning', title:'Выполняется экспорт',
        message:'Экспорт ещё выполняется. Прервать его и закрыть программу?',
        buttons:['Продолжить экспорт', 'Прервать и закрыть'], defaultId:0, cancelId:0,
        noLink:true
      });
      if (choice !== 1) return;
      for (const session of sessions.values()) {
        session.cancelled = true;
        try { session.child.kill('SIGTERM'); } catch {}
      }
    }
    if (!projectDirty) {allowClose = true;window.close();return;}
    const choice = dialog.showMessageBoxSync(window, {
      type:'warning', title:'Несохранённый проект',
      message:'Сохранить изменения перед выходом?',
      detail:'При закрытии без сохранения изменения будут потеряны.',
      buttons:['Сохранить и выйти', 'Закрыть без сохранения', 'Отмена'],
      defaultId:0, cancelId:2, noLink:true
    });
    if (choice === 1) {allowClose = true;window.close();}
    else if (choice === 0) window.webContents.send('app:save-and-close');
  });
}
app.whenReady().then(() => {
  protocol.handle('pulseframe-media', async (request) => {
    const id = new URL(request.url).pathname.replace(/^\//, '');
    const target = assetPaths.get(id);
    if (!target) return new Response('Forbidden', { status: 403 });
    const stats = await fs.promises.stat(target).catch(() => null);
    if (!stats) return new Response('Missing media', { status: 404 });
    const ext = path.extname(target).toLowerCase();
    const type = ({ '.mp3':'audio/mpeg', '.wav':'audio/wav', '.flac':'audio/flac', '.ogg':'audio/ogg', '.opus':'audio/ogg', '.m4a':'audio/mp4', '.aac':'audio/aac', '.aiff':'audio/aiff', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.mp4':'video/mp4', '.webm':'video/webm', '.mov':'video/quicktime', '.mkv':'video/x-matroska' })[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Accept-Ranges':'bytes', 'Access-Control-Allow-Origin':'*', 'Cache-Control':'no-store' };
    const range = request.headers.get('range');
    let start = 0, end = stats.size - 1, code = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416, headers: { 'Content-Range':`bytes */${stats.size}` } });
      if (!match[1] && match[2]) { start = Math.max(0, stats.size - Number(match[2])); }
      else { start = Number(match[1] || 0); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= stats.size) return new Response(null, { status:416, headers:{'Content-Range':`bytes */${stats.size}`} });
      code = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    }
    headers['Content-Length'] = String(end-start+1);
    return new Response(Readable.toWeb(fs.createReadStream(target, { start, end })), { status:code, headers });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
ipcMain.on('app:dirty', (event, dirty) => {
  if (window && event.sender === window.webContents) projectDirty = !!dirty;
});
ipcMain.handle('app:version',()=>app.getVersion());
ipcMain.handle('app:set-fullscreen', (event, enabled) => {
  if (!window || event.sender !== window.webContents) return false;
  if (sessions.size) return window.isFullScreen();
  window.setFullScreen(!!enabled);
  return window.isFullScreen();
});
ipcMain.handle('app:finish-close', (event) => {
  if (!window || event.sender !== window.webContents) return false;
  // A successful save clears renderer dirty state before invoking this.
  if (projectDirty) return false;
  allowClose = true;
  window.close();
  return true;
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  for (const session of sessions.values()) session.child.kill('SIGTERM');
  for (const filename of tempFiles) { try { fs.unlinkSync(filename); } catch {} }
});

ipcMain.handle('media:choose', async (_ev, kind) => {
  if (!['audio', 'cover', 'background', 'watermark', 'corner'].includes(kind)) throw Error('Неправильный тип файла');
  const filters = kind === 'watermark' ? [{name:'Водяной знак (PNG / видео)',extensions:['png','mp4','webm','mov']}]  : kind === 'audio'
    ? [{ name: 'Аудио', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'aiff'] }]
    : [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];
  const res = await dialog.showOpenDialog(window, { properties: ['openFile'], filters });
  if (res.canceled) return null;
  const asset = authorize(res.filePaths[0]);
  if (kind === 'audio' && asset) asset.probe = await probe(asset.path);
  return asset;
});
ipcMain.handle('project:save', async (_ev, { project, path: existing }) => {
  if (!project || ![1,2].includes(project.schemaVersion) || !project.metadata) throw Error('Неправильный проект');
  let target = existing && typeof existing === 'string' ? existing : null;
  if (!target) {
    const res = await dialog.showSaveDialog(window, {
      defaultPath: (project.metadata.title || 'New Project') + '.pulseframe',
      filters: [{ name: 'PulseFrame Project', extensions: ['pulseframe'] }]
    });
    if (res.canceled) return null;
    target = res.filePath;
  }
  if (!target.endsWith('.pulseframe')) target += '.pulseframe';
  await fs.promises.writeFile(target, JSON.stringify(project, null, 2), 'utf8');
  return target;
});
ipcMain.handle('project:open', async () => {
  const res = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'PulseFrame Project', extensions: ['pulseframe'] }] });
  if (res.canceled) return null;
  const source = res.filePaths[0];
  const project = JSON.parse(await fs.promises.readFile(source, 'utf8'));
  if (![1,2].includes(project.schemaVersion) || !project.media || !project.metadata) throw Error('Неподдерживаемый формат проекта');
  const assets = {};
  for (const kind of ['audio', 'cover', 'background', 'watermark']) {
    const filename = kind === 'watermark' ? project.watermark?.path : project.media[kind];
    const okay = kind === 'audio' ? /\.(mp3|wav|flac|ogg|m4a|aac|opus|aiff)$/i.test(filename || '') : kind==='watermark'?/\.(png|mp4|webm|mov)$/i.test(filename||''):/\.(png|jpg|jpeg|webp)$/i.test(filename || '');
    assets[kind] = filename && typeof filename === 'string' && okay ? authorize(filename) : null;
    if (kind === 'audio' && assets[kind]) assets[kind].probe = await probe(filename);
  }
  // Re-authorize editable montage media and corner PNGs on reopening.
  assets.montage = [];
  for (const clip of project.montage?.clips || []) {
    const f = clip.path;
    if (f && /\.(mp4|mov|webm|mkv|png|jpg|jpeg|webp)$/i.test(f)) {
      const media = authorize(f);
      if (media) assets.montage.push({ ...media, id: clip.id, mediaType: clip.mediaType });
    }
  }
  assets.corners = [];
  for (const decor of project.cornerImages || []) {
    if (decor.path && /\.(png|jpg|jpeg|webp)$/i.test(decor.path)) {
      const media = authorize(decor.path);
      if (media) assets.corners.push({...media, id: decor.id});
    }
  }
  return { project, assets, path: source };
});
ipcMain.handle('media:choose-many', async (_ev, kind) => {
  if (kind !== 'montage') throw Error('Недопустимый тип медиа');
  const result = await dialog.showOpenDialog(window, { properties:['openFile','multiSelections'], filters:[{name:'Видео и изображения',extensions:['mp4','webm','mov','mkv','png','jpg','jpeg','webp']}] });
  return result.canceled ? [] : result.filePaths.slice(0,22).map(authorize).filter(Boolean);
});
ipcMain.handle('settings:ffmpeg', async (_ev, choose = false) => {
  if (choose) {
    const res=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'FFmpeg',extensions: process.platform === 'win32' ? ['exe'] : ['*']}]});
    if (res.canceled) return {path:getSettings().ffmpeg || ''};
    const filename=res.filePaths[0];
    if (path.basename(filename).toLowerCase() !== (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')) throw Error('Выбери исполняемый файл ffmpeg');
    await fs.promises.mkdir(path.dirname(settingsFile()),{recursive:true});
    await fs.promises.writeFile(settingsFile(), JSON.stringify({...getSettings(),ffmpeg:filename},null,2));
  }
  return {path:getSettings().ffmpeg || ''};
});
ipcMain.handle('media:prepare', async (_ev, filename) => {
  const resolved = path.resolve(filename || '');
  if (!allowedPaths.has(resolved)) throw Error('Недоступный аудиофайл');
  const target = path.join(os.tmpdir(), 'pulseframe-' + randomUUID() + '.wav');
  await execTool(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', resolved, '-vn', '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', target]);
  tempFiles.add(target);
  return authorize(target);
});
ipcMain.handle('export:status', async () => {
  try { await execTool(ffmpegPath(), ['-version']); return { available: true, path: ffmpegPath() }; }
  catch (err) { return { available: false, path: ffmpegPath(), error: String(err.message) }; }
});

ipcMain.handle('export:start', async (_ev, opts) => {
  const { audioPath, fps, width, height, offset, duration, trimStart=0, trimDuration, introDuration=7, originalAudioClips=[], audioFadeIn=0, audioFadeOut=0, quality, frameFormat='png', suggestedName=null } = opts || {};
  if (!allowedPaths.has(path.resolve(audioPath || ''))) throw Error('Исходная музыка недоступна');
  if (![30, 60].includes(fps) || ![[1920, 1080], [1080, 1920]].some(pair => pair[0] === width && pair[1] === height)) throw Error('Неправильное разрешение или FPS');
  if (!Number.isFinite(duration) || duration <= 0 || duration > 7200 || !Number.isFinite(offset) || offset < 0 || offset > duration) throw Error('Неправильная длительность');
  if (!Number.isFinite(trimStart) || trimStart < 0 || !Number.isFinite(trimDuration) || trimDuration <= 0) throw Error('Неправильный музыкальный фрагмент');
  const safeName=String(suggestedName||'PulseFrame Video.mp4').replace(/[\\/:*?"<>|]/g,'_').slice(0,110);
  const chosen = await dialog.showSaveDialog(window, { defaultPath: safeName, filters: [{ name: 'MP4 Video', extensions: ['mp4'] }] });
  if (chosen.canceled) return null;
  const output = chosen.filePath.endsWith('.mp4') ? chosen.filePath : chosen.filePath + '.mp4';
  const partial = output + '.partial.mp4';
  if(!['jpeg','png'].includes(frameFormat))throw Error('Неверный формат промежуточных кадров');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', frameFormat==='jpeg'?'mjpeg':'png', '-i', 'pipe:0'];
  if (offset > 0) args.push('-itsoffset', String(offset));
  args.push('-ss', String(trimStart), '-t', String(trimDuration), '-i', audioPath);
  const mixClips=[];
  if(!Array.isArray(originalAudioClips) || originalAudioClips.length>2)throw Error('Допускается не более двух аудиовставок');
  for(const item of originalAudioClips){
    if(!allowedPaths.has(path.resolve(item.path||'')))throw Error('Медиафайл звуковой вставки недоступен');
    const info=await probe(item.path);
    if(!info?.streams?.some(st=>st.codec_type==='audio'))continue;
    const start=Math.max(0, Number(item.sourceIn)||0), len=Math.max(.1,Number(item.duration)||1),pos=Math.max(0,Number(item.start)||0);
    if(![start,len,pos].every(Number.isFinite))throw Error('Некорректные границы монтажа');
    args.push('-i',item.path);
    mixClips.push({index:1+mixClips.length,start,len,pos});
  }
  const fades=[];
  if(audioFadeIn>0)fades.push('afade=t=in:st=0:d='+Math.min(audioFadeIn,duration).toFixed(3));
  if(audioFadeOut>0)fades.push('afade=t=out:st='+Math.max(0,duration-audioFadeOut).toFixed(3)+':d='+Math.min(audioFadeOut,duration).toFixed(3));
  if(mixClips.length){
    const parts=[];
    // Background music has intro offset already from -itsoffset.
    parts.push('[1:a]aresample=async=1:first_pts=0,apad,atrim=duration='+duration+'[background]');
    const names=['[background]'];
    mixClips.forEach((c,i)=>{
      const mark='[clip'+i+']';
      const delay=Math.round((introDuration+c.pos)*1000);
      parts.push('['+(2+i)+':a]atrim=start='+c.start+':duration='+c.len+',asetpts=PTS-STARTPTS,adelay='+delay+':all=1,volume=0.48'+mark);
      names.push(mark);
    });
    parts.push(names.join('')+'amix=inputs='+names.length+':duration=longest:dropout_transition=0,atrim=duration='+duration+(fades.length?','+fades.join(','):'')+'[mix]');
    args.push('-filter_complex',parts.join(';'),'-map','0:v:0','-map','[mix]');
  }else { args.push('-map','0:v:0','-map','1:a:0');if(fades.length)args.push('-af',fades.join(',')); }
  args.push('-c:v', 'libx264', '-preset', frameFormat==='jpeg'?'superfast':'veryfast', '-crf', String(({ fast: 26, balanced: 21, high: 17 })[quality] || 21), '-pix_fmt', 'yuv420p', '-r', String(fps), '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart', '-f', 'mp4', partial);
  const child = spawn(ffmpegPath(), args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  const id = randomUUID();
  const session = { child, output, partial, error: '', closed: null, cancelled: false };
  session.closed = new Promise(resolve => {
    child.once('close', (code) => resolve(code));
    child.once('error', err => { session.error += String(err.message); resolve(-1); });
  });
  child.stderr.on('data', d => { session.error = (session.error + d.toString()).slice(-4000); });
  sessions.set(id, session);
  return { id, output };
});
ipcMain.handle('export:frame', async (_ev, { id, base64 }) => {
  const session = sessions.get(id);
  if (!session || session.cancelled || session.child.exitCode !== null || !session.child.stdin.writable) throw Error(session?.error || 'Рендер остановлен');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 16 * 1024 * 1024) throw Error('Слишком большой кадр');
  await new Promise((resolve, reject) => {
    // Callback fires after write is accepted, providing backpressure between frames.
    session.child.stdin.write(buffer, err => err ? reject(Error(session.error || err.message)) : resolve());
  });
  return true;
});
ipcMain.handle('export:finish', async (_ev, id) => {
  const session = sessions.get(id);
  if (!session) throw Error('Рендер не найден');
  if (session.child.stdin.writable) session.child.stdin.end();
  const exitCode = await session.closed;
  sessions.delete(id);
  if (exitCode !== 0 || session.cancelled) {
    try { fs.unlinkSync(session.partial); } catch {}
    throw Error('FFmpeg: ' + (session.error || 'Код ' + exitCode));
  }
  await fs.promises.rename(session.partial, session.output);
  return { output: session.output };
});
ipcMain.handle('export:cancel', async (_ev, id) => {
  const session = sessions.get(id);
  if (!session) return false;
  session.cancelled = true;
  session.child.kill('SIGTERM');
  await session.closed;
  sessions.delete(id);
  try { fs.unlinkSync(session.partial); } catch {}
  return true;
});
ipcMain.handle('system:open-external', async (_ev, url) => {
  if(!['https://fonts.google.com/specimen/Montserrat','https://fonts.google.com/specimen/Press+Start+2P','https://ffmpeg.org/legal.html','https://ko-fi.com/tihsmile','https://t.me/PulseFrameOpS','https://x.com/pulseframeops','https://github.com/pulseframeops/studio'].includes(url))throw Error('Ссылка не разрешена');
  await shell.openExternal(url);return true;
});
ipcMain.handle('system:reveal', (_ev, filename) => shell.showItemInFolder(filename));
