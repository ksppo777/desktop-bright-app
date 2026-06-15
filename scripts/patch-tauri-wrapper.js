import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const binDir = path.join(root, "node_modules", ".bin");
const wrappers = ["tauri", "tauri.cmd", "tauri.ps1"];

const shPatch = (content) => {
  if (content.includes("-r dotenv/config")) return content;
  return content
    .replace(
      /exec \"\$basedir\/node\"\s+\"\$basedir\/\.\.\/@tauri-apps\/cli\/tauri\.js\" \"\$@\"/,
      "exec \"$basedir/node\" -r dotenv/config \"$basedir/../@tauri-apps/cli/tauri.js\" \"$@\""
    )
    .replace(
      /exec node\s+\"\$basedir\/\.\.\/@tauri-apps\/cli\/tauri\.js\" \"\$@\"/,
      "exec node -r dotenv/config \"$basedir/../@tauri-apps/cli/tauri.js\" \"$@\""
    );
};

const cmdPatch = (content) => {
  if (content.includes("node -r dotenv/config")) return content;
  return content.replace(
    /"%_prog%"\s+"%dp0%\\..\\@tauri-apps\\cli\\tauri\.js" %\*/,
    "\"%_prog%\" -r dotenv/config \"%dp0%\\..\\@tauri-apps\\cli\\tauri.js\" %*"
  );
};

const ps1Patch = (content) => {
  if (content.includes("node$exe -r dotenv/config")) return content;
  return content
    .replace(
      /& \"\$basedir\/node\$exe\"\s+\"\$basedir\/\.\.\/@tauri-apps\/cli\/tauri\.js\" \$args/,
      "& \"$basedir/node$exe\" -r dotenv/config \"$basedir/../@tauri-apps/cli/tauri.js\" $args"
    )
    .replace(
      /& \"node\$exe\"\s+\"\$basedir\/\.\.\/@tauri-apps\/cli\/tauri\.js\" \$args/,
      "& \"node$exe\" -r dotenv/config \"$basedir/../@tauri-apps/cli/tauri.js\" $args"
    );
};

const patchFile = async (name) => {
  const file = path.join(binDir, name);
  try {
    const content = await fs.readFile(file, "utf8");
    let patched = content;
    if (name === "tauri") patched = shPatch(content);
    if (name === "tauri.cmd") patched = cmdPatch(content);
    if (name === "tauri.ps1") patched = ps1Patch(content);
    if (patched !== content) {
      await fs.writeFile(file, patched, "utf8");
      console.log(`Patched ${name}`);
    } else {
      console.log(`Already patched ${name}`);
    }
  } catch (error) {
    console.warn(`Could not patch ${name}: ${error.message}`);
  }
};

const run = async () => {
  for (const name of wrappers) {
    await patchFile(name);
  }
};

run();
