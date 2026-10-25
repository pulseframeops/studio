(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PFTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function smooth(a, b, x) { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); }
  function timeline(project, length) {
    const intro = Math.max(0, Number(project.intro.durationSec) || 0);
    const outro = Math.max(0, Number(project.outro.durationSec) || 0);
    const offset = project.intro.audioStart === 'after_intro' ? intro : 0;
    const trim=project.montage?.musicTrim||{};
    const audioStart=clamp(Number(trim.start)||0,0,Math.max(0,length-.05));
    const audioEnd=clamp(Number(trim.end)>0?Number(trim.end):length,audioStart+.05,Math.max(length,audioStart+.05));
    const effectiveLength=Math.max(0,audioEnd-audioStart);
    const total = effectiveLength + offset;
    return { intro, outro, offset, total, mainStart: intro, outroStart: total - outro,
      audioStart, audioEnd, effectiveLength,
      valid: effectiveLength > 0 && total > intro + outro && outro < effectiveLength && (offset !== 0 || intro + outro < effectiveLength),
      audioAt(t) { return audioStart+clamp(t - offset, 0, effectiveLength); },
      scene(t) { return t < intro ? 'intro' : t >= total - outro ? 'outro' : 'main'; }
    };
  }
  return { clamp, smooth, timeline };
});
