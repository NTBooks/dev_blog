#!/usr/bin/env node
/**
 * Compress all non-JPG images in blog/images/ to JPEG at 90% quality using ffmpeg.
 * Converts each file to .jpg, updates all HTML references, then removes the original.
 * Requires: ffmpeg on PATH.
 * Usage: node compress-blog-images.js
 * Run from project root.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const IMAGES_DIR = "blog/images";
const JPEG_QUALITY = 2; // ffmpeg -q:v 2-31; 2 = best quality
const OG_IMAGE_MIN_WIDTH = 1200; // LinkedIn/social previews look sharp at 1200px+ wide

function isJpg(name) {
  return /\.jpe?g$/i.test(name);
}

function isHeroImage(baseName) {
  return baseName.endsWith("-hero");
}

function compressToJpeg(projectRoot, inputPath, outputPath, baseName) {
  const scale = isHeroImage(baseName)
    ? ` -vf "scale=${OG_IMAGE_MIN_WIDTH}:-2"`
    : "";
  const cmd = `ffmpeg -i ${JSON.stringify(inputPath)}${scale} -q:v ${JPEG_QUALITY} -qmin ${JPEG_QUALITY} -qmax ${JPEG_QUALITY} -frames:v 1 -y ${JSON.stringify(outputPath)}`;
  execSync(cmd, { stdio: "inherit", cwd: projectRoot });
}

function updateHtmlReferences(projectRoot, fromBasename, toBasename) {
  const fromPng = fromBasename; // e.g. "slug-hero.png"
  const toJpg = toBasename;     // e.g. "slug-hero.jpg"
  const blogDir = path.resolve(projectRoot, "blog");
  const files = [
    path.resolve(projectRoot, "index.html"),
    path.resolve(blogDir, "index.html"),
    ...fs.readdirSync(blogDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\\.html$/.test(f))
      .map((f) => path.resolve(blogDir, f)),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, "utf8");
    const before = html;
    html = html.split(fromPng).join(toJpg);
    if (html !== before) fs.writeFileSync(file, html, "utf8");
  }
}

function fixHeroJpgs(projectRoot, imagesPath) {
  const files = fs.readdirSync(imagesPath).filter((f) => f.endsWith("-hero.jpg"));
  if (files.length === 0) return;
  for (const file of files) {
    const base = path.basename(file, ".jpg");
    const inputPath = path.join(imagesPath, file);
    const tempPath = path.join(imagesPath, `${base}.tmp.jpg`);
    console.log("Re-encoding (1200px wide):", file);
    compressToJpeg(projectRoot, inputPath, tempPath, base);
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);
  }
}

function main() {
  const args = process.argv.slice(2);
  const fixHero = args.includes("--fix-hero");
  const projectRoot = path.resolve(process.cwd());
  const imagesPath = path.resolve(projectRoot, IMAGES_DIR);
  if (!fs.existsSync(imagesPath)) {
    console.log("No blog/images directory.");
    return;
  }
  if (fixHero) {
    fixHeroJpgs(projectRoot, imagesPath);
    console.log("Done.");
    return;
  }
  const files = fs.readdirSync(imagesPath);
  const nonJpg = files.filter((f) => !isJpg(f));
  if (nonJpg.length === 0) {
    console.log("No non-JPG images in blog/images.");
    return;
  }
  for (const file of nonJpg) {
    const base = path.basename(file, path.extname(file));
    const inputPath = path.join(imagesPath, file);
    const outputPath = path.join(imagesPath, `${base}.jpg`);
    if (!fs.existsSync(inputPath)) continue;
    console.log("Compressing:", file);
    compressToJpeg(projectRoot, inputPath, outputPath, base);
    updateHtmlReferences(projectRoot, file, `${base}.jpg`);
    fs.unlinkSync(inputPath);
    console.log("  ->", `${base}.jpg`, "(removed original)");
  }
  console.log("Done.");
}

main();
