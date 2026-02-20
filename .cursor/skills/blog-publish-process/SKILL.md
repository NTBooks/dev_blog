---
name: blog-publish-process
description: Checklist for publishing a new LUMP Depot blog post. Use when publishing or finalizing a new post, or when the user asks to update the site for a new post. Covers listing page, home page recent posts, sitemap, and post formatting.
---

# Blog Publish Process (LUMP Depot)

When a new blog post is ready to publish, complete these steps so the post is linked everywhere and the post itself is consistent.

## Publish checklist

- [ ] **Listing page** — Add the new post to `blog/index.html`
- [ ] **Home page** — Add the new post to the "Recent posts" section in `index.html`
- [ ] **Sitemap** — Add the post URL to `sitemap.xml` and bump `lastmod` where needed
- [ ] **Post formatting** — Confirm the post file is well-formatted and consistent

---

## 1. Listing page (`blog/index.html`)

- Add a new `<li>` with the post card **at the top** of the post list (newest first).
- Use the same structure as existing items: `<article class="post-card">`, link with `post-card-link`, `<header>` with `<time datetime="YYYY-MM-DD">` and `<h3 class="post-title">`, then `<p class="post-excerpt">`.
- **Link href**: filename only, e.g. `2026-02-20-slug-of-post.html` (no `blog/` prefix; we're already in `blog/`).
- If the post's year doesn't have a section yet, add a new `<section aria-labelledby="year-YYYY">` with `<h2 class="section-title" id="year-YYYY">YYYY</h2>` and an `<ol class="post-list" reversed>`.

---

## 2. Home page recent posts (`index.html`)

- In the "Recent posts" section, add a new `<li>` with the post card **as the first item** in the `<ol class="post-list" reversed>`.
- Same card structure as the listing page.
- **Link href**: `blog/` + filename, e.g. `blog/2026-02-20-slug-of-post.html`.
- Keep the list to a reasonable "recent" size (e.g. 3–5 posts); drop the oldest from this block if you add more (the full list stays on the blog listing page).

---

## 3. Sitemap (`sitemap.xml`)

- Add a new `<url>` entry for the post.
- **`<loc>`**: `https://lumpdepot.pages.dev/blog/FILENAME` (e.g. `.../blog/2026-02-20-slug-of-post.html`).
- **`<lastmod>`**: Post date in `YYYY-MM-DD`.
- **`<changefreq>`**: `yearly` for posts.
- **`<priority>`**: `0.8` for posts (match existing).
- Place the new post entry **after** the `blog/` index URL and **before** other static pages (about, contact) so blog posts stay grouped.
- Optionally update `<lastmod>` on the root `/` and `/blog/` entries to today when adding a new post.

---

## 4. Post formatting

Before considering the post "published," confirm:

- **Filename**: `YYYY-MM-DD-slug-with-hyphens.html` in the `blog/` folder.
- **HTML structure**: Same as existing posts (doctype, head with meta, canonical, og/twitter, one `<article>` with header, title, time, content).
- **Meta**: `title`, `description`, `canonical`, `og:*`, `article:published_time`, `twitter:*` present and correct.
- **Content**: Apply the project’s [blog-writing-style](.cursor/skills/blog-writing-style/SKILL.md) for voice and structure (first person, short paragraphs, clear sections, concrete details).
- **Accessibility**: Semantic headings, `datetime` on `<time>`, no missing alt text on images.

---

## Quick reference: file locations

| What            | File              |
|-----------------|-------------------|
| Listing (all)   | `blog/index.html` |
| Recent (home)   | `index.html`      |
| Sitemap         | `sitemap.xml`     |
| Post file       | `blog/YYYY-MM-DD-slug.html` |

When in doubt, mirror the structure and order of the most recent existing post in each file.
