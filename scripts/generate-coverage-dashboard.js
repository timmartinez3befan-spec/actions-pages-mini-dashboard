const fs = require("fs");
const path = require("path");

const summaryPath = process.argv[2];

if (!summaryPath) {
  console.error("Bitte Pfad zur coverage-summary.json angeben.");
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error("coverage-summary.json nicht gefunden:", summaryPath);
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "dist");
const rawSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const total = rawSummary.total;

const files = Object.entries(rawSummary)
  .filter(([filePath]) => filePath !== "total")
  .map(([filePath, metrics]) => ({
    file: filePath.replaceAll("\\", "/"),
    lines: metrics.lines.pct,
    statements: metrics.statements.pct,
    functions: metrics.functions.pct,
    branches: metrics.branches.pct,
  }));

const dashboardData = {
  generatedAt: new Date().toISOString(),
  branch: process.env.GITHUB_REF_NAME || "lokal",
  commit: process.env.GITHUB_SHA || "lokal",
  runNumber: process.env.GITHUB_RUN_NUMBER || "lokal",
  submodulePath: "submodules/app-code",
  total: {
    lines: total.lines.pct,
    statements: total.statements.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
  },
  files,
};

const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Submodule Coverage Dashboard</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1100px;
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
      font-size: 30px;
      margin-top: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }

    code {
      background: #eee;
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .bad {
      color: #b00020;
      font-weight: bold;
    }

    .ok {
      color: #8a6d00;
      font-weight: bold;
    }

    .good {
      color: #006b2e;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Submodule Coverage Dashboard</h1>
    <p>Die Tests laufen im Submodule. Das Dashboard wird im Hauptrepo erzeugt und über GitHub Pages veröffentlicht.</p>
  </div>

  <div class="card grid">
    <div class="metric">
      Lines
      <strong id="lines">-</strong>
    </div>

    <div class="metric">
      Statements
      <strong id="statements">-</strong>
    </div>

    <div class="metric">
      Functions
      <strong id="functions">-</strong>
    </div>

    <div class="metric">
      Branches
      <strong id="branches">-</strong>
    </div>
  </div>

  <div class="card">
    <h2>Build-Informationen</h2>
    <p><strong>Submodule:</strong> <code id="submodulePath">-</code></p>
    <p><strong>Branch:</strong> <code id="branch">-</code></p>
    <p><strong>Commit:</strong> <code id="commit">-</code></p>
    <p><strong>Workflow Run:</strong> <code id="runNumber">-</code></p>
    <p><strong>Generiert am:</strong> <span id="generatedAt">-</span></p>
  </div>

  <div class="card">
    <h2>Coverage pro Datei</h2>
    <table>
      <thead>
        <tr>
          <th>Datei</th>
          <th>Lines</th>
          <th>Statements</th>
          <th>Functions</th>
          <th>Branches</th>
        </tr>
      </thead>
      <tbody id="fileTable"></tbody>
    </table>
  </div>

  <script>
    function classify(value) {
      if (value >= 80) return "good";
      if (value >= 50) return "ok";
      return "bad";
    }

    function formatPct(value) {
      return value + "%";
    }

    async function loadDashboard() {
      const response = await fetch("./data.json");
      const data = await response.json();

      document.getElementById("lines").textContent = formatPct(data.total.lines);
      document.getElementById("statements").textContent = formatPct(data.total.statements);
      document.getElementById("functions").textContent = formatPct(data.total.functions);
      document.getElementById("branches").textContent = formatPct(data.total.branches);

      document.getElementById("lines").className = classify(data.total.lines);
      document.getElementById("statements").className = classify(data.total.statements);
      document.getElementById("functions").className = classify(data.total.functions);
      document.getElementById("branches").className = classify(data.total.branches);

      document.getElementById("submodulePath").textContent = data.submodulePath;
      document.getElementById("branch").textContent = data.branch;
      document.getElementById("commit").textContent = data.commit;
      document.getElementById("runNumber").textContent = data.runNumber;
      document.getElementById("generatedAt").textContent =
        new Date(data.generatedAt).toLocaleString("de-DE");

      const table = document.getElementById("fileTable");
      table.innerHTML = "";

      data.files.forEach((item) => {
        const row = document.createElement("tr");

        row.innerHTML =
          "<td><code>" + item.file + "</code></td>" +
          "<td class='" + classify(item.lines) + "'>" + formatPct(item.lines) + "</td>" +
          "<td class='" + classify(item.statements) + "'>" + formatPct(item.statements) + "</td>" +
          "<td class='" + classify(item.functions) + "'>" + formatPct(item.functions) + "</td>" +
          "<td class='" + classify(item.branches) + "'>" + formatPct(item.branches) + "</td>";

        table.appendChild(row);
      });
    }

    loadDashboard();
  </script>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, "data.json"),
  JSON.stringify(dashboardData, null, 2),
  "utf8"
);

fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");

console.log("Coverage Dashboard erzeugt:");
console.log("- dist/index.html");
console.log("- dist/data.json");