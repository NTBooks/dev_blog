# LUMP Depot

**L.U.M.P.** — Largely Universal Model Prompts. A static dark-mode dev blog built with [Eleventy](https://www.11ty.dev/).

## Structure

```
src/
  _includes/
    layouts/        Nunjucks layouts (base, post, page)
    partials/       Reusable components (header, footer, analytics)
  _data/
    site.json       Site-wide metadata (title, URL, gtag ID)
  blog/
    blog.json       Directory data file (sets layout for all posts)
    *.html          Blog posts with YAML frontmatter
    index.njk       Blog listing page (auto-generated from collection)
    images/         Hero images, thumbnails, inline images
  css/style.css     Single stylesheet (dark theme)
  index.njk         Homepage with recent posts (auto-generated)
  about.njk         About page
  contact.njk       Contact page
  404.njk           Not found page
  sitemap.njk       Auto-generated sitemap
```

## Development

```bash
npm run dev        # Start dev server with live reload
npm run build      # Build to _site/
```

## Adding a post

1. Create `src/blog/YYYY-MM-DD-slug.html` with frontmatter:

   ```yaml
   ---
   title: "Post Title"
   date: YYYY-MM-DD
   description: "Short excerpt for listings and social cards."
   hero: slug-hero.jpg
   thumb: slug-thumb.jpg
   permalink: /blog/YYYY-MM-DD-slug.html
   ---
   ```

2. Put the article body HTML below the frontmatter (no `<head>`, `<header>`, or `<footer>` — the layout handles those).

3. Drop hero and thumbnail images into `src/blog/images/`.

4. Run `npm run build`. The homepage, blog listing, and sitemap update automatically.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. In Cloudflare Dashboard → Pages → Create project → Connect to Git.
3. Build settings:
   - **Build command:** `npx @11ty/eleventy`
   - **Build output directory:** `_site`
4. Deploy.

## Local preview

```bash
npm run dev
```

Opens at `http://localhost:8080` with live reload.

## License

Content and code as you like. Swap in your own repo URL in the sample post and contact page.
