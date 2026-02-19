# LUMP Depot

**L.U.M.P.** — Largely Universal Model Prompts. A static dark-mode dev blog.

## Structure

- `index.html` — Homepage with recent posts
- `about.html` — About LUMP and the blog
- `contact.html` — How to get in touch
- `blog/` — Blog index and dated posts (e.g. `2026-02-18-welcome-to-lump-depot.html`)
- `css/style.css` — Single stylesheet (dark theme)
- `404.html` — Not found page

## Adding a post

1. **Create the post file** `blog/YYYY-MM-DD-slug.html` using this structure (copy from `blog/2026-02-18-welcome-to-lump-depot.html` and adjust):

   - **Document:** Same `<head>` and site `<header>` / `<footer>` as other pages; `../` for CSS and nav links.
   - **Main content:** One `<main id="main-content">` containing a single `<article itemscope itemtype="https://schema.org/BlogPosting">`.
   - **Article header:** `<header class="article-header">` with breadcrumb `<nav aria-label="Breadcrumb">` (back link to blog), `<h1 class="article-title" itemprop="headline">`, and `<time class="article-date" datetime="YYYY-MM-DD" itemprop="datePublished">`.
   - **Article body:** `<div class="article-body">` with sections as needed: `<section aria-labelledby="section-id">` and `<h2 id="section-id">` for each major part. Use `<p>`, `<ul>`/`<ol>`, `<pre>`/`<code>`, `<blockquote>` as needed. External links: add `class="external"` and `target="_blank" rel="noopener"` for repo links.

2. **Blog index** (`blog/index.html`): Add a `<li>` inside the correct year `<section>` (or add a new `<section aria-labelledby="year-YYYY">` and `<h2 class="section-title" id="year-YYYY">YYYY</h2>` if it’s a new year). Each entry:

   ```html
   <li>
     <article class="post-card">
       <a href="YYYY-MM-DD-slug.html" class="post-card-link">
         <header>
           <time datetime="YYYY-MM-DD">YYYY-MM-DD</time>
           <h3 class="post-title">Post title</h3>
         </header>
         <p class="post-excerpt">Short excerpt for the listing.</p>
       </a>
     </article>
   </li>
   ```

   Keep the `<ol class="post-list" reversed>` so newest posts appear first.

3. **Homepage** (`index.html`): Add the same card block (with `href="blog/YYYY-MM-DD-slug.html"`) to the “Recent posts” `<ol class="post-list">`. Keep only the number of recent posts you want on the homepage.

## Deploy to Cloudflare Pages

**Option A — Git (recommended)**

1. Push this repo to GitHub (or GitLab).
2. In [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create project → Connect to Git.
3. Select the repo.
4. Build settings:
   - **Build command:** leave empty
   - **Build output directory:** `/` (or `.`)
5. Deploy. Cloudflare will serve the static files from the root.

**Option B — Direct upload**

1. Zip the project (ensure `index.html` is at the root of the zip).
2. Pages → Create project → Direct Upload → upload the zip.

## Local preview

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

Or open `index.html` in a browser (relative links work if you use a server).

## License

Content and code as you like. Swap in your own repo URL in the sample post and contact page.
