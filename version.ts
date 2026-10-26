import { $ } from "bun";

const DATE_FMT = "format:%Y-%m-%d %H:%M";

async function git(args: string[]): Promise<string | null> {
	const { exitCode, stdout } = await $`git ${args}`.quiet().nothrow();
	return exitCode === 0 ? stdout.toString().trim() : null;
}

async function getVersionInfo(): Promise<string> {
	const tag = await git(["describe", "--tags", "--abbrev=0"]);
	const ref = tag ?? (await git(["rev-parse", "--short", "HEAD"]));
	if (ref) {
		const date = await git([
			"log",
			"-1",
			"--format=%cd",
			`--date=${DATE_FMT}`,
			...(tag ? [tag] : []),
		]);
		if (date) return `${ref} (${date})`;
	}
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
	return `dev (${ts})`;
}

console.log(await getVersionInfo());
