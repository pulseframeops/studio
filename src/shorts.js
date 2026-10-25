(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.PFShorts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const defaults=()=>({start:0,duration:20,introDuration:3,introAccent:'glitch',introText:'',outroDuration:4,releaseDate:'',frameZoom:1,frameX:0,frameY:0,bgZoom:1.15,bgX:0,bgY:0,effects:[]});
  function limits(settings,audioDuration){
    const total=Math.max(0,Number(audioDuration)||0),max=Math.min(30,total);
    const canCreate=total>=10;
    const wanted=Number(settings?.duration);
    const duration=canCreate?clamp(Number.isFinite(wanted)?wanted:20,10,max):0;
    const start=canCreate?clamp(Number(settings?.start)||0,0,Math.max(0,total-duration)):0;
    const intro=canCreate?clamp(Number(settings?.introDuration)||0,0,Math.min(5,duration-4)):0;
    const outro=canCreate?clamp(Number(settings?.outroDuration)||4,2,Math.min(6,duration-intro-2)):0;
    return {valid:canCreate,start,duration,intro,outro,mainStart:intro,outroStart:duration-outro,total:duration,releaseDate:String(settings?.releaseDate||'')};
  }
  function makeRenderProject(project,audioDuration){
    const s=limits(project.shorts,audioDuration);
    const p={...project,canvas:{...project.canvas,aspect:'9:16'},
      intro:{...project.intro,durationSec:s.intro,audioStart:'with_intro',accent:project.shorts?.introAccent||'glitch',presents:project.shorts?.introText||project.intro.presents||''},
      outro:{...project.outro,durationSec:s.outro},
      montage:{...project.montage,musicTrim:{start:s.start,end:s.start+s.duration}},
      shorts:{...project.shorts,render:true,computed:s}
    };
    return {project:p,info:s};
  }
  function montageSourceTime(computed,teaserLocalTime){
    const start=Math.max(0,Number(computed?.start)||0),duration=Math.max(0,Number(computed?.duration)||0);
    return start+clamp(Number(teaserLocalTime)||0,0,duration);
  }
  function normalizeEffect(effect,duration){
    const allowed=['flash','zoom','rgb','shake','glitch'];
    return {id:String(effect?.id||''),time:clamp(Number(effect?.time)||0,0,Math.max(0,duration-.05)),kind:allowed.includes(effect?.kind)?effect.kind:'flash',strength:clamp(Number(effect?.strength)||.7,.1,1)};
  }
  function activeEffects(effects,time,duration){
    return (effects||[]).map(e=>normalizeEffect(e,duration)).map(e=>({...e,phase:(time-e.time)/.45})).filter(e=>e.phase>=0&&e.phase<1);
  }
  function audioGain(t,s){const gainIn=s.intro>0?clamp(t/s.intro,0,1):1;const gainOut=s.outro>0?clamp((s.total-t)/s.outro,0,1):1;return Math.min(gainIn,gainOut);}
  function outroLabel(settings){
    const value=String(settings?.releaseDate||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'СКОРО';
    const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
    if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return 'СКОРО';
    return String(d).padStart(2,'0')+'.'+String(m).padStart(2,'0')+'.'+y;
  }
  return {defaults,limits,makeRenderProject,montageSourceTime,activeEffects,outroLabel,audioGain};
});
