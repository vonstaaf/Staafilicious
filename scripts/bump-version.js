const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const appJsonPath = path.join(rootDir, "app.json");

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to read JSON from ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  try {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new Error(`Failed to write JSON to ${filePath}: ${error.message}`);
  }
}

function run() {
  const packageJson = readJson(packageJsonPath);
  const appJson = readJson(appJsonPath);

  const packageVersion = packageJson.version;
  if (!packageVersion || typeof packageVersion !== "string") {
    throw new Error("package.json is missing a valid version field.");
  }
  if (!appJson.expo || typeof appJson.expo !== "object") {
    throw new Error("app.json is missing expo configuration.");
  }

  const previousVersion = appJson.expo.version;
  appJson.expo.version = packageVersion;
  writeJson(appJsonPath, appJson);

  const changed = previousVersion !== packageVersion;
  console.log(
    changed
      ? `Version sync complete: app.json expo.version updated from ${previousVersion} to ${packageVersion}.`
      : `Version sync complete: app.json expo.version already ${packageVersion}.`
  );
}

try {
  run();
} catch (error) {
  console.error(`[bump-version] ${error.message}`);
  process.exit(1);
}
