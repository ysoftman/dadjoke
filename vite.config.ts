import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const DATE_FMT = "format:%Y-%m-%d %H:%M";

function isGitRepo(): boolean {
	try {
		execSync("git rev-parse --git-dir", { encoding: "utf-8", stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

function getVersionInfo(): string {
	if (isGitRepo()) {
		try {
			const tag = execSync("git describe --tags --abbrev=0", {
				encoding: "utf-8",
				stdio: "pipe",
			}).trim();
			const date = execSync(
				`git log -1 --format=%cd --date="${DATE_FMT}" ${tag}`,
				{ encoding: "utf-8", stdio: "pipe" },
			).trim();
			return `${tag} (${date})`;
		} catch {
			/* no tag — fall through */
		}
		try {
			const hash = execSync("git rev-parse --short HEAD", {
				encoding: "utf-8",
				stdio: "pipe",
			}).trim();
			const date = execSync(
				`git log -1 --format=%cd --date="${DATE_FMT}"`,
				{ encoding: "utf-8", stdio: "pipe" },
			).trim();
			return `${hash} (${date})`;
		} catch {
			/* no commits */
		}
	}
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
	return `dev (${ts})`;
}

export default defineConfig({
	build: {
		outDir: "docs",
	},
	define: {
		__APP_VERSION__: JSON.stringify(getVersionInfo()),
	},
});
