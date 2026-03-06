/**
 * BookWorm — Excel Import / Export
 * Uses SheetJS (xlsx) library loaded from CDN
 */

const ExcelManager = (() => {
  /* ── BOOKS EXPORT ──────────────────────────── */
  function exportBooks(books, filename = 'BookWorm_Books.xlsx') {
    if (!books || books.length === 0) {
      showToast('No books to export.', 'error');
      return;
    }

    const data = books.map(b => ({
      'Title':       b.title,
      'Author':      b.author,
      'Genre':       b.genre,
      'Status':      b.status,
      'Rating':      b.rating ? `${b.rating}/5` : '',
      'Date Read':   b.dateRead   || '',
      'Pages':       b.pages      || '',
      'Notes':       b.notes      || '',
      'Date Added':  b.dateAdded  ? new Date(b.dateAdded).toLocaleDateString()  : '',
    }));

    _writeExcel(data, 'Books', filename);
    showToast(`📥 Exported ${books.length} book(s) successfully!`, 'success');
  }

  /* ── BOOKS IMPORT ──────────────────────────── */
  function importBooks(file, onSuccess) {
    _readExcel(file, (rows) => {
      const books = rows.map(row => ({
        title:    String(row['Title']    || '').trim(),
        author:   String(row['Author']   || '').trim(),
        genre:    String(row['Genre']    || '').trim(),
        status:   _mapBookStatus(row['Status']),
        rating:   _parseRating(row['Rating']),
        dateRead: String(row['Date Read'] || '').trim(),
        pages:    String(row['Pages']    || '').trim(),
        notes:    String(row['Notes']    || '').trim(),
      })).filter(b => b.title);

      if (books.length === 0) {
        showToast('No valid rows found. Make sure columns match the template.', 'error');
        return;
      }

      const count = BookWormDB.Books.importMany(books);
      showToast(`📚 Imported ${count} book(s) successfully!`, 'success');
      if (typeof onSuccess === 'function') onSuccess(count);
    });
  }

  /* ── MOVIES EXPORT ─────────────────────────── */
  function exportMovies(movies, filename = 'BookWorm_Movies.xlsx') {
    if (!movies || movies.length === 0) {
      showToast('No movies to export.', 'error');
      return;
    }

    const data = movies.map(m => ({
      'Title':         m.title,
      'Director':      m.director,
      'Genre':         m.genre,
      'Year':          m.year || '',
      'Status':        m.status,
      'Rating':        m.rating ? `${m.rating}/5` : '',
      'Date Watched':  m.dateWatched  || '',
      'Notes':         m.notes        || '',
      'Date Added':    m.dateAdded ? new Date(m.dateAdded).toLocaleDateString() : '',
    }));

    _writeExcel(data, 'Movies', filename);
    showToast(`🎬 Exported ${movies.length} movie(s) successfully!`, 'success');
  }

  /* ── MOVIES IMPORT ─────────────────────────── */
  function importMovies(file, onSuccess) {
    _readExcel(file, (rows) => {
      const movies = rows.map(row => ({
        title:       String(row['Title']        || '').trim(),
        director:    String(row['Director']     || '').trim(),
        genre:       String(row['Genre']        || '').trim(),
        year:        String(row['Year']         || '').trim(),
        status:      _mapMovieStatus(row['Status']),
        rating:      _parseRating(row['Rating']),
        dateWatched: String(row['Date Watched'] || '').trim(),
        notes:       String(row['Notes']        || '').trim(),
      })).filter(m => m.title);

      if (movies.length === 0) {
        showToast('No valid rows found. Make sure columns match the template.', 'error');
        return;
      }

      const count = BookWormDB.Movies.importMany(movies);
      showToast(`🎬 Imported ${count} movie(s) successfully!`, 'success');
      if (typeof onSuccess === 'function') onSuccess(count);
    });
  }

  /* ── TEMPLATE DOWNLOAD ─────────────────────── */
  function downloadBookTemplate() {
    const sample = [{
      'Title':    'The Great Gatsby',
      'Author':   'F. Scott Fitzgerald',
      'Genre':    'Fiction',
      'Status':   'Read',
      'Rating':   '5/5',
      'Date Read': '2024-01-15',
      'Pages':    '180',
      'Notes':    'A timeless classic.',
    }];
    _writeExcel(sample, 'Books', 'BookWorm_Books_Template.xlsx');
    showToast('📄 Book template downloaded!', 'success');
  }

  function downloadMovieTemplate() {
    const sample = [{
      'Title':        'Inception',
      'Director':     'Christopher Nolan',
      'Genre':        'Science Fiction',
      'Year':         '2010',
      'Status':       'Watched',
      'Rating':       '5/5',
      'Date Watched': '2024-02-20',
      'Notes':        'Mind-bending masterpiece.',
    }];
    _writeExcel(sample, 'Movies', 'BookWorm_Movies_Template.xlsx');
    showToast('📄 Movie template downloaded!', 'success');
  }

  /* ── PRIVATE HELPERS ───────────────────────── */
  function _writeExcel(data, sheetName, filename) {
    const ws = XLSX.utils.json_to_sheet(data);

    // Style column widths
    const cols = Object.keys(data[0] || {}).map(k => ({
      wch: Math.max(k.length, ...data.map(r => String(r[k] || '').length)) + 2
    }));
    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  function _readExcel(file, callback) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['xlsx', 'xls', 'csv'];
    if (!allowedExts.includes(ext)) {
      showToast('Please upload an .xlsx, .xls, or .csv file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        callback(rows);
      } catch (err) {
        console.error('Excel read error:', err);
        showToast('Failed to read file. Check the format and try again.', 'error');
      }
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsBinaryString(file);
  }

  function _mapBookStatus(val) {
    const v = String(val || '').toLowerCase().trim();
    if (v.includes('read'))   return 'Read';
    if (v.includes('reading')) return 'Reading';
    if (v.includes('wish'))   return 'Wishlist';
    return 'Read';
  }

  function _mapMovieStatus(val) {
    const v = String(val || '').toLowerCase().trim();
    if (v.includes('watched'))  return 'Watched';
    if (v.includes('watching')) return 'Watching';
    if (v.includes('watch'))    return 'Watchlist';
    return 'Watched';
  }

  function _parseRating(val) {
    const s = String(val || '');
    const match = s.match(/(\d)/);
    const n = match ? parseInt(match[1]) : 0;
    return Math.min(5, Math.max(0, n));
  }

  return {
    exportBooks,
    importBooks,
    exportMovies,
    importMovies,
    downloadBookTemplate,
    downloadMovieTemplate,
  };
})();
