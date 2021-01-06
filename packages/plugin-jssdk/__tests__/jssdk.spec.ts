import { Option } from "commander";
import fs from "fs";
import path from "path";
import sh from "shelljs";

import { loadPlugins, testPlugin } from "@siujs/core";

import fallbackApi from "../lib/index";

type PromiseResolvedResult<T> = T extends (...args: any[]) => Promise<infer P> ? P : never;

let siuPluginCore: PromiseResolvedResult<typeof loadPlugins>;

const packagesRoot = path.resolve(__dirname, "./packages");

jest.mock("console");

beforeAll(async done => {
	siuPluginCore = await loadPlugins(fallbackApi);

	process.chdir(__dirname);

	fs.writeFileSync(
		path.resolve(__dirname, "package.json"),
		`{
		"name": "vui.spec",
		"siu":{}
	}`
	);

	sh.mkdir(packagesRoot);
	sh.mkdir(path.resolve(packagesRoot, "test"));

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

test(" build.start ", async done => {
	const ctx = await testPlugin("build", "start", "test");

	expect(!!ctx.scopedKeys("startTime")).toBe(true);

	done();
});

test(" build.complete ", async done => {
	const spy = jest.spyOn(console, "log").mockImplementation();

	await testPlugin("build", "complete", "test");

	expect(spy).toHaveBeenCalledTimes(1);

	spy.mockRestore();

	done();
});

test(" build.process ", async done => {
	const pkgRoot = path.resolve(packagesRoot, "test");

	sh.mkdir(path.resolve(pkgRoot, "lib"));
	fs.writeFileSync(path.resolve(pkgRoot, "lib/index.ts"), `export const a = "a";`);

	await testPlugin("build", "process", "test");

	await testPlugin("build", "error");

	await testPlugin("build", "clean", "test");

	const outputFileUmd = path.resolve(pkgRoot, "dist/test.js");
	const outputFileES = path.resolve(pkgRoot, "dist/test.mjs");
	const outputFileCJS = path.resolve(pkgRoot, "dist/test.cjs");
	expect(fs.existsSync(outputFileUmd)).toBe(true);
	expect(fs.existsSync(outputFileES)).toBe(true);
	expect(fs.existsSync(outputFileCJS)).toBe(true);

	expect(fs.readFileSync(outputFileES).toString()).toBe(`const a = "a";

export { a };
`);
	expect(fs.readFileSync(outputFileCJS).toString()).toBe(`'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const a = "a";

exports.a = a;
`);

	const umdStr = fs.readFileSync(outputFileUmd).toString();

	expect(!!~umdStr.indexOf("(function (global, factory) {")).toBe(true);
	expect(!!~umdStr.indexOf("global.Test = {}")).toBe(true);

	done();
});

afterAll(() => {
	fs.unlinkSync(path.resolve(__dirname, "package.json"));

	sh.rm("-rf", packagesRoot);
});
