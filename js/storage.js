/**
 * BookWorm — Storage Manager
 * Handles all localStorage read/write operations
 * Data persists locally on the user's device
 */

const BookWormDB = (() => {
  const KEYS = {
    BOOKS:  'bookworm_books_v1',
    MOVIES: 'bookworm_movies_v1',
  };

  function _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('BookWorm storage error:', e);
      return false;
    }
  }

  function _newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── BOOKS ─────────────────────────────────── */
  const Books = {
    getAll() {
      return _get(KEYS.BOOKS);
    },
    getByStatus(status) {
      return this.getAll().filter(b => b.status === status);
    },
    getById(id) {
      return this.getAll().find(b => b.id === id) || null;
    },
    add(bookData) {
      const books = this.getAll();
      const book = {
        id:        _newId(),
        title:     bookData.title     || '',
        author:    bookData.author    || '',
        genre:     bookData.genre     || '',
        status:    bookData.status    || 'Read',
        rating:    parseInt(bookData.rating) || 0,
        dateRead:  bookData.dateRead  || '',
        pages:     bookData.pages     || '',
        notes:     bookData.notes     || '',
        dateAdded: new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
      };
      books.push(book);
      _save(KEYS.BOOKS, books);
      return book;
    },
    update(id, updates) {
      const books = this.getAll();
      const idx = books.findIndex(b => b.id === id);
      if (idx === -1) return null;
      books[idx] = { ...books[idx], ...updates, dateUpdated: new Date().toISOString() };
      _save(KEYS.BOOKS, books);
      return books[idx];
    },
    delete(id) {
      const books = this.getAll().filter(b => b.id !== id);
      _save(KEYS.BOOKS, books);
    },
    importMany(booksArray) {
      const existing = this.getAll();
      const incoming = booksArray.map(b => ({
        id:        _newId(),
        title:     b.title     || '',
        author:    b.author    || '',
        genre:     b.genre     || '',
        status:    b.status    || 'Read',
        rating:    parseInt(b.rating) || 0,
        dateRead:  b.dateRead  || '',
        pages:     b.pages     || '',
        notes:     b.notes     || '',
        dateAdded:  b.dateAdded  || new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
      }));
      _save(KEYS.BOOKS, [...existing, ...incoming]);
      return incoming.length;
    },
    stats() {
      const all = this.getAll();
      return {
        total:    all.length,
        read:     all.filter(b => b.status === 'Read').length,
        reading:  all.filter(b => b.status === 'Reading').length,
        wishlist: all.filter(b => b.status === 'Wishlist').length,
      };
    },
  };

  /* ── MOVIES ─────────────────────────────────── */
  const Movies = {
    getAll() {
      return _get(KEYS.MOVIES);
    },
    getByStatus(status) {
      return this.getAll().filter(m => m.status === status);
    },
    getById(id) {
      return this.getAll().find(m => m.id === id) || null;
    },
    add(movieData) {
      const movies = this.getAll();
      const movie = {
        id:           _newId(),
        title:        movieData.title    || '',
        director:     movieData.director || '',
        genre:        movieData.genre    || '',
        year:         movieData.year     || '',
        status:       movieData.status   || 'Watched',
        rating:       parseInt(movieData.rating) || 0,
        dateWatched:  movieData.dateWatched || '',
        notes:        movieData.notes    || '',
        dateAdded:    new Date().toISOString(),
        dateUpdated:  new Date().toISOString(),
      };
      movies.push(movie);
      _save(KEYS.MOVIES, movies);
      return movie;
    },
    update(id, updates) {
      const movies = this.getAll();
      const idx = movies.findIndex(m => m.id === id);
      if (idx === -1) return null;
      movies[idx] = { ...movies[idx], ...updates, dateUpdated: new Date().toISOString() };
      _save(KEYS.MOVIES, movies);
      return movies[idx];
    },
    delete(id) {
      const movies = this.getAll().filter(m => m.id !== id);
      _save(KEYS.MOVIES, movies);
    },
    importMany(moviesArray) {
      const existing = this.getAll();
      const incoming = moviesArray.map(m => ({
        id:          _newId(),
        title:       m.title    || '',
        director:    m.director || '',
        genre:       m.genre    || '',
        year:        m.year     || '',
        status:      m.status   || 'Watched',
        rating:      parseInt(m.rating) || 0,
        dateWatched: m.dateWatched || '',
        notes:       m.notes    || '',
        dateAdded:   m.dateAdded || new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
      }));
      _save(KEYS.MOVIES, [...existing, ...incoming]);
      return incoming.length;
    },
    stats() {
      const all = this.getAll();
      return {
        total:     all.length,
        watched:   all.filter(m => m.status === 'Watched').length,
        watching:  all.filter(m => m.status === 'Watching').length,
        watchlist: all.filter(m => m.status === 'Watchlist').length,
      };
    },
  };

  return { Books, Movies };
})();
