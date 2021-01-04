import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const pkgDirs = fs.readdirSync(path.resolve(process.cwd(), "./packages"));

let specifiedPkgNames = "";
if (process.argv.length >= 2) {
	const mdus = process.argv[2];
	specifiedPkgNames =
		!mdus || mdus === "*"
			? "*"
			: mdus
					.split(",")
					.filter(p => pkgDirs.includes("plugin-" + p))
					.join(",");
}

execSync(`cross-env UT_MDU=${specifiedPkgNames.replace(/^\s*|\s*$/, "")} jest --coverage --color=always`);
