import { CLIOptionHandlerParams, PluginApi } from "@siujs/core";

import { onBuildClean, onBuildComplete, onBuildError, onBuildProc, onBuildStart } from "./build";
import { onCreateComplete, onCreateError, onCreateProc, onCreateStart } from "./create";
import { onDocGenerationComplete, onDocGenerationError, onDocGenerationProc, onDocGenerationStart } from "./doc";

export default (api: PluginApi) => {
	api.create.cli((option: CLIOptionHandlerParams) => {
		option("-I, --no-install", "You do not want run npm/yarn install");
		option(
			"-t, --type <type>",
			"Package type: lib or ui, default: ui",
			"ui"
		)({
			questions: {
				type: "list",
				name: "type",
				message: "Select package type:",
				choices: ["ui", "lib"]
			}
		});
	});

	api.create.start(onCreateStart);
	api.create.process(onCreateProc);
	api.create.complete(onCreateComplete);
	api.create.error(onCreateError);

	api.build.start(onBuildStart);
	api.build.process(onBuildProc);
	api.build.complete(onBuildComplete);
	api.build.error(onBuildError);
	api.build.clean(onBuildClean);

	api.doc.start(onDocGenerationStart);
	api.doc.process(onDocGenerationProc);
	api.doc.complete(onDocGenerationComplete);
	api.build.error(onDocGenerationError);
};
