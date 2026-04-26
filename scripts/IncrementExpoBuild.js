const fs = require("fs");
const path = require("path");

function toIntOr(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function incrementVersionString(version) {
  const parts = String(version || "1.0.0")
    .split(".")
    .map((p) => toIntOr(p, 0));
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function run() {
  const appJsonPath = path.join(__dirname, "..", "app.json");
  const raw = fs.readFileSync(appJsonPath, "utf8");
  const appJson = JSON.parse(raw);
  const expo = appJson.expo || {};
  const ios = expo.ios || {};
  const android = expo.android || {};

  const currentVersion = String(expo.version || "1.0.0");
  const currentBuildNumber = toIntOr(ios.buildNumber, 1);
  const currentVersionCode = toIntOr(android.versionCode, 1);

  const nextVersion = incrementVersionString(currentVersion);
  const nextBuildNumber = String(currentBuildNumber + 1);
  const nextVersionCode = currentVersionCode + 1;

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log(`[dry-run] expo.version: ${currentVersion} -> ${nextVersion}`);
    console.log(`[dry-run] ios.buildNumber: ${ios.buildNumber || "N/A"} -> ${nextBuildNumber}`);
    console.log(`[dry-run] android.versionCode: ${android.versionCode || "N/A"} -> ${nextVersionCode}`);
    return;
  }

  appJson.expo = {
    ...expo,
    version: nextVersion,
    ios: {
      ...ios,
      buildNumber: nextBuildNumber,
    },
    android: {
      ...android,
      versionCode: nextVersionCode,
    },
  };

  fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, "utf8");
  console.log(`Updated app.json versioning -> version ${nextVersion}, iOS ${nextBuildNumber}, Android ${nextVersionCode}`);
}

run();
