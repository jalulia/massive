import { mountHeroRotation, mountStageVideo } from './game-video.js';

const $ = (selector) => document.querySelector(selector);
const format = (value) => Number(value).toLocaleString('en-US');
const percent = (n, d, decimals = 1) => d ? (n / d * 100).toFixed(decimals) : (0).toFixed(decimals);
const duration = (seconds, decimal = false) => {
  const rounded = Math.round(seconds * (decimal ? 10 : 1));
  const minutes = Math.floor(rounded / (decimal ? 600 : 60));
  const remainder = rounded / (decimal ? 10 : 1) - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(decimal ? 1 : 0).padStart(decimal ? 4 : 2, '0')}`;
};
const hours = (minutes) => { const m = Math.round(minutes); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
const dateFormat = new Intl.DateTimeFormat('en-GB', {timeZone:'America/New_York', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
mountHeroRotation($('#hero-art'));
let disposeStageVideo = () => {};
$('#retry').addEventListener('click', () => location.reload());

try {
  const response = await fetch('./snapshot.json');
  if (!response.ok) throw new Error('Snapshot request failed');
  const data = await response.json();
  if (!data.summary || !data.days || !data.levels || !Array.isArray(data.incomplete)) throw new Error('Invalid snapshot');
  const summary = data.summary;
  $('#total-starts').textContent = format(summary.starts);
  $('#completed-count').textContent = `${summary.status.Completed} COMPLETED`;
  $('#abandoned-count').textContent = `${summary.status.Abandoned} ABANDONED`;
  $('#completion-rate').innerHTML = `${percent(summary.status.Completed, summary.starts)}<span class="unit">%</span>`;
  $('#completion-meter').style.width = `${percent(summary.status.Completed, summary.starts, 4)}%`;
  $('#completion-denominator').textContent = `${summary.status.Completed} / ${summary.starts} STARTS`;
  const activeMinutes = Math.round(summary.active_minutes);
  $('#total-match-time').innerHTML = `${Math.floor(activeMinutes / 60)}<span class="time-unit">h</span>${String(activeMinutes % 60).padStart(2,'0')}<span class="time-unit">m</span>`;
  $('#average-duration').textContent = duration(summary.completed_mean_seconds, true).replace(/^0/, '');
  $('#enemy-total').textContent = format(data.totals.enemies_killed);
  $('#pvp-total').textContent = format(data.totals.pvp_kills);
  $('#deaths-total').textContent = format(data.totals.deaths);
  $('#distance-total').innerHTML = `${(data.totals.distance_meters / 1000).toFixed(2)} <small>km</small>`;
  let selectedDay = '2026-10-17';
  let selectedStage = 'LATTICE';
  let stageSort = 'starts';

  function renderDayDetail() {
    const day = data.days[selectedDay];
    $('#day-detail').innerHTML = `<div class="selected-date">${selectedDay.slice(8)} OCT<br><span>2026 / EDT</span></div><div><span>COMPLETED</span><strong>${day.status.Completed || 0} / ${day.starts}</strong></div><div><span>ABANDONED</span><strong>${day.status.Abandoned || 0}</strong></div><div><span>ACTIVE TIME</span><strong>${hours(day.active_minutes)}</strong></div>`;
  }
  const weekdays = ['THU', 'FRI', 'SAT', 'SUN'];
  $('#day-chart').innerHTML = Object.entries(data.days).map(([date, day], i) => {
    // A fixed 80-position field, filled from bottom left: every mark is one record.
    const cells = Array.from({length:80}, (_, j) => {
      const rank = (9 - Math.floor(j / 8)) * 8 + j % 8;
      if (rank >= day.starts) return '<span class="match-dot empty"></span>';
      return rank >= day.status.Completed ? '<span class="match-dot abandoned">×</span>' : '<span class="match-dot"></span>';
    }).join('');
    return `<button type="button" class="day-bar" data-day="${date}" aria-pressed="${date === selectedDay}" aria-label="${date.slice(8)} October: ${day.starts} starts, ${day.status.Completed} completed, ${day.status.Abandoned} abandoned"><span class="day-value">${day.starts}</span><span class="dot-grid" aria-hidden="true">${cells}</span><span class="day-label">${date.slice(8)} OCT</span><span class="day-week">${weekdays[i]}</span></button>`;
  }).join('');
  $('#day-chart').addEventListener('click', event => {
    const button = event.target.closest('[data-day]');
    if (!button) return;
    selectedDay = button.dataset.day;
    document.querySelectorAll('[data-day]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.day === selectedDay)));
    renderDayDetail();
  });
  renderDayDetail();

  function renderOutcomes(mode) {
    const stats = mode === 'all' ? data.summary : data.mode_wins[mode];
    const wins = stats.completed_winners;
    const completed = stats.status.Completed;
    $('#outcomes').innerHTML = `<div class="outcome-numbers">${[['Light','LIGHT WINS'],['Dark','DARK WINS'],['Tie','TIES']].map(([key,label]) => `<div><div class="outcome-name"><span class="team-symbol ${key.toLowerCase()}" aria-hidden="true"></span>${label}</div><div class="outcome-value">${wins[key] || 0}</div><div class="outcome-percent">${percent(wins[key] || 0, completed)}%</div></div>`).join('')}</div><div class="outcome-track" aria-hidden="true">${['Light','Dark','Tie'].map(key => `<span class="${key.toLowerCase()}" style="flex:${wins[key] || 0}"></span>`).join('')}</div><div class="outcome-caption"><span>SHARE OF ${completed} COMPLETED MATCHES</span><span>${mode === 'all' ? 'ALL MODES' : mode.toUpperCase()}</span></div>`;
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderOutcomes(button.dataset.mode);
  }));
  renderOutcomes('all');

  function renderStageRows() {
    const entries = Object.entries(data.levels).sort((a,b) => stageSort === 'name' ? a[0].localeCompare(b[0]) : stageSort === 'completion' ? ((a[1].status.Completed || 0)/a[1].starts - (b[1].status.Completed || 0)/b[1].starts) || b[1].starts-a[1].starts : b[1].starts-a[1].starts || a[0].localeCompare(b[0]));
    $('#stage-rows').innerHTML = entries.map(([name, stats]) => `<tr class="${name === selectedStage ? 'selected' : ''}"><td><button type="button" class="stage-select" data-stage="${name}" aria-pressed="${name === selectedStage}"><span class="selection-arrow" aria-hidden="true">›</span>${name}</button></td><td>${stats.starts}</td><td class="share-column">${percent(stats.starts,data.summary.starts)}%<span class="share-bar" aria-hidden="true"><i style="width:${percent(stats.starts,data.summary.starts,3)}%"></i></span></td><td class="completion-cell">${percent(stats.status.Completed || 0, stats.starts, stats.status.Completed === stats.starts ? 0 : 1)}%<span class="${stats.status.Completed === stats.starts ? 'complete' : ''}" aria-hidden="true"></span></td></tr>`).join('');
  }
  function renderStageDetail() {
    disposeStageVideo();
    const s = data.levels[selectedStage];
    const wins = s.completed_winners;
    $('#stage-detail').innerHTML = `<p class="eyebrow"><span class="square" aria-hidden="true"></span> STAGE STATISTICS</p><h3>${selectedStage}</h3><figure class="stage-art"><video class="stage-video" muted playsinline loop preload="none" poster="assets/game/stage-${selectedStage.toLowerCase()}-poster.jpg" aria-label="${selectedStage} stage animation from MASSIVE" width="1080" height="1080" tabindex="-1" disablepictureinpicture></video></figure><div class="stage-subtitle"><span>${s.starts} MATCHES STARTED</span><span>${percent(s.starts,data.summary.starts)}% OF STARTS</span></div><div class="stage-completion"><div class="stage-completion-label"><span>${s.status.Completed || 0} COMPLETED</span><span class="muted">${s.status.Abandoned || 0} ABANDONED</span></div><div class="stage-completion-track" aria-hidden="true"><i style="width:${percent(s.status.Completed || 0,s.starts,3)}%"></i></div></div><div class="stage-data"><div><span>ENEMIES KILLED</span><b>${format(s.enemies_killed)}</b></div><div><span>PLAYER DEATHS</span><b>${format(s.deaths)}</b></div><div><span>PVP KILLS</span><b>${format(s.pvp_kills)}</b></div><div><span>ACTIVE TIME</span><b>${hours(s.active_minutes)}</b></div><div><span>AVG. DURATION</span><b>${duration(s.completed_mean_seconds,true)}</b></div><div><span>CUMULATIVE PLAYER TIME</span><b>${hours(s.player_minutes)}</b></div></div><div class="stage-wins"><div><span>LIGHT WINS</span> ${wins.Light || 0}</div><div><span>DARK WINS</span> ${wins.Dark || 0}</div><div><span>TIES</span> ${wins.Tie || 0}</div></div><div class="stage-mode"><span>1v1 / ${s.modes['1v1'] || 0} STARTS</span><span>2v2 / ${s.modes['2v2'] || 0} STARTS</span></div>`;
    disposeStageVideo = mountStageVideo($('#stage-detail video'), selectedStage);
  }
  $('#stage-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-stage]');
    if (!button) return;
    selectedStage = button.dataset.stage;
    // Update selection without replacing the focused button.
    document.querySelectorAll('#stage-rows [data-stage]').forEach(item => { const selected = item.dataset.stage === selectedStage; item.setAttribute('aria-pressed', String(selected)); item.closest('tr').classList.toggle('selected', selected); });
    renderStageDetail();
  });
  $('#stage-sort').addEventListener('change', event => { stageSort = event.target.value; renderStageRows(); });
  renderStageRows();
  renderStageDetail();

  function renderRecords(stage) {
    const records = data.incomplete.filter(record => stage === 'all' || record.level === stage);
    $('#record-rows').innerHTML = records.map(r => `<tr><td>${dateFormat.format(new Date(r.start)).replace(',', '').toUpperCase()}</td><td>${r.level}</td><td>${r.mode === 0 ? '1v1' : '2v2'}</td><td>${duration(r.active_seconds,true)}</td><td title="${r.id}">${r.id.slice(0,12)}…</td></tr>`).join('');
    $('#record-result').textContent = `${records.length} OF ${data.incomplete.length} ABANDONED MATCHES`;
  }
  $('#record-stage').addEventListener('change', event => renderRecords(event.target.value));
  renderRecords('all');

  const sections = ['overview','stages','records'].map(id => document.getElementById(id));
  const updateNav = () => {
    let current = 'overview';
    sections.forEach(section => { if (section.getBoundingClientRect().top < window.innerHeight * .45) current = section.id; });
    document.querySelectorAll('.masthead nav a').forEach(link => link.classList.toggle('nav-active', link.hash === `#${current}`));
  };
  window.addEventListener('scroll', updateNav, {passive:true});
  updateNav();
  document.documentElement.dataset.ready = 'true';
} catch (error) {
  console.error(error);
  $('#load-error').hidden = false;
}
