import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ms from "pretty-ms";
import shell from "shelljs";

import { HookHandlerContext } from "@siujs/core";
import { downloadGit, getPkgDirName, startSpinner } from "@siujs/utils";

export async function onCreateStart(ctx: HookHandlerContext) {
	ctx.scopedKeys("startTime", Date.now());

	ctx.scopedKeys("spinner", startSpinner(chalk.greenBright(`Creating \`${chalk.bold(ctx.pkg().name)}\` package... `)));
}

export async function onCreateProc(ctx: HookHandlerContext) {
	const pkgData = ctx.pkg();

	await downloadGit("https://gitee.com/siujs/tpls", "vui.pkg", pkgData.path);

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
			code === 0 ? resolve(true) : reject(stderr);
		});
	});

	const deps = ctx.opts<string>("deps");

	const pkgMeta = await fs.readJSON(pkgData.metaPath);

	if (deps) {
		const depsArr = deps.split(",").map(dep => ({ name: dep, isDev: false }));

		if (depsArr.length) {
			const depMetas = await Promise.all(
				depsArr.map(dep => fs.readJSON(path.resolve(pkgData.pkgsRoot, getPkgDirName(dep.name), "package.json")))
			);

			const pkgMeta = await fs.readJSON(pkgData.metaPath);

			if (pkgMeta) {
				depMetas.forEach((depMeta, index) => {
					pkgMeta[depsArr[index].isDev ? "devDependencies" : "dependencies"][depMeta.name] = depMeta.version;
				});

				await Promise.all([
					ctx.pkg(pkgMeta),
					fs.writeJSON(pkgData.metaPath, pkgMeta, {
						spaces: 2
					})
				]);
			}
		}
	} else {
		const type = ctx.opts<string>("type");
		if (type === "lib") {
			pkgMeta["siu:vui:lib"] = true;
		}
	}

	await Promise.all([
		ctx.pkg(pkgMeta),
		fs.writeJSON(pkgData.metaPath, pkgMeta, {
			spaces: 2
		})
	]);

	ctx.scopedKeys<any>("spinner").stop(true);

	const canInstall = ctx.opts<boolean>("install");

	if (canInstall) {
		shell.exec("yarn");
	}
}

export async function onCreateComplete(ctx: HookHandlerContext) {
	console.log(
		chalk.green(
			`\n✔ Created ${chalk.bold(ctx.pkg().name)} in ${chalk.bold(
				ms(Date.now() - ctx.scopedKeys<number>("startTime"))
			)}!`
		)
	);
}

export async function onCreateError(ctx: HookHandlerContext) {
	ctx.scopedKeys<any>("spinner").stop(true);
	shell.rm("-rf", ctx.pkg().path);
	console.log(chalk.redBright(ctx.ex()));
}
