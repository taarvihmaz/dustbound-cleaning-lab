// Build the public site from the same game, lab and submission files used offline.
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const projectFiles = {
  "docs/technical_report.pdf": "files/technical-report.pdf",
  "presentation/Mini_Robot_Vacuum.pdf": "files/presentation.pdf",
  "presentation/Mini_Robot_Vacuum.pptx": "files/presentation.pptx",
  "demo/Dustbound_Showcase.mp4": "files/demonstration.mp4",
  "game/engine.js": "lab/engine.js",
  "game/locations.js": "lab/locations.js",
};
const links = `<nav aria-label="Course project" style="display:flex;gap:0.65rem 1.25rem;flex-wrap:wrap;align-items:center;margin:1.5rem 0;color:#294337;font:600 0.9rem/1.5 system-ui">
<a style="color:inherit" href="lab/">Open the 5 × 5 course lab</a>
<a style="color:inherit" href="files/technical-report.pdf">Technical report</a>
<a style="color:inherit" href="files/presentation.pdf">Slides</a>
<a style="color:inherit" href="files/demonstration.mp4">Watch the demo</a>
</nav>`;
await Promise.all(["files", "lab"].map(dir => mkdir(path.join(output, dir), {recursive:true})));
await Promise.all(Object.entries(projectFiles).map(([source, target]) =>
  copyFile(path.join(root, source), path.join(output, target))));
const game = await readFile(path.join(root, "Dustbound.html"), "utf8");
const endOfMenu = game.indexOf("</main>");
if (endOfMenu === -1) throw new Error("The game menu is missing.");
await writeFile(path.join(output, "index.html"), game.slice(0, endOfMenu) + links + game.slice(endOfMenu));
const lab = await readFile(path.join(root, "game/lab.html"), "utf8");
await writeFile(path.join(output, "lab/index.html"), lab.replaceAll("../Dustbound.html", "../"));
console.log("Built campaign, course lab, report, slides and demonstration in dist/.");
