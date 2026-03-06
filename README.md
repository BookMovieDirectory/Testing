# 📚 BookWorm — Personal Reading & Watching Diary

> A beautiful, fully offline personal tracker for books and movies.
> No login, no server, no ads — all data lives in your browser.

---

## ✨ Features

| Feature | Books | Movies |
|---------|-------|--------|
| Add / Edit / Delete entries | ✅ | ✅ |
| Genre dropdown | ✅ | ✅ |
| Star rating (1–5) | ✅ | ✅ |
| Personal notes/review | ✅ | ✅ |
| Status tracking | Read / Reading / Wishlist | Watched / Watching / Watchlist |
| Wishlist / Watchlist tab | ✅ | ✅ |
| Search & Filter | ✅ | ✅ |
| Sort (date / title / rating) | ✅ | ✅ |
| Export to Excel (.xlsx) | ✅ | ✅ |
| Import from Excel (.xlsx) | ✅ | ✅ |
| Download blank template | ✅ | ✅ |
| Persistent local storage | ✅ | ✅ |
| Auto-fill (coming soon) | 🔜 | 🔜 |

---

## 📁 Folder Structure

```
bookworm/
├── index.html          ← Landing / home page
├── books.html          ← Books section (library + wishlist)
├── movies.html         ← Movies section (cinema + watchlist)
│
├── css/
│   ├── main.css        ← Global styles, variables, components
│   └── movies.css      ← Movies-specific colour overrides
│
├── js/
│   ├── storage.js      ← LocalStorage CRUD (BookWormDB)
│   ├── ui-utils.js     ← Shared UI helpers (toast, stars, modal, etc.)
│   ├── excel.js        ← Import / Export via SheetJS
│   ├── books.js        ← Books page logic
│   └── movies.js       ← Movies page logic
│
└── README.md
```

---

## 🚀 Getting Started (Local)

You can open this site two ways:

### Option 1 — Double-click (simplest)
Just open `index.html` in any modern browser.
> ⚠️ Import/Export may be blocked by some browsers when opened via `file://`.
> Use Option 2 for full functionality.

### Option 2 — Local Server (recommended)

**Using Node.js:**
```bash
npx serve .
# → Open http://localhost:3000
```

**Using Python:**
```bash
python -m http.server 8080
# → Open http://localhost:8080
```

**Using VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, then right-click `index.html` → **Open with Live Server**.

---

## 🐙 Push to GitHub & Host for Free

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and log in (or sign up — it's free).
2. Click **New repository** (the ＋ icon, top right).
3. Name it `bookworm` (or anything you like).
4. Keep it **Public** (required for free GitHub Pages hosting).
5. **Do NOT** check "Add README" — we already have one.
6. Click **Create repository**.

---

### Step 2 — Push your files

Open your terminal in the `bookworm/` folder:

```bash
# 1. Initialise git
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "🚀 Initial commit — BookWorm website"

# 4. Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/bookworm.git

# 5. Push
git branch -M main
git push -u origin main
```

---

### Step 3 — Enable GitHub Pages (free hosting!)

1. Go to your repository on GitHub.
2. Click **Settings** tab.
3. Scroll down to **Pages** (left sidebar).
4. Under **Source**, select branch **main** and folder **/ (root)**.
5. Click **Save**.
6. Wait ~60 seconds, then visit:

```
https://YOUR_USERNAME.github.io/bookworm/
```

Your BookWorm site is now **live on the internet** 🎉

---

## 📊 Excel Import Format

When importing, your Excel file must have these column headers:

### Books columns:
| Title | Author | Genre | Status | Rating | Date Read | Pages | Notes |
|-------|--------|-------|--------|--------|-----------|-------|-------|
| The Great Gatsby | F. Scott Fitzgerald | Fiction | Read | 5/5 | 2024-01-15 | 180 | A classic |

- **Status** values: `Read`, `Reading`, `Wishlist`
- **Rating** values: `1/5` to `5/5` (or just `1` to `5`)

### Movies columns:
| Title | Director | Genre | Year | Status | Rating | Date Watched | Notes |
|-------|----------|-------|------|--------|--------|--------------|-------|
| Inception | Christopher Nolan | Science Fiction | 2010 | Watched | 5/5 | 2024-02-20 | Mind-blowing |

- **Status** values: `Watched`, `Watching`, `Watchlist`

> 💡 Download the template from within the app for a pre-formatted file.

---

## 🔒 Privacy

- **Zero data leaves your device.** All entries are stored in `localStorage`.
- No cookies, no tracking, no accounts.
- Data persists across browser sessions on the same device/browser.
- Clearing browser data will erase your entries — **export regularly as backup!**

---

## 🔮 Future Scope

The following features are architected and ready for activation:

- **Auto-fill from title** — The `autoFillBookDetails()` function in `ui-utils.js` is wired up to the Open Library API. Once a backend proxy or CORS workaround is in place, it will auto-fill author and genre when you type a book title.
- **TMDB integration** — Similar auto-fill for movies via The Movie Database API.
- **Dark mode** — CSS variables are structured for easy dark theme addition.
- **Tags / custom categories** — Data model supports extension.
- **Reading/watching progress** — Page count progress bars.

---

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| Vanilla HTML/CSS/JS | No framework needed — fast, simple, portable |
| [SheetJS (xlsx)](https://sheetjs.com) | Excel import/export (loaded from CDN) |
| [Google Fonts](https://fonts.google.com) | Playfair Display + Lora + EB Garamond |
| LocalStorage API | Persistent client-side data |
| GitHub Pages | Free hosting |

---

## 📝 License

MIT — free to use, modify, and share.

---

*Made with 📚 for bookworms everywhere.*
