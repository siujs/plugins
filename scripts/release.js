/* eslint-disable @typescript-eslint/no-var-requires */

const { release, runWhetherDry } = require("@siujs/builtin-publish");

const minimist = require("minimist");

const cmd = minimist(process.argv);

const skips = cmd.skip ? cmd.skip.split(",") : [];

(async () => {
	await release({
		pkgShortName: pkg => pkg.replace("plugin-", ""),
		dryRun: cmd.dryRun || cmd["dry-run"],
		skipLint: false,
		skipBuild: !!skips.length && skips.includes("build"),
		skipPublish: !!skips.length && skips.includes("publish"),
		skipCommit: !!skips.length && skips.includes("commit"),
		skipPush: !!skips.length && skips.includes("push"),
		version: "independent",
		hooks: {
			async lint({ cwd, dryRun }) {
				await runWhetherDry(dryRun)("yarn", ["test"], { cwd });
			}
		}
	});
})();
