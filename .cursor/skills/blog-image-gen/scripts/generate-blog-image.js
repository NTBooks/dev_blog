#!/usr/bin/env node
/**
 * Generate a hero image for a blog post using the Gemini API.
 * Brand aesthetic is loaded from .cursor/skills/brand-guidelines/brand-prompt.md.
 * Uses GEMINI_KEY (and optional SITE_URL) from .env in project root.
 * No npm dependencies (Node 18+ with fetch).
 *
 * Usage: node generate-blog-image.js blog/YYYY-MM-DD-slug.html [--regenerate] [--seed-image path]
 * If --seed-image is omitted, script looks for logo.jpg in project root.
 */

const fs = require("fs");
const path = require("path");

const MODEL = "gemini-3-pro-image-preview";
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

function buildHeroPrompt(brandPrompt) {
  return `Generate a black background image for this post using this aesthetic:\n\n${brandPrompt}\n\n---\n\nPost to illustrate:`;
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
  return match ? match[1] : base;
}

function hasExistingImage(html) {
  if (/property="og:image"\s+content=/i.test(html)) return true;
  if (/class="article-body"[^>]*>\s*<img/i.test(html)) return true;
  return false;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return "";
  let title = m[1].trim();
  const sep = title.lastIndexOf(" \u2014 ");
  if (sep > 0) title = title.slice(0, sep).trim();
  return title;
}

function extractSiteUrl(html, envUrl) {
  if (envUrl) return envUrl;
  const m = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i);
  if (m) {
    try {
      const url = new URL(m[1]);
      return url.origin;
    } catch { /* fall through */ }
  }
  return "";
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
  return block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
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

function insertImageIntoHtml(html, slug, title, siteUrl) {
  const imageUrl = `${siteUrl}/blog/images/${slug}-hero.png`;
  const imgTag = `<img src="images/${slug}-hero.png" alt="${title.replace(/"/g, "&quot;")}" class="article-hero" width="600" height="auto">`;

  let out = html;

  if (!/property="og:image"/.test(out)) {
    out = out.replace(
      /(<meta\s+property="og:url"[^>]*>)/i,
      `$1\n  <meta property="og:image" content="${imageUrl}">`
    );
  }
  if (!/name="twitter:image"/.test(out)) {
    out = out.replace(
      /(<meta\s+name="twitter:title"[^>]*>)/i,
      `$1\n  <meta name="twitter:image" content="${imageUrl}">`
    );
  }
  out = out.replace(/<meta\s+name="twitter:card"\s+content="summary"\s*>/i, '<meta name="twitter:card" content="summary_large_image">');

  if (!/<div class="article-body">\s*<img/.test(out)) {
    out = out.replace(
      /<div class="article-body">\s*/,
      `<div class="article-body">\n        ${imgTag}\n\n        `
    );
  }

  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const postPath = args.find((a) => !a.startsWith("--"));
  const regenerate = args.includes("--regenerate");
  const seedIdx = args.indexOf("--seed-image");
  const seedPath = seedIdx >= 0 && args[seedIdx + 1] ? args[seedIdx + 1] : null;

  if (!postPath) {
    console.error("Usage: node generate-blog-image.js blog/YYYY-MM-DD-slug.html [--regenerate]");
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const env = loadEnv(projectRoot);
  const apiKey = env.GEMINI_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_KEY in .env (project root)");
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(postPath) ? postPath : path.join(projectRoot, postPath);
  if (!fs.existsSync(absolutePath)) {
    console.error("Post file not found:", absolutePath);
    process.exit(1);
  }

  let html = fs.readFileSync(absolutePath, "utf8");
  if (hasExistingImage(html) && !regenerate) {
    console.log("Post already has an image; skipping. Use --regenerate to replace.");
    process.exit(0);
  }

  const brandPrompt = loadBrandPrompt(projectRoot);
  const heroPrompt = buildHeroPrompt(brandPrompt);
  const siteUrl = extractSiteUrl(html, env.SITE_URL || "");

  const slug = slugFromPostPath(postPath);
  const title = extractTitle(html);
  const description = extractDescription(html);
  const bodyText = extractBodyText(html);
  const fullPrompt = `${heroPrompt}\n\nTitle: ${title}\nDescription: ${description}\n\nContent (excerpt):\n${bodyText}`;

  const seedPart = getSeedImagePart(projectRoot, seedPath);
  if (seedPart) console.log("Using seed image for style reference.");
  console.log("Generating image for:", title);
  const imageBuffer = await generateImage(apiKey, fullPrompt, seedPart);

  const imagesDir = path.join(projectRoot, "blog", "images");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  const imagePath = path.join(imagesDir, `${slug}-hero.png`);
  fs.writeFileSync(imagePath, imageBuffer);
  console.log("Saved:", imagePath);

  html = insertImageIntoHtml(html, slug, title, siteUrl);
  fs.writeFileSync(absolutePath, html);
  console.log("Updated post HTML with hero image and og:image / twitter:image.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
