/**
 * BookWorm — UI Utilities
 * Toast, star rendering, card building, helpers
 */

/* ── Toast Notifications ───────────────────────── */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.35s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/* ── Star Rating Renderer ──────────────────────── */
function renderStars(rating, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span class="${i <= rating ? 'star-filled' : 'star-empty'}">★</span>`;
  }
  return html;
}

/* ── Star Rating Input ─────────────────────────── */
function initStarInput(container, initialValue = 0, onChange) {
  const stars = container.querySelectorAll('.star');
  let current = initialValue;

  function updateDisplay(val) {
    stars.forEach((s, i) => {
      s.classList.toggle('active', i < val);
    });
  }

  updateDisplay(current);

  stars.forEach((star, i) => {
    star.addEventListener('click', () => {
      current = current === i + 1 ? 0 : i + 1;
      updateDisplay(current);
      if (typeof onChange === 'function') onChange(current);
    });
    star.addEventListener('mouseenter', () => updateDisplay(i + 1));
    star.addEventListener('mouseleave', () => updateDisplay(current));
  });

  return {
    getValue: () => current,
    setValue: (v) => { current = v; updateDisplay(v); },
  };
}

/* ── Modal Manager ─────────────────────────────── */
function openModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus first input
  const first = overlay.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 200);
}

function closeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

/* ── Date Formatter ────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

/* ── Status Tag HTML ───────────────────────────── */
function statusTagHTML(status) {
  const cls = status ? status.toLowerCase() : '';
  return `<span class="tag tag-status-${cls}">${status}</span>`;
}

/* ── Debounce ──────────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Highlight Search ──────────────────────────── */
function highlight(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
}

/* ── Future Scope: Auto-fill from Open Library API */
async function autoFillBookDetails(title) {
  /**
   * FUTURE SCOPE — Automatic writer & genre detection
   *
   * This function can be activated once CORS issues are resolved
   * or a backend proxy is implemented.
   *
   * It uses the Open Library Search API:
   * https://openlibrary.org/search.json?title=<title>&limit=1
   *
   * Usage example:
   *   const details = await autoFillBookDetails('The Great Gatsby');
   *   if (details) {
   *     document.getElementById('author-input').value = details.author;
   *     document.getElementById('genre-input').value  = details.genre;
   *   }
   */

  /*
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const book = data.docs && data.docs[0];
    if (!book) return null;

    return {
      author: book.author_name ? book.author_name[0] : '',
      genre:  book.subject     ? book.subject[0]      : '',
      pages:  book.number_of_pages_median || '',
    };
  } catch (e) {
    console.warn('Auto-fill failed:', e);
    return null;
  }
  */

  // Placeholder until backend proxy is ready
  return null;
}

/* ── Confirm Dialog ────────────────────────────── */
function confirmDelete(name, onConfirm) {
  const confirmed = window.confirm(
    `Delete "${name}"?\n\nThis action cannot be undone.`
  );
  if (confirmed && typeof onConfirm === 'function') onConfirm();
}

/* ── Export File Trigger ───────────────────────── */
function triggerFileInput(inputId) {
  document.getElementById(inputId)?.click();
}
