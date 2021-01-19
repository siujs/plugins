import { Option } from "commander";
import fs from "fs";
import path from "path";
import sh from "shelljs";

import { loadPlugins, testPlugin } from "@siujs/core";

import fallbackApi from "../lib/index";

type PromiseResolvedResult<T> = T extends (...args: any[]) => Promise<infer P> ? P : never;

let siuPluginCore: PromiseResolvedResult<typeof loadPlugins>;

jest.mock("console");

let packagesRoot: string, backup: string;

beforeAll(async done => {
	packagesRoot = path.resolve(__dirname, "./packages");

	backup = process.cwd();

	process.chdir(__dirname);

	siuPluginCore = await loadPlugins(fallbackApi);

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

afterAll(() => {
	process.chdir(backup);
	fs.unlinkSync(path.resolve(__dirname, "package.json"));
	sh.rm("-rf", packagesRoot);
});

test(" cli options ", async done => {
	const cliOptions = await siuPluginCore.resolveCLIOptions();

	expect(cliOptions).toHaveProperty("build");

	const options = cliOptions.build.map(it => new Option(it.flags, it.description));

	expect(options.length).toBe(2);

	expect(options[0].long.replace("--", "").replace("no-", "")).toBe("source-dir");
	expect(options[1].long.replace("--", "").replace("no-", "")).toBe("dest-dir");
	expect(options[0].optional).toBe(true);
	expect(options[0].required).toBe(false);
	expect(options[1].optional).toBe(true);
	expect(options[1].required).toBe(false);

	expect(options[0].long).toBe("--source-dir");
	expect(options[0].short).toBe("-s");
	expect(options[1].long).toBe("--dest-dir");
	expect(options[1].short).toBe("-d");

	done();
});

test(" build.start ", async done => {
	const ctx = await testPlugin("build", "start", "test");

	expect(!!ctx.scopedKeys("startTime")).toBe(true);

	done();
});

test(" build.process ", async done => {
	const pkgRoot = path.resolve(packagesRoot, "test");

	sh.mkdir(path.resolve(pkgRoot, "lib"));

	fs.writeFileSync(
		path.resolve(pkgRoot, "lib/index.ts"),
		`import {a} from "../lib2";
	export const c = "a"+a;
	`
	);

	sh.mkdir(path.resolve(pkgRoot, "lib2"));
	fs.writeFileSync(
		path.resolve(pkgRoot, "lib2/index.ts"),
		`
	export const a = "c";
	`
	);

	await testPlugin("build", "process", "test");

	await testPlugin("build", "error");

	await testPlugin("build", "clean");

	const file = path.resolve(pkgRoot, "es/index.js");

	expect(fs.existsSync(file)).toBe(true);

	expect(fs.readFileSync(file).toString()).toBe(`const a = "c";

const c = "a" + a;

export { c };
`);

	done();
});

test(" build.complete ", async done => {
	const spy = jest.spyOn(console, "log").mockImplementation();

	await testPlugin("build", "complete", "test");

	expect(spy).toHaveBeenCalledTimes(1);

	spy.mockRestore();

	done();
});
