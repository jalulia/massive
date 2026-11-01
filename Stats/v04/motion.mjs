const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const base = "../v03/assets/game/stage-";
const heroStages = ["singularity", "pulsar", "dynamo", "cosmos", "emergence", "lattice", "higgs", "orbital", "nova"];

function onVisible(element, change) {
  let inView = false;
  const sync = () => change(inView && !document.hidden && !reduced.matches);
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  observer.observe(element);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  return sync;
}

function setClip(video, stage) {
  const src = base + stage + "-loop.mp4";
  video.poster = base + stage + "-poster.jpg";
  if (video.getAttribute("src") !== src) video.setAttribute("src", src);
}

function clearClip(video) {
  video.pause();
  video.classList.remove("is-outgoing");
  if (video.hasAttribute("src")) {
    video.removeAttribute("src");
    video.load();
  }
}

export function animateHero(root) {
  const videos = [...root.querySelectorAll("video")];
  let front = 0, stage = 0, next = 1, generation = 0;
  let timer, fade;
  const schedule = () => { timer = setTimeout(rotate, 12000); };
  async function rotate() {
    const token = generation;
    const back = 1 - front;
    const target = next;
    next = (next + 1) % heroStages.length;
    setClip(videos[back], heroStages[target]);
    try { await videos[back].play(); }
    catch {
      if (generation === token) { clearClip(videos[back]); schedule(); }
      return;
    }
    if (generation !== token) return;
    videos[front].classList.add("is-outgoing");
    videos[front].classList.remove("is-active");
    videos[back].classList.add("is-active");
    front = back;
    stage = target;
    fade = setTimeout(() => clearClip(videos[1 - front]), 2200);
    schedule();
  }
  onVisible(root, enabled => {
    generation++;
    clearTimeout(timer);
    clearTimeout(fade);
    clearClip(videos[1 - front]);
    if (enabled) {
      setClip(videos[front], heroStages[stage]);
      videos[front].play().catch(() => {});
      schedule();
    } else {
      videos[front].pause();
      if (reduced.matches) clearClip(videos[front]);
    }
  });
}

export function stageAnimation(video, poster) {
  let stage;
  const sync = onVisible(video, enabled => {
    if (stage && enabled) {
      setClip(video, stage);
      video.play().catch(() => {});
    } else {
      clearClip(video);
    }
  });
  return name => {
    const selected = name?.toLowerCase();
    if (stage === selected) return;
    stage = selected;
    if (stage) {
      poster.src = base + stage + "-poster.jpg";
      video.poster = poster.src;
    }
    sync();
  };
}
