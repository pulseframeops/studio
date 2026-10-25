(function(){
  'use strict';
  const $=(q)=>document.querySelector(q), $$=(q)=>[...document.querySelectorAll(q)];
  const desktop=window.pulseDesktop||null;
  // Load Google Fonts without blocking offline app startup.
  queueMicrotask(()=>{const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap';document.head.appendChild(font);});
  const {clamp,timeline}=window.PFTime;
  const montage=window.PFMontage;
  const canvas=$('#preview-canvas'),audio=$('#music');
  let previewFPS=30,previewQuality='medium',lastPreviewTime=0;
  const previewSizes={low:[640,360],medium:[960,540],high:[1280,720]};
  const storedLang=window.PFI18n?.getLanguage?.()||'ru';
  const languageSelect=$('#ui-language');languageSelect.value=storedLang;
  languageSelect.addEventListener('change',()=>{project.uiLanguage=languageSelect.value;window.PFI18n.setLanguage(languageSelect.value);requestDraw();});
  const DEFAULT_SETTINGS={glow:.75,bassResponse:.85,particles:.60,shake:.35,zoom:.55,particlePauseMs:300,safeFX:false};
  const defaultProject=()=>({
    schemaVersion:2,uiLanguage:storedLang,projectName:'Без названия',media:{audio:null,cover:null,background:null},
    metadata:{title:'',artist:'',album:'',featuring:'',genre:'',year:''},
    canvas:{aspect:'16:9',fps:60},
    intro:{durationSec:7,audioStart:'with_intro',accent:'glitch',presents:'',titleGlow:.65},
    main:{preset:'neon_wave',coverPosition:'left',neonCoverPosition:'left',playerEntrance:'fade_focus',visualSettings:{...DEFAULT_SETTINGS},seed:406},
    backgroundStyle:{blur:50,dim:54,vignette:72},platforms:{show:true},
    montage:{enabled:false,clips:[],musicTrim:{start:0,end:0},retainOriginalSound:false},cornerImages:[],
    outro:{durationSec:10,platforms:[]},
    watermark:{enabled:true,mode:'system',path:null,position:'bottom-left',scale:.13,opacity:.85},effects:{manualMarkers:[]},
    shorts:window.PFShorts.defaults()
  });
  let project=defaultProject(),assets={audio:null,cover:null,background:null,watermark:null},images={cover:null,coverAccent:'#ae90ff',background:null,watermark:null,montage:new Map(),corners:new Map()};
  let analysis=null,sourceFile=null,currentTime=0,playing=false,playStarted=0,playTimeStarted=0,sceneSelection='main';
  let view='wizard',wizardStep=0,projectPath=null,dirty=false,selectedMarker=null,renderPending=false;
  let exportSession=null,exportCancelled=false,exportResultPath=null,toastTimeout;
  let montageSelected=null,montageClipboard=null,renderSyncPending=false,montageZoom=85,drawToken=0;
  let shortTime=0,shortPlayStarted=0,shortPlayTimeStarted=0;
  let history=[],redo=[];
  const $field=(name)=>$$(`[data-field="${name}"]`);
  function notify(text,error=false){const t=$('#toast');clearTimeout(toastTimeout);t.textContent=text;t.classList.toggle('error',error);t.classList.add('shown');toastTimeout=setTimeout(()=>t.classList.remove('shown'),4600);}
  function reportDirty(){desktop?.setWindowDirty?.(dirty);}
  function setDirty(){dirty=true;updateProjectTitle();reportDirty();}
  function updateProjectTitle(){const name=project.metadata.title||'Без названия';$('#project-indicator').textContent=`${name}${dirty?' •':''}`;document.title=`${name} — PulseFrame Studio`;}
  function checkpoint(){history.push(JSON.stringify(project));if(history.length>35)history.shift();redo=[];}
  function setView(next){
    if((view==='shorts')!==(next==='shorts'))pause();
    view=next;audio.volume=1;
    for(const name of ['wizard','editor','montage','shorts'])$('#'+name+'-view').classList.toggle('hidden',next!==name);
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));
    if(next==='montage'){if(currentTime<getTL().mainStart)seek(getTL().mainStart);renderMontageUI();}
    if(next==='shorts')renderShortsUI();
    if(next!=='wizard')requestDraw();
  }
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  function showStep(step){wizardStep=clamp(step,0,4);$$('[data-page]').forEach(p=>p.classList.toggle('visible',Number(p.dataset.page)===wizardStep));$$('[data-step]').forEach(b=>{const i=Number(b.dataset.step);b.classList.toggle('active',i===wizardStep);b.classList.toggle('completed',i<wizardStep);});$('#wizard-prev').disabled=wizardStep===0;$('#wizard-next').style.display=wizardStep===4?'none':'';$('#wizard-message').textContent='';refreshSummary();}
  function validateStep(s){if(s===0&&!analysis)return 'Сначала выбери музыкальный файл';if(s===1&&(!project.metadata.title.trim()||!project.metadata.artist.trim()))return 'Введи название трека и исполнителя';if(s===2&&!images.cover)return 'Добавь обложку трека';return '';}
  $('#wizard-next').addEventListener('click',()=>{const err=validateStep(wizardStep);if(err){$('#wizard-message').textContent=err;return;}showStep(wizardStep+1);});
  $('#wizard-prev').addEventListener('click',()=>showStep(wizardStep-1));
  $$('[data-step]').forEach(b=>b.addEventListener('click',()=>{const dest=Number(b.dataset.step);for(let i=0;i<dest;i++){const err=validateStep(i);if(err){$('#wizard-message').textContent=err;return;}}showStep(dest);}));
  $('#go-editor').addEventListener('click',()=>setView('editor'));
  $('#preview-setup').addEventListener('click',()=>setView('wizard'));
  function refreshSummary(){const d=analysis?.duration||0,tl=timeline(project,d);$('#wizard-summary').innerHTML=`<b>Трек:</b> ${esc(project.metadata.title||'Не указан')} · ${esc(project.metadata.artist||'Исполнитель')}<br><b>Длительность:</b> ${timeFmt(d)} / видео ${timeFmt(tl.total)}<br><b>Визуал:</b> ${esc(project.main.preset)}<br><b>Интро:</b> ${project.intro.durationSec} c · ${project.intro.audioStart==='after_intro'?'музыка после':'музыка сразу'}<br><b>Формат:</b> ${project.canvas.aspect} · MP4 до 1080p / 60 FPS`;
    if(!tl.valid&&d>0)$('#wizard-summary').innerHTML+='<br><span style="color:#f4a0aa">Для такого короткого трека нужно уменьшить длительность интро или аутро.</span>';
  }
  function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
  function timeFmt(n){n=Math.max(0,Number(n)||0);const m=Math.floor(n/60),s=Math.floor(n%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  const FIELD_GET={title:()=>project.metadata.title,artist:()=>project.metadata.artist,album:()=>project.metadata.album,featuring:()=>project.metadata.featuring,genre:()=>project.metadata.genre,year:()=>project.metadata.year,
    preset:()=>project.main.preset,introDuration:()=>project.intro.durationSec,introAccent:()=>project.intro.accent,presents:()=>project.intro.presents||"",titleGlow:()=>Math.round((project.intro.titleGlow??.65)*100),audioStart:()=>project.intro.audioStart,entrance:()=>project.main.playerEntrance,outroDuration:()=>project.outro.durationSec,aspect:()=>project.canvas.aspect,coverPosition:()=>project.main.coverPosition,platforms:()=>project.outro.platforms.join('\n'),safeFX:()=>project.main.visualSettings.safeFX,watermarkEnabled:()=>project.watermark.mode!=='off',watermarkMode:()=>project.watermark.mode||'system',watermarkPosition:()=>project.watermark.position,watermarkScale:()=>Math.round(project.watermark.scale*100),watermarkOpacity:()=>Math.round(project.watermark.opacity*100),showLogos:()=>project.platforms.show};
  // Montagem centers its cover only in the renderer. The Neon position is an
  // independent preference and must survive any number of preset switches.
  function switchPreset(next){
    if(!['neon_wave','montagem'].includes(next))return;
    if(next==='montagem' && project.main.preset!=='montagem'){
      project.main.neonCoverPosition=project.main.coverPosition||'left';
    } else if(next==='neon_wave' && project.main.preset==='montagem'){
      project.main.coverPosition=project.main.neonCoverPosition||'left';
    }
    project.main.preset=next;
  }
  function setField(name,v){
    if(playing&&['audioStart','introDuration','outroDuration'].includes(name))pause();
    if(['title','artist','album','featuring','genre','year'].includes(name))project.metadata[name]=String(v);
    else if(name==='preset'){switchPreset(v);}
    else if(name==='introDuration')project.intro.durationSec=clamp(Number(v)||2,2,30);
    else if(name==='outroDuration')project.outro.durationSec=clamp(Number(v)||2,2,30);
    else if(name==='introAccent')project.intro.accent=v;
    else if(name==='presents')project.intro.presents=v;
    else if(name==='titleGlow')project.intro.titleGlow=clamp(Number(v)/100,0,1);
    else if(name==='audioStart')project.intro.audioStart=v;
    else if(name==='entrance')project.main.playerEntrance=v;
    else if(name==='aspect')project.canvas.aspect=v;
    else if(name==='coverPosition'&&project.main.preset==='neon_wave'){project.main.coverPosition=v;project.main.neonCoverPosition=v;}
    else if(name==='platforms')project.outro.platforms=String(v).split(/[\n,]/).map(s=>s.trim()).filter(Boolean).slice(0,12);
    else if(name==='safeFX')project.main.visualSettings.safeFX=!!v;
    else if(name==='watermarkEnabled'){project.watermark.enabled=!!v;project.watermark.mode=v?'system':'off';}
    else if(name==='watermarkMode'){project.watermark.mode=v;project.watermark.enabled=v!=='off';}
    else if(name==='watermarkPosition')project.watermark.position=v;
    else if(name==='watermarkScale')project.watermark.scale=Number(v)/100;
    else if(name==='watermarkOpacity')project.watermark.opacity=Number(v)/100;
    else if(name==='showLogos')project.platforms.show=!!v;
    setDirty();afterConfigChange();
  }
  function refreshFields(){if($('#particle-pause-ms')){$('#particle-pause-ms').value=project.main.visualSettings.particlePauseMs??300;$('#particle-pause-note').textContent=($('#particle-pause-ms').value)+' мс';}for(const [name,getter] of Object.entries(FIELD_GET)){
    const value=getter();for(const el of $field(name)){
      if(el.type==='checkbox')el.checked=!!value;
      else if(document.activeElement!==el&&el.value!==String(value))el.value=value;
    }
  }
    $$('[data-preset]').forEach(b=>b.classList.toggle('selected',b.dataset.preset===project.main.preset));
    $field('coverPosition').forEach(el=>{
      el.disabled=project.main.preset==='montagem';
      el.title=el.disabled?'В Montagem обложка всегда по центру. Положение Neon сохранено.':'Положение обложки в Neon';
    });
    $$('[data-bg]').forEach(el=>{el.value=project.backgroundStyle?.[el.dataset.bg]??50;});
    $$('#sliders input[type=range]').forEach(el=>{el.value=Math.round((project.main.visualSettings[el.dataset.setting]||0)*100);const lbl=el.closest('.slider-wrap').querySelector('.slider-top b');lbl.textContent=el.value+'%';});
  }
  for(const name of Object.keys(FIELD_GET))$field(name).forEach(el=>{
    const ev=el.tagName==='SELECT'||el.type==='checkbox'?'change':'input';
    el.addEventListener(ev,()=>{checkpoint();setField(name,el.type==='checkbox'?el.checked:el.value);$field(name).forEach(other=>{if(other!==el){if(other.type==='checkbox')other.checked=el.checked;else other.value=el.value;}});});
  });
  const settings=[['glow','Свечение'],['bassResponse','Реакция на бас'],['particles','Частицы'],['shake','Тряска экрана'],['zoom','Приближение']];
  $('#sliders').innerHTML=settings.map(([key,label])=>`<div class="slider-wrap"><div class="slider-top"><span>${label}</span><b>0%</b></div><input aria-label="${label}" type="range" min="0" max="100" data-setting="${key}"></div>`).join('');
  $$('#sliders [data-setting]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.setting;project.main.visualSettings[key]=Number(el.value)/100;el.closest('.slider-wrap').querySelector('b').textContent=el.value+'%';setDirty();requestDraw();}));
  $$('[data-preset]').forEach(el=>el.addEventListener('click',()=>{checkpoint();switchPreset(el.dataset.preset);setDirty();refreshFields();requestDraw();}));
  $$('[data-bg]').forEach(el=>el.addEventListener('input',()=>{project.backgroundStyle[el.dataset.bg]=Number(el.value);setDirty();requestDraw();}));
  function afterConfigChange(){const tl=timeline(project,analysis?.duration||0);if(currentTime>tl.total)currentTime=tl.total;
    updateAspect();renderTimeline();refreshSummary();refreshFields();requestDraw();}
  function updateAspect(){const portrait=project.canvas.aspect==='9:16',dims=previewSizes[previewQuality]||previewSizes.medium;for(const c of [canvas,$('#montage-canvas')]){c.width=portrait?dims[1]:dims[0];c.height=portrait?dims[0]:dims[1];c.style.aspectRatio=portrait?'9 / 16':'16 / 9';}$('#dimension-badge').textContent=project.canvas.aspect;}
  $('#preview-quality')?.addEventListener('change',e=>{previewQuality=e.target.value;updateAspect();requestDraw();});
  $('#preview-fps')?.addEventListener('change',e=>{previewFPS=Number(e.target.value)||30;lastPreviewTime=0;requestDraw();});
  $('#particle-pause-ms').addEventListener('input',e=>{project.main.visualSettings.particlePauseMs=Number(e.target.value);$('#particle-pause-note').textContent=e.target.value+' мс';setDirty();requestDraw();});
  async function loadSafeImage(data){
    // Never draw cross-origin custom-scheme URLs directly into an export canvas.
    // Fetch bytes and create an own-origin blob: URL. A decode check catches broken images.
    const blob=data.blob || await (await fetch(data.url,{mode:'cors'})).blob();
    const safeUrl=URL.createObjectURL(blob);
    const image=new Image();image.decoding='async';
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Невозможно декодировать изображение'));image.src=safeUrl;});
      if(image.decode)await image.decode().catch(()=>{});
      return {element:image,safeUrl};
    }catch(e){URL.revokeObjectURL(safeUrl);throw e;}
  }
  function detectCoverAccent(image){
    // Pick a vivid, non-white/dark dominant hue from a sample of the cover.
    const c=document.createElement('canvas');c.width=72;c.height=72;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,72,72);
    const bytes=x.getImageData(0,0,72,72).data,bins=new Map();
    for(let i=0;i<bytes.length;i+=16){
      if(bytes[i+3]<170)continue;
      const rgb=[bytes[i],bytes[i+1],bytes[i+2]],max=Math.max(...rgb),min=Math.min(...rgb);
      if(max<46||max-min<28)continue;
      const key=rgb.map(v=>Math.min(255,Math.round(v/32)*32)).join(',');
      bins.set(key,(bins.get(key)||0)+(max-min)/255*(max/255));
    }
    const key=[...bins].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(!key)return '#ae90ff';
    const channel=key.split(',').map(Number);return '#'+channel.map(c=>Math.min(255,Math.round(c*.78+55)).toString(16).padStart(2,'0')).join('');
  }
  async function setAsset(kind,data,blob){
    if(!data)return;
    if(kind==='watermark'&&images.watermark?.tagName==='VIDEO'){images.watermark.pause();images.watermark.removeAttribute('src');}
    if(assets[kind]?.safeUrl)URL.revokeObjectURL(assets[kind].safeUrl);
    if(assets[kind]?.localUrl)URL.revokeObjectURL(assets[kind].localUrl);
    assets[kind]=data;
    if(['cover','background','watermark'].includes(kind)){
      if(kind==='watermark'&&(/\.(mp4|webm|mov)$/i.test(data.name)||blob?.type?.startsWith('video/'))){
        const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.loop=true;video.crossOrigin='anonymous';video.src=data.url;
        try{await new Promise((ok,fail)=>{video.onloadeddata=ok;video.onerror=()=>fail(Error('Невозможно декодировать видео'));video.load();});images.watermark=video;data.isVideo=true;
          $('#watermark-filename').textContent=data.name;project.watermark.path=data.path||null;project.watermark.mode='video';project.watermark.enabled=true;refreshFields();
        }catch(e){notify('Видео-водяной знак: '+e.message,true);}
        setDirty();requestDraw();return;
      }
      try{
        const loaded=await loadSafeImage({...data,blob});
        if(assets[kind]!==data){URL.revokeObjectURL(loaded.safeUrl);return;}
        data.safeUrl=loaded.safeUrl;images[kind]=loaded.element;
        if(kind==='cover')images.coverAccent=detectCoverAccent(loaded.element);
        const label=$(`#${kind}-filename`);if(label)label.textContent=data.name;
        const thumb=$(`#${kind}-thumb`);if(thumb){thumb.style.backgroundImage=`url("${loaded.safeUrl}")`;thumb.textContent='';}
      }catch(e){images[kind]=null;notify('Не удалось открыть '+kind+': '+e.message,true);}
      if(kind==='watermark'){project.watermark.path=data.path||null;data.isVideo=false;project.watermark.mode='image';project.watermark.enabled=true;refreshFields();}
    }
    if(kind!=='watermark')project.media[kind]=data.path||null;
    if(kind==='audio'){
      analysis=null;audio.pause();playing=false;audio.src=data.url;audio.load();currentTime=0;
      $('#audio-filename').textContent=data.name;$('#file-stats').textContent='Анализируем музыку…';
      const probe=data.probe?.format;
      if(probe?.tags){const tags=probe.tags;const find=(k)=>Object.keys(tags).find(x=>x.toLowerCase()===k);if(!project.metadata.title&&find('title'))project.metadata.title=tags[find('title')];if(!project.metadata.artist&&find('artist'))project.metadata.artist=tags[find('artist')];}
    }
    setDirty();refreshFields();requestDraw();
  }
  async function loadAudioAsset(data,blob){
    await setAsset('audio',data,blob);
    try{
      const target=blob||await (await fetch(data.url)).blob();
      sourceFile=target;
      const result=await window.PFAudio.analyze(target,p=>{$('#file-stats').textContent=`Анализ частот: ${Math.round(p*100)}%`;});
      // If a second track was chosen during analysis, discard stale results.
      if(assets.audio!==data)return;
      analysis=result;
      $('#file-stats').textContent=`${timeFmt(result.duration)} · ${Math.round(result.sampleRate/1000)} кГц · ${result.channels} кан. · ${result.markers.length} автоакцентов`;
      if(!project.metadata.title)project.metadata.title=data.name.replace(/\.[^.]+$/,'');
      refreshFields();afterConfigChange();$('#preview-empty').classList.add('hidden');notify('Музыка загружена и проанализирована');
    }catch(err){
      if(assets.audio!==data)return;
      if(desktop&&data.path){
        try {$('#file-stats').textContent='Конвертируем в WAV через FFmpeg…';const wav=await desktop.prepareAudio(data.path);const previewBlob=await(await fetch(wav.url)).blob();const result=await window.PFAudio.analyze(previewBlob);
          if(assets.audio!==data)return;analysis=result;sourceFile=previewBlob;audio.src=wav.url;audio.load();afterConfigChange();$('#preview-empty').classList.add('hidden');$('#file-stats').textContent=`${timeFmt(result.duration)} · декодировано через FFmpeg`;notify('Музыка подготовлена');return;
        }catch(e){err=e;}
      }
      $('#file-stats').textContent='Ошибка чтения музыки';notify('Не удалось декодировать звук: '+err.message,true);
    }
  }
  async function choose(kind){
    try{
      if(desktop){const data=await desktop.selectMedia(kind);if(!data)return;
        if(kind==='audio')await loadAudioAsset(data);else await setAsset(kind,data);
      }else $(`#file-${kind}`).click();
    }catch(e){notify('Ошибка импорта: '+e.message,true);}
  }
  $('#audio-drop').addEventListener('click',()=>choose('audio'));
  $('#cover-drop').addEventListener('click',()=>choose('cover'));
  $('#background-drop').addEventListener('click',()=>choose('background'));
  for(const kind of ['audio','cover','background','watermark']){
    $(`#file-${kind}`).addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;
      const url=URL.createObjectURL(file),data={url,localUrl:url,path:null,name:file.name};
      if(kind==='audio')await loadAudioAsset(data,file);else await setAsset(kind,data,file);
      ev.target.value='';
    });
  }
  // Drag & drop lets the first media file replace its matching asset.
  document.addEventListener('dragover',ev=>{if(ev.dataTransfer?.types?.includes('Files'))ev.preventDefault();});
  document.addEventListener('drop',async ev=>{const file=ev.dataTransfer?.files?.[0];if(!file)return;ev.preventDefault();const lower=file.name.toLowerCase();
    const kind=/\.(png|jpe?g|webp)$/.test(lower)?'cover':'audio';const url=URL.createObjectURL(file),data={url,localUrl:url,path:null,name:file.name};if(kind==='audio')await loadAudioAsset(data,file);else await setAsset(kind,data,file);
  });
  function isVideo(name){return /\.(mp4|mov|webm|mkv)$/i.test(name||'');}
  function nextClipId(){return (crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));}
  async function importMontage(data,restore=false){
    const type=data.mediaType||(isVideo(data.name)?'video':'image');
    const clips=project.montage.clips;
    if(!restore){
      if(clips.length>=22)throw Error('В монтажной дорожке может быть не более 22 фрагментов');
      const primary=type==='video'&&clips.filter(c=>c.role==='primary').length<2;
      const role=primary?'primary':'cut';
      if(!primary&&clips.filter(c=>c.role==='cut').length>=20)throw Error('Лимит: 20 дополнительных фрагментов');
      const last=clips.reduce((max,c)=>Math.max(max,c.start+c.duration),0);
      const duration=type==='image'?3:5;
      const clip={id:nextClipId(),role,mediaType:type,name:data.name,path:data.path||null,start:Math.round(last*10)/10,duration,sourceIn:0,effect:role==='cut'?'flash':'none',transition:role==='cut'?'fade':'cut',transitionDuration:.4};
      clips.push(clip);data={...data,id:clip.id};montageSelected=clip.id;
      project.montage.enabled=true;switchPreset('montagem');refreshFields();
      setDirty();
    }
    const id=data.id;
    const blob=await (await fetch(data.url,{mode:'cors'})).blob();
    const safeUrl=URL.createObjectURL(blob);
    const el=type==='video'?document.createElement('video'):new Image();
    if(type==='video'){
      el.preload='auto';el.muted=true;el.playsInline=true;el.src=safeUrl;
      await new Promise((resolve,reject)=>{if(el.readyState>=1)return resolve();el.addEventListener('loadedmetadata',resolve,{once:true});el.addEventListener('error',()=>reject(Error('Не удалось открыть видео')),{once:true});setTimeout(()=>reject(Error('Таймаут загрузки видео')),15000);});
      el.addEventListener('seeked',()=>{if(!playing)requestDraw();});
      const clip=clips.find(c=>c.id===id);
      if(clip&&!restore)clip.duration=Math.min(5,Math.max(.3,(Number(el.duration)||5)-clip.sourceIn));
    }else{
      el.src=safeUrl;
      await new Promise((resolve,reject)=>{el.onload=resolve;el.onerror=()=>reject(Error('Нельзя открыть изображение'));});
    }
    images.montage.set(id,{element:el,safeUrl,duration:type==='video'?el.duration:null,mediaType:type});
    renderMontageUI();requestDraw();
  }
  async function importCorner(data,restore=false){
    if(!restore){if(project.cornerImages.length>=12)throw Error('Лимит: 12 декоративных изображений');
      data={...data,id:nextClipId()};project.cornerImages.push({id:data.id,name:data.name,path:data.path||null,anchor:'bottom-left',offsetX:0,offsetY:0,scale:.12,opacity:1});setDirty();}
    const loaded=await loadSafeImage(data);
    images.corners.set(data.id,loaded.element);
    renderCornerUI();requestDraw();
  }
  async function chooseMontage(){
    try{
      const list=desktop?await desktop.selectMany('montage'):null;
      if(!desktop){$('#file-montage').click();return;}
      for(const item of list||[])await importMontage(item);
    }catch(e){notify('Монтаж: '+e.message,true);}
  }
  $('#montage-add').addEventListener('click',chooseMontage);
  $('#file-montage').addEventListener('change',async(ev)=>{
    for(const file of [...ev.target.files]){
      try{const url=URL.createObjectURL(file);await importMontage({url,localUrl:url,blob:file,name:file.name,path:null});}
      catch(e){notify('Импорт: '+e.message,true);}
    }
    ev.target.value='';
  });
  $('#watermark-choose').addEventListener('click',()=>{if(!desktop)$('#file-watermark').click();else choose('watermark');});
  $('#corner-add').addEventListener('click',async()=>{
    if(desktop){try{const data=await desktop.selectMedia('corner');if(data)await importCorner(data);}catch(e){notify('Картинка: '+e.message,true);}}
    else $('#file-corner').click();
  });
  $('#file-corner').addEventListener('change',async(ev)=>{
    const f=ev.target.files[0];if(f){const url=URL.createObjectURL(f);try{await importCorner({url,localUrl:url,blob:f,name:f.name});}catch(e){notify(e.message,true);}}
    ev.target.value='';
  });
  $('#edit-montage').addEventListener('click',()=>{switchPreset('montagem');refreshFields();setView('montage');});
  $('#montage-back').addEventListener('click',()=>setView('editor'));
  $('#montage-play').addEventListener('click',()=>playing?pause():play());
  $('#montage-enabled').addEventListener('change',ev=>{project.montage.enabled=ev.target.checked;setDirty();requestDraw();});
  $('#montage-original-audio').addEventListener('change',ev=>{project.montage.retainOriginalSound=ev.target.checked;setDirty();});
  function selectedClip(){return project.montage.clips.find(c=>c.id===montageSelected);}
  function renderMontageUI(){
    $('#montage-enabled').checked=!!project.montage.enabled;$('#montage-original-audio').checked=!!project.montage.retainOriginalSound;
    $('#trim-start').value=project.montage.musicTrim.start||0;$('#trim-end').value=project.montage.musicTrim.end||0;
    $('#montage-zoom').value=montageZoom;
    const clips=montage.clipsOf(project),seq=montage.cutSequence(project),span=seq.length,mainLength=Math.max(0,getTL().outroStart-getTL().mainStart);
    $('#montage-loop-info').textContent=span>0?`Зациклены ТОЛЬКО НАРЕЗКИ: ${span.toFixed(1)} с, начиная с ${seq.start.toFixed(1)} с → до конца основной сцены`:(clips.length?'Главные видео играют один раз. Добавь нарезки для повтора.':'Главные видео играют один раз. Зацикливаются только нарезки.');
    $('#montage-media-list').innerHTML=clips.length?clips.map(c=>`<button type="button" data-montage-item="${esc(c.id)}" class="${c.id===montageSelected?'active':''}">${c.role==='primary'?'ГЛАВНЫЙ':'ВСТАВКА'} · ${esc(c.name||'Медиа')}<br><small>${c.start.toFixed(1)}–${(c.start+c.duration).toFixed(1)} сек. · ${esc(c.transition||'cut')}</small></button>`).join(''):'<small>Пока нет фрагментов.</small>';
    const scroll=$('#montage-scroll'),savedScroll=scroll.scrollLeft;
    const visibleLength=Math.max(12,mainLength,span*2),width=Math.max(680,Math.ceil(visibleLength*montageZoom)+120);
    const rulerStep=montageZoom<50?10:montageZoom<100?5:2;
    const ticks=Array.from({length:Math.min(360,Math.ceil(visibleLength/rulerStep)+1)},(_,i)=>{const sec=i*rulerStep;return `<span class="montage-ruler-tick" style="left:${Math.round(sec*montageZoom)}px">${timeFmt(sec)}</span>`;}).join('');
    const layer=(role,y)=>clips.filter(c=>c.role===role).map(c=>`<button type="button" data-montage-clip="${esc(c.id)}" class="montage-tl-clip ${role} ${c.id===montageSelected?'active':''}" style="left:${c.start*montageZoom}px;top:${y}px;width:${Math.max(5,c.duration*montageZoom)}px" title="${esc(c.name)} · ${c.duration.toFixed(1)} с">${esc(c.name)}<span>${c.duration.toFixed(1)} с</span></button>`).join('');
    const transitions=clips.filter(c=>(c.transition||'cut')!=='cut').map(c=>`<button class="montage-tl-transition" data-montage-clip="${esc(c.id)}" title="Переход: ${esc(c.transition)}" style="left:${c.start*montageZoom-11}px;top:170px">◆</button>`).join('');
    let loops='';if(span>0){const n=Math.min(220,Math.ceil(Math.max(0,mainLength-seq.start)/span));for(let i=1;i<n;i++){const from=seq.start+i*span;const dur=Math.min(span,mainLength-from);if(dur>0)loops+=`<div class="montage-loop-block" style="left:${from*montageZoom}px;width:${dur*montageZoom}px;top:202px">↻ НАРЕЗКИ ${i+1}</div>`;}}
    $('#montage-track').style.width=width+'px';
    $('#montage-track').innerHTML=`<div class="montage-ruler-row" data-montage-seek="1">${ticks}</div><div class="montage-tl-lane" style="top:32px"></div><div class="montage-tl-lane" style="top:97px"></div><div class="montage-tl-lane" style="top:162px"></div><div class="montage-tl-lane" style="top:198px"></div>${layer('primary',40)}${layer('cut',105)}${transitions}${loops}<div class="montage-playhead" id="montage-playhead" style="left:${Math.max(0,currentTime-getTL().mainStart)*montageZoom}px"></div>`;
    $('#montage-media-list').querySelectorAll('[data-montage-item]').forEach(el=>el.addEventListener('click',()=>selectMontageClip(el.dataset.montageItem)));
    $('#montage-track').querySelectorAll('[data-montage-clip]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();selectMontageClip(el.dataset.montageClip);}));
    $('#montage-track').querySelector('[data-montage-seek]').addEventListener('click',ev=>{const r=ev.currentTarget.getBoundingClientRect();seek(getTL().mainStart+clamp((ev.clientX-r.left)/montageZoom,0,mainLength));});
    scroll.scrollLeft=savedScroll;
    const clip=selectedClip();
    for(const id of ['montage-clip-start','montage-clip-duration','montage-effect','montage-transition'])$('#'+id).disabled=!clip;
    if(clip){$('#montage-clip-start').value=clip.start;$('#montage-clip-duration').value=clip.duration;$('#montage-effect').value=clip.effect||'none';$('#montage-transition').value=clip.transition||'cut';}
    renderCornerUI();updateMontagePlayhead();
  }
  function updateMontagePlayhead(){const cursor=$('#montage-playhead');if(cursor)cursor.style.left=(Math.max(0,currentTime-getTL().mainStart)*montageZoom)+'px';}
  $('#montage-zoom').addEventListener('input',ev=>{montageZoom=Number(ev.target.value);renderMontageUI();});
  function selectMontageClip(id){montageSelected=id;const clip=selectedClip();if(clip)seek(getTL().mainStart+clip.start+.05);renderMontageUI();}
  for(const [key,property] of [['montage-clip-start','start'],['montage-clip-duration','duration'],['montage-effect','effect'],['montage-transition','transition']]){
    $('#'+key).addEventListener('change',ev=>{
      const c=selectedClip();if(!c)return;checkpoint();
      c[property]=['effect','transition'].includes(property)?ev.target.value:Math.max(property==='duration'?.2:0,Number(ev.target.value)||0);
      if(property==='duration'){const m=images.montage.get(c.id);if(m?.mediaType==='video'&&Number.isFinite(m.duration))c.duration=Math.min(c.duration,Math.max(.2,m.duration-c.sourceIn));}
      setDirty();renderMontageUI();requestDraw();
    });
  }
  for(const [id,k] of [['trim-start','start'],['trim-end','end']])$('#'+id).addEventListener('change',e=>{
    if(!analysis)return;checkpoint();project.montage.musicTrim[k]=Math.max(0,Number(e.target.value)||0);
    if(project.montage.musicTrim.end>0&&project.montage.musicTrim.end<=project.montage.musicTrim.start){notify('Конец фрагмента должен быть позже начала',true);project.montage.musicTrim[k]=0;}
    pause();seek(0);setDirty();afterConfigChange();renderMontageUI();
  });
  function splitSelected(){const c=selectedClip();if(!c)return notify('Выбери клип, который нужно разрезать');
    if(project.montage.clips.length>=22)return notify('Достигнут лимит 22 фрагментов',true);
    const at=currentTime-getTL().mainStart,dt=at-c.start;
    if(dt<.2||dt>c.duration-.2)return notify('Поставь курсор внутри клипа, не у края',true);
    if(c.role==='primary'&&project.montage.clips.filter(x=>x.role==='cut').length>=20)return notify('Лимит дополнительных фрагментов',true);
    checkpoint();const clone={...c,id:nextClipId(),role:'cut',sourceIn:c.sourceIn+dt,start:at,duration:c.duration-dt};c.duration=dt;
    project.montage.clips.push(clone);images.montage.set(clone.id,images.montage.get(c.id));montageSelected=clone.id;
    setDirty();renderMontageUI();notify('Фрагмент разделён');
  }
  function copySelected(){const c=selectedClip();if(!c)return notify('Сначала выбери фрагмент');montageClipboard={...c};notify('Фрагмент скопирован');}
  function pasteSelected(){if(!montageClipboard)return notify('Нечего вставлять');
    if(project.montage.clips.length>=22||project.montage.clips.filter(x=>x.role==='cut').length>=20)return notify('Лимит фрагментов',true);
    checkpoint();const id=nextClipId();const clip={...montageClipboard,id,role:'cut',start:Math.max(0,currentTime-getTL().mainStart)};
    project.montage.clips.push(clip);images.montage.set(id,images.montage.get(montageClipboard.id));montageSelected=id;
    setDirty();renderMontageUI();notify('Фрагмент вставлен');
  }
  function deleteSelected(){if(!selectedClip())return;checkpoint();project.montage.clips=project.montage.clips.filter(c=>c.id!==montageSelected);montageSelected=null;setDirty();renderMontageUI();requestDraw();}
  $('#montage-split').addEventListener('click',splitSelected);$('#montage-copy').addEventListener('click',copySelected);$('#montage-paste').addEventListener('click',pasteSelected);$('#montage-delete').addEventListener('click',deleteSelected);
  function renderCornerUI(){const root=$('#corner-list');root.innerHTML=(project.cornerImages||[]).map(d=>`<div data-corner="${esc(d.id)}"><small>${esc(d.name||'Картинка')}</small><select data-key="anchor"><option value="bottom-left">Снизу слева</option><option value="bottom-right">Снизу справа</option><option value="top-left">Сверху слева</option><option value="top-right">Сверху справа</option></select><input data-key="offsetX" type="number" title="Смещение по X" style="width:65px" value="${d.offsetX||0}"><input data-key="offsetY" type="number" title="Смещение по Y" style="width:65px" value="${d.offsetY||0}"><input data-key="scale" type="number" min="3" max="30" title="Размер %" style="width:65px" value="${Math.round((d.scale||.12)*100)}"><button type="button" class="subtle mini" data-remove="1">×</button></div>`).join('');
    for(const row of root.children){const d=project.cornerImages.find(x=>x.id===row.dataset.corner);if(!d)continue;
      row.querySelector('select').value=d.anchor||'bottom-left';
      row.querySelectorAll('[data-key]').forEach(input=>input.addEventListener('change',()=>{checkpoint();d[input.dataset.key]=input.dataset.key==='anchor'?input.value:input.dataset.key==='scale'?Math.max(.03,Math.min(.3,Number(input.value)/100)):Number(input.value)||0;setDirty();requestDraw();}));
      row.querySelector('[data-remove]').addEventListener('click',()=>{checkpoint();project.cornerImages=project.cornerImages.filter(x=>x.id!==d.id);images.corners.delete(d.id);setDirty();renderCornerUI();requestDraw();});
    }
  }
  function shortBuild(){return window.PFShorts.makeRenderProject(project,analysis?.duration||0);}
  function shortsLimits(){return window.PFShorts.limits(project.shorts,analysis?.duration||0);}
  function renderShortsUI(){
    const info=shortsLimits(),s=project.shorts;
    for(const [id,value] of [['shorts-start',s.start],['shorts-duration',s.duration],['shorts-intro-duration',s.introDuration],['shorts-outro-duration',s.outroDuration],['shorts-release-date',s.releaseDate],['shorts-frame-zoom',s.frameZoom||1],['shorts-frame-x',s.frameX||0],['shorts-frame-y',s.frameY||0],['shorts-bg-zoom',s.bgZoom??1.15],['shorts-bg-x',s.bgX||0],['shorts-bg-y',s.bgY||0]]){
      const input=$('#'+id);if(document.activeElement!==input||id==='shorts-duration'||id==='shorts-start'||id==='shorts-intro-duration'||id==='shorts-outro-duration')input.value=value??'';
    }
    $('#shorts-duration').max=String(Math.min(30,analysis?.duration||30));
    $('#shorts-start').max=String(Math.max(0,(analysis?.duration||0)-info.duration));
    $('#shorts-length-note').textContent=!info.valid?'Для анонса нужен трек длиной хотя бы 10 секунд.':
      `Отрезок ${info.duration.toFixed(1)} сек. · от ${info.start.toFixed(1)} до ${(info.start+info.duration).toFixed(1)} сек. ${info.duration<15?'Рекомендуется от 15 сек.':''}`;
    $('#shorts-release-note').textContent='На аутро: '+(s.releaseDate?`РЕЛИЗ ${window.PFShorts.outroLabel(s)}`:'СКОРО НА ПЛОЩАДКАХ');
    $('#shorts-no-audio').classList.toggle('hidden',Boolean(info.valid&&images.cover));
    $('#shorts-fx-add').disabled=!info.valid;
    $('#shorts-intro-band').style.width=info.valid?info.intro/info.total*100+'%':'0%';
    $('#shorts-main-band').style.width=info.valid?(info.outroStart-info.intro)/info.total*100+'%':'0%';
    $('#shorts-outro-band').style.width=info.valid?info.outro/info.total*100+'%':'0%';
    $('#shorts-fx-points').innerHTML=(s.effects||[]).map(e=>`<span class="shorts-fx-point" title="${esc(e.kind)} @ ${e.time.toFixed(2)}s" style="left:${clamp(e.time/Math.max(.1,info.total)*100,0,99)}%"><span class="fx-pixel"></span></span>`).join('');
    $('#shorts-effects-list').innerHTML=(s.effects||[]).length?s.effects.map(e=>`<div class="shorts-fx-item"><span>${esc(e.kind)} · ${e.time.toFixed(2)} сек.</span><button data-short-fx-remove="${esc(e.id)}" type="button">×</button></div>`).join(''):'<small>Нет эффектов. Можно оставить пустым.</small>';
    $$('[data-short-fx-remove]').forEach(b=>b.addEventListener('click',()=>{checkpoint();s.effects=s.effects.filter(e=>e.id!==b.dataset.shortFxRemove);setDirty();renderShortsUI();requestDraw();}));
    updateShortsTransport();
  }
  function updateShortsTransport(){
    const info=shortsLimits();$('#shorts-clock').textContent=timeFmt(shortTime)+' / '+timeFmt(info.total||0);
    $('#shorts-playhead').style.left=(info.total?clamp(shortTime/info.total*100,0,100):0)+'%';
    $('#shorts-play').innerHTML='<img src="assets/icons/'+(playing&&view==='shorts'?'pause':'play')+'.png" class="ui-icon" alt="">';
  }
  const shortInputs=[['shorts-start','start'],['shorts-duration','duration'],['shorts-intro-duration','introDuration'],['shorts-outro-duration','outroDuration'],['shorts-release-date','releaseDate'],['shorts-frame-zoom','frameZoom'],['shorts-frame-x','frameX'],['shorts-frame-y','frameY'],['shorts-bg-zoom','bgZoom'],['shorts-bg-x','bgX'],['shorts-bg-y','bgY']];
  for(const [id,key] of shortInputs)$('#'+id).addEventListener('change',ev=>{
    if(playing)pause();checkpoint();
    project.shorts[key]=['introAccent','introText','releaseDate'].includes(key)?ev.target.value:Number(ev.target.value);
    const info=shortsLimits();project.shorts.start=info.start;
    if(info.valid){project.shorts.duration=info.duration;project.shorts.introDuration=info.intro;project.shorts.outroDuration=info.outro;}
    shortTime=Math.min(shortTime,info.total);setDirty();renderShortsUI();requestDraw();
  });
  $('#shorts-fx-strength').addEventListener('input',ev=>$('#shorts-fx-strength-value').textContent=ev.target.value+'%');
  $('#shorts-fx-add').addEventListener('click',()=>{
    const info=shortsLimits();if(!info.valid)return notify('Нужна музыка длиной минимум 10 секунд',true);
    if(shortTime<info.mainStart||shortTime>=info.outroStart)return notify('Эффекты добавляются на основную сцену, между интро и аутро',true);
    checkpoint();project.shorts.effects.push({id:nextClipId(),time:Math.round(shortTime*100)/100,kind:$('#shorts-fx-kind').value,strength:Number($('#shorts-fx-strength').value)/100});
    setDirty();renderShortsUI();requestDraw();notify('Эффект добавлен в анонс');
  });
  function seekShort(t){
    const s=shortsLimits();shortTime=clamp(t,0,s.total);
    if(analysis&&Math.abs(audio.currentTime-(s.start+shortTime))>.05)audio.currentTime=clamp(s.start+shortTime,0,Math.max(0,analysis.duration-.01));
    if(playing){shortPlayTimeStarted=shortTime;shortPlayStarted=performance.now();}
    requestDraw();
  }
  async function playShort(){
    const s=shortsLimits();if(!s.valid||!images.cover)return notify('Для анонса добавь музыку (от 10 сек.) и обложку',true);
    if(shortTime>=s.total-.05)seekShort(0);
    playing=true;shortPlayTimeStarted=shortTime;shortPlayStarted=performance.now();
    audio.currentTime=clamp(s.start+shortTime,0,Math.max(0,analysis.duration-.01));
    audio.volume=window.PFShorts.audioGain(shortTime,s);
    try{await audio.play();}catch(e){pause();notify('Не удалось запустить музыку: '+e.message,true);}
    requestDraw();
  }
  $('#shorts-play').addEventListener('click',()=>playing?pause():playShort());
  $('#shorts-to-start').addEventListener('click',()=>{pause();seekShort(0);});
  $('#shorts-timeline').addEventListener('click',ev=>{const rect=ev.currentTarget.getBoundingClientRect();seekShort((ev.clientX-rect.left)/rect.width*shortsLimits().total);});
  $('#shorts-export').addEventListener('click',()=>openExport());
  // Preview is asynchronous, export is frame-accurate and must not proceed
  // until the requested video frame has finished seeking/decoding.
  async function syncVideoFrames(t,strict=false,renderProject=project,renderTimeline=getTL()){
    if((!renderProject.montage?.enabled&&view!=='montage')||renderProject.main.preset!=='montagem')return;
    const local=renderProject.shorts?.render?window.PFShorts.montageSourceTime(renderProject.shorts.computed,t):t-renderTimeline.mainStart;if(local<0)return;
    const state=montage.resolve(renderProject,local);if(!state)return;
    const transition=montage.transition(renderProject,local);
    const targets=[{clip:state.clip,source:state.sourceTime}];
    if(transition&&transition.previous.id!==state.clip.id)targets.push({clip:transition.previous,source:transition.previousSourceTime});
    const done=new Set();
    for(const target of targets){
      if(target.clip.mediaType!=='video')continue;
      const v=images.montage.get(target.clip.id)?.element;
      if(!v||v.readyState<1){if(strict)throw Error('Видеофайл недоступен или декодер не загрузил метаданные: '+target.clip.name);continue;}
      if(done.has(v))continue;done.add(v);
      const desired=clamp(target.source,0,Math.max(.01,(v.duration||0)-.03));
      const diff=Math.abs(v.currentTime-desired);
      if(!strict){
        // Do not queue another seek every rAF while the previous seek is pending.
        // The renderer holds the last good image during a boundary seek.
        if(v.seeking)continue;
        if(playing&&diff<.25){if(v.paused)v.play().catch(()=>{});continue;}
        if(diff<.08&&v.readyState>=2)continue;
        if(!v.paused)v.pause();
        try{v.currentTime=desired;}catch(err){console.warn('Preview video seek:',err);}
        continue;
      }
      if(!v.paused)v.pause();
      if(v.seeking){
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{cleanup();reject(Error('Видеокадр всё ещё ищется: '+target.clip.name));},7000);
          const cleanup=()=>{clearTimeout(timeout);v.removeEventListener('seeked',finish);v.removeEventListener('error',fail);};
          const finish=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Ошибка декодирования: '+target.clip.name));};
          v.addEventListener('seeked',finish,{once:true});v.addEventListener('error',fail,{once:true});
        });
      }
      if(Math.abs(v.currentTime-desired)>.015||v.readyState<2){
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{cleanup();reject(Error('Не удалось декодировать кадр: '+target.clip.name));},7000);
          const cleanup=()=>{clearTimeout(timeout);v.removeEventListener('seeked',finish);v.removeEventListener('error',fail);};
          const finish=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Ошибка кадра: '+target.clip.name));};
          v.addEventListener('seeked',finish,{once:true});v.addEventListener('error',fail,{once:true});
          try{v.currentTime=desired;}catch(err){cleanup();reject(err);}
        });
      }
      if(v.readyState<2||v.seeking||Math.abs(v.currentTime-desired)>.06)
        throw Error('Кадр видеоклипа не готов, экспорт остановлен вместо чёрной вспышки: '+target.clip.name);
    }
    if(!strict&&playing&&renderProject.montage?.enabled){
      const next=montage.resolve(renderProject,local+.32);
      if(next&&next.clip.id!==state.clip.id&&next.clip.mediaType==='video'){
        const future=images.montage.get(next.clip.id)?.element;
        if(future&&future!==images.montage.get(state.clip.id)?.element&&!future.seeking&&future.readyState>=1){
          const dest=clamp(next.sourceTime,0,Math.max(.01,(future.duration||0)-.03));
          if(Math.abs(future.currentTime-dest)>.15){try{future.pause();future.currentTime=dest;}catch{}}
        }
      }
    }
  }
  async function syncWatermarkVideo(t,strict=false){
    const v=images.watermark;if(project.watermark.mode!=='video'||v?.tagName!=='VIDEO'||!Number.isFinite(v.duration)||v.duration<=.05)return;
    const desired=t%Math.max(.1,v.duration-.02);
    if(!strict){if(!v.seeking&&Math.abs(v.currentTime-desired)>.08)try{v.currentTime=desired;}catch{}return;}
    if(v.seeking)await new Promise((ok,bad)=>{const tid=setTimeout(()=>bad(Error('Видео-водяной знак не декодирован')),8000);v.addEventListener('seeked',()=>{clearTimeout(tid);ok();},{once:true});});
    if(Math.abs(v.currentTime-desired)>.025||v.readyState<2)await new Promise((ok,bad)=>{const tid=setTimeout(()=>bad(Error('Таймаут декодирования видеоводяного знака')),8000);v.addEventListener('seeked',()=>{clearTimeout(tid);ok();},{once:true});v.currentTime=desired;});
  }
  function getTL(){return timeline(project,analysis?.duration||0);}
  function seek(t){const tl=getTL();currentTime=clamp(t,0,tl.total);if(analysis){
      if(currentTime>=tl.offset){const v=tl.audioAt(currentTime);if(Math.abs(audio.currentTime-v)>.05)audio.currentTime=v;}
      else{audio.pause();audio.currentTime=getTL().audioStart;}
    }if(playing){playTimeStarted=currentTime;playStarted=performance.now();}requestDraw();}
  async function play(){if(view==='shorts')return playShort();if(!analysis){notify('Сначала загрузи музыку',true);return;}
    const tl=getTL();if(!tl.valid){notify('Длины интро и аутро не помещаются в трек. Измени их.',true);return;}
    if(currentTime>=tl.total-.05)seek(0);
    playing=true;playTimeStarted=currentTime;playStarted=performance.now();$('#play-pause').innerHTML='<img src="assets/icons/pause.png" class="ui-icon" alt="">';
    if(currentTime>=tl.offset){audio.currentTime=clamp(tl.audioAt(currentTime),0,Math.max(0,analysis.duration-.01));try{await audio.play();}catch(e){pause();notify('Звук заблокирован: '+e.message,true);}}
    else {audio.pause();audio.currentTime=getTL().audioStart;}
  }
  function pause(){playing=false;audio.pause();for(const m of images.montage.values()){if(m.mediaType==='video')m.element.pause();}$('#play-pause').innerHTML='<img src="assets/icons/play.png" class="ui-icon" alt="">';updateShortsTransport();requestDraw();}
  function tick(now){
    if(playing&&view==='shorts'){
      const s=shortsLimits();let next=shortPlayTimeStarted+(now-shortPlayStarted)/1000;
      if(!audio.paused&&Math.abs((audio.currentTime-s.start)-next)<.3)next=audio.currentTime-s.start;
      shortTime=clamp(next,0,s.total);
      audio.volume=window.PFShorts.audioGain(shortTime,s);
      if(shortTime>=s.total-.015){shortTime=s.total;pause();}
    }
    else if(playing){const tl=getTL();let next=playTimeStarted+(now-playStarted)/1000;
      if(next>=tl.offset&&!audio.ended){if(audio.paused){audio.play().catch(()=>{});}if(!audio.paused&&Math.abs(audio.currentTime-tl.audioStart+tl.offset-next)<.28)next=audio.currentTime-tl.audioStart+tl.offset;}
      currentTime=clamp(next,0,tl.total);if(currentTime>=tl.total-.015){currentTime=tl.total;pause();}
    }
    if((view==='editor'||view==='montage'||view==='shorts')&&(analysis||view==='montage')&&(playing||renderPending)&&(renderPending||now-lastPreviewTime>=1000/previewFPS)){
      lastPreviewTime=now;
      if(view==='shorts'){
        if(!renderSyncPending){renderSyncPending=true;const sp=shortBuild();syncVideoFrames(shortTime,false,sp.project,timeline(sp.project,analysis?.duration||0)).catch(e=>console.warn('Teaser preview decode:',e.message)).finally(()=>{renderSyncPending=false;});}
      }else if(!renderSyncPending){renderSyncPending=true;syncVideoFrames(currentTime).catch(()=>{}).finally(()=>{renderSyncPending=false;});}
      syncWatermarkVideo(view==='shorts'?shortTime:currentTime,false).catch(()=>{});
      renderCanvas();
    }
    window.requestAnimationFrame(tick);
  }
  function requestDraw(){
    renderPending=true;
    if(view!=='editor'&&view!=='montage'&&view!=='shorts')return;
    // On paused scrub the previous implementation drew before the video had
    // sought, then cleared renderPending. That left stale/frozen montage frames.
    const token=++drawToken;
    if(!playing&&project.main.preset==='montagem'&&project.montage?.clips?.length){
      const sp=view==='shorts'?shortBuild():null;
      const pt=sp?shortTime:currentTime,pp=sp?.project||project,tl=sp?timeline(pp,analysis?.duration||0):getTL();
      syncVideoFrames(pt,true,pp,tl).catch(e=>console.warn('Scrub decode:',e.message)).finally(()=>{
        if(token===drawToken)renderCanvas();
      });
    }else renderCanvas();
  }
  function renderCanvas(){if(!analysis&&view!=='montage')return;
    try{
      if(view==='montage')window.PFRenderer.drawMontage($('#montage-canvas'),project,Math.max(0,currentTime-getTL().mainStart),images);
      else if(view==='shorts')window.PFRenderer.drawShort($('#shorts-canvas'),project,shortTime,images,analysis);
      else window.PFRenderer.draw(canvas,project,currentTime,images,analysis);
    }catch(e){console.error(e);}renderPending=false;updateTransport();if(view==='shorts')updateShortsTransport();
  }
  function updateTransport(){const tl=getTL();$('#montage-clock').textContent=timeFmt(Math.max(0,currentTime-tl.mainStart))+' / '+timeFmt(Math.max(0,tl.outroStart-tl.mainStart));updateMontagePlayhead();$('#clock').textContent=timeFmt(currentTime)+' / '+timeFmt(tl.total);$('#seek-line').style.left=(tl.total>0?currentTime/tl.total*100:0)+'%';const scene=tl.scene(currentTime);$('#preview-title').textContent=scene==='intro'?'Интро':scene==='outro'?'Аутро':'Основная сцена';
    $$('.scene-button').forEach(el=>el.classList.toggle('active',el.dataset.scene===sceneSelection));
  }
  $('#play-pause').addEventListener('click',()=>playing?pause():play());
  $('#jump-start').addEventListener('click',()=>seek(0));$('#jump-end').addEventListener('click',()=>seek(getTL().total));
  $('#frame-prev').addEventListener('click',()=>{pause();seek(currentTime-1/60);});$('#frame-next').addEventListener('click',()=>{pause();seek(currentTime+1/60);});
  $('#fullscreen').addEventListener('click',()=>$('#canvas-box').requestFullscreen?.().catch(()=>notify('Не удалось развернуть предпросмотр',true)));
  function sceneSeek(scene){const tl=getTL();sceneSelection=scene;seek(scene==='intro'?Math.min(.4,tl.intro*.2):scene==='main'?tl.mainStart+.6:tl.outroStart+Math.min(2,tl.outro*.35));updateTransport();}
  $$('.scene-button').forEach(b=>b.addEventListener('click',()=>sceneSeek(b.dataset.scene)));
  function waveform(){const c=$('#waveform-canvas'),cx=c.getContext('2d');cx.clearRect(0,0,c.width,c.height);if(!analysis)return;const frames=analysis.frames;const step=Math.max(1,Math.floor(frames.length/c.width));cx.fillStyle='#5bd7d0';
    const tl=getTL();for(let x=0;x<c.width;x++){let max=0;const audioT=x/c.width*tl.total-tl.offset+tl.audioStart;if(audioT<0||audioT>analysis.duration)continue;const from=Math.floor(audioT/analysis.hopSec);for(let j=from;j<Math.min(from+step,frames.length);j++)max=Math.max(max,frames[j]?.rms||0);const h=2+max*30;cx.globalAlpha=.35+max*.6;cx.fillRect(x,17-h/2,1,h);}
    cx.globalAlpha=1;
  }
  function renderTimeline(){const tl=getTL(),total=Math.max(.00001,tl.total);
    $('#intro-bar').style.width=tl.intro/total*100+'%';$('#outro-bar').style.width=tl.outro/total*100+'%';$('#main-bar').style.width=Math.max(0,tl.total-tl.intro-tl.outro)/total*100+'%';
    const times=[0,total*.25,total*.5,total*.75,total];$('#ruler-labels').innerHTML=times.map(s=>`<span>${timeFmt(s)}</span>`).join('');
    const markers=$('#fx-track');markers.innerHTML='';const offset=tl.offset;
    if(analysis){analysis.markers.slice(0,160).forEach((m)=>{const x=(m.t-tl.audioStart+offset)/total*100;if(x>100)return;const el=document.createElement('span');el.className='marker';el.style.left=x+'%';el.title=`Автоакцент ${m.t.toFixed(2)} с`;el.addEventListener('click',ev=>{ev.stopPropagation();seek(m.t-tl.audioStart+offset);});markers.appendChild(el);});}
    project.effects.manualMarkers.forEach((m,i)=>{const el=document.createElement('button');el.className='marker manual'+(selectedMarker===i?' selected':'');el.style.left=(m.t-tl.audioStart+offset)/total*100+'%';el.title=`FX ${m.t.toFixed(2)} с · сила ${m.strength.toFixed(2)}`;el.addEventListener('click',ev=>{ev.stopPropagation();selectedMarker=i;seek(m.t-tl.audioStart+offset);renderTimeline();});
      el.addEventListener('pointerdown',ev=>{ev.stopPropagation();checkpoint();selectedMarker=i;let dragged=false;el.setPointerCapture(ev.pointerId);const move=moveEv=>{dragged=true;const rect=markers.getBoundingClientRect();project.effects.manualMarkers[i].t=Number(clamp((moveEv.clientX-rect.left)/rect.width*total-offset+tl.audioStart,tl.audioStart,tl.audioEnd).toFixed(2));el.style.left=((project.effects.manualMarkers[i].t-tl.audioStart+offset)/total*100)+'%';setDirty();requestDraw();};const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);renderTimeline();if(dragged)notify('Положение маркера обновлено');};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up,{once:true});el.addEventListener('pointercancel',up,{once:true});});markers.appendChild(el);});
    const control=$('#selected-marker-controls');control.classList.toggle('hidden',selectedMarker===null||!project.effects.manualMarkers[selectedMarker]);if(selectedMarker!==null&&project.effects.manualMarkers[selectedMarker]){const sel=project.effects.manualMarkers[selectedMarker];$('#selected-marker-strength').value=sel.strength*100;$('#selected-marker-label').textContent=sel.t.toFixed(2)+' с · '+Math.round(sel.strength*100)+'%';}
    waveform();updateTransport();
  }
  for(const id of ['scene-track','audio-track','fx-track'])$("#"+id).addEventListener('click',ev=>{
    const rect=ev.currentTarget.getBoundingClientRect();seek((ev.clientX-rect.left)/rect.width*getTL().total);
  });
  $('#marker-add').addEventListener('click',()=>{if(!analysis)return;checkpoint();const tl=getTL();const when=clamp(tl.audioAt(currentTime),tl.audioStart,tl.audioEnd);project.effects.manualMarkers.push({t:Number(when.toFixed(2)),strength:1});selectedMarker=project.effects.manualMarkers.length-1;setDirty();renderTimeline();notify('FX-маркер добавлен в '+timeFmt(currentTime));});
  $('#selected-marker-strength').addEventListener('input',ev=>{if(selectedMarker===null||!project.effects.manualMarkers[selectedMarker])return;project.effects.manualMarkers[selectedMarker].strength=Number(ev.target.value)/100;$('#selected-marker-label').textContent=project.effects.manualMarkers[selectedMarker].t.toFixed(2)+' с · '+ev.target.value+'%';setDirty();requestDraw();});
  $('#marker-remove').addEventListener('click',()=>{if(selectedMarker===null){notify('Сначала выбери оранжевый FX-маркер');return;}checkpoint();project.effects.manualMarkers.splice(selectedMarker,1);selectedMarker=null;setDirty();renderTimeline();});
  function reset(){pause();project=defaultProject();projectPath=null;analysis=null;sourceFile=null;assets={audio:null,cover:null,background:null,watermark:null};images={cover:null,coverAccent:'#ae90ff',background:null,watermark:null,montage:new Map(),corners:new Map()};currentTime=0;shortTime=0;history=[];redo=[];dirty=false;audio.removeAttribute('src');audio.load();$('#audio-filename').textContent='Перетащи трек сюда или нажми для выбора';$('#file-stats').textContent='Пока ничего не выбрано';$('#cover-filename').textContent='Выбрать PNG, JPG или WebP';$('#background-filename').textContent='Необязательно, иначе фон из обложки';for(const k of ['cover','background']){$(`#${k}-thumb`).style.backgroundImage='';$(`#${k}-thumb`).innerHTML='<img class="ui-icon" src="assets/icons/image.png" alt="">';}$('#preview-empty').classList.remove('hidden');refreshFields();afterConfigChange();updateProjectTitle();reportDirty();setView('wizard');showStep(0);}
  $('#new-project').addEventListener('click',()=>{if(dirty&&!confirm('Текущие несохранённые изменения будут потеряны. Создать новый проект?'))return;reset();});
  function serialize(){return JSON.parse(JSON.stringify(project));}
  $('#save-project').addEventListener('click',saveProject);
  async function saveProject(){try{
    if(desktop){const saved=await desktop.saveProject(serialize(),projectPath);if(!saved)return false;projectPath=saved;dirty=false;updateProjectTitle();reportDirty();notify('Проект сохранён: '+saved);return true;}
    else{const blob=new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(project.metadata.title||'project')+'.pulseframe';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);dirty=false;updateProjectTitle();reportDirty();notify('Проект сохранён. После открытия потребуется заново указать медиафайлы.');return true;}
  }catch(e){notify('Не удалось сохранить: '+e.message,true);return false;}}
  $('#open-project').addEventListener('click',async()=>{if(dirty&&!confirm('Открытие проекта сбросит несохранённые изменения. Продолжить?'))return;
    try{if(desktop){const loaded=await desktop.openProject();if(loaded)await applyProject(loaded.project,loaded.assets,loaded.path);}else $('#file-project').click();}catch(e){notify('Ошибка открытия проекта: '+e.message,true);}
  });
  $('#file-project').addEventListener('change',async ev=>{const f=ev.target.files[0];if(!f)return;try{await applyProject(JSON.parse(await f.text()),{},null);}catch(e){notify('Неправильный файл проекта: '+e.message,true);}ev.target.value='';});
  async function applyProject(saved,assetMap,filePath){if(![1,2].includes(saved.schemaVersion)||!saved.media||!saved.main?.visualSettings)throw Error('Неподдерживаемый файл');
    pause();project=saved;
    project.schemaVersion=2;
    project.backgroundStyle={blur:50,dim:54,vignette:72,...project.backgroundStyle};
    project.platforms={show:true,...project.platforms};
    project.montage={enabled:false,clips:[],musicTrim:{start:0,end:0},retainOriginalSound:false,...project.montage};
    project.montage.musicTrim={start:0,end:0,...project.montage.musicTrim};
    project.montage.clips=project.montage.clips||[];
    project.cornerImages=project.cornerImages||[];
    project.watermark={enabled:true,mode:project.watermark?.enabled===false?'off':'system',path:null,position:'bottom-left',scale:.13,opacity:.85,...project.watermark};
    project.shorts={...window.PFShorts.defaults(),...project.shorts};project.shorts.effects=Array.isArray(project.shorts.effects)?project.shorts.effects:[];
    if(!['neon_wave','montagem'].includes(project.main.preset))project.main.preset='neon_wave';
    // Legacy Alpha 0.2 Montage projects overwrote the Neon position with center.
    // Only infer from a legacy project when no separate Neon preference exists.
    if(!['left','right','center'].includes(project.main.neonCoverPosition)){
      project.main.neonCoverPosition=project.main.preset==='montagem'?'left':(project.main.coverPosition||'left');
    }
    if(project.main.preset==='neon_wave')project.main.coverPosition=project.main.neonCoverPosition;
    project.main.visualSettings={...DEFAULT_SETTINGS,...saved.main.visualSettings};project.effects=project.effects||{manualMarkers:[]};project.effects.manualMarkers=project.effects.manualMarkers||[];project.outro.platforms=project.outro.platforms||[];
    project.uiLanguage=storedLang;projectPath=filePath;analysis=null;assets={audio:null,cover:null,background:null,watermark:null};images={cover:null,coverAccent:'#ae90ff',background:null,watermark:null,montage:new Map(),corners:new Map()};currentTime=0;shortTime=0;history=[];redo=[];dirty=false;
    refreshFields();afterConfigChange();updateProjectTitle();
    for(const kind of ['cover','background','watermark'])if(assetMap[kind])await setAsset(kind,assetMap[kind]);
    for(const data of assetMap.montage||[])await importMontage(data,true);
    for(const data of assetMap.corners||[])await importCorner(data,true);
    if(assetMap.audio)await loadAudioAsset(assetMap.audio);
    dirty=false;updateProjectTitle();reportDirty();setView('editor');
    if(!assetMap.audio||!assetMap.cover)notify('Проект открыт. Некоторые исходные файлы отсутствуют, добавь их в мастере.',true);
    else notify('Проект открыт');
  }
  function undo(){if(!history.length)return;redo.push(JSON.stringify(project));project=JSON.parse(history.pop());refreshFields();afterConfigChange();setDirty();}
  function redoAction(){if(!redo.length)return;history.push(JSON.stringify(project));project=JSON.parse(redo.pop());refreshFields();afterConfigChange();setDirty();}
  window.addEventListener('keydown',ev=>{
    const field=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='s'){ev.preventDefault();saveProject();}
    else if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redoAction():undo();}
    else if(!field&&ev.code==='Space'&&(view==='editor'||view==='montage'||view==='shorts')){ev.preventDefault();playing?pause():play();}
    else if(!field&&ev.key==='ArrowRight'&&(view==='editor'||view==='montage'||view==='shorts')){ev.preventDefault();view==='shorts'?seekShort(shortTime+(ev.shiftKey?1:1/30)):seek(currentTime+(ev.shiftKey?1:1/30));}
    else if(!field&&ev.key==='ArrowLeft'&&(view==='editor'||view==='montage'||view==='shorts')){ev.preventDefault();view==='shorts'?seekShort(shortTime-(ev.shiftKey?1:1/30)):seek(currentTime-(ev.shiftKey?1:1/30));}
    else if(!field&&view==='montage'&&(ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='b'){ev.preventDefault();splitSelected();}
    else if(!field&&view==='montage'&&!ev.ctrlKey&&!ev.metaKey&&ev.key.toLowerCase()==='c'){ev.preventDefault();copySelected();}
    else if(!field&&view==='montage'&&!ev.ctrlKey&&!ev.metaKey&&ev.key.toLowerCase()==='v'){ev.preventDefault();pasteSelected();}
    else if(ev.key==='Escape'){if(exportSession)return;$('#export-modal').classList.add('hidden');$('#help-modal').classList.add('hidden');}
  });
  // Native Electron owns the close confirmation. A renderer beforeunload
  // handler traps the title-bar × and can make the window impossible to close.
  if(!desktop)window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
  desktop?.onSaveAndClose?.(async()=>{
    if(exportSession)return;
    if(await saveProject())await desktop.finishClose();
  });
  $$('#help-modal a[href]').forEach(a=>a.addEventListener('click',ev=>{if(!desktop?.openExternal)return;ev.preventDefault();desktop.openExternal(a.href).catch(e=>notify(e.message,true));}));
  $('#help-btn').addEventListener('click',()=>$('#help-modal').classList.remove('hidden'));
  $('#help-close').addEventListener('click',()=>$('#help-modal').classList.add('hidden'));
  // Open only allowlisted HTTPS documentation/social links in the OS browser.
  document.addEventListener('click',e=>{
    const link=e.target.closest?.('a[href]');if(!link||!desktop)return;
    const address=link.getAttribute('href')||'';
    if(/^https:\/\/(?:t\.me\/PulseFrameOpS|x\.com\/pulseframeops|github\.com\/pulseframeops\/studio|fonts\.google\.com\/specimen\/Montserrat|ffmpeg\.org\/legal\.html)/i.test(address)){
      e.preventDefault();desktop.openExternal(address).catch(()=>notify('Ссылка не открылась',true));
    }
  });
  $('#help-ok').addEventListener('click',()=>$('#help-modal').classList.add('hidden'));
  $$('[data-help-tab]').forEach(btn=>btn.addEventListener('click',()=>{$$('[data-help-tab]').forEach(b=>b.classList.toggle('active',b===btn));$$('[data-help-page]').forEach(page=>page.classList.toggle('hidden',page.dataset.helpPage!==btn.dataset.helpTab));}));
  $('#export-open').addEventListener('click',openExport);
  $('#export-close').addEventListener('click',()=>{if(!exportSession)$('#export-modal').classList.add('hidden');});
  $('#export-cancel').addEventListener('click',async()=>{
    if(exportSession){exportCancelled=true;$('#export-status').textContent='Отменяем рендер…';await desktop.cancelExport(exportSession.id).catch(()=>{});}else $('#export-modal').classList.add('hidden');
  });
  async function openExport(){pause();exportResultPath=null;const isShort=view==='shorts';$('#export-start').textContent='Начать экспорт';$('#export-modal').classList.remove('hidden');const portrait=isShort||project.canvas.aspect==='9:16';$('#export-aspect').value=isShort?'9:16 (Анонс)':project.canvas.aspect;$('#export-res').value=portrait?'1080 × 1920':'1920 × 1080';$('#export-progress').classList.add('hidden');$('#export-start').disabled=true;
    if(!analysis){$('#export-status').textContent='Для экспорта сначала нужно загрузить трек.';return;}
    if(!images.cover){$('#export-status').textContent='Для экспорта необходима обложка.';return;}
    if(isShort&&!shortsLimits().valid){$('#export-status').textContent='Анонс требует музыкальный фрагмент длиной 10–30 секунд.';return;}
    if(!isShort&&!getTL().valid){$('#export-status').textContent='Интро и аутро слишком длинные для этого трека.';return;}
    if(!desktop){$('#export-status').textContent='Открыта браузерная версия. Для MP4 запусти приложение через Electron и установи FFmpeg.';return;}
    if(!assets.audio?.path){$('#export-status').textContent='Нет пути к исходному аудиофайлу. Импортируй музыку через десктопное окно.';return;}
    if(['image','video'].includes(project.watermark.mode)&&!images.watermark){$('#export-status').textContent='Выбран пользовательский водяной знак, но файл не загружен.';return;}
    if(project.montage.enabled&&project.main.preset==='montagem'&&project.montage.clips.some(c=>!images.montage.has(c.id))){$('#export-status').textContent='Один из монтажных файлов отсутствует. Перезагрузи его.';return;}
    const check=await desktop.ffmpegStatus();
    $('#ffmpeg-path').textContent=check.path||'Автопоиск в PATH';$('#export-status').textContent=check.available?'Готово: MP4 · H.264/AAC · системный водяной знак включён по умолчанию. Рендер может выполняться медленнее длительности песни.':'FFmpeg не найден. Установи FFmpeg и добавь ffmpeg/ffprobe в PATH.';
    if(isShort&&check.available)$('#export-status').textContent='Анонс · 9:16 · 10–30 сек. · H.264/AAC. Intro и outro входят в длительность. Готово к экспорту.';
    $('#export-start').disabled=!check.available;
  }
  $('#ffmpeg-browse').addEventListener('click',async()=>{
    if(!desktop){notify('Доступно только в десктопном приложении',true);return;}
    try{const result=await desktop.ffmpegSettings(true);$('#ffmpeg-path').textContent=result.path||'PATH';await openExport();}
    catch(e){notify('FFmpeg: '+e.message,true);}
  });
  $('#export-start').addEventListener('click',doExport);
  async function doExport(){if(exportResultPath){desktop?.revealFile(exportResultPath);return;}if(exportSession||!desktop)return;const isShort=view==='shorts',built=isShort?shortBuild():null,renderProj=built?.project||project,tl=isShort?timeline(renderProj,analysis?.duration||0):getTL(),fps=Number($('#export-fps').value),portrait=isShort||project.canvas.aspect==='9:16';
    const width=portrait?1080:1920,height=portrait?1920:1080,frames=Math.ceil(tl.total*fps);
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const montageGuard=document.createElement('canvas');montageGuard.width=192;montageGuard.height=108;
    const checkFrameAt=(sec)=>{
      if(renderProj.main.preset!=='montagem'||!renderProj.montage?.enabled||!montage.clipsOf(renderProj).length)return;
      if(!isShort&&(sec<tl.mainStart||sec>=tl.outroStart))return;
      const guardContext=montageGuard.getContext('2d');guardContext.clearRect(0,0,192,108);
      if(!window.PFRenderer.montageFrame(guardContext,192,108,(isShort?window.PFShorts.montageSourceTime(renderProj.shorts.computed,sec):sec-tl.mainStart),renderProj,images))
        throw Error('Прерван экспорт: видеокадр на '+sec.toFixed(2)+' сек. не готов. Чёрный кадр в MP4 не записан.');
    };
    exportCancelled=false;$('#export-start').disabled=true;$('#export-close').disabled=true;$('#export-progress').classList.remove('hidden');$('#export-progress-fill').style.width='0%';
    try{
      await document.fonts.ready;await window.PFRenderer.readyAssets();
      // Before opening FFmpeg, check origin-clean status on the exact render canvas.
      await syncVideoFrames(tl.mainStart+.1,true,renderProj,tl);
      await syncWatermarkVideo(tl.mainStart+.1,true);
      checkFrameAt(tl.mainStart+.1);
      if(isShort)window.PFRenderer.drawShort(out,project,tl.mainStart+.1,images,analysis);
      else window.PFRenderer.draw(out,project,tl.mainStart+.1,images,analysis);
      try{out.toDataURL('image/png');}catch(e){
        if(e.name==='SecurityError')throw Error('Один из медиафайлов блокирует экспорт Canvas. Удали и заново добавь фон, обложку или видеоряд.');
        throw e;
      }
      exportSession=await desktop.startExport({audioPath:assets.audio.path,fps,width,height,offset:tl.offset,duration:tl.total,trimStart:tl.audioStart,trimDuration:tl.effectiveLength,introDuration:tl.intro,audioFadeIn:isShort?tl.intro:0,audioFadeOut:isShort?tl.outro:0,suggestedName:isShort?`${project.metadata.artist||'Artist'} - ${project.metadata.title||'Track'} - АНОНС.mp4`:null,originalAudioClips:!isShort&&project.montage.enabled&&project.montage.retainOriginalSound&&project.main.preset==='montagem'?project.montage.clips.filter(c=>c.role==='primary'&&c.mediaType==='video').map(c=>({path:c.path,start:c.start,duration:c.duration,sourceIn:c.sourceIn})):[],quality:$('#export-quality').value,frameFormat:$('#export-frame-mode').value});
      if(!exportSession)return;
      for(let i=0;i<frames;i++){
        if(exportCancelled)throw Error('Экспорт отменён');
        await syncVideoFrames(i/fps,true,renderProj,tl);
        await syncWatermarkVideo(i/fps,true);
        checkFrameAt(i/fps);
        if(isShort)window.PFRenderer.drawShort(out,project,i/fps,images,analysis);
        else window.PFRenderer.draw(out,project,i/fps,images,analysis);
        const frameMode=$('#export-frame-mode').value;
        const encoded=frameMode==='jpeg'?out.toDataURL('image/jpeg',.98).split(',')[1]:out.toDataURL('image/png').split(',')[1];
        await desktop.pushFrame(exportSession.id,encoded);
        if(i%Math.max(1,Math.floor(fps/2))===0||i===frames-1){const percent=Math.round((i+1)/frames*100);$('#export-progress-fill').style.width=percent+'%';$('#export-status').textContent=`Кадр ${i+1} из ${frames} · ${percent}% · видеокодирование…`;await new Promise(r=>setTimeout(r,0));}
      }
      const result=await desktop.finishExport(exportSession.id);
      $('#export-status').textContent='Готовый MP4: '+result.output;
      notify('Видеоклип успешно экспортирован!');
      exportResultPath=result.output;$('#export-start').textContent='Открыть в папке';$('#export-start').disabled=false;
    }catch(e){if(exportSession){await desktop.cancelExport(exportSession.id).catch(()=>{});}$('#export-status').textContent=exportCancelled?'Экспорт отменён.':'Ошибка экспорта: '+e.message;notify($('#export-status').textContent,true);}
    finally{exportSession=null;$('#export-close').disabled=false;$('#export-start').disabled=false;}
  }
  updateAspect();window.PFI18n?.setLanguage?.(storedLang);refreshFields();showStep(0);renderShortsUI();renderTimeline();updateProjectTitle();reportDirty();window.requestAnimationFrame(tick);
})();
