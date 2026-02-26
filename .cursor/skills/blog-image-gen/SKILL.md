---
name: blog-image-gen
description: Generates a crystalline-aesthetic hero image for a LUMP Depot blog post using the Gemini API (GEMINI_KEY in .env), saves it under blog/images/, and inserts it into the post plus og/twitter meta. Use when the user wants to add or regenerate a post image. Skips posts that already have an image unless the user says to regenerate.
---

# Blog image generation (LUMP Depot)

Generate a black-background hero image for a blog post using the **Gemini API** (Nano Banana Pro; model: `gemini-3-pro-image-preview`). The image follows the Crystalline Aesthetic and is inserted into the post and meta tags.

## When to use

- User asks to **add an image** to a blog post, **generate a post image**, or **create a hero image** for a post.
- User asks to **regenerate** or **replace** the image for a post (run with `--regenerate`).

**Skip** (do not generate) when the post already has an `og:image` or an `<img>` in the article body, **unless** the user explicitly says to regenerate or replace the image.

## Prerequisites

- **GEMINI_KEY** in the project root `.env` file (Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)).
- Node.js 18+ (uses built-in `fetch` and `fs`; no npm dependencies).

## How to run

From the project root (e.g. `e:\dev_blog`):

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html
```

To force regeneration for a post that already has an image:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --regenerate
```

Optional: use the site logo as a style reference (seed image). By default the script looks for `logo.jpg` in the project root. To pass a path explicitly:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --seed-image logo.jpg
```

The script will:

1. Load `GEMINI_KEY` from `.env` in the project root.
2. If the post already has an image and `--regenerate` was not passed, exit without changes.
3. Extract title, meta description, and body text from the post HTML.
4. Call the Gemini API with the **base prompt** (Crystalline Aesthetic, black background) and the post content to generate one image.
5. Save the image as `blog/images/<slug>-hero.png` (creating `blog/images/` if needed). Slug is derived from the filename (e.g. `2026-02-25-keep-your-agents-in-a-fishbowl.html` → `keep-your-agents-in-a-fishbowl`).
6. Insert a hero `<img>` at the start of `<div class="article-body">` and add `og:image` and `twitter:image` meta tags (and set `twitter:card` to `summary_large_image` if appropriate).

## Base prompt (Crystalline Aesthetic)

The script sends this aesthetic as the fixed style; the variable part is the post content.

**Generate a black background image for this post using this aesthetic:**

**BRAND STYLE GUIDE: THE CRYSTALLINE AESTHETIC**  
Applied to: Diamond Soul / L.U.M.P.

1. **CORE PHILOSOPHY**  
   The visual identity is defined by permanence, clarity, and digital magic. Every visual element must be rendered as a clean, professional vector illustration carved from faceted, sparkling blue diamond or ice. The aesthetic is rigid, cool, and highly reflective.

2. **COLOR PALETTE**  
   The brand relies on a strict monochromatic icy-blue scheme highlighted with white. No warm colors.

   - **#0A1E35 (Deep Navy)** — Outlines & shadows. Bold and uniform.
   - **#2E86C1 (Mid-Blue)** — Primary body, gradients and facets.
   - **#AEEEEE (Icy Cyan)** — Highlights and sharp edges.
   - **#FFFFFF (Pure White)** — Specular glints, sparkle, starbursts at facets.
   - **Background for this asset:** solid **black** (not white), so the crystalline elements pop.

3. **ICONOGRAPHY & ILLUSTRATION**  
   "Cartoon Crystalline" vector style:

   - **Faceted structure:** Subjects are geometric crystal facets, not organic.
   - **Bold outlines:** Dark blue outline on every element and internal facet line.
   - **High contrast:** Sharp gradients within facets (deep blue → bright cyan).
   - **Sparkle:** White specular highlights/starbursts at key vertices.

4. **TYPOGRAPHY (if text appears)**  
   Headers: bold, blocky, sans-serif, uppercase, same faceted crystal texture and sparkle as icons. Secondary text: bold sans-serif in Deep Navy or Mid-Blue for readability. **Spelling:** The model must check that any text in the image is spelled correctly (verify against the post title/theme and standard spelling); do not render misspellings.

5. **USAGE**  
   Do not remove dark blue outlines or use flat fills for primary elements. Keep the image suitable for a blog hero (readable, on black).

**Optional seed image:** The script sends the site logo as a style reference when available. By default it looks for `logo.jpg` in the project root. Use `--seed-image <path>` to specify another image (e.g. `logo.jpg` or `glyph.png`).

## Output locations

| What            | Location |
|-----------------|----------|
| Generated image | `blog/images/<slug>-hero.png` |
| Hero img in post | First child of `<div class="article-body">` |
| og:image / twitter:image | In `<head>`, full URL: `https://lumpdepot.pages.dev/blog/images/<slug>-hero.png` |

## Quick reference

- **Script:** `.cursor/skills/blog-image-gen/scripts/generate-blog-image.js`
- **Env:** `GEMINI_KEY` in project root `.env`
- **Skip rule:** Post already has image → skip unless user says regenerate (`--regenerate`).
