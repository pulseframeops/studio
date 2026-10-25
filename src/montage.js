(function(root, factory) {
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.PFMontage=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function clipsOf(project){
    return (project?.montage?.clips||[])
      .filter(c=>Number(c.duration)>0 && Number.isFinite(Number(c.start)))
      .slice().sort((a,b)=>Number(a.start)-Number(b.start));
  }
  function cutSequence(project){
    const cuts=clipsOf(project).filter(c=>c.role==='cut');
    if(!cuts.length)return {cuts,start:0,end:0,length:0};
    const start=Math.min(...cuts.map(c=>Number(c.start)));
    const end=Math.max(...cuts.map(c=>Number(c.start)+Number(c.duration)));
    return {cuts,start,end,length:Math.max(0,end-start)};
  }
  // Only the CUT track loops. Primary videos retain their absolute positions
  // and are never replayed during later cycles of the CUT track.
  function cycleDuration(project){return cutSequence(project).length;}
  function result(clip,sceneLocal,cycle,cycleLength,clipTime,looped){
    const maxTime=Math.max(0,Number(clip.duration)-.03);
    const within=clamp(clipTime,0,maxTime);
    return {
      clip,local:sceneLocal,cycle,cycleLength,looped,
      sourceTime:Math.max(0,(Number(clip.sourceIn)||0)+within),
      clipTime:within
    };
  }
  function resolve(project,sceneTime){
    if(!Number.isFinite(sceneTime))return null;
    const clips=clipsOf(project);
    if(!clips.length)return null;
    const t=Math.max(0,sceneTime), seq=cutSequence(project);
    const primaries=clips.filter(c=>c.role!=='cut');
    if(seq.length>0 && t>=seq.start){
      // Rewind the cuts only. A primary clip must not reappear after the first
      // cut sequence reaches its end.
      const elapsed=t-seq.start,cycle=Math.floor(elapsed/seq.length);
      const at=seq.start+(elapsed%seq.length);
      const active=seq.cuts.filter(c=>at>=Number(c.start)&&at<Number(c.start)+Number(c.duration));
      let clip=active[active.length-1];
      let clipTime;
      if(clip){clipTime=at-Number(clip.start);}
      else{
        // Hold a cut's last frame across gaps, rather than suddenly jumping
        // back to a primary video in repeated cycles.
        clip=seq.cuts.filter(c=>Number(c.start)<=at).pop()||seq.cuts[0];
        clipTime=Number(clip.start)<=at?Math.min(Number(clip.duration)-.03,at-Number(clip.start)):0;
      }
      return result(clip,at,cycle,seq.length,clipTime,cycle>0);
    }
    // Primary videos play in their original positions exactly once.
    const active=primaries.filter(c=>t>=Number(c.start)&&t<Number(c.start)+Number(c.duration));
    if(active.length){const clip=active[active.length-1];return result(clip,t,0,seq.length,t-Number(clip.start),false);}
    if(primaries.length){
      // If there is a gap before the cuts, hold the most recent primary frame.
      const clip=primaries.filter(c=>Number(c.start)<=t).pop()||primaries[0];
      const clipTime=t>=Number(clip.start)?Math.min(Number(clip.duration)-.03,t-Number(clip.start)):0;
      return result(clip,t,0,seq.length,clipTime,false);
    }
    // A project containing only cuts can still fill the frame before the
    // first scheduled cut without looping backwards in time.
    if(seq.cuts.length)return result(seq.cuts[0],t,0,seq.length,0,false);
    return null;
  }
  function transition(project,sceneTime){
    const state=resolve(project,sceneTime);
    if(!state)return null;
    const c=state.clip,kind=c.transition||'cut';
    if(kind==='cut'||state.clipTime>=clamp(Number(c.transitionDuration)||.4,.15,1.5))return null;
    const seq=cutSequence(project);
    const primaries=clipsOf(project).filter(x=>x.role!=='cut');
    let previous=null;
    if(c.role==='cut'){
      const index=seq.cuts.findIndex(x=>x.id===c.id);
      if(index>0)previous=seq.cuts[index-1];
      else if(state.cycle>0)previous=seq.cuts[seq.cuts.length-1];
      else previous=primaries.filter(x=>Number(x.start)<Number(c.start)).pop()||null;
    }else{
      const index=primaries.findIndex(x=>x.id===c.id);
      if(index>0)previous=primaries[index-1];
    }
    if(!previous||previous.id===c.id)return null;
    const progress=clamp(state.clipTime/clamp(Number(c.transitionDuration)||.4,.15,1.5),0,1);
    return {kind,previous,progress,previousSourceTime:Math.max(0,(Number(previous.sourceIn)||0)+Math.max(0,Number(previous.duration)-.08))};
  }
  return {clipsOf,cutSequence,cycleDuration,resolve,transition};
});
