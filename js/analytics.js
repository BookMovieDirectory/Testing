/**
 * BookWorm — Analytics Dashboard
 * All data crunching, Chart.js rendering, goals management
 */

const Analytics = (() => {

  /* ── Palette ──────────────────────────────────── */
  const COLORS = [
    '#C4973A','#D4603A','#4A8CD4','#4CAF50','#9B59B6',
    '#1ABC9C','#E74C3C','#F39C12','#3498DB','#E91E63',
    '#FF5722','#00BCD4','#8BC34A','#FF9800','#607D8B',
  ];

  const CHART_DEFAULTS = {
    books_color:  '#C4973A',
    movies_color: '#4A8CD4',
    grid_color:   'rgba(255,255,255,0.06)',
    tick_color:   '#7A5C3E',
    font_family:  "'Lora', Georgia, serif",
  };

  Chart.defaults.color          = CHART_DEFAULTS.tick_color;
  Chart.defaults.font.family    = CHART_DEFAULTS.font_family;
  Chart.defaults.font.size      = 11;
  Chart.defaults.plugins.legend.display = false;

  /* ── Stored goals ─────────────────────────────── */
  const GOALS_KEY = 'bookworm_goals_v1';

  function getGoals() {
    try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveGoals(g) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
  }

  /* ── Data helpers ─────────────────────────────── */
  function groupByMonth(items, dateField) {
    const now = new Date();
    const months = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months[key] = 0;
    }
    items.forEach(item => {
      const raw = item[dateField] || item.dateRead || '';
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (key in months) months[key]++;
    });
    return months;
  }

  function groupByGenre(items) {
    const m = {};
    items.forEach(item => {
      const g = item.genre || 'Unknown';
      m[g] = (m[g] || 0) + 1;
    });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }

  function groupByRating(items) {
    const counts = [0,0,0,0,0];
    items.forEach(item => {
      const r = parseInt(item.rating);
      if (r >= 1 && r <= 5) counts[r-1]++;
    });
    return counts;
  }

  function avgRating(items) {
    const rated = items.filter(i => i.rating > 0);
    if (!rated.length) return 0;
    const sum = rated.reduce((s,i) => s + i.rating, 0);
    return (sum / rated.length).toFixed(1);
  }

  function topRated(items, n = 5) {
    return [...items]
      .filter(i => i.rating > 0)
      .sort((a,b) => b.rating - a.rating || new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, n);
  }

  function recentActivity(books, movies, n = 12) {
    const combined = [
      ...books.map(b => ({ ...b, _type: 'book' })),
      ...movies.map(m => ({ ...m, _type: 'movie' })),
    ];
    return combined
      .sort((a,b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, n);
  }

  function calcStreak(books) {
    // Count consecutive months (ending this month) with ≥1 book marked Read
    const readBooks = books.filter(b => b.status === 'Read');
    const monthsWithRead = new Set();
    readBooks.forEach(b => {
      const raw = b.dateRead || b.dateAdded;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d)) {
        monthsWithRead.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      }
    });
    const now = new Date();
    let streak = 0;
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (monthsWithRead.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  function bestMonth(groupedMonths) {
    let best = { key: '', count: 0 };
    Object.entries(groupedMonths).forEach(([k, v]) => {
      if (v > best.count) best = { key: k, count: v };
    });
    if (!best.key || !best.count) return '—';
    const [yr, mo] = best.key.split('-');
    const d = new Date(parseInt(yr), parseInt(mo)-1, 1);
    return d.toLocaleString('default', { month: 'short', year: 'numeric' }) + ` (${best.count})`;
  }

  /* ── Animated Counter ─────────────────────────── */
  function animateCount(el, target, duration = 1200, isDecimal = false) {
    const start = performance.now();
    const num = parseFloat(target) || 0;
    function step(now) {
      const prog = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const val = num * ease;
      el.textContent = isDecimal ? val.toFixed(1) : Math.floor(val).toLocaleString();
      if (prog < 1) requestAnimationFrame(step);
      else el.textContent = isDecimal ? num.toFixed(1) : Math.floor(num).toLocaleString();
    }
    requestAnimationFrame(step);
  }

  /* ── Build Month Labels ───────────────────────── */
  function monthLabels(groupedMonths) {
    return Object.keys(groupedMonths).map(k => {
      const [yr, mo] = k.split('-');
      const d = new Date(parseInt(yr), parseInt(mo)-1, 1);
      return d.toLocaleString('default', { month: 'short' });
    });
  }

  /* ═══════════════════════════════════════════════
     CHART: Activity Over Time
  ════════════════════════════════════════════════ */
  let activityChart = null;
  function renderActivityChart(books, movies) {
    const ctx = document.getElementById('activity-chart')?.getContext('2d');
    if (!ctx) return;

    const booksByMonth  = groupByMonth(books.filter(b => b.status !== 'Wishlist'), 'dateAdded');
    const moviesbyMonth = groupByMonth(movies.filter(m => m.status !== 'Watchlist'), 'dateAdded');
    const labels = monthLabels(booksByMonth);

    if (activityChart) activityChart.destroy();
    activityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Books',
            data: Object.values(booksByMonth),
            backgroundColor: 'rgba(196,151,58,0.75)',
            borderColor: '#C4973A',
            borderWidth: 1,
            borderRadius: 3,
            borderSkipped: false,
          },
          {
            label: 'Movies',
            data: Object.values(moviesbyMonth),
            backgroundColor: 'rgba(74,140,212,0.65)',
            borderColor: '#4A8CD4',
            borderWidth: 1,
            borderRadius: 3,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#7A5C3E',
              usePointStyle: true,
              pointStyle: 'rect',
              boxWidth: 10,
              boxHeight: 10,
              padding: 16,
              font: { family: "'Lora', serif", size: 11 },
            },
          },
          tooltip: {
            backgroundColor: '#1A1008',
            borderColor: '#3D2A14',
            borderWidth: 1,
            titleColor: '#C4A882',
            bodyColor: '#F0E6D3',
            padding: 12,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          },
        },
        scales: {
          x: {
            stacked: false,
            grid: { color: CHART_DEFAULTS.grid_color },
            ticks: { color: CHART_DEFAULTS.tick_color, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: CHART_DEFAULTS.grid_color },
            ticks: { color: CHART_DEFAULTS.tick_color, stepSize: 1, precision: 0 },
          },
        },
      },
    });
  }

  /* ═══════════════════════════════════════════════
     CHART: Genre Donut — Books
  ════════════════════════════════════════════════ */
  let bookGenreChart = null;
  function renderBookGenreChart(books) {
    const ctx = document.getElementById('book-genre-chart')?.getContext('2d');
    const legendEl = document.getElementById('book-genre-legend');
    if (!ctx) return;

    const genres = groupByGenre(books);
    if (!genres.length) {
      if (legendEl) legendEl.innerHTML = '<div class="an-empty"><div class="an-empty-icon">📚</div>No books yet</div>';
      return;
    }

    const labels = genres.map(g => g[0]);
    const values = genres.map(g => g[1]);
    const total  = values.reduce((a,b) => a+b, 0);

    if (bookGenreChart) bookGenreChart.destroy();
    bookGenreChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS.slice(0, labels.length).map(c => c + 'DD'),
          borderColor: COLORS.slice(0, labels.length),
          borderWidth: 1.5,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
        animation: { animateRotate: true, duration: 900 },
        plugins: {
          tooltip: {
            backgroundColor: '#1A1008',
            borderColor: '#3D2A14',
            borderWidth: 1,
            titleColor: '#C4A882',
            bodyColor: '#F0E6D3',
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/total*100)}%)`
            }
          },
        },
      },
    });

    // Donut center
    const wrap = ctx.canvas.parentElement;
    wrap.style.position = 'relative';
    let centerDiv = wrap.querySelector('.donut-center');
    if (!centerDiv) {
      centerDiv = document.createElement('div');
      centerDiv.className = 'donut-center';
      wrap.appendChild(centerDiv);
    }
    centerDiv.innerHTML = `<div class="donut-number">${total}</div><div class="donut-label">Books</div>`;

    // Legend
    if (legendEl) {
      legendEl.innerHTML = genres.slice(0, 8).map((g, i) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${COLORS[i]}"></span>
          <span class="legend-label">${g[0]}</span>
          <span class="legend-value">${g[1]}</span>
        </div>
      `).join('');
    }
  }

  /* ═══════════════════════════════════════════════
     CHART: Genre Donut — Movies
  ════════════════════════════════════════════════ */
  let movieGenreChart = null;
  function renderMovieGenreChart(movies) {
    const ctx = document.getElementById('movie-genre-chart')?.getContext('2d');
    const legendEl = document.getElementById('movie-genre-legend');
    if (!ctx) return;

    const genres = groupByGenre(movies);
    if (!genres.length) {
      if (legendEl) legendEl.innerHTML = '<div class="an-empty"><div class="an-empty-icon">🎬</div>No movies yet</div>';
      return;
    }

    const labels = genres.map(g => g[0]);
    const values = genres.map(g => g[1]);
    const total  = values.reduce((a,b) => a+b, 0);
    const movieColors = COLORS.slice(0).reverse();

    if (movieGenreChart) movieGenreChart.destroy();
    movieGenreChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: movieColors.slice(0, labels.length).map(c => c + 'DD'),
          borderColor: movieColors.slice(0, labels.length),
          borderWidth: 1.5,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
        animation: { animateRotate: true, duration: 900, delay: 150 },
        plugins: {
          tooltip: {
            backgroundColor: '#1A1008',
            borderColor: '#3D2A14',
            borderWidth: 1,
            titleColor: '#C4A882',
            bodyColor: '#F0E6D3',
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/total*100)}%)`
            }
          },
        },
      },
    });

    const wrap = ctx.canvas.parentElement;
    wrap.style.position = 'relative';
    let centerDiv = wrap.querySelector('.donut-center');
    if (!centerDiv) {
      centerDiv = document.createElement('div');
      centerDiv.className = 'donut-center';
      wrap.appendChild(centerDiv);
    }
    centerDiv.innerHTML = `<div class="donut-number">${total}</div><div class="donut-label">Movies</div>`;

    if (legendEl) {
      legendEl.innerHTML = genres.slice(0, 8).map((g, i) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${movieColors[i]}"></span>
          <span class="legend-label">${g[0]}</span>
          <span class="legend-value">${g[1]}</span>
        </div>
      `).join('');
    }
  }

  /* ═══════════════════════════════════════════════
     Rating Histograms
  ════════════════════════════════════════════════ */
  function renderRatingHist(containerId, items, color, glow) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const counts = groupByRating(items);
    const max    = Math.max(...counts, 1);

    container.innerHTML = counts.map((count, i) => {
      const pct = Math.round((count / max) * 100);
      const stars = '★'.repeat(i+1);
      return `
        <div class="hist-bar-wrap">
          <div class="hist-bar"
            style="
              height: ${pct}%;
              --hist-color: ${color};
              --hist-glow: ${glow};
            "
            data-count="${count}"
            title="${count} rated ${i+1} star${count !== 1 ? 's' : ''}"
          ></div>
          <div class="hist-label">${stars}</div>
        </div>
      `;
    }).join('');
  }

  /* ═══════════════════════════════════════════════
     Top Rated Lists
  ════════════════════════════════════════════════ */
  function renderTopList(containerId, items, metaKey) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const top = topRated(items);
    if (!top.length) {
      el.innerHTML = `<div class="an-empty"><div class="an-empty-icon">⭐</div>No ratings yet</div>`;
      return;
    }
    const rankSymbols = ['🥇','🥈','🥉','4','5'];
    el.innerHTML = top.map((item, i) => `
      <div class="top-item">
        <span class="top-rank rank-${i+1}">${rankSymbols[i]}</span>
        <div class="top-info">
          <div class="top-title">${item.title}</div>
          <div class="top-meta">${item[metaKey] || '—'}</div>
        </div>
        <span class="top-stars">${'★'.repeat(item.rating)}</span>
      </div>
    `).join('');
  }

  /* ═══════════════════════════════════════════════
     Recent Activity Feed
  ════════════════════════════════════════════════ */
  function renderActivityFeed(books, movies) {
    const el = document.getElementById('activity-feed');
    if (!el) return;
    const items = recentActivity(books, movies);
    if (!items.length) {
      el.innerHTML = `<div class="an-empty"><div class="an-empty-icon">📋</div>No entries yet. Start adding!</div>`;
      return;
    }
    el.innerHTML = items.map(item => {
      const isBook = item._type === 'book';
      const icon = isBook ? '📖' : '🎬';
      const meta = isBook ? (item.author || item.genre) : (item.director || item.genre);
      const dateStr = item.dateAdded
        ? new Date(item.dateAdded).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
        : '—';
      return `
        <div class="feed-item">
          <div class="feed-icon">${icon}</div>
          <div class="feed-text">
            <div class="feed-title">${item.title}</div>
            <div class="feed-date">${meta ? meta + ' · ' : ''}${dateStr}</div>
          </div>
          <span class="feed-tag ${isBook ? '' : 'movies'}">${isBook ? item.status : item.status}</span>
        </div>
      `;
    }).join('');
  }

  /* ═══════════════════════════════════════════════
     Goals Widget
  ════════════════════════════════════════════════ */
  function renderGoals(books, movies) {
    const goals = getGoals();
    const currentYear = new Date().getFullYear();
    const booksReadThisYear = books.filter(b => {
      if (b.status !== 'Read') return false;
      const d = new Date(b.dateRead || '');
      return !isNaN(d) && d.getFullYear() === currentYear;
    }).length;
    const moviesThisYear = movies.filter(m => {
      if (m.status !== 'Watched') return false;
      const d = new Date(m.dateWatched || '');
      return !isNaN(d) && d.getFullYear() === currentYear;
    }).length;

    const bookGoal  = parseInt(goals.books  || 12);
    const movieGoal = parseInt(goals.movies || 24);

    const bPct = Math.min(100, Math.round((booksReadThisYear / bookGoal) * 100));
    const mPct = Math.min(100, Math.round((moviesThisYear / movieGoal) * 100));

    const el = document.getElementById('goals-wrap');
    if (!el) return;

    el.innerHTML = `
      <div class="goal-item">
        <div class="goal-header">
          <span class="goal-label">📚 Books in ${currentYear}</span>
          <span class="goal-fraction">${booksReadThisYear} / <span id="book-goal-display">${bookGoal}</span></span>
        </div>
        <div class="goal-bar-track">
          <div class="goal-bar-fill"
            style="width:0%;--bar-color:#C4973A;--bar-color-lt:#E8C56A;--bar-glow:rgba(196,151,58,0.4)"
            id="book-goal-bar"
          ></div>
        </div>
        <div class="goal-pct">${bPct}% of goal</div>
        <div class="goal-input-wrap">
          <span style="font-size:0.78rem;color:var(--an-text-3);font-style:italic">Set goal:</span>
          <input type="number" class="goal-input" id="book-goal-input" value="${bookGoal}" min="1" max="999" />
          <button class="goal-set-btn" onclick="Analytics._setBookGoal()">Update</button>
        </div>
      </div>

      <div class="an-divider"></div>

      <div class="goal-item">
        <div class="goal-header">
          <span class="goal-label">🎬 Movies in ${currentYear}</span>
          <span class="goal-fraction">${moviesThisYear} / <span id="movie-goal-display">${movieGoal}</span></span>
        </div>
        <div class="goal-bar-track">
          <div class="goal-bar-fill"
            style="width:0%;--bar-color:#4A8CD4;--bar-color-lt:#7ABAFF;--bar-glow:rgba(74,140,212,0.4)"
            id="movie-goal-bar"
          ></div>
        </div>
        <div class="goal-pct">${mPct}% of goal</div>
        <div class="goal-input-wrap">
          <span style="font-size:0.78rem;color:var(--an-text-3);font-style:italic">Set goal:</span>
          <input type="number" class="goal-input" id="movie-goal-input" value="${movieGoal}" min="1" max="999" />
          <button class="goal-set-btn" onclick="Analytics._setMovieGoal()">Update</button>
        </div>
      </div>

      <div class="streak-grid">
        <div class="streak-card">
          <div class="streak-number" id="streak-num">—</div>
          <div class="streak-label">Month Streak 🔥</div>
        </div>
        <div class="streak-card">
          <div class="streak-number" id="best-month-num" style="font-size:1rem;padding-top:0.25rem">—</div>
          <div class="streak-label">Best Month</div>
        </div>
      </div>
    `;

    // Animate bars after DOM update
    setTimeout(() => {
      const bb = document.getElementById('book-goal-bar');
      const mb = document.getElementById('movie-goal-bar');
      if (bb) bb.style.width = bPct + '%';
      if (mb) mb.style.width = mPct + '%';
    }, 100);

    // Streak
    const streak = calcStreak(books);
    const sEl = document.getElementById('streak-num');
    if (sEl) animateCount(sEl, streak);

    // Best month
    const booksMonths = groupByMonth(books.filter(b=>b.status==='Read'), 'dateRead');
    const bmEl = document.getElementById('best-month-num');
    if (bmEl) bmEl.textContent = bestMonth(booksMonths);
  }

  /* Public refs for onclick handlers */
  let _cachedBooks  = [];
  let _cachedMovies = [];

  function _setBookGoal() {
    const val = parseInt(document.getElementById('book-goal-input')?.value) || 12;
    const goals = getGoals();
    goals.books = val;
    saveGoals(goals);
    renderGoals(_cachedBooks, _cachedMovies);
  }

  function _setMovieGoal() {
    const val = parseInt(document.getElementById('movie-goal-input')?.value) || 24;
    const goals = getGoals();
    goals.movies = val;
    saveGoals(goals);
    renderGoals(_cachedBooks, _cachedMovies);
  }

  /* ═══════════════════════════════════════════════
     Hero Stat Cards
  ════════════════════════════════════════════════ */
  function renderHeroStats(books, movies) {
    const bStats = BookWormDB.Books.stats();
    const mStats = BookWormDB.Movies.stats();

    const totalPages = books
      .filter(b => b.status === 'Read' && b.pages)
      .reduce((s, b) => s + (parseInt(b.pages) || 0), 0);

    const avgBookRating  = avgRating(books.filter(b => b.rating > 0));
    const avgMovieRating = avgRating(movies.filter(m => m.rating > 0));

    const set = (id, val, decimal) => {
      const el = document.getElementById(id);
      if (el) animateCount(el, val, 1200, decimal);
    };

    set('hs-books-read', bStats.read);
    set('hs-movies-watched', mStats.watched);
    set('hs-pages', totalPages);
    set('hs-avg-rating', avgBookRating || avgMovieRating, true);

    // Sub texts
    const sub = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    sub('hs-books-sub',
      `${bStats.reading} reading · ${bStats.wishlist} on wishlist`);
    sub('hs-movies-sub',
      `${mStats.watching} watching · ${mStats.watchlist} to watch`);
    sub('hs-pages-sub',
      totalPages ? `≈ ${Math.round(totalPages / 300)} novels worth` : 'Add page counts!');
    sub('hs-rating-sub',
      `${books.filter(b=>b.rating>0).length + movies.filter(m=>m.rating>0).length} rated entries`);
  }

  /* ═══════════════════════════════════════════════
     Status Overview
  ════════════════════════════════════════════════ */
  function renderStatusOverview(books, movies) {
    const el = document.getElementById('status-overview');
    if (!el) return;

    const total = books.length + movies.length || 1;
    const items = [
      { label: 'Read',       count: books.filter(b=>b.status==='Read').length,      color: '#C4973A', glow: 'rgba(196,151,58,0.4)' },
      { label: 'Reading',    count: books.filter(b=>b.status==='Reading').length,    color: '#4A8CD4', glow: 'rgba(74,140,212,0.4)' },
      { label: 'Wishlist',   count: books.filter(b=>b.status==='Wishlist').length,   color: '#D4603A', glow: 'rgba(212,96,58,0.4)' },
      { label: 'Watched',    count: movies.filter(m=>m.status==='Watched').length,   color: '#4CAF50', glow: 'rgba(76,175,80,0.4)' },
      { label: 'Watching',   count: movies.filter(m=>m.status==='Watching').length,  color: '#9B59B6', glow: 'rgba(155,89,182,0.4)' },
      { label: 'Watchlist',  count: movies.filter(m=>m.status==='Watchlist').length, color: '#1ABC9C', glow: 'rgba(26,188,156,0.4)' },
    ];

    el.innerHTML = items.map(item => {
      const pct = Math.round((item.count / total) * 100);
      return `
        <div class="goal-item">
          <div class="goal-header">
            <span class="goal-label" style="color:${item.color}">${item.label}</span>
            <span class="goal-fraction">${item.count}</span>
          </div>
          <div class="goal-bar-track">
            <div class="goal-bar-fill"
              id="status-bar-${item.label.toLowerCase()}"
              style="width:0%;--bar-color:${item.color};--bar-color-lt:${item.color};--bar-glow:${item.glow}"
            ></div>
          </div>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      items.forEach(item => {
        const bar = document.getElementById(`status-bar-${item.label.toLowerCase()}`);
        const pct = Math.round((item.count / total) * 100);
        if (bar) bar.style.width = pct + '%';
      });
    }, 150);
  }

  /* ═══════════════════════════════════════════════
     MAIN INIT
  ════════════════════════════════════════════════ */
  function init() {
    const books  = BookWormDB.Books.getAll();
    const movies = BookWormDB.Movies.getAll();

    _cachedBooks  = books;
    _cachedMovies = movies;

    renderHeroStats(books, movies);
    renderActivityChart(books, movies);
    renderBookGenreChart(books);
    renderMovieGenreChart(movies);
    renderRatingHist('book-rating-hist', books,  '#C4973A', 'rgba(196,151,58,0.4)');
    renderRatingHist('movie-rating-hist', movies, '#4A8CD4', 'rgba(74,140,212,0.4)');
    renderTopList('top-books-list', books, 'author');
    renderTopList('top-movies-list', movies, 'director');
    renderActivityFeed(books, movies);
    renderGoals(books, movies);
    renderStatusOverview(books, movies);
  }

  return { init, _setBookGoal, _setMovieGoal };
})();

document.addEventListener('DOMContentLoaded', () => Analytics.init());
