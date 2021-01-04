/**
 *
 * Generate README.md and README.zh-CN.md and vetur's files
 *
 */

import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import sh from "shelljs";

import { HookHandlerContext } from "@siujs/core";
import { startSpinner } from "@siujs/utils";

import { PkgDocOption } from "./define";
import { gen as genREADME } from "./readme/gen";
import { extendComponentData } from "./vetur/types";

export async function onDocGenerationStart(ctx: HookHandlerContext) {
	ctx.scopedKeys("startTime", Date.now());

	ctx.scopedKeys(
		"spinner",
		startSpinner(chalk.greenBright(`Generating docs of \`${chalk.bold(ctx.pkg().name)}\` package... `))
	);
}

export async function onDocGenerationProc(ctx: HookHandlerContext) {
	const pkgData = ctx.pkg();

	const opts = ctx.opts<PkgDocOption>();

	const compData = await extendComponentData(pkgData, opts);

	const veturPath = path.resolve(pkgData.path, "./vetur");

	const exists = await fs.pathExists(veturPath);

	!exists && (await fs.mkdir(veturPath));

	await Promise.all([
		fs.writeJSON(path.resolve(veturPath, "tags.json"), compData.tags, { spaces: 2 }),
		fs.writeJSON(path.resolve(veturPath, "attributes.json"), compData.attributes, { spaces: 2 }),
		genREADME(pkgData, compData, opts)
	]);
}

export async function onDocGenerationComplete(ctx: HookHandlerContext) {
	ctx.scopedKeys<any>("spinner")?.stop();
	console.log(chalk.green(`Generated docs of ${ctx.pkg().dirName}!`));
}

export async function onDocGenerationError(ctx: HookHandlerContext) {
	const pkgData = ctx.pkg();
	sh.rm("-rf", path.resolve(pkgData.path, "./vetur"));
	console.log(chalk.red(ctx.ex()));
}
