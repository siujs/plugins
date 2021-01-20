import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ms from "pretty-ms";

import {
	esbuildRollupPlugin,
	generateDTSWithTSC,
	SiuRollupBuilder,
	SiuRollupConfig,
	stopEsBuildService,
	TOutputFormatKey
} from "@siujs/builtin-build";
import { HookHandlerContext } from "@siujs/core";

type TransformConfigHook = (config: SiuRollupConfig, format: TOutputFormatKey) => void | Promise<void>;

export async function onBuildStart(ctx: HookHandlerContext) {
	ctx.scopedKeys("startTime", Date.now());

	await fs.remove(path.resolve(ctx.pkg().path, "./dist"));
}

export async function onBuildProc(ctx: HookHandlerContext) {
	const customTransform = ctx.opts<TransformConfigHook>("transformConfig");

	const pkgData = ctx.pkg();

	const builder = new SiuRollupBuilder(pkgData, {
		async onConfigTransform(config: SiuRollupConfig, format: TOutputFormatKey) {
			config.plugin("esbuild").use(esbuildRollupPlugin());

			// eslint-disable-next-line @typescript-eslint/no-var-requires
			config.plugin("babel").use(require("@rollup/plugin-babel").default, [
				{
					extensions: [".mjs", ".cjs", ".js", ".es", ".es6"],
					include: ["packages/**/*"],
					/**
					 * babelHelpers: 'bundled' option was used by default.
					 * It is recommended to configure this option explicitly,
					 * read more here: https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
					 */
					babelHelpers: "bundled",
					// 自动读取目标项目的.babelrc文件配置
					root: pkgData.root
				}
			]);

			config.treeshake({
				moduleSideEffects: true
			});

			if (customTransform) {
				await customTransform(config, format);
			}
		},
		/* istanbul ignore next */
		onBuildError(ex: Error) {
			throw ex;
		}
	});

	const format = ctx.opts<string>("format", "es,cjs,umd,umd-min").split(",") as TOutputFormatKey[];

	const customFormats = (pkgData.meta?.buildFormats ?? []) as TOutputFormatKey[];

	await builder.build({
		allowFormats: customFormats.length ? customFormats.filter(x => format.includes(x)) : format
	});

	console.log();

	/* istanbul ignore next */
	ctx.opts<boolean>("dts") && (await generateDTSWithTSC(pkgData));
}

export async function onBuildComplete(ctx: HookHandlerContext) {
	console.log();
	console.log(
		chalk.green(
			`✔ Builded ${chalk.bold(ctx.pkg().name)} in ${chalk.bold(ms(Date.now() - ctx.scopedKeys<number>("startTime")))}!`
		)
	);
}

export async function onBuildClean(ctx: HookHandlerContext) {
	/**
	 * 关闭esbuild的servie
	 *
	 *  note: 放在clean周期而不是放在buildComplete或者Builder.finished这几个地方主要是为了当前项目全程保持esbuild service进程一直存在,可以缩短项目编译时间
	 */
	stopEsBuildService();

	const pkgData = ctx.pkg();

	await Promise.all([
		fs.remove(path.resolve(pkgData.path, "./dts_dist")),
		fs.remove(path.resolve(pkgData.path, "./temp")),
		fs.remove(path.resolve(pkgData.path, "./tsconfig.tsbuildinfo"))
	]);
}
