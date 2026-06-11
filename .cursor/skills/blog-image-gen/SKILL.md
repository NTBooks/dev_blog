---
name: blog-image-gen
description: Generates a hero image (and a LinkedIn-article-sized cover) for a blog post using the Gemini API (GEMINI_KEY in .env) with the brand aesthetic from the brand-guidelines skill. Saves images under src/blog/images/ and wires the hero into the post's `hero:` frontmatter (the Eleventy layout renders the img + og/twitter meta). After generating, run the blog-thumbnails compress script so the hero becomes a 1200px JPG and the LinkedIn image becomes a 1920x1080 JPG. Use when the user wants to add or regenerate a post image. Skips posts that already have a hero unless the user says to regenerate.
---

# Blog image generation

Generate a hero image for a blog post using the **Gemini API** (model: `gemini-3-pro-image-preview`). The image follows the brand aesthetic defined in the **brand-guidelines** skill and is wired into the post via the `hero:` frontmatter field (the Eleventy post layout renders the `<img>`, `og:image`, and `twitter:image` automatically).

This site is **Eleventy**: posts are YAML-frontmatter + HTML body in `src/blog/`, and images live in `src/blog/images/`. By default the script also generates a **LinkedIn-article-sized** landscape cover (`<slug>-linkedin`, sized to 1920x1080 by the compress step) as a standalone asset for uploading to LinkedIn. Pass `--no-linkedin` to skip it.

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
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js src/blog/YYYY-MM-DD-post-slug.html
```

To force regeneration for a post that already has an image:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js src/blog/YYYY-MM-DD-post-slug.html --regenerate
```

To generate only the hero (skip the LinkedIn cover):

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js src/blog/YYYY-MM-DD-post-slug.html --no-linkedin
```

Optional: use a logo or brand mark as a style reference (seed image). By default the script looks for `logo.jpg` in the project root. To pass a path explicitly:

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --seed-image logo.jpg
```

Optional: extra composition notes (still uses brand prompt + post excerpt):

```bash
node .cursor/skills/blog-image-gen/scripts/generate-blog-image.js blog/YYYY-MM-DD-post-slug.html --regenerate --brief "Your scene direction here."
```

The script will:

1. Load `GEMINI_KEY` from `.env` in the project root.
2. Load the brand aesthetic from `.cursor/skills/brand-guidelines/brand-prompt.md`.
3. If the post already has a `hero:` in frontmatter and `--regenerate` was not passed, exit without changes.
4. Extract title, description (from frontmatter), and body text from the post.
5. Call the Gemini API with the brand prompt and the post content to generate the hero image (and, unless `--no-linkedin`, a separate LinkedIn landscape cover).
6. Save images as `src/blog/images/<slug>-hero.png` and `src/blog/images/<slug>-linkedin.png` (creating the folder if needed). Slug is derived from the filename (e.g. `2026-02-25-keep-your-agents-in-a-fishbowl.html` → `keep-your-agents-in-a-fishbowl`).
7. Set `hero: <slug>-hero.png` in the post frontmatter. The Eleventy layout renders the hero `<img>`, `og:image`, and `twitter:image` from that field. The LinkedIn cover is a standalone asset (not referenced by the layout).

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
| Generated hero  | `src/blog/images/<slug>-hero.png` (run compress to get JPG) |
| Generated LinkedIn cover | `src/blog/images/<slug>-linkedin.png` (compress sizes to 1920x1080 JPG) |
| After compress (hero) | `src/blog/images/<slug>-hero.jpg` at **1200px wide** (canonical for embeds) |
| Hero wired into post | `hero:` frontmatter field; layout renders img + og:image/twitter:image |

## Quick reference

- **Script:** `.cursor/skills/blog-image-gen/scripts/generate-blog-image.js`
- **Brand prompt:** `.cursor/skills/brand-guidelines/brand-prompt.md`
- **Env:** `GEMINI_KEY` in project root `.env`; optional `SITE_URL` for absolute og:image URLs.
- **Skip rule:** Post already has `hero:` in frontmatter → skip unless user says regenerate (`--regenerate`).
- **LinkedIn:** Generated by default as `<slug>-linkedin.png` (compress sizes to 1920x1080 JPG); pass `--no-linkedin` to skip.
- **Pattern:** Generate hero (+ LinkedIn) PNG → run `compress-blog-images.js` → serve 1200px hero JPG + 1920x1080 LinkedIn JPG.
