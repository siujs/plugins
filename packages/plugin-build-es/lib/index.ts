import chalk from "chalk";
import fs from "fs-extra";
import glob from "glob";
import path from "path";
import ms from "pretty-ms";

import { asRollupPlugin, Config, SiuRollupBuilder, stopService, TOutputFormatKey } from "@siujs/builtin-build";
import { CLIOptionHandlerParams, HookHandlerContext, PluginApi } from "@siujs/core";

type TransformConfigHook = (config: Config, format: TOutputFormatKey) => void | Promise<void>;

export default (api: PluginApi) => {
	api.build.cli((option: CLIOptionHandlerParams) => {
		option("-s, --source-dir <sourceDir>", "Source directory", "lib");
		option("-d, --dest-dir <destDir>", "Builded destination directory", "es");
	});

	api.build.start(async (ctx: HookHandlerContext) => {
		const sourceDir = ctx.opts<string>("sourceDir");

		if (!sourceDir) {
			throw new Error(`ERROR: 'sourceDir' options can't be emtpy!`);
		}

		const destDir = ctx.opts<string>("destDir") || "es";

		ctx.scopedKeys("startTime", Date.now());

		await fs.remove(path.resolve(ctx.pkg().path, destDir));
	});

	api.build.process(async (ctx: HookHandlerContext) => {
		const pkgData = ctx.pkg();

		const sourceESDirPath = path.resolve(pkgData.path, ctx.opts<string>("sourceDir"));

		const destESDir = path.resolve(pkgData.path, ctx.opts<string>("destDir") || "es");

		const customTransform = ctx.opts<TransformConfigHook>("transformConfig");

		const bablePluginImportBuilder = new SiuRollupBuilder(pkgData, {
			onEachBuildStart(config: Config) {
				const outputs = config.toOutput();

				const input = sourceESDirPath + "/**/*.ts";

				console.log(
					chalk.cyan(
						`bundles ${chalk.bold(input)} → ${outputs
							.map(output => chalk.bold(output.file || path.resolve(output.dir, <string>output.entryFileNames)))
							.join(",")}`
					)
				);
			},
			async onConfigTransform(config: Config, format: TOutputFormatKey) {
				if (format !== "es") return;

				const sourceESDirFiles = glob.sync("**/*.ts", { cwd: sourceESDirPath }).reduce((prev, cur) => {
					prev[cur.replace(".ts", "")] = path.resolve(sourceESDirPath, cur);
					return prev;
				}, {} as Record<string, string>);

				config
					.input(sourceESDirFiles)
					.output(format)
					.format("es")
					.dir(destESDir)
					.entryFileNames("[name].js")
					.delete("file")
					.end()
					.plugin("esbuild")
					.use(asRollupPlugin());

				if (customTransform) {
					await customTransform(config, format);
				}
			}
		});

		await bablePluginImportBuilder.build({
			allowFormats: ["es"],
			sizeCalc: false
		});
	});

	api.build.complete((ctx: HookHandlerContext) => {
		console.log(
			chalk.green(
				`\n✔ Builded ${chalk.bold(ctx.pkg().name)} in ${chalk.bold(
					ms(Date.now() - ctx.scopedKeys<number>("startTime"))
				)}!`
			)
		);
	});

	api.build.error((ctx: HookHandlerContext) => {
		console.log(chalk.redBright(ctx.ex()));
	});

	api.build.clean(() => {
		stopService();
	});
};
