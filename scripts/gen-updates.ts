import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from "fs";
import path from "path";

const [, , updatesFolder, updatesBaseUrl] = process.argv;

if (!updatesFolder || !updatesBaseUrl) {
  console.error("Usage: npm run gen-updates -- <updates_folder> <updates_base_url>");
  process.exit(1);
}

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const version = pkg.version;
const versionedDir = path.join(updatesFolder, version);
const buildDir = path.resolve(__dirname, "../dist-electron");

if (!existsSync(buildDir)) {
  console.error(`Build dir not found: ${buildDir}`);
  process.exit(1);
}

if (!existsSync(versionedDir)) {
  mkdirSync(versionedDir, { recursive: true });
}

const artifactExtensions = [".dmg", ".zip", ".blockmap"];
const entries = readdirSync(buildDir);

for (const file of entries) {
  if (artifactExtensions.some((ext) => file.endsWith(ext))) {
    copyFileSync(path.join(buildDir, file), path.join(versionedDir, file));
    console.log(`Copied ${file}`);
  }
}

const latestYmlNames = ["latest-mac.yml"];
for (const name of latestYmlNames) {
  const src = path.join(buildDir, name);
  if (!existsSync(src)) continue;
  let yml = readFileSync(src, "utf-8");
  yml = yml.replace(/^(\s*url:\s*)(\S+)/gm, (_, prefix: string, file: string) => {
    if (/^https?:\/\//.test(file)) return `${prefix}${file}`;
    return `${prefix}${updatesBaseUrl}/${version}/${file}`;
  });
  writeFileSync(path.join(updatesFolder, name), yml);
  writeFileSync(path.join(versionedDir, name), yml);
  console.log(`Wrote ${name}`);
}

console.log(`Release ${version} prepared at ${versionedDir}`);
