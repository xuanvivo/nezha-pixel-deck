import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!files.length) {
  console.error(
    "No tracked files to check. Stage the intended public files first.",
  );
  process.exit(1);
}
const issues = [];
const sensitiveFiles =
  /(?:^|\/)(?:\.env(?:\.|$)|config\.local\.json$|[^/]*\.private\.|[^/]*\.(?:db|sqlite3?|pem|key)$|(?:backups|private|node_modules)\/)/i;
const credentials = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{24,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{24,}\b/,
  /\b(?:nzp_|sk-)[A-Za-z0-9_-]{24,}\b/,
  /(?:password|passwd|secret_key|api_key|access_token)\s*["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i,
];
for (const file of files) {
  if (sensitiveFiles.test(file) && file !== ".env.example")
    issues.push(`${file}: sensitive filename`);
  const buffer = readFileSync(file);
  if (buffer.includes(0) || /\.(?:png|jpe?g|webp|woff2?)$/i.test(file))
    continue;
  const content = buffer.toString("utf8");
  for (const pattern of credentials)
    if (pattern.test(content)) issues.push(`${file}: possible credential`);
  const addresses = content.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  for (const address of addresses) {
    const numbers = address.split(".").map(Number);
    if (
      numbers.some((n) => n > 255) ||
      address === "127.0.0.1" ||
      address === "0.0.0.0" ||
      /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\./.test(address)
    )
      continue;
    issues.push(`${file}: possible production IP address`);
  }
}
if (issues.length) {
  console.error([...new Set(issues)].join("\n"));
  process.exit(1);
}
console.log(
  `Privacy patterns passed for ${files.length} tracked files. Review screenshots and personal text separately.`,
);
