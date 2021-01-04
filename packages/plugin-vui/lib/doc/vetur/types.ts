import fs, { pathExists } from "fs-extra";
import path from "path";

import { tsquery } from "@phenomnomnominal/tsquery";
import { PkgData } from "@siujs/utils";

import { ComponentData, ComponentPropItem, PkgDocOption } from "../define";
import { getSlots } from "./slots";
import { getIntfMaps, trim } from "./utils";

export async function getComponentData(pkgData: PkgData) {
	const definePath = path.resolve(pkgData.path, "./types/index.d.ts");

	const exists = await pathExists(definePath);

	if (!exists) return void 0;

	const fileContent = (await fs.readFile(definePath)).toString();

	const ast = tsquery.ast(fileContent);

	const intfs = getIntfMaps(ast);

	const targetIntf = intfs[`${pkgData.umdName}Props`];

	if (!targetIntf) return void 0;

	const propNames = Object.keys(targetIntf.props);

	const kv = {
		tags: {
			[pkgData.umdName]: {
				description: pkgData.meta?.description ?? "",
				attributes: propNames,
				required: propNames.filter(p => targetIntf.props[p].required)
			}
		},
		attributes: propNames.reduce((prev, name) => {
			const propItem = targetIntf.props[name];

			if (typeof propItem.options === "string") {
				propItem.options = (propItem.options as string).split("|").map(trim);
			}

			prev[`${pkgData.umdName}/${name}`] = propItem;
			return prev;
		}, {} as Record<string, Partial<ComponentPropItem>>)
	} as ComponentData;

	return kv;
}

export async function extendComponentData(pkgData: PkgData, opt: PkgDocOption) {
	const [vueTypes, slotsMap] = await Promise.all([
		getComponentData(pkgData),
		getSlots(path.resolve(pkgData.path, "./lib/render/index.vue"))
	]);

	(opt.i18n ? Object.keys(opt.i18n) : []).reduce(
		(prev, locale) => {
			const pkgConfig = opt.i18n[locale].componentDatas;

			const { name, desc, props } = pkgConfig[pkgData.umdName] || pkgConfig[pkgData.dirName] || pkgConfig[pkgData.name];

			prev.locales[locale] = prev.locales[locale] || {};

			prev.locales[locale].name = trim(name || "");
			prev.locales[locale].description = trim(desc || "");

			Object.keys(props).forEach((propName: string) => {
				const item = vueTypes.attributes[pkgData.umdName + "/" + propName];

				item.locales = item.locales || {};

				item.locales[locale] = props[propName];
			});

			return prev;
		},
		{
			...vueTypes.tags[pkgData.umdName],
			slots: slotsMap,
			locales: {} as Record<string, any>
		}
	);

	return vueTypes;
}
