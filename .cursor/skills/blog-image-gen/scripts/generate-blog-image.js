#!/usr/bin/env node
/**
 * Generate a hero image (and a LinkedIn-article-sized image) for a blog post
 * using the Gemini API.
 *
 * Built for the Eleventy structure of this site:
 *   - Posts live in src/blog/ as YAML-frontmatter + HTML body (no <title> tag).
 *   - Images live in src/blog/images/.
 *   - The hero is wired in via the `hero:` frontmatter field (the post layout
 *     renders the <img> and og:image/twitter:image automatically).
 *
 * The LinkedIn image is a standalone landscape asset (16:9) for uploading as a
 * LinkedIn article cover; it is not referenced by the layout.
 *
 * Brand aesthetic is loaded from .cursor/skills/brand-guidelines/brand-prompt.md.
 * Uses GEMINI_KEY (and optional SITE_URL) from .env in project root.
 * No npm dependencies (Node 18+ with fetch).
 *
 * Usage:
 *   node generate-blog-image.js src/blog/YYYY-MM-DD-slug.html [--regenerate] [--seed-image path] [--brief "art direction"] [--no-linkedin]
 * The post path may also be given as just the filename or a blog/ path; it is
 * resolved against src/blog/.
 */

const fs = require("fs");
const path = require("path");

const MODEL = "gemini-3-pro-image-preview";
const BRAND_PROMPT_PATH = ".cursor/skills/brand-guidelines/brand-prompt.md";
const BLOG_DIR = path.join("src", "blog");
const IMAGES_DIR = path.join("src", "blog", "images");

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
  return `Generate a black background image for this post using this aesthetic:\n\n${brandPrompt}\n\nIt can include LUMP Depot branding but not the logo or tagline. Simple infographics are preferred. We want these headers to do well on linkedin. \n\n---\n\nPost to illustrate:`;
}

function buildLinkedInPrompt(brandPrompt) {
  return `Generate a WIDE LANDSCAPE 16:9 cover image (1920x1080 proportions) for a LinkedIn article using this aesthetic:\n\n${brandPrompt}\n\nComposition notes:\n1. Strong horizontal 16:9 layout with the main subject centered and readable when cropped to 1.91:1.\n2. You may render the post title as a bold, faceted crystalline headline. CRITICAL: spell every word correctly, matching the title exactly.\n3. It can include LUMP Depot branding but not the logo or tagline. Simple infographics preferred. Black background.\n\n---\n\nPost to illustrate:`;
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

function resolvePostPath(projectRoot, postPath) {
  const candidates = [];
  if (path.isAbsolute(postPath)) {
    candidates.push(postPath);
  } else {
    candidates.push(path.join(projectRoot, postPath));
    const base = path.basename(postPath);
    candidates.push(path.join(projectRoot, BLOG_DIR, base));
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function slugFromPostPath(postPath) {
  const base = path.basename(postPath, ".html");
  const match = base.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return match ? match[1] : base;
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

function rebuild(frontmatter, body) {
  return `---\n${frontmatter}\n---\n${body}`;
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

async function main() {
  const args = process.argv.slice(2);
  let postPath = null;
  let regenerate = false;
  let seedPath = null;
  let imageBrief = "";
  let withLinkedIn = true;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--regenerate") regenerate = true;
    else if (a === "--no-linkedin") withLinkedIn = false;
    else if (a === "--seed-image") seedPath = args[++i] || null;
    else if (a === "--brief") imageBrief = args[++i] || "";
    else if (!a.startsWith("--")) postPath = postPath || a;
  }

  if (!postPath) {
    console.error("Usage: node generate-blog-image.js src/blog/YYYY-MM-DD-slug.html [--regenerate] [--no-linkedin] [--seed-image path] [--brief \"art direction\"]");
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const env = loadEnv(projectRoot);
  const apiKey = env.GEMINI_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_KEY in .env (project root)");
    process.exit(1);
  }

  const absolutePath = resolvePostPath(projectRoot, postPath);
  if (!fs.existsSync(absolutePath)) {
    console.error("Post file not found:", absolutePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const { frontmatter, body, hasFrontmatter } = splitFrontmatter(raw);
  if (!hasFrontmatter) {
    console.error("Post has no YAML frontmatter; expected an Eleventy post in src/blog/.");
    process.exit(1);
  }

  const slug = slugFromPostPath(absolutePath);
  const existingHero = getFrontmatterValue(frontmatter, "hero");
  if (existingHero && !regenerate) {
    console.log("Post already has a hero image; skipping. Use --regenerate to replace.");
    process.exit(0);
  }

  const brandPrompt = loadBrandPrompt(projectRoot);
  const title = getFrontmatterValue(frontmatter, "title");
  const description = getFrontmatterValue(frontmatter, "description");
  const bodyText = bodyToText(body, 2000);
  const briefBlock = imageBrief
    ? `\n\nArt direction (prioritize this for the composition):\n${imageBrief}`
    : "";
  const postBlock = `\n\nTitle: ${title}\nDescription: ${description}\n\nContent (excerpt):\n${bodyText}${briefBlock}`;

  const imagesDir = path.join(projectRoot, IMAGES_DIR);
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const seedPart = getSeedImagePart(projectRoot, seedPath);
  if (seedPart) console.log("Using seed image for style reference.");

  // Hero
  console.log("Generating hero image for:", title);
  const heroBuffer = await generateImage(apiKey, buildHeroPrompt(brandPrompt) + postBlock, seedPart);
  const heroPath = path.join(imagesDir, `${slug}-hero.png`);
  fs.writeFileSync(heroPath, heroBuffer);
  console.log("Saved:", path.join(IMAGES_DIR, `${slug}-hero.png`));

  // LinkedIn article cover (standalone asset)
  if (withLinkedIn) {
    console.log("Generating LinkedIn article image for:", title);
    const liBuffer = await generateImage(apiKey, buildLinkedInPrompt(brandPrompt) + postBlock, seedPart);
    const liPath = path.join(imagesDir, `${slug}-linkedin.png`);
    fs.writeFileSync(liPath, liBuffer);
    console.log("Saved:", path.join(IMAGES_DIR, `${slug}-linkedin.png`));
  }

  // Wire the hero into frontmatter (compress step rewrites .png -> .jpg).
  let fm = setFrontmatterValue(frontmatter, "hero", `${slug}-hero.png`);
  fs.writeFileSync(absolutePath, rebuild(fm, body));
  console.log("Updated post frontmatter with hero:", `${slug}-hero.png`);
  console.log("Next: run compress-blog-images.js to convert PNG -> JPG and size for embeds.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
