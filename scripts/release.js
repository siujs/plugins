/* eslint-disable @typescript-eslint/no-var-requires */

const chalk = require("chalk");
const path = require("path");

const { release, appendChangedLog, getNewChangedLog, runWhetherDry } = require("@siujs/builtin-publish");

const minimist = require("minimist");

const cmd = minimist(process.argv);

const skips = cmd.skip ? cmd.skip.split(",") : [];

(async () => {
	await release({
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
			},
			async commit({ cwd, version, dryRun }) {
				const run = runWhetherDry(dryRun);
				await run("git", ["add", cwd]);
				await run("git", ["commit", "-m", `chore(release): ${path.basename(cwd).replace("plugin-", "")}-v${version}`]);
			},
			async addGitTag({ cwd, version, dryRun }) {
				await runWhetherDry(dryRun)("git", ["tag", `${path.basename(cwd).replace("plugin-", "")}-v${version}`], {
					cwd,
					stdio: "inherit"
				});
			},
			async changelog({ cwd, version, dryRun, pkg }) {
				const newLog = await getNewChangedLog(version, {
					versionPrefix: pkg + "-",
					normalizeCommitMsg: (item, remoteUrl) => {
						if (!pkg) return "";
						if (item.scope === pkg || "plugin-" + item.scope === pkg) {
							const ref = /\(#\d+\)/.test(item.header)
								? ""
								: ` ([${item.extra.hash.substring(0, 7)}](${remoteUrl}/commit/${item.extra.hash}))`;
							return item.subject.trim() + ref;
						}
					}
				});

				if (dryRun) {
					console.log(chalk`{yellow [dryrun] New ChangeLog}: \n ${newLog}`);
					return;
				}
				await appendChangedLog(newLog, cwd);
			}
		}
	});
})();
