---
name: blog-image-gen
description: Generates a hero image for a blog post using the Gemini API (GEMINI_KEY in .env) with the brand aesthetic from the brand-guidelines skill. Saves it under blog/images/ and inserts it into the post plus og/twitter meta. After generating, run the blog-thumbnails compress script so the hero becomes a 1200px JPG for sharp embeds. Use when the user wants to add or regenerate a post image. Skips posts that already have an image unless the user says to regenerate.
---

# Blog image generation

Generate a hero image for a blog post using the **Gemini API** (model: `gemini-3-pro-image-preview`). The image follows the brand aesthetic defined in the **brand-guidelines** skill and is inserted into the post and meta tags.

## When to use

- User asks to **add an image** to a blog post, **generate a post image**, or **create a hero image** for a post.
- User asks to **regenerate** or **replace** the image for a post (run with `--regenerate`).

**Skip** (do not generate) when the post already has an `og:image` or an `<img>` in the article body, **unless** the user explicitly says to regenerate or replace the image.

## Prerequisites

- **GEMINI_KEY** in the project root `.env` file (Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)).
- **brand-guidelines** skill present at `.cursor/skills/brand-guidelines/` with a `brand-prompt.md` file describing the design aesthetic.
- Optional: **SITE_URL** in `.env` for absolute og:image URLs (falls back to extracting from the post's `og:url` meta).
- Node.js 18+ (uses built-in `fetch` and `fs`; no npm dependencies).

## How to run

From the project root:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html
```

To force regeneration for a post that already has an image:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --regenerate
```

Optional: use a logo or brand mark as a style reference (seed image). By default the script looks for `logo.jpg` in the project root. To pass a path explicitly:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --seed-image logo.jpg
```

The script will:

1. Load `GEMINI_KEY` from `.env` in the project root.
2. Load the brand aesthetic from `.cursor/skills/brand-guidelines/brand-prompt.md`.
3. If the post already has an image and `--regenerate` was not passed, exit without changes.
4. Extract title, meta description, and body text from the post HTML.
5. Call the Gemini API with the brand prompt and the post content to generate one image.
6. Save the image as `blog/images/<slug>-hero.png` (creating `blog/images/` if needed). Slug is derived from the filename (e.g. `2026-02-25-keep-your-agents-in-a-fishbowl.html` → `keep-your-agents-in-a-fishbowl`).
7. Insert a hero `<img>` at the start of `<div class="article-body">` and add `og:image` and `twitter:image` meta tags (and set `twitter:card` to `summary_large_image` if appropriate).

**After generating:** Run the compress script so the hero is converted to a **1200px-wide JPG** for sharp social/embed previews (LinkedIn, og:image, etc.). The compress script updates all post and meta references to the `.jpg` and removes the original PNG:

```bash
node .cursor/skills/blog-thumbnails/scripts/compress-blog-images.js
```

## Brand aesthetic

The script loads design principles from the **brand-guidelines** skill at runtime. To change the visual style of generated images, edit `.cursor/skills/brand-guidelines/brand-prompt.md`.

**Optional seed image:** The script sends a logo/brand mark as a style reference when available. By default it looks for `logo.jpg` in the project root. Use `--seed-image <path>` to specify another image.

## Output locations

| What            | Location |
|-----------------|----------|
| Generated image | `blog/images/<slug>-hero.png` (run compress to get JPG) |
| After compress  | `blog/images/<slug>-hero.jpg` at **1200px wide** (canonical for embeds) |
| Hero img in post | First child of `<div class="article-body">` (compress script updates to `.jpg`) |
| og:image / twitter:image | In `<head>`, full URL to `.jpg` after compress |

## Quick reference

- **Script:** `.cursor/skills/blog-image-gen/scripts/generate-blog-image.js`
- **Brand prompt:** `.cursor/skills/brand-guidelines/brand-prompt.md`
- **Env:** `GEMINI_KEY` in project root `.env`; optional `SITE_URL` for absolute og:image URLs.
- **Skip rule:** Post already has image → skip unless user says regenerate (`--regenerate`).
- **Pattern:** Generate hero PNG → run `compress-blog-images.js` → serve 1200px hero JPG for embeds.
