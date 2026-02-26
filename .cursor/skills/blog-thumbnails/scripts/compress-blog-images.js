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
const JPEG_QUALITY = 3; // ffmpeg -q:v 2-5; 3 ≈ 90% quality

function isJpg(name) {
  return /\.jpe?g$/i.test(name);
}

function compressToJpeg(projectRoot, inputPath, outputPath) {
  execSync(
    `ffmpeg -i ${JSON.stringify(inputPath)} -q:v ${JPEG_QUALITY} -frames:v 1 -y ${JSON.stringify(outputPath)}`,
    { stdio: "inherit", cwd: projectRoot }
  );
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

function main() {
  const projectRoot = path.resolve(process.cwd());
  const imagesPath = path.resolve(projectRoot, IMAGES_DIR);
  if (!fs.existsSync(imagesPath)) {
    console.log("No blog/images directory.");
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
    const ext = path.extname(file);
    const inputPath = path.join(imagesPath, file);
    const outputPath = path.join(imagesPath, `${base}.jpg`);
    if (!fs.existsSync(inputPath)) continue;
    console.log("Compressing:", file);
    compressToJpeg(projectRoot, inputPath, outputPath);
    updateHtmlReferences(projectRoot, file, `${base}.jpg`);
    fs.unlinkSync(inputPath);
    console.log("  ->", `${base}.jpg`, "(removed original)");
  }
  console.log("Done.");
}

main();
