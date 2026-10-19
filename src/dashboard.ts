/** One workout, with GPS stripped. Distances/ascent in km, times in seconds. */
export interface DashActivity {
  id: string;
  name: string;
  sport: string;
  startTime: number;
  distance: number;
  timerTime: number;
  elapsedTime: number;
  ascent: number;
  calories: number;
  avgHeartRate: number;
}

export function buildDashboardHTML(activities: DashActivity[]): string {
  const dataJson = JSON.stringify(activities).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard · FIT Map Viewer</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #14161c; color: #e6e6e6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0 20px 40px; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 18px 0 14px; }
    header h1 { font-size: 20px; font-weight: 700; margin-right: auto; }
    a.nav { color: #ccc; text-decoration: none; font-size: 12px; background: #2a2d36; border: 1px solid #3a3e4a; border-radius: 6px; padding: 6px 12px; }
    a.nav:hover { border-color: #7B2CBF; }
    .unit-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #888; }
    .unit-row span.on { color: #fff; font-weight: 600; }
    .switch { position: relative; width: 38px; height: 20px; padding: 0; border: none; border-radius: 10px; background: #3a3e4a; cursor: pointer; transition: background 0.15s; }
    .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
    .switch[aria-checked="true"] { background: #7B2CBF; }
    .switch[aria-checked="true"]::after { transform: translateX(18px); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .chip { font-size: 12px; color: #ccc; background: #2a2d36; border: 1px solid #3a3e4a; border-radius: 14px; padding: 5px 12px; cursor: pointer; }
    .chip i { margin-right: 6px; }
    .chip.on { background: #7B2CBF; border-color: #7B2CBF; color: #fff; }
    .card { background: #1b1e26; border: 1px solid #2a2d36; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
    .card h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .card h2 .grow { flex: 1; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .tile { background: #1b1e26; border: 1px solid #2a2d36; border-radius: 10px; padding: 14px; }
    .tile .l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; }
    .tile .v { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .tile .s { font-size: 11px; color: #888; margin-top: 2px; }
    .year-btns { display: flex; flex-wrap: wrap; gap: 4px; }
    .year-btns button { font-size: 11px; color: #ccc; background: #2a2d36; border: 1px solid #3a3e4a; border-radius: 6px; padding: 3px 9px; cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .year-btns button.on { background: #7B2CBF; border-color: #7B2CBF; color: #fff; }
    .heat-scroll { overflow-x: auto; padding-bottom: 6px; }
    .heat { display: grid; grid-auto-flow: column; grid-template-rows: 14px repeat(7, 12px); grid-auto-columns: 12px; gap: 3px; width: max-content; }
    .heat .m { font-size: 10px; color: #888; white-space: nowrap; overflow: visible; line-height: 14px; }
    .cell { width: 12px; height: 12px; border-radius: 2px; background: #2a2d36; }
    .cell.off { visibility: hidden; }
    .cell.l1 { background: #4a2275; }
    .cell.l2 { background: #6a28a8; }
    .cell.l3 { background: #8b3fd6; }
    .cell.l4 { background: #b57bee; }
    .cell:not(.off):hover { outline: 1px solid #fff; }
    .heat-foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 11px; color: #888; margin-top: 8px; }
    .legend { display: flex; align-items: center; gap: 4px; }
    #tip { position: fixed; display: none; pointer-events: none; z-index: 10; background: #000; color: #e6e6e6; font-size: 11px; padding: 5px 8px; border-radius: 5px; white-space: nowrap; }
    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .grid2 .card { margin-bottom: 0; }
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 150px; }
    .bar-col { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
    .bar { width: 100%; background: #7B2CBF; border-radius: 3px 3px 0 0; min-height: 0; }
    .bar:hover { background: #b57bee; }
    .bar-val { font-size: 10px; color: #aaa; margin-bottom: 3px; white-space: nowrap; }
    .bar-lab { font-size: 10px; color: #888; margin-top: 5px; }
    .tbl-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: right; padding: 8px 10px; white-space: nowrap; }
    th:first-child, td:first-child { text-align: left; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; font-weight: 600; cursor: pointer; border-bottom: 1px solid #3a3e4a; user-select: none; }
    th.on { color: #fff; }
    tbody tr { border-bottom: 1px solid #23262f; }
    tfoot td { font-weight: 700; border-top: 1px solid #3a3e4a; }
    td i { width: 20px; color: #b57bee; }
    .rec { display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid #23262f; font-size: 13px; }
    .rec:last-child { border-bottom: none; }
    .rec .k { width: 120px; flex-shrink: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .rec .v { font-weight: 600; }
    .rec .w { margin-left: auto; color: #888; font-size: 11px; text-align: right; }
    .empty { color: #888; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Dashboard</h1>
      <a class="nav" href="/"><i class="fa-solid fa-map"></i> Map</a>
      <div class="unit-row">
        <span id="u-mi">Imperial</span>
        <button id="unit-switch" class="switch" role="switch" aria-label="Use metric units" aria-checked="false"></button>
        <span id="u-km">Metric</span>
      </div>
    </header>
    <div class="chips" id="chips"></div>
    <div id="body"></div>
  </div>
  <div id="tip"></div>
  <script>
    (function () {
      const es = new EventSource('/__reload');
      es.onerror = () => {
        es.close();
        const poll = setInterval(() => {
          fetch('/dashboard', { cache: 'no-store' }).then(r => { if (r.ok) { clearInterval(poll); location.reload(); } }).catch(() => {});
        }, 500);
      };
    })();
  </script>
  <script>
    const ACTS = ${dataJson};

    const SPORT_ICONS = {
      running: 'person-running', trail_running: 'mountain', cycling: 'person-biking', e_biking: 'person-biking',
      walking: 'person-walking', hiking: 'person-hiking', swimming: 'person-swimming',
      alpine_skiing: 'person-skiing', cross_country_skiing: 'person-skiing-nordic',
      snowboarding: 'person-snowboarding', training: 'dumbbell',
    };
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // ---- Units ----
    const KM_TO_MI = 0.621371, KM_TO_FT = 3280.84, KM_TO_M = 1000;
    let units = 'mi';
    try { if (localStorage.getItem('units') === 'km') units = 'km'; } catch (e) {}
    const isMi = () => units === 'mi';
    const dMul = () => (isMi() ? KM_TO_MI : 1);
    const fmtDist = km => (km * dMul()).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ' + units;
    const fmtElev = km => Math.round(km * (isMi() ? KM_TO_FT : KM_TO_M)).toLocaleString() + (isMi() ? ' ft' : ' m');
    function fmtDur(sec) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return h > 0 ? h.toLocaleString() + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
    }
    function fmtPace(sec, km) {
      if (!(sec > 0 && km > 0)) return '–';
      const p = sec / (km * dMul());
      return Math.floor(p / 60) + ':' + String(Math.round(p % 60)).padStart(2, '0') + ' /' + units;
    }
    function fmtSpeed(sec, km) {
      if (!(sec > 0 && km > 0)) return '–';
      return (km * dMul() / (sec / 3600)).toFixed(1) + ' ' + (isMi() ? 'mph' : 'km/h');
    }
    const isRide = s => s === 'cycling' || s === 'e_biking';
    const fmtRate = (s, sec, km) => (isRide(s) ? fmtSpeed(sec, km) : fmtPace(sec, km));
    const sportName = s => s ? s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Other';
    const icon = s => '<i class="fa-solid fa-' + (SPORT_ICONS[s] || 'location-dot') + '"></i>';
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const keyOf = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const dayNum = k => { const p = k.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); };
    const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const state = { sport: 'all', range: 'last', sortKey: 'distance', sortDir: 'desc' };
    const filtered = () => ACTS.filter(a => state.sport === 'all' || a.sport === state.sport);
    const sum = (list, f) => list.reduce((t, a) => t + f(a), 0);

    // ---- Sport chips ----
    function renderChips() {
      const counts = {};
      ACTS.forEach(a => { counts[a.sport] = (counts[a.sport] || 0) + 1; });
      const sports = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      const chip = (key, html) => '<button class="chip' + (state.sport === key ? ' on' : '') + '" data-sport="' + esc(key) + '">' + html + '</button>';
      document.getElementById('chips').innerHTML =
        chip('all', 'All (' + ACTS.length + ')') +
        sports.map(s => chip(s, icon(s) + esc(sportName(s)) + ' (' + counts[s] + ')')).join('');
    }
    document.getElementById('chips').addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      state.sport = b.dataset.sport;
      render();
    });

    // ---- Summary tiles ----
    function streaks(list) {
      const days = [...new Set(list.filter(a => a.startTime).map(a => dayNum(keyOf(a.startTime))))].sort((a, b) => a - b);
      let best = 0, run = 0;
      days.forEach((d, i) => { run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; });
      const now = new Date(), today = Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
      let cur = 0;
      if (days.length && days[days.length - 1] >= today - 1) {
        cur = 1;
        for (let i = days.length - 1; i > 0 && days[i] === days[i - 1] + 1; i--) cur++;
      }
      return { best, cur, active: days.length };
    }

    function tilesHtml(list) {
      const dist = sum(list, a => a.distance), time = sum(list, a => a.timerTime);
      const hrs = list.filter(a => a.avgHeartRate > 0);
      const st = streaks(list);
      const tile = (l, v, s) => '<div class="tile"><div class="l">' + l + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
      return '<div class="tiles">' +
        tile('Activities', list.length.toLocaleString(), '') +
        tile('Distance', fmtDist(dist), list.length ? 'avg ' + fmtDist(dist / list.length) : '') +
        tile('Moving time', fmtDur(time), list.length ? 'avg ' + fmtDur(time / list.length) : '') +
        tile('Elevation gain', fmtElev(sum(list, a => a.ascent)), '') +
        tile('Calories', sum(list, a => a.calories).toLocaleString() + ' kcal', '') +
        tile('Active days', st.active.toLocaleString(), '') +
        tile('Longest streak', st.best + ' day' + (st.best === 1 ? '' : 's'), st.cur ? 'current: ' + st.cur : '') +
        tile('Avg heart rate', hrs.length ? Math.round(sum(hrs, a => a.avgHeartRate) / hrs.length) + ' bpm' : '–', '') +
        '</div>';
    }

    // ---- Calendar heatmap (distance per day) ----
    let heatDays = new Map();
    function heatHtml(list) {
      const byDay = new Map();
      list.forEach(a => {
        if (!a.startTime) return;
        const k = keyOf(a.startTime), o = byDay.get(k) || { d: 0, t: 0, n: 0 };
        o.d += a.distance; o.t += a.timerTime; o.n++;
        byDay.set(k, o);
      });
      heatDays = byDay;

      const years = [...new Set(list.filter(a => a.startTime).map(a => new Date(a.startTime).getFullYear()))].sort((a, b) => b - a);
      if (state.range !== 'last' && !years.includes(+state.range)) state.range = 'last';
      const now = new Date();
      let rs, re;
      if (state.range === 'last') { re = new Date(now.getFullYear(), now.getMonth(), now.getDate()); rs = new Date(re.getFullYear(), re.getMonth(), re.getDate() - 364); }
      else { rs = new Date(+state.range, 0, 1); re = new Date(+state.range, 11, 31); }
      const first = new Date(rs.getFullYear(), rs.getMonth(), rs.getDate() - rs.getDay());
      const weeks = Math.ceil(((re - first) / 864e5 + 1) / 7);

      let max = 0, total = 0, active = 0;
      const rsK = keyOf(rs), reK = keyOf(re);
      byDay.forEach((v, k) => { if (k >= rsK && k <= reK) { if (v.d > max) max = v.d; total += v.d; active++; } });

      let cells = '', lastMonth = -1;
      for (let w = 0; w < weeks; w++) {
        const head = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7);
        const mo = head.getMonth();
        cells += '<div class="m">' + (mo !== lastMonth ? MONTHS[mo] : '') + '</div>';
        lastMonth = mo;
        for (let d = 0; d < 7; d++) {
          const cur = new Date(head.getFullYear(), head.getMonth(), head.getDate() + d), k = keyOf(cur.getTime());
          if (k < rsK || k > reK) { cells += '<div class="cell off"></div>'; continue; }
          const v = byDay.get(k);
          const lvl = v && v.d > 0 ? Math.min(4, Math.max(1, Math.ceil((v.d / max) * 4))) : (v ? 1 : 0);
          cells += '<div class="cell' + (lvl ? ' l' + lvl : '') + '" data-k="' + k + '"></div>';
        }
      }

      const btn = (v, label) => '<button data-range="' + v + '"' + (String(state.range) === String(v) ? ' class="on"' : '') + '>' + label + '</button>';
      return '<div class="card"><h2><span class="grow">Daily distance</span><span class="year-btns">' +
        btn('last', 'Last 12 months') + years.map(y => btn(y, y)).join('') + '</span></h2>' +
        '<div class="heat-scroll"><div class="heat" id="heat">' + cells + '</div></div>' +
        '<div class="heat-foot"><span>' + active + ' active day' + (active === 1 ? '' : 's') + ' · ' + fmtDist(total) + '</span>' +
        '<span class="legend">Less <span class="cell"></span><span class="cell l1"></span><span class="cell l2"></span><span class="cell l3"></span><span class="cell l4"></span> More</span></div></div>';
    }

    // ---- Distance per month (last 12) ----
    function monthsHtml(list) {
      const now = new Date(), buckets = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ y: d.getFullYear(), m: d.getMonth(), d: 0 });
      }
      list.forEach(a => {
        if (!a.startTime) return;
        const d = new Date(a.startTime), b = buckets.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
        if (b) b.d += a.distance;
      });
      return barsHtml('Distance per month', buckets.map(b => ({ label: MONTHS[b.m], v: b.d, title: MONTHS[b.m] + ' ' + b.y + ': ' + fmtDist(b.d) })));
    }

    // ---- Distance by weekday ----
    function weekdayHtml(list) {
      const t = DAYS.map(() => 0);
      list.forEach(a => { if (a.startTime) t[new Date(a.startTime).getDay()] += a.distance; });
      const order = [1, 2, 3, 4, 5, 6, 0];
      return barsHtml('Distance by weekday', order.map(i => ({ label: DAYS[i], v: t[i], title: DAYS[i] + ': ' + fmtDist(t[i]) })));
    }

    function barsHtml(title, items) {
      const max = Math.max(1e-9, ...items.map(i => i.v));
      return '<div class="card"><h2>' + title + '</h2><div class="bars">' + items.map(i =>
        '<div class="bar-col" title="' + esc(i.title) + '"><div class="bar-val">' + (i.v > 0 ? Math.round(i.v * dMul()) : '') + '</div>' +
        '<div class="bar" style="height:' + Math.round((i.v / max) * 100 * 0.8) + '%"></div><div class="bar-lab">' + i.label + '</div></div>').join('') +
        '</div></div>';
    }

    // ---- Totals by sport ----
    const COLS = [
      ['sport', 'Type', r => r.sport.toLowerCase()],
      ['count', 'Activities', r => r.count],
      ['distance', 'Distance', r => r.distance],
      ['time', 'Moving time', r => r.time],
      ['ascent', 'Elevation', r => r.ascent],
      ['calories', 'Calories', r => r.calories],
      ['rate', 'Avg pace', r => (r.distance > 0 ? r.time / r.distance : 0)],
    ];
    function groupRow(label, sportKey, list) {
      return { sport: label, key: sportKey, count: list.length, distance: sum(list, a => a.distance), time: sum(list, a => a.timerTime), ascent: sum(list, a => a.ascent), calories: sum(list, a => a.calories) };
    }
    function tableHtml(list) {
      const groups = {};
      list.forEach(a => { (groups[a.sport] = groups[a.sport] || []).push(a); });
      const rows = Object.keys(groups).map(s => groupRow(sportName(s), s, groups[s]));
      const col = COLS.find(c => c[0] === state.sortKey) || COLS[2];
      const sign = state.sortDir === 'asc' ? 1 : -1;
      rows.sort((a, b) => { const x = col[2](a), y = col[2](b); return sign * (typeof x === 'string' ? x.localeCompare(y) : x - y); });
      const cells = (r, s) => '<td>' + r.count + '</td><td>' + fmtDist(r.distance) + '</td><td>' + fmtDur(r.time) + '</td><td>' + fmtElev(r.ascent) + '</td><td>' + r.calories.toLocaleString() + '</td><td>' + fmtRate(s, r.time, r.distance) + '</td>';
      const tot = groupRow('Total', '', list);
      return '<div class="card"><h2>Totals by type</h2><div class="tbl-scroll"><table><thead><tr>' +
        COLS.map(c => '<th data-sort="' + c[0] + '"' + (c[0] === state.sortKey ? ' class="on"' : '') + '>' + c[1] + (c[0] === state.sortKey ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '') + '</th>').join('') +
        '</tr></thead><tbody>' +
        rows.map(r => '<tr><td>' + icon(r.key) + esc(r.sport) + '</td>' + cells(r, r.key) + '</tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td>' + cells(tot, rows.length === 1 ? rows[0].key : '') + '</tr></tfoot></table></div></div>';
    }

    // ---- Personal records ----
    function recordsHtml(list) {
      const best = (f, better) => list.reduce((b, a) => { const v = f(a); return v != null && (b == null || better(v, f(b))) ? a : b; }, null);
      const hi = (a, b) => a > b, lo = (a, b) => a < b;
      const row = (k, a, val) => a ? '<div class="rec"><span class="k">' + k + '</span><span class="v">' + val(a) + '</span><span class="w">' + esc(a.name || sportName(a.sport)) + ' · ' + fmtDate(a.startTime) + '</span></div>' : '';
      const rate = a => (a.distance >= 1.6 && a.timerTime > 0 && !isRide(a.sport) ? a.timerTime / a.distance : null);
      const out =
        row('Longest', best(a => (a.distance > 0 ? a.distance : null), hi), a => fmtDist(a.distance)) +
        row('Longest time', best(a => (a.timerTime > 0 ? a.timerTime : null), hi), a => fmtDur(a.timerTime)) +
        row('Most climbing', best(a => (a.ascent > 0 ? a.ascent : null), hi), a => fmtElev(a.ascent)) +
        row('Fastest pace', best(rate, lo), a => fmtPace(a.timerTime, a.distance)) +
        row('Most calories', best(a => (a.calories > 0 ? a.calories : null), hi), a => a.calories.toLocaleString() + ' kcal');
      return '<div class="card"><h2>Personal records</h2>' + (out || '<div class="empty">No data.</div>') +
        '<div class="empty" style="margin-top:8px;font-size:11px">Fastest pace requires at least 1 mi (1.6 km).</div></div>';
    }

    function render() {
      renderChips();
      const list = filtered();
      document.getElementById('body').innerHTML = ACTS.length === 0 ? '<div class="empty">No activities found.</div>' :
        tilesHtml(list) + heatHtml(list) +
        '<div class="grid2" style="margin-bottom:16px">' + monthsHtml(list) + weekdayHtml(list) + '</div>' +
        '<div class="grid2">' + tableHtml(list).replace('class="card"', 'class="card" style="grid-column:1/-1"') + recordsHtml(list) + '</div>';
      const u = document.getElementById('unit-switch');
      u.setAttribute('aria-checked', String(!isMi()));
      document.getElementById('u-mi').classList.toggle('on', isMi());
      document.getElementById('u-km').classList.toggle('on', !isMi());
    }

    document.getElementById('body').addEventListener('click', e => {
      const r = e.target.closest('[data-range]');
      if (r) { state.range = r.dataset.range; render(); return; }
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.dataset.sort;
        if (state.sortKey === k) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = k; state.sortDir = k === 'sport' ? 'asc' : 'desc'; }
        render();
      }
    });

    // ---- Heatmap tooltip ----
    const tip = document.getElementById('tip');
    document.getElementById('body').addEventListener('mouseover', e => {
      const c = e.target.closest('.cell[data-k]');
      if (!c) { tip.style.display = 'none'; return; }
      const v = heatDays.get(c.dataset.k), p = c.dataset.k.split('-');
      const date = new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      tip.textContent = v ? date + ' · ' + fmtDist(v.d) + ' · ' + fmtDur(v.t) + (v.n > 1 ? ' · ' + v.n + ' activities' : '') : date + ' · rest day';
      const r = c.getBoundingClientRect();
      tip.style.display = 'block';
      tip.style.left = Math.max(4, Math.min(innerWidth - tip.offsetWidth - 4, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
      tip.style.top = (r.top - tip.offsetHeight - 6) + 'px';
    });
    document.getElementById('body').addEventListener('mouseleave', () => { tip.style.display = 'none'; });

    document.getElementById('unit-switch').addEventListener('click', () => {
      units = isMi() ? 'km' : 'mi';
      try { localStorage.setItem('units', units); } catch (e) {}
      render();
    });

    render();
  </script>
</body>
</html>`;
}
