// Leonida Legend: an offline GTA VI trophy tracker.
// Loads app/data/trophies.json, renders the checklist, and keeps progress in localStorage.
// Nothing here reaches the network: the only fetch is the trophy file beside this script,
// and source links open only when the reader follows them.
const KEY = 'leonida-legend-earned-v1';
const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  platinum: 'Platinum',
};

const listEl = document.getElementById('list');
const detailEl = document.getElementById('detail');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const countLine = document.getElementById('countLine');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');

const params = new URLSearchParams(location.search);
const earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let trophies = [];
let activeKind = params.get('kind') ?? 'all';
let selectedId = Number(params.get('trophy') ?? 28);
if (params.get('spoiler') === '1') spoilerEl.checked = true;

function saveProgress() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isHidden(trophy) {
  // Spoiler mode masks story trophies the reader has not earned yet.
  return spoilerEl.checked && trophy.hidden && !earned.has(trophy.id);
}

function matchesKind(trophy, kind) {
  if (kind === 'all') return true;
  if (kind === 'missable') return trophy.missable === true;
  if (kind === 'online') return trophy.kind === 'online';
  return trophy.kind === kind;
}

function visibleTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  const grade = gradeEl.value;
  return trophies.filter((t) => {
    if (!matchesKind(t, activeKind)) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (query && !(t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query))) return false;
    return true;
  });
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = `grade ${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function kindTags(trophy) {
  const wrap = document.createElement('div');
  wrap.className = 'trophy-meta';
  const kind = document.createElement('span');
  kind.className = 'tag';
  kind.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
  wrap.append(kind);
  if (trophy.count) {
    const count = document.createElement('span');
    count.className = 'tag';
    count.textContent = `× ${trophy.count.toLocaleString('en-US')}`;
    wrap.append(count);
  }
  if (trophy.missable) {
    const miss = document.createElement('span');
    miss.className = 'tag missable';
    miss.textContent = 'Missable';
    wrap.append(miss);
  }
  return wrap;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  if (shown.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = activeKind === 'online'
      ? 'No online trophies — every one of the 55 is single-player. Nothing here needs multiplayer.'
      : 'No trophies match these filters. Try clearing the search or picking another kind.';
    listEl.append(empty);
  }
  for (const trophy of shown) {
    const item = document.createElement('li');
    if (earned.has(trophy.id)) item.classList.add('earned');
    if (trophy.id === selectedId) item.classList.add('selected');
    item.addEventListener('click', () => {
      selectedId = trophy.id;
      renderList();
      renderDetail();
    });

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      saveProgress();
      renderList();
      renderDetail();
      renderProgress();
    });
    item.append(box);

    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    if (isHidden(trophy)) {
      name.textContent = 'Hidden trophy ';
      const note = document.createElement('span');
      note.className = 'hidden-note';
      note.textContent = '— earn it to reveal';
      name.append(note);
    } else {
      name.textContent = trophy.name;
    }
    body.append(name);
    if (!isHidden(trophy)) {
      const desc = document.createElement('div');
      desc.className = 'trophy-desc';
      desc.textContent = trophy.description;
      body.append(desc);
      body.append(kindTags(trophy));
      const preview = document.createElement('div');
      preview.className = 'guide-preview';
      preview.textContent = trophy.guide;
      body.append(preview);
    }
    item.append(body);
    item.append(gradeBadge(trophy));
    listEl.append(item);
  }
  const earnedShown = shown.filter((t) => earned.has(t.id)).length;
  countLine.textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${earnedShown} earned in this view`;
}

function renderDetail() {
  const trophy = trophies.find((t) => t.id === selectedId);
  detailEl.replaceChildren();
  if (!trophy) {
    const hint = document.createElement('p');
    hint.className = 'placeholder';
    hint.textContent = 'Pick a trophy from the list to read its guide and sources.';
    detailEl.append(hint);
    return;
  }
  if (isHidden(trophy)) {
    const heading = document.createElement('h3');
    heading.textContent = 'Hidden story trophy';
    detailEl.append(heading);
    const note = document.createElement('p');
    note.className = 'placeholder';
    note.textContent = 'This trophy is hidden on PlayStation until you earn it. Turn off “Hide story spoilers” to read its name and guide, or earn it in the game and tick it off here.';
    detailEl.append(note);
    return;
  }
  const heading = document.createElement('h3');
  heading.textContent = trophy.name;
  detailEl.append(heading);
  detailEl.append(gradeBadge(trophy));
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = trophy.description;
  detailEl.append(official);
  detailEl.append(kindTags(trophy));
  if (trophy.missable) {
    const warn = document.createElement('div');
    warn.className = 'missable-box';
    warn.textContent = 'Missable: this is the only trophy in the list that can be missed. See the guide below and do it before the window closes.';
    detailEl.append(warn);
  }
  const guideLabel = document.createElement('p');
  guideLabel.className = 'guide-label';
  guideLabel.textContent = 'Guide';
  detailEl.append(guideLabel);
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = trophy.guide;
  detailEl.append(guide);
  const sourcesLabel = document.createElement('p');
  sourcesLabel.className = 'sources-label';
  sourcesLabel.textContent = 'Sources';
  detailEl.append(sourcesLabel);
  const sources = document.createElement('ul');
  sources.className = 'sources';
  for (const source of trophy.sources) {
    const item = document.createElement('li');
    if (source.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.name;
      item.append(link);
    } else {
      item.textContent = source.name;
    }
    sources.append(item);
  }
  detailEl.append(sources);
  if (earned.has(trophy.id)) {
    const line = document.createElement('p');
    line.className = 'earned-line';
    line.textContent = 'Earned — ticked off in your tracker.';
    detailEl.append(line);
  }
}

function renderProgress() {
  progressFill.style.width = `${(earned.size / trophies.length) * 100}%`;
  progressText.textContent = `${earned.size} of ${trophies.length} earned · ${Math.round((earned.size / trophies.length) * 100)}% to the platinum`;
}

function download(filename, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById('export').addEventListener('click', () => {
  download('leonida-legend-progress.json', JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b) }, null, 2));
});

document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.id));
    const imported = ids.filter((id) => valid.has(id));
    earned.clear();
    for (const id of imported) earned.add(id);
    saveProgress();
    renderList();
    renderDetail();
    renderProgress();
  } catch {
    countLine.textContent = 'That file could not be read as a progress export. Nothing changed.';
  }
  event.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (!window.confirm('Clear every tick in the tracker?')) return;
  earned.clear();
  saveProgress();
  renderList();
  renderDetail();
  renderProgress();
});

document.querySelectorAll('.chip').forEach((chip) => {
  if (chip.dataset.kind === activeKind) chip.classList.add('active');
  else chip.classList.remove('active');
  chip.addEventListener('click', () => {
    activeKind = chip.dataset.kind;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderList();
  });
});
gradeEl.addEventListener('change', renderList);
searchEl.addEventListener('input', renderList);
spoilerEl.addEventListener('change', () => {
  renderList();
  renderDetail();
});

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
if (!trophies.some((t) => t.id === selectedId)) selectedId = trophies[0].id;
renderList();
renderDetail();
renderProgress();
