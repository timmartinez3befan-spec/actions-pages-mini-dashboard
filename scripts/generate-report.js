const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "dist");

const ignoredFolders = new Set([".git", "node_modules", "dist"]);

function walkDirectory(dir) {
  let results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredFolders.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(walkDirectory(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const files = walkDirectory(rootDir).map((file) =>
  path.relative(rootDir, file).replaceAll("\\", "/")
);

const fileTypes = {};

for (const file of files) {
  const ext = path.extname(file) || "ohne Endung";
  fileTypes[ext] = (fileTypes[ext] || 0) + 1;
}

const fileTypeRows = Object.entries(fileTypes)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([type, count]) => `
      <tr>
        <td>${escapeHtml(type)}</td>
        <td>${count}</td>
      </tr>
    `
  )
  .join("");

const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mini GitHub Actions Dashboard</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f5f5f5;
      color: #222;
    }

    .card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    h1 {
      margin-bottom: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .metric {
      background: #f0f0f0;
      padding: 16px;
      border-radius: 10px;
    }

    .metric strong {
      display: block;
      font-size: 28px;
      margin-top: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td, th {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }

    code {
      background: #eee;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mini GitHub Actions Dashboard</h1>
    <p>Diese Seite wurde automatisch durch GitHub Actions generiert und über GitHub Pages veröffentlicht.</p>
  </div>

  <div class="card grid">
    <div class="metric">
      Dateien im Repo
      <strong>${files.length}</strong>
    </div>

    <div class="metric">
      Branch
      <strong>${escapeHtml(process.env.GITHUB_REF_NAME || "lokal")}</strong>
    </div>

    <div class="metric">
      Workflow Run
      <strong>${escapeHtml(process.env.GITHUB_RUN_NUMBER || "lokal")}</strong>
    </div>
  </div>

  <div class="card">
    <h2>Build-Informationen</h2>
    <p><strong>Commit:</strong> <code>${escapeHtml(process.env.GITHUB_SHA || "lokal")}</code></p>
    <p><strong>Generiert am:</strong> ${new Date().toLocaleString("de-DE")}</p>
  </div>

  <div class="card">
    <h2>Dateitypen</h2>
    <table>
      <thead>
        <tr>
          <th>Dateityp</th>
          <th>Anzahl</th>
        </tr>
      </thead>
      <tbody>
        ${fileTypeRows}
      </tbody>
    </table>
  </div>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");

console.log("Dashboard wurde erfolgreich generiert: dist/index.html");