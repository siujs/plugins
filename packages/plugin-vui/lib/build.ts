/* eslint-disable @typescript-eslint/no-var-requires */
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ms from "pretty-ms";

import {
	asRollupPlugin,
	Config,
	generateDTSWithTSC,
	SiuRollupBuilder,
	stopService,
	TOutputFormatKey
} from "@siujs/builtin-build";
import { HookHandlerContext } from "@siujs/core";

import { PostCSSOptions, vueOptions } from "./const";

type TransformConfigHook = (config: Config, format: TOutputFormatKey) => void | Promise<void>;

export async function onBuildStart(ctx: HookHandlerContext) {
	ctx.scopedKeys("startTime", Date.now());

	await fs.remove(path.resolve(ctx.pkg().path, "./dist"));
}

export async function onBuildProc(ctx: HookHandlerContext) {
	const customTransform = ctx.opts<TransformConfigHook>("transformConfig");

	const pkgData = ctx.pkg();

	const isLibPkg = pkgData.meta?.["siu:vui:lib"];

	const builder = new SiuRollupBuilder(pkgData, {
		async onConfigTransform(config: Config, format: TOutputFormatKey) {
			config.external.add("vue");

			config.output(format).globals.set("vue", "Vue");

			config.plugin("esbuild").use(asRollupPlugin());

			config.plugin("babel").use(require("@rollup/plugin-babel").default, [
				{
					extensions: [".mjs", ".cjs", ".js", ".es", ".es6"],
					include: ["packages/**/*"],
					// 自动去读取目标项目的.babelrc文件配置
					root: pkgData.root
				}
			]);

			if (!isLibPkg) {
				const postcssPlugins = [
					require("autoprefixer")({
						overrideBrowserslist: process.env.__BROWSERS__
					}),
					require("postcss-sorting")(PostCSSOptions)
				];

				config.plugin("vue").use(require("rollup-plugin-vue"), [
					{
						...vueOptions,
						postcssPlugins
					}
				]);

				config.plugin("postcss").use(require("rollup-plugin-postcss"), [
					{
						extract: `${pkgData.path}/dist/${pkgData.dirName}.css`,
						plugins: postcssPlugins
					}
				]);

				if (format === "umd-min") {
					const cssnano = require("cssnano");

					config.plugin("postcss").tap((opts: any[]) => {
						opts[0].plugins.push(cssnano());
						return opts;
					});
				}
			}

			if (customTransform) {
				await customTransform(config, format);
			}
		},
		onBuildError(ex: Error) {
			throw ex;
		}
	});

	const format = ctx.opts<string>("format");

	await builder.build(
		format && {
			allowFormats: format.split(",") as TOutputFormatKey[]
		}
	);

	console.log();

	isLibPkg && (await generateDTSWithTSC(pkgData));
}

export async function onBuildComplete(ctx: HookHandlerContext) {
	console.log(
		chalk.green(
			`\n✔ Builded ${chalk.bold(ctx.pkg().name)} in ${chalk.bold(
				ms(Date.now() - ctx.scopedKeys<number>("startTime"))
			)}!`
		)
	);
}

export async function onBuildError(ctx: HookHandlerContext) {
	console.log(chalk.redBright(ctx.ex()));
}

export async function onBuildClean(ctx: HookHandlerContext) {
	/**
	 * 关闭esbuild的servie
	 *
	 *  note: 放在clean周期而不是放在buildComplete或者Builder.finished这几个地方主要是为了当前项目全程保持esbuild service进程一直存在,可以缩短项目编译时间
	 */
	stopService();

	const pkgData = ctx.pkg();

	await Promise.all([
		fs.remove(path.resolve(pkgData.path, "./dts_dist")),
		fs.remove(path.resolve(pkgData.path, "./temp")),
		fs.remove(path.resolve(pkgData.path, "./tsconfig.tsbuildinfo"))
	]);
}
