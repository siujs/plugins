import { Option } from "commander";
import fs from "fs";
import path from "path";
import sh from "shelljs";

import { loadPlugins } from "@siujs/core";

import fallbackApi from "../lib/index";

type PromiseResolvedResult<T> = T extends (...args: any[]) => Promise<infer P> ? P : never;

let siuPluginCore: PromiseResolvedResult<typeof loadPlugins>;

const packagesRoot = path.resolve(__dirname, "./packages");

beforeAll(async done => {
	siuPluginCore = await loadPlugins(fallbackApi);

	process.chdir(__dirname);

	fs.writeFileSync(
		path.resolve(__dirname, "package.json"),
		`{
		"name": "vui.spec"
	}`
	);

	sh.mkdir(packagesRoot);

	done();
});

test(" cli options ", async done => {
	const cliOptions = await siuPluginCore.resolveCLIOptions();

	expect(cliOptions).toHaveProperty("create");
	expect(cliOptions).toHaveProperty("build");

	let options = cliOptions.create.map(it => new Option(it.flags, it.description));
	expect(options.length).toBe(1);
	expect(options[0].long.replace("--", "").replace("no-", "")).toBe("install");
	expect(options[0].optional).toBe(false);
	expect(options[0].required).toBe(false);
	expect(options[0].long).toBe("--no-install");
	expect(options[0].short).toBe("-I");

	options = cliOptions.build.map(it => new Option(it.flags, it.description));
	expect(options.length).toBe(1);
	expect(options[0].long.replace("--", "").replace("no-", "")).toBe("dts");
	expect(options[0].optional).toBe(false);
	expect(options[0].required).toBe(false);
	expect(options[0].long).toBe("--no-dts");
	expect(options[0].short).toBe("-D");

	done();
});

test(" create package ", async done => {
	sh.mkdir(path.resolve(packagesRoot, "test2"));
	fs.writeFileSync(path.resolve(packagesRoot, "test2/package.json"), '{"name":"test2"}');

	await siuPluginCore
		.applyPlugins("create", {
			install: false,
			deps: "test2",
			pkg: "test"
		})
		.catch(ex => {
			console.log(ex);
		});

	const pkgPath = path.resolve(__dirname, "./packages/test");

	expect(fs.existsSync(pkgPath)).toBe(true);
	expect(fs.existsSync(path.resolve(pkgPath, "package.json"))).toBe(true);

	const meta = JSON.parse(fs.readFileSync(path.resolve(pkgPath, "package.json")).toString());

	expect(!!meta).toBe(true);
	expect(meta.name).toBe("test");
	expect(meta.main).toBe("dist/test.cjs");
	expect(meta.module).toBe("dist/test.mjs");
	expect(meta.unpkg).toBe("dist/test.js");

	expect(meta.dependencies).toHaveProperty("test2");
	expect(meta.dependencies.test2).toBe("file:../test2");

	done();
});

afterAll(() => {
	fs.unlinkSync(path.resolve(__dirname, "package.json"));

	sh.rm("-rf", packagesRoot);
});
