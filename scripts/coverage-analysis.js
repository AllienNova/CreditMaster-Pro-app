const cov = require("../coverage/coverage-final.json");
const total = { stmts: 0, covered: 0 };
const files = Object.entries(cov).map(([path, data]) => {
  const stmts = Object.values(data.statementMap).length;
  const covered = Object.values(data.s).filter(v => v > 0).length;
  total.stmts += stmts;
  total.covered += covered;
  return { path: path.replace(process.cwd() + "/src/", ""), pct: stmts > 0 ? ((covered / stmts) * 100).toFixed(1) : "100.0", uncovered: stmts - covered, stmts };
});

const zeroFiles = files.filter(f => parseFloat(f.pct) === 0 && f.stmts > 10)
  .sort((a, b) => b.stmts - a.stmts);

const groups = {};
zeroFiles.forEach(f => {
  const parts = f.path.split("/");
  let key;
  if (parts[0] === "app" && parts[1] === "api") key = "app/api/" + parts[2];
  else if (parts[0] === "lib") key = "lib/" + parts[1];
  else if (parts[0] === "components") key = "components/" + parts[1];
  else key = parts[0] + "/" + (parts[1] || "");

  if (!(key in groups)) groups[key] = { files: 0, stmts: 0, fileList: [] };
  groups[key].files++;
  groups[key].stmts += f.stmts;
  groups[key].fileList.push(f.path);
});

const sorted = Object.entries(groups).sort((a, b) => b[1].stmts - a[1].stmts);

console.log("=== Uncovered Groups (0% files, sorted by impact) ===");
console.log("Stmts  | Files | Directory");
console.log("-------|-------|----------");
sorted.forEach(([dir, data]) => {
  console.log(String(data.stmts).padStart(6) + " | " + String(data.files).padStart(5) + " | " + dir);
});

console.log("\n=== Top 15 groups with file details ===");
sorted.slice(0, 15).forEach(([dir, data]) => {
  console.log("\n" + dir + " (" + data.stmts + " stmts, " + data.files + " files):");
  data.fileList.sort().forEach(f => console.log("  - " + f));
});

// Calculate impact of covering top groups
let cumStmts = 0;
console.log("\n=== Cumulative coverage if we test groups in order ===");
sorted.forEach(([dir, data]) => {
  cumStmts += data.stmts;
  const newPct = ((total.covered + cumStmts) / total.stmts * 100).toFixed(1);
  console.log(newPct + "% | +" + data.stmts + " stmts | " + dir);
});
