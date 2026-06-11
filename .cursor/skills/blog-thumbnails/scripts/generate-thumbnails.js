#!/usr/bin/env node
/**
 * Generate 200x200 thumbnail images for blog posts using the Gemini API.
 *
 * Built for the Eleventy structure of this site:
 *   - Posts live in src/blog/ as YAML-frontmatter + HTML body.
 *   - Images live in src/blog/images/.
 *   - The thumbnail is wired in via the `thumb:` frontmatter field (the blog
 *     listing renders the <img class="post-thumb"> automatically).
 *
 * Thumbnails are new images (not resized heroes): NO text, square, representing
 * the post theme visually only.
 *
 * Brand aesthetic is loaded from .cursor/skills/brand-guidelines/brand-prompt.md.
 * Uses GEMINI_KEY from .env in project root. Optional: sharp to resize to 200x200
 * (otherwise the compress step / ffmpeg handles sizing).
 *
 * Usage:
 *   node generate-thumbnails.js [src/blog/YYYY-MM-DD-slug.html] [--regenerate] [--seed-image path]
 * If a post path is given, only that post gets a thumbnail; otherwise every post
 * missing one is processed. Run from project root.
 */

const fs = require("fs");
const path = require("path");

const SIZE = 200;
const MODEL = "gemini-3-pro-image-preview";
const BLOG_DIR = path.join("src", "blog");
const IMAGES_DIR = path.join("src", "blog", "images");
const BRAND_PROMPT_PATH = ".cursor/skills/brand-guidelines/brand-prompt.md";

function loadBrandPrompt(projectRoot) {
  const promptPath = path.join(projectRoot, BRAND_PROMPT_PATH);
  if (!fs.existsSync(promptPath)) {
    console.error(`Brand prompt not found: ${promptPath}`);
    console.error("Expected a brand-guidelines skill at .cursor/skills/brand-guidelines/");
    process.exit(1);
  }
  return fs.readFileSync(promptPath, "utf8").trim();
}

function buildThumbPrompt(brandPrompt) {
  return `Generate a SMALL SQUARE image (200x200 pixels or equivalent) for use as a thumbnail. Use this aesthetic:\n\n${brandPrompt}\n\nCRITICAL CONSTRAINTS:\n1. NO TEXT: Do not include any words, letters, numbers, or labels in the image. The image must be purely visual/symbolic. No typography.\n2. BACKGROUND COLOR: The background color specified in the brand guide above is CRITICAL. You MUST use exactly that background color. Do not substitute, lighten, darken, or ignore it.\n3. FILL THE FRAME: The icon or symbol must be as large as possible within the square, filling the available space edge-to-edge. Minimize empty margins. The subject should dominate the thumbnail.\n4. SQUARE: The image must be square and suitable for a 200x200 pixel thumbnail.\n5. SIMPLE: Represent the post theme with a single symbol or abstract shape—not a busy scene. It will be displayed at 200x200.\n\nPost to illustrate (use only the theme/topic to design a simple icon or symbol; do not render any of this text):`;
}

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

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: raw, hasFrontmatter: false };
  return { frontmatter: m[1], body: m[2], hasFrontmatter: true };
}

function getFrontmatterValue(frontmatter, key) {
  const re = new RegExp(`^${key}\\s*:\\s*(.+)$`, "im");
  const m = frontmatter.match(re);
  if (!m) return "";
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  return v;
}

function setFrontmatterValue(frontmatter, key, value) {
  const re = new RegExp(`^${key}\\s*:.*$`, "im");
  const line = `${key}: ${value}`;
  if (re.test(frontmatter)) return frontmatter.replace(re, line);
  return `${frontmatter.replace(/\s*$/, "")}\n${line}`;
}

function bodyToText(body, limit) {
  return body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
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

async function main() {
  const args = process.argv.slice(2);
  const regenerate = args.includes("--regenerate");
  const seedIdx = args.indexOf("--seed-image");
  const seedPath = seedIdx >= 0 && args[seedIdx + 1] ? args[seedIdx + 1] : null;
  const singlePostArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--seed-image") || null;

  const projectRoot = process.cwd();
  const env = loadEnv(projectRoot);
  const apiKey = env.GEMINI_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_KEY in .env (project root)");
    process.exit(1);
  }

  const blogPath = path.join(projectRoot, BLOG_DIR);
  if (!fs.existsSync(blogPath)) {
    console.log("No src/blog directory.");
    return;
  }

  let postFiles;
  if (singlePostArg) {
    const base = path.basename(singlePostArg);
    const resolved = path.isAbsolute(singlePostArg)
      ? singlePostArg
      : fs.existsSync(path.join(projectRoot, singlePostArg))
        ? path.join(projectRoot, singlePostArg)
        : path.join(blogPath, base);
    if (!fs.existsSync(resolved)) {
      console.error("Post file not found:", resolved);
      process.exit(1);
    }
    postFiles = [resolved];
  } else {
    postFiles = fs.readdirSync(blogPath)
      .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.html$/.test(f))
      .map((f) => path.join(blogPath, f));
  }

  const imagesPath = path.join(projectRoot, IMAGES_DIR);
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });

  const brandPrompt = loadBrandPrompt(projectRoot);
  const thumbPrompt = buildThumbPrompt(brandPrompt);

  const seedPart = getSeedImagePart(projectRoot, seedPath);
  if (seedPart) console.log("Using seed image for style reference.");

  function thumbFileExists(slug) {
    return fs.existsSync(path.join(imagesPath, `${slug}-thumb.png`)) ||
      fs.existsSync(path.join(imagesPath, `${slug}-thumb.jpg`));
  }

  let generated = 0;
  for (const postPath of postFiles) {
    const slug = slugFromPostPath(postPath);
    if (!slug) continue;
    const raw = fs.readFileSync(postPath, "utf8");
    const { frontmatter, body, hasFrontmatter } = splitFrontmatter(raw);
    if (!hasFrontmatter) continue;

    const hasThumb = getFrontmatterValue(frontmatter, "thumb") || thumbFileExists(slug);
    if (hasThumb && !regenerate) continue;

    const title = getFrontmatterValue(frontmatter, "title");
    const description = getFrontmatterValue(frontmatter, "description");
    const bodyText = bodyToText(body, 800);
    const fullPrompt = `${thumbPrompt}\n\nTitle: ${title}\nDescription: ${description}\n\nContent (excerpt):\n${bodyText}`;

    console.log("Generating thumb for:", title);
    let buffer = await generateImage(apiKey, fullPrompt, seedPart);
    buffer = await resizeTo200(buffer);
    const thumbPath = path.join(imagesPath, `${slug}-thumb.png`);
    fs.writeFileSync(thumbPath, buffer);
    console.log("Saved:", path.join(IMAGES_DIR, `${slug}-thumb.png`));

    const fm = setFrontmatterValue(frontmatter, "thumb", `${slug}-thumb.png`);
    fs.writeFileSync(postPath, `---\n${fm}\n---\n${body}`);
    console.log("Updated post frontmatter with thumb:", `${slug}-thumb.png`);
    generated++;
  }

  if (generated === 0) {
    console.log("No thumbnails generated (all posts already have one; use --regenerate to replace).");
  } else {
    console.log(`Generated ${generated} thumbnail(s). Next: run compress-blog-images.js to convert PNG -> JPG.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
