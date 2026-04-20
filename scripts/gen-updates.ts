import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from "fs";
import path from "path";

interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [key: string]: {
      signature: string;
      url: string;
    };
  };
}

const [, , updatesFolder, updatesBaseUrl] = process.argv;

if (!updatesFolder || !updatesBaseUrl) {
  console.error("Usage: bun gen-updates.ts <updates_folder> <updates_base_url>");
  process.exit(1);
}

const tauriConfigPath = path.resolve(__dirname, "../src-tauri/tauri.conf.json");
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf-8"));
const version = tauriConfig.version;
const versionedDir = path.join(updatesFolder, version);

const getTargetDirs = () => {
  return [
    path.resolve(__dirname, "../src-tauri/target/aarch64-apple-darwin/release/bundle"),
    path.resolve(__dirname, "../src-tauri/target/x86_64-apple-darwin/release/bundle")
  ];
};

function copyBuildArtifacts() {
  const targetDirs = getTargetDirs();

  targetDirs.forEach((dir) => {
    if (!existsSync(dir)) return;

    const arch = dir.includes("aarch64") ? "aarch64" : "x86_64";

    if (!existsSync(versionedDir)) {
      mkdirSync(versionedDir, { recursive: true });
    }

    // Handle .app.tar.gz files
    const macosDir = path.join(dir, "macos");
    if (existsSync(macosDir)) {
      const macosFiles = readdirSync(macosDir);
      const tarGz = macosFiles.find((f) => f.endsWith(".app.tar.gz"));
      if (tarGz) {
        const archTarGz = tarGz
          .replace(".app.tar.gz", `_${version}_${arch}.app.tar.gz`)
          .toLowerCase();
        copyFileSync(path.join(macosDir, tarGz), path.join(versionedDir, archTarGz));

        const sigFile = `${tarGz}.sig`;
        const archSigFile = `${archTarGz}.sig`;
        if (existsSync(path.join(macosDir, sigFile))) {
          copyFileSync(path.join(macosDir, sigFile), path.join(versionedDir, archSigFile));
        }
      }
    }

    // Handle .dmg files
    const dmgDir = path.join(dir, "dmg");
    if (existsSync(dmgDir)) {
      const dmgFiles = readdirSync(dmgDir);
      const dmg = dmgFiles.find((f) => f.endsWith(".dmg"));
      if (dmg) {
        // const archDmg = dmg.replace(".dmg", `_${version}_${arch}.dmg`).toLowerCase();
        const archDmg = dmg.replace("x64", "x86_64").toLowerCase();
        copyFileSync(path.join(dmgDir, dmg), path.join(versionedDir, archDmg));
      }
    }
  });
}

function generateUpdateManifest() {
  const files = readdirSync(versionedDir);
  const platforms: { [key: string]: { signature: string; url: string } } = {};

  files.forEach((file) => {
    if (file.endsWith(".app.tar.gz")) {
      const sigFile = `${file}.sig`;
      const signature = readFileSync(path.join(versionedDir, sigFile), "utf-8");

      // Extract architecture from filename and map to platform
      const isAarch64 = file.includes("aarch64");
      const platform = isAarch64 ? "darwin-aarch64" : "darwin-x86_64";

      platforms[platform] = {
        signature,
        url: `${updatesBaseUrl}/${version}/${file}`
      };
    }
  });

  const manifest: UpdateManifest = {
    version,
    notes: "New version released",
    pub_date: new Date().toISOString(),
    platforms
  };

  // Write latest.json to the root updates folder
  writeFileSync(path.join(updatesFolder, "latest.json"), JSON.stringify(manifest, null, 2));

  console.log("Generated latest.json with update information");
}

// Main execution
copyBuildArtifacts();
generateUpdateManifest();
