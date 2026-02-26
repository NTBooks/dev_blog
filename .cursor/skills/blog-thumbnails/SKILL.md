---
name: blog-thumbnails
description: Generates 200x200 thumbnail images for blog posts using the Gemini API. Thumbnails are new images (not resized heroes): crystalline aesthetic, no text, square. Use when the user wants thumbnails on the listing, new posts were added, or to regenerate listing thumbnails.
---

# Blog thumbnails (LUMP Depot)

Generate **new** 200×200 thumbnail images for each blog post using the **Gemini API**. Thumbnails are **intelligently generated** to fit the constraints: crystalline aesthetic on black, **no text**, square, representing the post theme visually only (symbol or abstract shape). They are not resized hero images.

## When to use

- User asks to **add thumbnails** to the blog listing or **generate thumbnails** for posts.
- After adding new posts and you want listing thumbnails.
- When the user wants thumbnails that are **new images with no text** and fit within 200×200.

## Prerequisites

- **GEMINI_KEY** in the project root `.env` file (same as [blog-image-gen](blog-image-gen/SKILL.md)).
- Node.js 18+ (built-in `fetch`; no npm required for generation).
- Optional: **sharp** (npm install) to resize API output to exactly 200×200; without it, the script saves the API image as-is.

## How to run

From the project root (e.g. `e:\dev_blog`):

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js
```

To regenerate thumbnails for posts that already have one:

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js --regenerate
```

Optional: use the site logo as a style reference (default: `logo.jpg` in project root):

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js --seed-image logo.jpg
```

The script will:

1. Find every post file in `blog/` matching `YYYY-MM-DD-slug.html`.
2. For each post, if `blog/images/<slug>-thumb.png` already exists and `--regenerate` was not passed, skip.
3. Extract title, description, and body excerpt from the post HTML.
4. Call the Gemini API with a **thumbnail-specific prompt**: Crystalline Aesthetic, **no text**, square 200×200, represent the post theme with a single crystalline symbol or abstract shape.
5. Save the image as `blog/images/<slug>-thumb.png` (resize to 200×200 with sharp if available).
6. **Patch `blog/index.html`**: for each post card that has a thumb file, ensure `<img class="post-thumb" ...>` is present.

## Constraints (enforced in the prompt)

- **No text**: No words, letters, numbers, or labels in the image.
- **Square**: Suitable for a 200×200 pixel thumbnail.
- **Simple**: One focal symbol or icon that reads at small size; not a busy scene.

## Output

| What | Location |
|------|----------|
| Thumbnails | `blog/images/<slug>-thumb.png` (200×200 when sharp is used) |
| Listing | `blog/index.html` updated with `<img class="post-thumb">` inside each card that has a thumb |

The script only patches `blog/index.html`. **Home page** (`index.html`): use **hero images** (full post images), not thumbnails—e.g. `src="blog/images/<slug>-hero.jpg"` with `width="400" height="auto"`. **Blog listing** (`blog/index.html`): use **thumbnails** (`<slug>-thumb.jpg`) so the page stays light when displaying many posts.

---

## JPEG compression (ffmpeg)

All blog images in `blog/images/` should be JPEG at 90% quality. Use ffmpeg to convert any non-JPG images (e.g. PNG from hero/thumb generators) to JPEG and update references.

**Prerequisite:** ffmpeg on PATH.

From project root:

```bash
node .cursor/skills/blog-thumbnails/scripts/compress-blog-images.js
```

The script will:

1. Find every file in `blog/images/` that is not already `.jpg` (e.g. `.png`).
2. Run ffmpeg: `ffmpeg -i input -q:v 3 -y output.jpg` (q:v 3 ≈ 90% quality).
3. Update all HTML (blog posts, blog index, home page) so references point to the `.jpg` file.
4. Remove the original non-JPG file.

Run after adding or regenerating hero or thumbnail images so the site serves JPEGs.

---

## Quick reference

- **Thumbnails script:** `.cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js`
- **Compress script:** `.cursor/skills/blog-thumbnails/scripts/compress-blog-images.js`
- **Env:** `GEMINI_KEY` in project root `.env`
- **Skip:** Post already has `blog/images/<slug>-thumb.png` (or `.jpg`) → skip unless `--regenerate`.
- **Optional:** `sharp` (npm install) for exact 200×200 resize. **Required for compression:** ffmpeg on PATH.
