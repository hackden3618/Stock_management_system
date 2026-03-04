const { spawn } = require("child_process");
const os = require("os");

function run(cmd, args, options = {}) {
  const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...options });
  return p;
}

console.log("Checking environment...");

// Node check
if (!process.version) {
  console.error("Node is required.");
  process.exit(1);
}

// PHP detection
let php = "php";

const isWin = os.platform() === "win32";

if (isWin) {
  php = "php";
} else {
  php = "php";
}

// fallback handled by system/XAMPP PATH

console.log("Starting backend...");
run(php, ["-S", "127.0.0.1:8000"], { cwd: "api" });

console.log("Installing frontend deps...");
run("npm", ["install"], { cwd: "frontend" });

setTimeout(() => {
  console.log("Starting frontend...");
  run("npm", ["run", "dev"], { cwd: "frontend" });
}, 2000);

console.log("\nApp will be available at http://localhost:5173");
