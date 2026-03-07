/**
 * BookWorm — Books Page Logic
 * CRUD, search, filter, sort, tab switching
 */

const BooksPage = (() => {
  // ── State ────────────────────────────────────
  let state = {
    tab:     'library',    // 'library' | 'wishlist'
    search:  '',
    genre:   '',
    status:  'all',
    sort:    'dateAdded',  // 'dateAdded' | 'title' | 'rating' | 'dateRead'
    sortDir: 'desc',
    editingId: null,
    currentRating: 0,
  };

  const BOOK_GENRES = [
    'Fiction', 'Non-Fiction', 'Fantasy', 'Science Fiction',
    'Mystery', 'Thriller', 'Romance', 'Historical Fiction',
    'Biography', 'Memoir', 'Self-Help', 'Horror', 'Adventure',
    'Literary Fiction', 'Graphic Novel', 'Poetry', 'Classic',
    'Philosophy', 'Psychology', 'Science', 'Travel', 'Other',
  ];

  const BOOK_STATUSES = ['Read', 'Reading', 'Wishlist'];

  // ── DOM refs ─────────────────────────────────
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

  // ── Filter & Sort Logic ───────────────────────
  function getFilteredBooks() {
    let books = BookWormDB.Books.getAll();

    // Tab filter
    if (state.tab === 'wishlist') {
      books = books.filter(b => b.status === 'Wishlist');
    } else {
      books = books.filter(b => b.status !== 'Wishlist');
    }

    // Search
    if (state.search) {
      books = books.filter(b =>
        b.title.toLowerCase().includes(state.search) ||
        b.author.toLowerCase().includes(state.search) ||
        (b.notes || '').toLowerCase().includes(state.search)
      );
    }

    // Genre
    if (state.genre) {
      books = books.filter(b => b.genre === state.genre);
    }

    // Sort
    books.sort((a, b) => {
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
        case 'dateRead':
          valA = a.dateRead || '';
          valB = b.dateRead || '';
          break;
        default:
          valA = a.dateRead || '';
          valB = b.dateRead || '';
      }
      if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return books;
  }

  // ── Render ────────────────────────────────────
  function renderAll() {
    const grid = $('cards-grid');
    if (!grid) return;

    const books = getFilteredBooks();
    const countEl = $('entry-count');
    if (countEl) countEl.textContent = books.length;

    if (books.length === 0) {
      grid.innerHTML = emptyState();
      return;
    }

    grid.innerHTML = books.map(book => bookCardHTML(book)).join('');
    attachCardListeners();
  }

  function bookCardHTML(book) {
    const q = state.search;
    const title  = highlight(book.title, q);
    const author = highlight(book.author, q);

    return `
      <article class="entry-card" data-id="${book.id}">
        <div class="card-header">
          <h3 class="card-title">${title}</h3>
          <div class="card-actions">
            <button class="btn-icon edit-btn" data-id="${book.id}" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" data-id="${book.id}" title="Delete">🗑️</button>
          </div>
        </div>
        ${author ? `<div class="card-meta">by ${author}</div>` : ''}
        <div class="card-tags">
          ${statusTagHTML(book.status)}
          ${book.genre ? `<span class="tag tag-genre">${book.genre}</span>` : ''}
        </div>
        ${book.rating ? `<div class="card-rating">${renderStars(book.rating)}</div>` : ''}
        ${book.notes ? `<p class="card-notes">${book.notes}</p>` : ''}
        <div class="card-date">
          ${book.dateRead ? `📅 Read: ${book.dateRead}` : ''}
          ${book.pages ? ` · ${book.pages} pages` : ''}
          ${!book.dateRead && !book.pages ? `Added ${formatDate(book.dateAdded)}` : ''}
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
    const isWishlist = state.tab === 'wishlist';
    return `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">${isWishlist ? '📋' : '📚'}</div>
      <h3>${isWishlist ? 'Your wishlist is empty' : 'Your library awaits'}</h3>
      <p>${isWishlist
        ? 'Add books you dream of reading someday.'
        : 'Start by adding a book you\'ve read or are reading.'}</p>
    </div>`;
  }

  function attachCardListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const book = BookWormDB.Books.getById(btn.dataset.id);
        if (!book) return;
        confirmDelete(book.title, () => {
          BookWormDB.Books.delete(btn.dataset.id);
          showToast(`"${book.title}" removed.`, 'info');
          renderAll();
          updateStats();
        });
      });
    });
  }

  // ── Stats ─────────────────────────────────────
  function updateStats() {
    const s = BookWormDB.Books.stats();
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('stat-total',    s.total);
    set('stat-read',     s.read);
    set('stat-reading',  s.reading);
    set('stat-wishlist', s.wishlist);
  }

  // ── Modal ─────────────────────────────────────
  function setupModal() {
    const addBtn = $('add-book-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const closeBtn = $('modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal('book-modal'));

    const cancelBtn = $('modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('book-modal'));

    const form = $('book-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Star rating
    const starContainer = document.querySelector('.star-rating-input');
    if (starContainer) {
      state._starInput = initStarInput(starContainer, 0, (val) => {
        state.currentRating = val;
      });
    }

    // Genre dropdown
    const genreSelect = $('book-genre');
    if (genreSelect) {
      genreSelect.innerHTML = `<option value="">— Select Genre —</option>` +
        BOOK_GENRES.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    const genreFilter = $('genre-filter');
    if (genreFilter) {
      genreFilter.innerHTML = `<option value="">All Genres</option>` +
        BOOK_GENRES.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    // Status dropdown
    const statusSelect = $('book-status');
    if (statusSelect) {
      statusSelect.innerHTML = BOOK_STATUSES
        .map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }

  function openAddModal() {
    state.editingId = null;
    const form = $('book-form');
    if (form) form.reset();
    if (state._starInput) state._starInput.setValue(0);
    state.currentRating = 0;

    const title = document.querySelector('#book-modal .modal-title');
    if (title) title.textContent = 'Add a New Book';
    const submit = $('modal-submit');
    if (submit) submit.textContent = 'Add Book';

    // Default status based on tab
    const statusSel = $('book-status');
    if (statusSel) statusSel.value = state.tab === 'wishlist' ? 'Wishlist' : 'Read';

    openModal('book-modal');
  }

  function openEditModal(id) {
    const book = BookWormDB.Books.getById(id);
    if (!book) return;
    state.editingId = id;

    const title = document.querySelector('#book-modal .modal-title');
    if (title) title.textContent = 'Edit Book';
    const submit = $('modal-submit');
    if (submit) submit.textContent = 'Save Changes';

    // Populate form
    const fields = ['title', 'author', 'genre', 'status', 'dateRead', 'pages', 'notes'];
    fields.forEach(f => {
      const el = $(`book-${f}`);
      if (el) el.value = book[f] || '';
    });

    // Stars
    state.currentRating = book.rating || 0;
    if (state._starInput) state._starInput.setValue(state.currentRating);

    openModal('book-modal');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const data = {
      title:    $('book-title')?.value.trim(),
      author:   $('book-author')?.value.trim(),
      genre:    $('book-genre')?.value,
      status:   $('book-status')?.value,
      rating:   state.currentRating,
      dateRead: $('book-dateRead')?.value,
      pages:    $('book-pages')?.value.trim(),
      notes:    $('book-notes')?.value.trim(),
    };

    if (!data.title) {
      showToast('Please enter a book title.', 'error');
      return;
    }

    if (state.editingId) {
      BookWormDB.Books.update(state.editingId, data);
      showToast(`"${data.title}" updated!`, 'success');
    } else {
      BookWormDB.Books.add(data);
      showToast(`"${data.title}" added to your library!`, 'success');
    }

    closeModal('book-modal');
    renderAll();
    updateStats();
  }

  // ── Import / Export ───────────────────────────
  function setupIOBar() {
    const exportBtn = $('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const books = BookWormDB.Books.getAll();
        ExcelManager.exportBooks(books);
      });
    }

    const importInput = $('import-input');
    if (importInput) {
      importInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        ExcelManager.importBooks(file, () => {
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
      templateBtn.addEventListener('click', () => ExcelManager.downloadBookTemplate());
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => BooksPage.init());
