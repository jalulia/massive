(() => {
  const video = document.querySelector('#spectrum-player');
  if (!video) return;
  const buttons = [...document.querySelectorAll('[data-spectrum-time]')];
  const status = document.querySelector('#spectrum-state');
  const error = document.querySelector('#spectrum-playback-error');
  const names = ['COSMOS', 'SINGULARITY', 'NOVA', 'DYNAMO', 'PULSAR', 'ORBITAL', 'HIGGS', 'LATTICE'];
  const clock = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const update = () => {
    let active = 0;
    buttons.forEach((button, index) => { if (video.currentTime >= Number(button.dataset.spectrumTime)) active = index; });
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
    status.textContent = `${names[active]} · ${clock(video.currentTime)} / 01:20`;
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const seek = () => {
      video.currentTime = Number(button.dataset.spectrumTime);
      video.play().catch(() => { /* Native controls and downloads remain available. */ });
      update();
    };
    if (video.readyState > 0) seek();
    else { video.addEventListener('loadedmetadata', seek, { once: true }); video.load(); }
  }));
  video.addEventListener('timeupdate', update);
  video.addEventListener('error', () => { error.hidden = false; });
  video.addEventListener('loadedmetadata', () => { error.hidden = Number.isFinite(video.duration); update(); });
  document.addEventListener('click', event => { if (event.target.closest('[data-open]')) video.pause(); });
  update();
})();
