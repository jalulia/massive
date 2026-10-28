// Native MASSIVE captures. Motion is suspended offscreen and for reduced motion.
const stages = ['singularity', 'nova', 'dynamo'];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const hold = 16000;
const fade = 2400;

function prepare(video, stage) {
  video.dataset.stage = stage;
  video.poster = `assets/game/stage-${stage}-poster.jpg`;
  video.muted = true;
  video.loop = true;
  if (!video.getAttribute('src')) video.src = `assets/game/stage-${stage}-loop.mp4`;
}

function unload(video) {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

async function play(video) {
  try { await video.play(); return true; }
  catch { return false; } // The native poster remains visible if playback is unavailable.
}

export function mountHeroRotation(root) {
  if (!root) return;
  const videos = [...root.querySelectorAll('video')];
  let active = 0;
  let index = 0;
  let candidate = 1;
  let visible = false;
  let rotationTimer;
  let fadeTimer;
  let revision = 0;
  const enabled = () => visible && !document.hidden && !motion.matches;

  function settle() {
    clearTimeout(fadeTimer);
    const previous = videos[1 - active];
    previous.classList.remove('is-active');
    unload(previous);
  }

  function schedule() {
    clearTimeout(rotationTimer);
    if (enabled()) rotationTimer = setTimeout(rotate, hold);
  }

  async function rotate() {
    if (!enabled()) return;
    const token = ++revision;
    const nextIndex = candidate;
    const nextSlot = 1 - active;
    const next = videos[nextSlot];
    prepare(next, stages[nextIndex]);
    // Leave the current level on screen until the next clip can play.
    const ready = await Promise.race([play(next), new Promise(resolve => setTimeout(() => resolve(false), 5000))]);
    if (token !== revision || !enabled()) return;
    candidate = (nextIndex + 1) % stages.length;
    if (!ready) { unload(next); schedule(); return; }
    videos[active].classList.remove('is-active');
    next.classList.add('is-active');
    active = nextSlot;
    index = nextIndex;
    root.dataset.stage = stages[index];
    fadeTimer = setTimeout(settle, fade);
    schedule();
  }

  function sync() {
    revision++;
    clearTimeout(rotationTimer);
    settle();
    if (!enabled()) {
      videos.forEach(video => video.pause());
      if (motion.matches) unload(videos[active]);
      return;
    }
    prepare(videos[active], stages[index]);
    play(videos[active]);
    schedule();
  }

  root.dataset.stage = stages[index];
  const observer = new IntersectionObserver(([entry]) => {
    if (visible === entry.isIntersecting) return;
    visible = entry.isIntersecting;
    sync();
  }, { threshold: 0 });
  observer.observe(root);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
}

export function mountStageVideo(video, name) {
  if (!video) return () => {};
  const stage = name.toLowerCase();
  let visible = false;
  let disposed = false;
  function sync() {
    if (disposed) return;
    if (!visible || document.hidden || motion.matches) {
      video.pause();
      if (motion.matches) unload(video);
      return;
    }
    prepare(video, stage);
    play(video);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(video);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
    unload(video);
  };
}
