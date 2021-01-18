import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ms from "pretty-ms";
import shell from "shelljs";

import { HookHandlerContext } from "@siujs/core";
import { downloadGit, startSpinner } from "@siujs/utils";

export async function onCreationStart(ctx: HookHandlerContext) {
	ctx.scopedKeys("startTime", Date.now());

	ctx.scopedKeys("spinner", startSpinner(chalk.greenBright(`Creating \`${chalk.bold(ctx.pkg().name)}\` package... `)));
}

export async function onCreationProc(ctx: HookHandlerContext) {
	const pkgData = ctx.pkg();

	await downloadGit("https://gitee.com/siujs/tpls", "jssdk.pkg", pkgData.path);

	/**
	 * replace placeholder chars
	 */
	const filePaths = shell.grep("-l", "__SIU_PKG_", `${pkgData.path}/**/*.*`).split("\n");

	filePaths.filter(Boolean).forEach(filePath => {
		shell.sed("-i", /__SIU_PKG_UMDNAME__/, pkgData.umdName, filePath);
		shell.sed("-i", /__SIU_PKG_DIRNAME__/, pkgData.dirName, filePath);
		shell.sed("-i", /__SIU_PKG_NAME__/, pkgData.name, filePath);
	});

	/**
	 * pretty files in current workspace
	 */
	await new Promise((resolve, reject) => {
		shell.exec(`yarn pretty`, { silent: true, cwd: pkgData.path }, (code, stdout, stderr) => {
			code === 0 ? resolve(true) : /* istanbul ignore next */ reject(stderr);
		});
	});

	const deps = ctx.opts<string>("deps");

	if (deps) {
		const depsArr = deps.split(",").filter(dep => fs.pathExistsSync(path.resolve(pkgData.pkgsRoot, dep)));

		if (depsArr.length) {
			const pkgMeta = await fs.readJSON(pkgData.metaPath);

			if (pkgMeta) {
				pkgMeta.dependencies = pkgMeta.dependencies || /* istanbul ignore next */ {};
				depsArr.forEach(dep => {
					pkgMeta.dependencies[dep] = `file:../${dep}`;
				});

				await Promise.all([
					ctx.pkg(pkgMeta),
					fs.writeJSON(pkgData.metaPath, pkgMeta, {
						spaces: 2
					})
				]);
			}
		}
	}

	ctx.scopedKeys<any>("spinner").stop(true);

	/* istanbul ignore if */
	if (ctx.opts<boolean>("install")) {
		shell.exec("yarn");
	}
}

export async function onCreationComplete(ctx: HookHandlerContext) {
	console.log(
		chalk.green(
			`\n✔ Created ${chalk.bold(ctx.pkg().name)} in ${chalk.bold(
				ms(Date.now() - ctx.scopedKeys<number>("startTime"))
			)}!`
		)
	);
}

/* istanbul ignore next */
export async function onCreationError(ctx: HookHandlerContext) {
	ctx.scopedKeys<any>("spinner")?.stop(true);
	shell.rm("-rf", ctx.pkg().path);
	console.log(chalk.redBright(ctx.ex()));
}
