import { Option } from "commander";
import path from "path";
import sh from "shelljs";

import { loadPlugins } from "@siujs/core";

import fallbackApi from "../lib/index";

type PromiseResolvedResult<T> = T extends (...args: any[]) => Promise<infer P> ? P : never;

let siuPluginCore: PromiseResolvedResult<typeof loadPlugins>;

const packagesRoot = path.resolve(process.cwd(), "packages");

beforeAll(async done => {
	siuPluginCore = await loadPlugins(fallbackApi);

	// await siuPluginCore
	// 	.applyPlugins("create", {
	// 		install: false,
	// 		pkg: "vui"
	// 	})
	// 	.catch(ex => {
	// 		console.log(ex);
	// 	});

	done();
});

afterAll(() => {
	sh.rm("-rf", path.resolve(packagesRoot, "vui"));
});

test(" cli options ", async done => {
	const cliOptions = await siuPluginCore.resolveCLIOptions();

	expect(cliOptions).toHaveProperty("create");

	const options = cliOptions.create.map(it => new Option(it.flags, it.description));

	expect(options.length).toBe(2);

	expect(options[0].long.replace("--", "").replace("no-", "")).toBe("install");
	expect(options[1].long.replace("--", "").replace("no-", "")).toBe("type");
	expect(options[0].optional).toBe(false);
	expect(options[0].required).toBe(false);

	expect(options[1].optional).toBe(false);
	expect(options[1].required).toBe(true);

	expect(options[0].long).toBe("--no-install");
	expect(options[0].short).toBe("-I");

	done();
});
