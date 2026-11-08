// Usage: node flatten-assets.js <expo-dist-dir>
// Moves every exported asset into dist/assets/f/ (names are content-hashed, so unique) and rewrites
// the asset folder paths inside the JS bundles. Keeps them out of "node_modules" folders, which git
// and Vercel uploads ignore.
const fs = require("fs");
const path = require("path");

const dist = path.resolve(process.argv[2]);
const assetsDir = path.join(dist, "assets");
const flat = path.join(assetsDir, "f");
fs.mkdirSync(flat, { recursive: true });

const dirs = new Set();
let moved = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (p !== flat) walk(p);
      continue;
    }
    const rel = path.relative(assetsDir, dir).split(path.sep).join("/");
    if (rel) dirs.add(rel);
    const target = path.join(flat, entry.name);
    if (fs.existsSync(target)) throw new Error(`Asset name collision: ${entry.name}`);
    fs.renameSync(p, target);
    moved++;
  }
}
walk(assetsDir);
for (const name of fs.readdirSync(assetsDir)) {
  if (name !== "f") fs.rmSync(path.join(assetsDir, name), { recursive: true, force: true });
}

const sorted = [...dirs].sort((a, b) => b.length - a.length);
const jsDir = path.join(dist, "_expo", "static", "js", "web");
let total = 0;
for (const file of fs.readdirSync(jsDir)) {
  if (!file.endsWith(".js")) continue;
  const fp = path.join(jsDir, file);
  let src = fs.readFileSync(fp, "utf8");
  let n = 0;
  for (const d of sorted) {
    const parts = src.split(`/assets/${d}`);
    if (parts.length > 1) {
      n += parts.length - 1;
      src = parts.join("/assets/f");
    }
  }
  if (n) {
    fs.writeFileSync(fp, src);
    total += n;
    console.log(`${file}: ${n} path(s) rewritten`);
  }
}
console.log(`moved ${moved} asset files from ${sorted.length} folders; ${total} bundle references rewritten`);
console.log(sorted.join("\n"));
