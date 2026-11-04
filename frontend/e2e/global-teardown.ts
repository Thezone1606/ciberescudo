import { execSync } from "node:child_process";
import path from "node:path";

export default function globalTeardown() {
  execSync("npx tsx scripts/cleanup-e2e.ts", { cwd: path.resolve(__dirname, "../../backend"), stdio: "inherit" });
}
