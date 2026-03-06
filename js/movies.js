/**
 * BookWorm — Movies Page Logic
 * CRUD, search, filter, sort, tab switching
 */

const MoviesPage = (() => {
  // ── State ────────────────────────────────────
  let state = {
    tab:     'watched',    // 'watched' | 'watchlist'
    search:  '',
    genre:   '',
    sort:    'dateAdded',
    sortDir: 'desc',
    editingId: null,
    currentRating: 0,
  };

  const MOVIE_GENRES = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Fantasy', 'Horror', 'Musical',
    'Mystery', 'Romance', 'Science Fiction', 'Thriller',
    'Western', 'Historical', 'Biographical', 'Family',
    'Superhero', 'Foreign', 'Other',
  ];

  const MOVIE_STATUSES = ['Watched', 'Watching', 'Watchlist'];

  const $ = id => document.getElementById(id);

  function init() {
    setupTabs();
    setupSearch();
    setupModal();
    setupIOBar();
    renderAll();
    updateStats();
  }

  // ── Tabs ─────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.tab;
        state.search = '';
        state.genre = '';
        if ($('search-input')) $('search-input').value = '';
        if ($('genre-filter')) $('genre-filter').value = '';
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
        updateStats();
      });
    });
  }

  // ── Search & Filter ───────────────────────────
  function setupSearch() {
    const searchInput = $('search-input');
    const genreFilter = $('genre-filter');
    const sortBtns = document.querySelectorAll('[data-sort]');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(e => {
        state.search = e.target.value.toLowerCase().trim();
        renderAll();
      }, 250));
    }

    if (genreFilter) {
      genreFilter.addEventListener('change', e => {
        state.genre = e.target.value;
        renderAll();
      });
    }

    if (sortBtns) {
      sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.sort === btn.dataset.sort) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sort = btn.dataset.sort;
            state.sortDir = 'desc';
          }
          sortBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderAll();
        });
      });
    }
  }

  // ── Filter & Sort ─────────────────────────────
  function getFilteredMovies() {
    let movies = BookWormDB.Movies.getAll();

    if (state.tab === 'watchlist') {
      movies = movies.filter(m => m.status === 'Watchlist');
    } else {
      movies = movies.filter(m => m.status !== 'Watchlist');
    }

    if (state.search) {
      movies = movies.filter(m =>
        m.title.toLowerCase().includes(state.search) ||
        m.director.toLowerCase().includes(state.search) ||
        (m.notes || '').toLowerCase().includes(state.search)
      );
    }

    if (state.genre) {
      movies = movies.filter(m => m.genre === state.genre);
    }

    movies.sort((a, b) => {
      let valA, valB;
      switch (state.sort) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'rating':
          valA = a.rating || 0;
          valB = b.rating || 0;
          break;
        case 'year':
          valA = a.year || '';
          valB = b.year || '';
          break;
        default:
          valA = a.dateAdded || '';
          valB = b.dateAdded || '';
      }
      if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return movies;
  }

  // ── Render ────────────────────────────────────
  function renderAll() {
    const grid = $('cards-grid');
    if (!grid) return;

    const movies = getFilteredMovies();
    const countEl = $('entry-count');
    if (countEl) countEl.textContent = movies.length;

    if (movies.length === 0) {
      grid.innerHTML = emptyState();
      return;
    }

    grid.innerHTML = movies.map(movie => movieCardHTML(movie)).join('');
    attachCardListeners();
  }

  function movieCardHTML(movie) {
    const q = state.search;
    const title    = highlight(movie.title, q);
    const director = highlight(movie.director, q);

    return `
      <article class="entry-card" data-id="${movie.id}">
        <div class="card-header">
          <h3 class="card-title">${title}</h3>
          <div class="card-actions">
            <button class="btn-icon edit-btn" data-id="${movie.id}" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" data-id="${movie.id}" title="Delete">🗑️</button>
          </div>
        </div>
        ${director ? `<div class="card-meta">dir. ${director}${movie.year ? ` · ${movie.year}` : ''}</div>` : (movie.year ? `<div class="card-meta">${movie.year}</div>` : '')}
        <div class="card-tags">
          ${statusTagHTML(movie.status)}
          ${movie.genre ? `<span class="tag tag-genre">${movie.genre}</span>` : ''}
        </div>
        ${movie.rating ? `<div class="card-rating">${renderStars(movie.rating)}</div>` : ''}
        ${movie.notes ? `<p class="card-notes">${movie.notes}</p>` : ''}
        <div class="card-date">
          ${movie.dateWatched ? `📅 Watched: ${movie.dateWatched}` : ''}
          ${!movie.dateWatched ? `Added ${formatDate(movie.dateAdded)}` : ''}
        </div>
      </article>
    `;
  }

  function emptyState() {
    const isSearch = state.search || state.genre;
    if (isSearch) {
      return `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No matches found</h3>
        <p>Try a different search or clear the filters.</p>
      </div>`;
    }
    const isWatchlist = state.tab === 'watchlist';
    return `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">${isWatchlist ? '🎞️' : '🎬'}</div>
      <h3>${isWatchlist ? 'Your watchlist is empty' : 'Lights, camera, action!'}</h3>
      <p>${isWatchlist
        ? 'Add movies you want to watch someday.'
        : 'Start tracking the movies you\'ve seen.'}</p>
    </div>`;
  }

  function attachCardListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const movie = BookWormDB.Movies.getById(btn.dataset.id);
        if (!movie) return;
        confirmDelete(movie.title, () => {
          BookWormDB.Movies.delete(btn.dataset.id);
          showToast(`"${movie.title}" removed.`, 'info');
          renderAll();
          updateStats();
        });
      });
    });
  }

  // ── Stats ─────────────────────────────────────
  function updateStats() {
    const s = BookWormDB.Movies.stats();
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('stat-total',     s.total);
    set('stat-watched',   s.watched);
    set('stat-watching',  s.watching);
    set('stat-watchlist', s.watchlist);
  }

  // ── Modal ─────────────────────────────────────
  function setupModal() {
    const addBtn = $('add-movie-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const closeBtn = $('modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal('movie-modal'));

    const cancelBtn = $('modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('movie-modal'));

    const form = $('movie-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Star rating
    const starContainer = document.querySelector('.star-rating-input');
    if (starContainer) {
      state._starInput = initStarInput(starContainer, 0, (val) => {
        state.currentRating = val;
      });
    }

    // Genre dropdown
    const genreSelect = $('movie-genre');
    if (genreSelect) {
      genreSelect.innerHTML = `<option value="">— Select Genre —</option>` +
        MOVIE_GENRES.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    const genreFilter = $('genre-filter');
    if (genreFilter) {
      genreFilter.innerHTML = `<option value="">All Genres</option>` +
        MOVIE_GENRES.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    // Status dropdown
    const statusSelect = $('movie-status');
    if (statusSelect) {
      statusSelect.innerHTML = MOVIE_STATUSES
        .map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }

  function openAddModal() {
    state.editingId = null;
    const form = $('movie-form');
    if (form) form.reset();
    if (state._starInput) state._starInput.setValue(0);
    state.currentRating = 0;

    const title = document.querySelector('#movie-modal .modal-title');
    if (title) title.textContent = 'Add a New Movie';
    const submit = $('modal-submit');
    if (submit) submit.textContent = 'Add Movie';

    const statusSel = $('movie-status');
    if (statusSel) statusSel.value = state.tab === 'watchlist' ? 'Watchlist' : 'Watched';

    openModal('movie-modal');
  }

  function openEditModal(id) {
    const movie = BookWormDB.Movies.getById(id);
    if (!movie) return;
    state.editingId = id;

    const title = document.querySelector('#movie-modal .modal-title');
    if (title) title.textContent = 'Edit Movie';
    const submit = $('modal-submit');
    if (submit) submit.textContent = 'Save Changes';

    const fields = ['title', 'director', 'genre', 'year', 'status', 'dateWatched', 'notes'];
    fields.forEach(f => {
      const el = $(`movie-${f}`);
      if (el) el.value = movie[f] || '';
    });

    state.currentRating = movie.rating || 0;
    if (state._starInput) state._starInput.setValue(state.currentRating);

    openModal('movie-modal');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const data = {
      title:       $('movie-title')?.value.trim(),
      director:    $('movie-director')?.value.trim(),
      genre:       $('movie-genre')?.value,
      year:        $('movie-year')?.value.trim(),
      status:      $('movie-status')?.value,
      rating:      state.currentRating,
      dateWatched: $('movie-dateWatched')?.value,
      notes:       $('movie-notes')?.value.trim(),
    };

    if (!data.title) {
      showToast('Please enter a movie title.', 'error');
      return;
    }

    if (state.editingId) {
      BookWormDB.Movies.update(state.editingId, data);
      showToast(`"${data.title}" updated!`, 'success');
    } else {
      BookWormDB.Movies.add(data);
      showToast(`"${data.title}" added!`, 'success');
    }

    closeModal('movie-modal');
    renderAll();
    updateStats();
  }

  // ── Import / Export ───────────────────────────
  function setupIOBar() {
    const exportBtn = $('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const movies = BookWormDB.Movies.getAll();
        ExcelManager.exportMovies(movies);
      });
    }

    const importInput = $('import-input');
    if (importInput) {
      importInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        ExcelManager.importMovies(file, () => {
          renderAll();
          updateStats();
          importInput.value = '';
        });
      });
    }

    const importBtn = $('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => triggerFileInput('import-input'));
    }

    const templateBtn = $('template-btn');
    if (templateBtn) {
      templateBtn.addEventListener('click', () => ExcelManager.downloadMovieTemplate());
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => MoviesPage.init());
