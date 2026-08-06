import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trackingId = "3caa4afc00730bf5e184910dff0e9f52";
const injection = [
  "  <script>",
  "    var _hmt = _hmt || [];",
  "    (function() {",
  "      var hm = document.createElement(\"script\");",
  "      hm.src = \"https://hm.baidu.com/hm.js?" + trackingId + "\";",
  "      var s = document.getElementsByTagName(\"script\")[0];",
  "      s.parentNode.insertBefore(hm, s);",
  "    })();",
  "  </script>",
].join("\n");

const ignoredDirectories = new Set([".git", "node_modules", "output"]);
let updated = 0;
let skipped = 0;

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        visit(path.join(directory, entry.name));
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      continue;
    }

    const file = path.join(directory, entry.name);
    const source = fs.readFileSync(file, "utf8");
    if (source.includes(trackingId) || !/<\/head\s*>/i.test(source)) {
      skipped += 1;
      continue;
    }

    const result = source.replace(/<\/head\s*>/i, injection + "\n</head>");
    fs.writeFileSync(file, result);
    updated += 1;
    console.log("Injected Baidu Tongji: " + path.relative(root, file));
  }
}

visit(root);
console.log("Baidu Tongji injection complete: " + updated + " updated, " + skipped + " skipped.");
