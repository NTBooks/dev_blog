const fs = require("fs");
const path = require("path");

const MODEL = "gemini-3-pro-image-preview";

function loadEnv() {
  const raw = fs.readFileSync(".env", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function run() {
  const env = loadEnv();
  const apiKey = env.GEMINI_KEY;
  if (!apiKey) { console.error("Missing GEMINI_KEY"); process.exit(1); }

  const brandPrompt = fs.readFileSync(".cursor/skills/brand-guidelines/brand-prompt.md", "utf8").trim();

  const prompt = `Using this brand aesthetic:\n\n${brandPrompt}\n\n---\n\nCreate a tall portrait infographic designed for vertical reading, titled THE EXPERT IMPOSTER in bold uppercase crystal-faceted text at the top. Solid black background throughout. Three stacked sections separated by sharp icy-blue geometric crystalline dividers:\n\nSection 1 (top): Label AI: THE SUPERIOR IMPOSTER. Crystalline robot icon in confident upright posture, faceted blue diamond style. Subtitle text: Confident. No self-doubt. Just output.\n\nSection 2 (middle): Label YOUR REAL SKILLS. Crystalline human figure with a glowing faceted crystal brain. Subtitle text: Context. Judgment. Hard-won experience.\n\nSection 3 (bottom): Label WORK WITH IT. Crystalline human and robot standing side by side. Subtitle text: Expertise directing AI raises the ceiling.\n\nFooter caption in small crystal text: Pick up the uncomfortable tools.\n\nAll elements use the Crystalline Aesthetic: faceted geometric vector style, bold #0A1E35 dark navy outlines on every element, #2EB6C1 mid-blue body color, #AEEEEE icy cyan edge highlights, white starburst sparkle glints at vertices. Solid black background.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  console.log("Generating infographic...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("API error:", t);
    process.exit(1);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) { console.error("No content in response"); process.exit(1); }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const outPath = "blog/images/the-expert-imposter-infographic.png";
      fs.mkdirSync("blog/images", { recursive: true });
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"));
      console.log("Saved:", outPath);
      return;
    }
  }

  console.error("No image data in response");
  if (data.candidates?.[0]?.content?.parts) {
    for (const p of data.candidates[0].content.parts) {
      if (p.text) console.log("Model text:", p.text);
    }
  }
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
