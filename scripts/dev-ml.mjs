// Launches the ml-service with its own venv's Python, so it works
// regardless of platform or which venv (if any) is activated.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serviceDir = path.join(repoRoot, "packages", "ml-service");
const python = path.join(
  serviceDir,
  ".venv",
  ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"])
);

if (!existsSync(python)) {
  console.error(`ml-service venv not found at ${python}`);
  console.error(
    "Create it first:\n" +
      "  cd packages/ml-service\n" +
      "  python -m venv .venv\n" +
      "  .venv/bin/pip install -r requirements.txt   (Windows: .venv\\Scripts\\pip)"
  );
  process.exit(1);
}

const child = spawn(
  python,
  ["-m", "uvicorn", "app:app", "--reload", "--port", "8000"],
  { cwd: serviceDir, stdio: "inherit" }
);
child.on("exit", (code) => process.exit(code ?? 0));
