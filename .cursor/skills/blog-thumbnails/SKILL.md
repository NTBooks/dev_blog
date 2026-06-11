---
name: blog-thumbnails
description: Generates 200x200 thumbnail images for blog posts using the Gemini API with the brand aesthetic from the brand-guidelines skill. Thumbnails are new images (not resized heroes), no text, square. Use when the user wants thumbnails on the listing, new posts were added, or to regenerate listing thumbnails.
---

# Blog thumbnails

Generate **new** 200×200 thumbnail images for each blog post using the **Gemini API**. Thumbnails are **intelligently generated** to fit the constraints: brand aesthetic on black, **no text**, square, representing the post theme visually only (symbol or abstract shape). They are not resized hero images.

**Image pipeline:** Hero/LinkedIn images (blog-image-gen) and thumbnails (this skill) are generated as PNG into `src/blog/images/`. Run the **compress script** after generating so the site serves JPGs: heroes at **1200px wide**, LinkedIn covers at **1920x1080**, thumbs cover-cropped to **200x200**. The compress script updates frontmatter references in `src/blog` posts to `.jpg` and removes the original PNGs.

## When to use

- User asks to **add thumbnails** to the blog listing or **generate thumbnails** for posts.
- After adding new posts and you want listing thumbnails.
- When the user wants thumbnails that are **new images with no text** and fit within 200×200.

## Prerequisites

- **GEMINI_KEY** in the project root `.env` file (same as blog-image-gen).
- **brand-guidelines** skill present at `.cursor/skills/brand-guidelines/` with a `brand-prompt.md` file describing the design aesthetic.
- Node.js 18+ (built-in `fetch`; no npm required for generation).
- Optional: **sharp** (npm install) to resize API output to exactly 200×200; without it, the script saves the API image as-is.

## How to run

From the project root:

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js
```

To generate a thumbnail for a single post only:

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js src/blog/YYYY-MM-DD-slug.html
```

To regenerate thumbnails for posts that already have one:

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js --regenerate
```

Optional: use a logo or brand mark as a style reference (default: `logo.jpg` in project root):

```bash
node .cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js --seed-image logo.jpg
```

The script will:

1. Load the brand aesthetic from `.cursor/skills/brand-guidelines/brand-prompt.md`.
2. Find every post file in `src/blog/` matching `YYYY-MM-DD-slug.html` (or just the one post if a path is passed).
3. For each post, if it already has a `thumb:` in frontmatter (or a thumb image file) and `--regenerate` was not passed, skip.
4. Extract title and description (from frontmatter) and a body excerpt from the post.
5. Call the Gemini API with a **thumbnail-specific prompt**: brand aesthetic, **no text**, square 200×200, represent the post theme with a single symbol or abstract shape.
6. Save the image as `src/blog/images/<slug>-thumb.png` (resize to 200×200 with sharp if available).
7. Set `thumb: <slug>-thumb.png` in the post frontmatter. The Eleventy blog listing renders `<img class="post-thumb">` from that field automatically.

## Constraints (enforced in the prompt)

- **No text**: No words, letters, numbers, or labels in the image.
- **Square**: Suitable for a 200×200 pixel thumbnail.
- **Simple**: One focal symbol or icon that reads at small size; not a busy scene.

## Brand aesthetic

The script loads design principles from the **brand-guidelines** skill at runtime. To change the visual style of generated thumbnails, edit `.cursor/skills/brand-guidelines/brand-prompt.md`.

## Output

| What | Location |
|------|----------|
| Thumbnails | `src/blog/images/<slug>-thumb.png` (200×200 when sharp is used) |
| Wired into post | `thumb:` frontmatter field; the Eleventy blog listing renders `<img class="post-thumb">` |

The script sets the `thumb:` frontmatter field per post. The Eleventy templates handle display: the **blog listing** (`src/blog/index.njk`) uses the **thumbnail** so the page stays light with many posts, and the **home page** (`src/index.njk`) uses the **hero** for recent posts. No HTML files are patched directly.

---

## JPEG compression (ffmpeg)

All blog images in `src/blog/images/` should be JPEG. Use ffmpeg to convert any non-JPG images (e.g. PNG from hero/thumb generators) to JPEG and update references in `src/blog` posts.

**Prerequisite:** ffmpeg on PATH.

From project root:

```bash
node .cursor/skills/blog-thumbnails/scripts/compress-blog-images.js
```

The script will:

1. Find every file in `src/blog/images/` that is not already `.jpg` (e.g. `.png`).
2. Run ffmpeg by image kind: `-hero` scaled to **1200px wide**; `-linkedin` cover-cropped to **1920x1080** (LinkedIn article cover); `-thumb` cover-cropped to **200x200**; others kept at native size. Quality: `-q:v 2` (best).
3. Update references in `src/blog` posts (frontmatter `hero:`/`thumb:`) so they point to the `.jpg` file.
4. Remove the original non-JPG file.

Run after adding or regenerating hero or thumbnail images so the site serves JPEGs.

**Fix existing hero JPGs (e.g. low-res in LinkedIn preview):** Re-encode all `*-hero.jpg` to 1200px wide and high quality:

```bash
node .cursor/skills/blog-thumbnails/scripts/compress-blog-images.js --fix-hero
```

---

## Quick reference

- **Thumbnails script:** `.cursor/skills/blog-thumbnails/scripts/generate-thumbnails.js`
- **Compress script:** `.cursor/skills/blog-thumbnails/scripts/compress-blog-images.js`
- **Brand prompt:** `.cursor/skills/brand-guidelines/brand-prompt.md`
- **Env:** `GEMINI_KEY` in project root `.env`
- **Skip:** Post already has `thumb:` in frontmatter (or a `<slug>-thumb` image) → skip unless `--regenerate`.
- **Optional:** `sharp` (npm install) for exact 200×200 resize. **Required for compression:** ffmpeg on PATH.
- **Pattern:** Generate PNGs (hero + thumbs) → run compress → serve 1200px hero JPGs and thumb JPGs; run compress after any new or regenerated images.
