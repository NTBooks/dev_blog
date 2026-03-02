---
name: brand-guidelines
description: Diamond Soul / LUMP Depot brand identity and visual design principles — the Crystalline Aesthetic. Referenced by blog-image-gen and blog-thumbnails at runtime. Contains brand-prompt.md, the design prompt loaded by image generation scripts.
---

# Brand Guidelines (Diamond Soul / LUMP Depot)

Central definition of the brand's visual identity — the **Crystalline Aesthetic**. Other skills (`blog-image-gen`, `blog-thumbnails`) load the design prompt from this skill at runtime so all generated imagery stays on-brand.

## When to use

- Referenced automatically by `blog-image-gen` and `blog-thumbnails` scripts (they load `brand-prompt.md`).
- Consult when making any visual or design decisions for the site.
- Update `brand-prompt.md` here to change the aesthetic across all generated images.

## Brand Identity

**Brand:** Diamond Soul / L.U.M.P. Depot
**Aesthetic:** The Crystalline Aesthetic — permanence, clarity, digital magic.
**Mascot:** Meditating wise figure rendered in faceted crystalline/ice style.

## Color Palette

| Swatch | Name | Hex | Role |
|--------|------|-----|------|
| ■ | Deep Navy | #0A1E35 | Outlines, shadows, structural container |
| ■ | Mid-Blue | #2EB6C1 | Primary body, gradients, facets |
| ■ | Icy Cyan | #AEEEEE | Highlights, sharp edges, lighter facets |
| □ | Pure White | #FFFFFF | Specular glints, sparkle, starbursts |

Background: solid **black** for blog assets so crystalline elements pop.
No warm colors.

## Typography

- **Headers:** Bold, blocky, sans-serif, uppercase, faceted crystal texture with sparkle.
- **Subtitles:** Bold sans-serif in Deep Navy or Mid-Blue.

## Iconography

"Cartoon Crystalline" vector style: faceted geometric structure, bold dark-blue outlines, high-contrast gradients (deep blue → bright cyan), white specular starbursts at vertices.

## Design Prompt File

The file `brand-prompt.md` (in this skill's directory) contains the full aesthetic description as a text prompt. Image generation scripts load this file at runtime to construct their API prompts.

**Location:** `.cursor/skills/brand-guidelines/brand-prompt.md`

## Logo / Seed Image

The site logo (`logo.jpg` in project root) can be passed as a style reference to the Gemini API. Image generation scripts default to this file.

## Quick reference

- **Prompt file:** `.cursor/skills/brand-guidelines/brand-prompt.md`
- **Used by:** `blog-image-gen`, `blog-thumbnails`
- **Logo/seed:** `logo.jpg` (project root)
