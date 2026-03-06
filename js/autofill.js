/**
 * BookWorm — Auto-Fill Engine
 * Books  → Open Library API (no key needed, CORS-enabled)
 * Movies → TMDB API (free key at themoviedb.org)
 *
 * HOW TO GET A FREE TMDB KEY:
 *  1. Visit https://www.themoviedb.org/signup
 *  2. Go to Settings → API → Request API Key (v3 auth)
 *  3. Paste it below
 */

const AutoFill = (() => {

  /* ════════════════════════════════════════════════
     CONFIG — paste your free TMDB API key here
  ═════════════════════════════════════════════════ */
  const TMDB_API_KEY = '';   // ← e.g. 'abc123def456'

  const TMDB_GENRES = {
    28:'Action', 12:'Adventure', 16:'Animation', 35:'Comedy',
    80:'Crime', 99:'Documentary', 18:'Drama', 14:'Fantasy',
    27:'Horror', 10402:'Musical', 9648:'Mystery', 10749:'Romance',
    878:'Science Fiction', 53:'Thriller', 10752:'Historical',
    37:'Western', 36:'Historical', 10751:'Family',
  };

  const OL_GENRE_MAP = [
    { keywords:['literary fiction'],  genre:'Literary Fiction' },
    { keywords:['science fiction','sf ','sci-fi','scifi'], genre:'Science Fiction' },
    { keywords:['historical fiction'], genre:'Historical Fiction' },
    { keywords:['graphic novel','comics'], genre:'Graphic Novel' },
    { keywords:['nonfiction','non-fiction','non fiction'], genre:'Non-Fiction' },
    { keywords:['self-help','self help','personal development'], genre:'Self-Help' },
    { keywords:['fantasy'],     genre:'Fantasy' },
    { keywords:['mystery'],     genre:'Mystery' },
    { keywords:['thriller'],    genre:'Thriller' },
    { keywords:['romance'],     genre:'Romance' },
    { keywords:['biography'],   genre:'Biography' },
    { keywords:['memoir','autobiography'], genre:'Memoir' },
    { keywords:['horror'],      genre:'Horror' },
    { keywords:['adventure'],   genre:'Adventure' },
    { keywords:['poetry','poems'], genre:'Poetry' },
    { keywords:['philosophy'],  genre:'Philosophy' },
    { keywords:['psychology'],  genre:'Psychology' },
    { keywords:['science'],     genre:'Science' },
    { keywords:['travel'],      genre:'Travel' },
    { keywords:['classic'],     genre:'Classic' },
    { keywords:['fiction'],     genre:'Fiction' },
  ];

  function _mapOLGenre(subjects) {
    if (!subjects || !subjects.length) return '';
    const lowered = subjects.map(s => s.toLowerCase());
    for (const rule of OL_GENRE_MAP) {
      if (lowered.some(s => rule.keywords.some(k => s.includes(k)))) {
        return rule.genre;
      }
    }
    return '';
  }

  function _mapTMDBGenre(genreIds) {
    if (!genreIds || !genreIds.length) return '';
    for (const id of genreIds) {
      if (TMDB_GENRES[id]) return TMDB_GENRES[id];
    }
    return '';
  }

  /* ─── Open Library — Book Lookup ──────────────────── */
  async function lookupBook(title) {
    if (!title || title.length < 3) return null;
    try {
      const q = encodeURIComponent(title);
      const url = `https://openlibrary.org/search.json?title=${q}&limit=5&fields=title,author_name,subject,number_of_pages_median,first_publish_year`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const data = await res.json();
      const docs = data.docs;
      if (!docs || !docs.length) return null;

      // Pick the best match: prefer exact title match (case-insensitive)
      let best = docs.find(d =>
        d.title && d.title.toLowerCase() === title.toLowerCase()
      ) || docs[0];

      return {
        author: best.author_name ? best.author_name[0] : '',
        genre:  _mapOLGenre(best.subject || []),
        pages:  best.number_of_pages_median ? String(best.number_of_pages_median) : '',
      };
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Open Library lookup failed:', err);
      return null;
    }
  }

  /* ─── TMDB — Movie Lookup ─────────────────────────── */
  async function lookupMovie(title) {
    if (!title || title.length < 2) return null;
    if (!TMDB_API_KEY) {
      // No key — return null silently
      return null;
    }
    try {
      const q = encodeURIComponent(title);
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${q}&limit=5`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const data = await res.json();
      const results = data.results;
      if (!results || !results.length) return null;

      let best = results.find(r =>
        r.title && r.title.toLowerCase() === title.toLowerCase()
      ) || results[0];

      const year = best.release_date ? best.release_date.slice(0, 4) : '';
      const genre = _mapTMDBGenre(best.genre_ids || []);

      return { year, genre };
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('TMDB lookup failed:', err);
      return null;
    }
  }

  /* ─── UI helpers ──────────────────────────────────── */
  function showLookupSpinner(fieldId, show) {
    const wrap = document.getElementById(fieldId)?.parentElement;
    if (!wrap) return;
    let indicator = wrap.querySelector('.autofill-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'autofill-indicator';
      wrap.style.position = 'relative';
      wrap.appendChild(indicator);
    }
    indicator.className = `autofill-indicator ${show ? 'loading' : ''}`;
    indicator.innerHTML = show
      ? `<span class="af-spinner"></span><span class="af-label">Looking up…</span>`
      : '';
  }

  function showAutofillBadge(fieldId, text, onApply) {
    const wrap = document.getElementById(fieldId)?.parentElement;
    if (!wrap) return;
    // Remove old badge
    wrap.querySelector('.autofill-badge')?.remove();

    if (!text) return;
    const badge = document.createElement('div');
    badge.className = 'autofill-badge';
    badge.innerHTML = `
      <span class="af-icon">✨</span>
      <span class="af-text">Found: <strong>${text}</strong></span>
      <button class="af-apply" type="button">Apply</button>
      <button class="af-dismiss" type="button">✕</button>
    `;
    badge.querySelector('.af-apply').addEventListener('click', () => {
      onApply();
      badge.remove();
    });
    badge.querySelector('.af-dismiss').addEventListener('click', () => badge.remove());
    wrap.appendChild(badge);
  }

  /* ─── Book Auto-Fill Integration ─────────────────── */
  function attachBookAutofill() {
    const titleInput = document.getElementById('book-title');
    if (!titleInput) return;

    let debounceTimer;
    titleInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const title = titleInput.value.trim();

      // Clear old badge
      titleInput.parentElement?.querySelector('.autofill-badge')?.remove();
      titleInput.parentElement?.querySelector('.autofill-indicator')?.remove();

      if (title.length < 4) return;

      debounceTimer = setTimeout(async () => {
        showLookupSpinner('book-title', true);
        const result = await lookupBook(title);
        showLookupSpinner('book-title', false);

        if (!result) return;

        const parts = [];
        const authorEl = document.getElementById('book-author');
        const genreEl  = document.getElementById('book-genre');
        const pagesEl  = document.getElementById('book-pages');

        if (result.author && authorEl && !authorEl.value.trim()) {
          parts.push(`Author: ${result.author}`);
        }
        if (result.genre && genreEl && !genreEl.value) {
          parts.push(`Genre: ${result.genre}`);
        }
        if (result.pages && pagesEl && !pagesEl.value.trim()) {
          parts.push(`Pages: ${result.pages}`);
        }

        if (!parts.length) return;

        showAutofillBadge('book-title', parts.join(' · '), () => {
          if (result.author && authorEl && !authorEl.value.trim()) {
            authorEl.value = result.author;
            flash(authorEl);
          }
          if (result.genre && genreEl && !genreEl.value) {
            // Check if option exists
            const opt = [...genreEl.options].find(o => o.value === result.genre);
            if (opt) { genreEl.value = result.genre; flash(genreEl); }
          }
          if (result.pages && pagesEl && !pagesEl.value.trim()) {
            pagesEl.value = result.pages;
            flash(pagesEl);
          }
          showToast('✨ Details filled from Open Library!', 'success');
        });
      }, 900);
    });
  }

  /* ─── Movie Auto-Fill Integration ────────────────── */
  function attachMovieAutofill() {
    const titleInput = document.getElementById('movie-title');
    if (!titleInput) return;

    let debounceTimer;
    titleInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const title = titleInput.value.trim();

      titleInput.parentElement?.querySelector('.autofill-badge')?.remove();
      titleInput.parentElement?.querySelector('.autofill-indicator')?.remove();

      if (title.length < 3) return;

      debounceTimer = setTimeout(async () => {
        showLookupSpinner('movie-title', true);
        const result = await lookupMovie(title);
        showLookupSpinner('movie-title', false);

        if (!result) {
          if (!TMDB_API_KEY) {
            // Show hint about TMDB key
            showTMDBHint();
          }
          return;
        }

        const parts = [];
        const genreEl = document.getElementById('movie-genre');
        const yearEl  = document.getElementById('movie-year');

        if (result.genre && genreEl && !genreEl.value) parts.push(`Genre: ${result.genre}`);
        if (result.year  && yearEl  && !yearEl.value.trim())  parts.push(`Year: ${result.year}`);
        if (!parts.length) return;

        showAutofillBadge('movie-title', parts.join(' · '), () => {
          if (result.genre && genreEl) {
            const opt = [...genreEl.options].find(o => o.value === result.genre);
            if (opt) { genreEl.value = result.genre; flash(genreEl); }
          }
          if (result.year && yearEl) { yearEl.value = result.year; flash(yearEl); }
          showToast('✨ Details filled from TMDB!', 'success');
        });
      }, 900);
    });
  }

  function showTMDBHint() {
    const existingHint = document.getElementById('tmdb-hint');
    if (existingHint) return;
    const hint = document.querySelector('.tmdb-hint-wrap');
    if (hint) hint.style.display = 'block';
  }

  function flash(el) {
    el.style.transition = 'background 0.3s ease';
    el.style.background = 'rgba(196,151,58,0.2)';
    setTimeout(() => { el.style.background = ''; }, 1000);
  }

  return { attachBookAutofill, attachMovieAutofill };
})();
