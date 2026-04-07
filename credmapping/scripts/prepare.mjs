import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");
const huskyDir = "credmapping/.husky";

if (!existsSync(resolve(repoRoot, ".git"))) {
  process.exit(0);
}

if (!existsSync(resolve(repoRoot, huskyDir))) {
  process.exit(0);
}

let husky;

try {
  ({ default: husky } = await import("husky"));
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") {
    process.exit(0);
  }

  throw error;
}

process.chdir(repoRoot);

const message = husky(huskyDir);

if (message) {
  console.log(message);
}
