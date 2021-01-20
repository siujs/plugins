import { CLIOptionHandlerParams, PluginApi } from "@siujs/core";

import { onBuildClean, onBuildComplete, onBuildProc, onBuildStart } from "./build";
import { onCreationComplete, onCreationError, onCreationProc, onCreationStart } from "./create";

export default (api: PluginApi) => {
	api.create.cli((option: CLIOptionHandlerParams) => {
		option("-I, --no-install", "You do not want run npm/yarn install");
	});

	api.create.start(onCreationStart);
	api.create.process(onCreationProc);
	api.create.complete(onCreationComplete);
	api.create.error(onCreationError);

	api.build.cli((option: CLIOptionHandlerParams) => {
		option("-D, --no-dts", "Whether not build defineTypes file");
		option("-G, --no-gitee", "Whether not use gitee template-url", false);
	});

	api.build.start(onBuildStart);
	api.build.process(onBuildProc);
	api.build.complete(onBuildComplete);
	api.build.clean(onBuildClean);
};
