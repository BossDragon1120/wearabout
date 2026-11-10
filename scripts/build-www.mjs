// Copy the web app into www/ for the iPhone app. The website (GitHub Pages) keeps using the files at the repo root.
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
const FILES = ["index.html", "app.js", "faces.js", "config.js", "styles.css", "legal.css", "manifest.webmanifest",
  "privacy.html", "terms.html", "support.html", "icons"];
rmSync("www", { recursive: true, force: true }); mkdirSync("www");
for (const f of FILES) if (existsSync(f)) cpSync(f, `www/${f}`, { recursive: true });
console.log("www/ ready:", FILES.join(", "));
