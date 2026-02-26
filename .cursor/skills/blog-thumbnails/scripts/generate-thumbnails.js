#!/usr/bin/env node
/**
 * Generate 200x200 thumbnail images for blog posts using the Gemini API.
 * Thumbnails are new images (not resized heroes): crystalline aesthetic, NO text,
 * square, representing the post theme visually only.
 * Uses GEMINI_KEY from .env in project root. Optional: sharp to resize output to 200x200.
 *
 * Usage: node generate-thumbnails.js [--regenerate] [--seed-image path]
 * Run from project root.
 */

const fs = require("fs");
const path = require("path");

const SIZE = 200;
const MODEL = "gemini-3-pro-image-preview";
const BLOG_DIR = "blog";
const IMAGES_DIR = "blog/images";
const LISTING_PATH = "blog/index.html";

const THUMB_PROMPT = `Generate a SMALL SQUARE image (200x200 pixels or equivalent) for use as a thumbnail. Use this aesthetic:

BRAND STYLE GUIDE: THE CRYSTALLINE AESTHETIC (thumbnail version)
- Same philosophy: clean, faceted, sparkling blue diamond/ice vector style on BLACK background.
- Color palette: Deep Navy (#0A1E35) outlines, Mid-Blue (#2E86C1) facets, Icy Cyan (#AEEEEE) highlights, Pure White (#FFFFFF) sparkles. No warm colors. Background: solid BLACK.
- Faceted structure, bold dark blue outlines, high contrast gradients, white specular sparkles at vertices.

CRITICAL CONSTRAINTS:
1. NO TEXT: Do not include any words, letters, numbers, or labels in the image. The image must be purely visual/symbolic. No typography.
2. SQUARE: The image must be square and suitable for a 200x200 pixel thumbnail. One clear focal subject or icon that reads at small size.
3. SIMPLE: Represent the post theme with a single crystalline symbol or abstract shape—not a busy scene. It will be displayed at 200x200.

Post to illustrate (use only the theme/topic to design a simple crystalline icon or symbol; do not render any of this text):`;

function loadEnv(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function slugFromPostPath(postPath) {
  const base = path.basename(postPath, ".html");
  const match = base.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return match ? match[1] : null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].replace(/\s*—\s*LUMP Depot\s*$/, "").trim() : "";
}

function extractDescription(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  return m ? m[1].trim() : "";
}

function extractBodyText(html) {
  const start = html.indexOf('<div class="article-body">');
  if (start === -1) return "";
  const end = html.indexOf("</div>", start);
  if (end === -1) return "";
  const block = html.slice(start, end);
  return block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
}

function getSeedImagePart(projectRoot, seedPath) {
  const p = seedPath ? path.join(projectRoot, seedPath) : path.join(projectRoot, "logo.jpg");
  if (!fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
  return { inlineData: { mimeType: mime, data: buf.toString("base64") } };
}

async function generateImage(apiKey, prompt, seedPart) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [];
  if (seedPart) parts.push(seedPart);
  parts.push({ text: prompt });
  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No content in Gemini response");
  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }
  throw new Error("No image in Gemini response");
}

async function resizeTo200(buffer) {
  try {
    const sharp = require("sharp");
    return await sharp(buffer)
      .resize(SIZE, SIZE, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

function updateListing(projectRoot, thumbsExist) {
  const listingPath = path.join(projectRoot, LISTING_PATH);
  if (!fs.existsSync(listingPath)) return;
  let html = fs.readFileSync(listingPath, "utf8");
  const thumbsSet = new Set(thumbsExist);

  const cardBlock = /<article\s+class="post-card">\s*<a\s+href="(\d{4}-\d{2}-\d{2}-([^"]+)\.html)"\s+class="post-card-link">\s*(?:<img[^>]+class="post-thumb"[^>]*>\s*)?<header>[\s\S]*?<time[^>]*>[^<]*<\/time>\s*<h3\s+class="post-title">([^<]*)<\/h3>/g;
  html = html.replace(cardBlock, (block, _fullHref, slug, title) => {
    const alt = title.replace(/"/g, "&quot;").trim();
    if (!thumbsSet.has(slug)) return block;
    if (/class="post-thumb"/.test(block)) return block;
    const img = `<img class="post-thumb" src="images/${slug}-thumb.png" alt="${alt}" width="200" height="200">\n            `;
    return block.replace(
      /class="post-card-link">\s*<header>/,
      `class="post-card-link">\n            ${img}<header>`
    );
  });

  fs.writeFileSync(listingPath, html, "utf8");
  console.log("Updated", LISTING_PATH, "with thumbnail images.");
}

async function main() {
  const args = process.argv.slice(2);
  const regenerate = args.includes("--regenerate");
  const seedIdx = args.indexOf("--seed-image");
  const seedPath = seedIdx >= 0 && args[seedIdx + 1] ? args[seedIdx + 1] : null;

  // Resolve project root: script is at .cursor/skills/blog-thumbnails/scripts/ so go up 4 levels
  const projectRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const env = loadEnv(projectRoot);
  const apiKey = env.GEMINI_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_KEY in .env (project root)");
    process.exit(1);
  }

  const blogPath = path.join(projectRoot, BLOG_DIR);
  if (!fs.existsSync(blogPath)) {
    console.log("No blog directory.");
    return;
  }
  const postFiles = fs.readdirSync(blogPath)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.html$/.test(f))
    .map((f) => path.join(blogPath, f));

  const imagesPath = path.join(projectRoot, IMAGES_DIR);
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });

  const seedPart = getSeedImagePart(projectRoot, seedPath);
  if (seedPart) console.log("Using seed image for style reference.");

  const thumbsCreated = [];
  for (const postPath of postFiles) {
    const slug = slugFromPostPath(postPath);
    if (!slug) continue;
    const thumbPath = path.join(imagesPath, `${slug}-thumb.png`);
    if (fs.existsSync(thumbPath) && !regenerate) {
      thumbsCreated.push(slug);
      continue;
    }
    const html = fs.readFileSync(postPath, "utf8");
    const title = extractTitle(html);
    const description = extractDescription(html);
    const bodyText = extractBodyText(html);
    const fullPrompt = `${THUMB_PROMPT}\n\nTitle: ${title}\nDescription: ${description}\n\nContent (excerpt):\n${bodyText}`;

    console.log("Generating thumb for:", title);
    let buffer = await generateImage(apiKey, fullPrompt, seedPart);
    buffer = await resizeTo200(buffer);
    fs.writeFileSync(thumbPath, buffer);
    thumbsCreated.push(slug);
    console.log("Saved:", path.join(IMAGES_DIR, `${slug}-thumb.png`));
  }

  if (thumbsCreated.length === 0) {
    console.log("No thumbnails generated.");
    return;
  }
  const imagesPathForList = path.join(projectRoot, IMAGES_DIR);
  if (fs.existsSync(imagesPathForList)) {
    const files = fs.readdirSync(imagesPathForList);
    const existing = files
      .filter((f) => f.endsWith("-thumb.png"))
      .map((f) => f.replace(/-thumb\.png$/i, ""));
    const allSlugs = [...new Set([...thumbsCreated, ...existing])];
    updateListing(projectRoot, allSlugs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
