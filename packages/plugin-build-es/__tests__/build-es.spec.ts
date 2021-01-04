import { Option } from "commander";
import fs from "fs";
import path from "path";

import { loadPlugins } from "@siujs/core";

import fallbackApi from "../lib/index";

type PromiseResolvedResult<T> = T extends (...args: any[]) => Promise<infer P> ? P : never;

let siuPluginCore: PromiseResolvedResult<typeof loadPlugins>;

beforeAll(async done => {
	siuPluginCore = await loadPlugins(fallbackApi);

	process.chdir(__dirname);

	fs.writeFileSync(
		path.resolve(__dirname, "package.json"),
		`{
		"name": "vui.spec"
	}`
	);

	done();
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

test(" build package ", async done => {
	done();
});

afterAll(() => {
	fs.unlinkSync(path.resolve(__dirname, "package.json"));
});
