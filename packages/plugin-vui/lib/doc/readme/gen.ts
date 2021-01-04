import fs from "fs-extra";
import get from "lodash.get";
import merge from "lodash.merge";
import marked, { Tokens } from "marked";
import path from "path";

import { camelize, PkgData } from "@siujs/utils";

import { ComponentData, ComponentPropItem, PkgComponentData, PkgDocOption, SlotsItem } from "../define";
import { DEFAULT_PROPS_HEADER, DEFAULT_SLOTS_HEADER, README_TPL } from "./const";

function transformComponentData(vueTypes: ComponentData, pkgUmdName: string) {
	const tag = vueTypes.tags[pkgUmdName];

	const attrPrefix = pkgUmdName + "/";

	const props = Object.keys(vueTypes.attributes)
		.filter(p => p.startsWith(attrPrefix))
		.reduce((prev, cur) => {
			const propName = cur.replace(attrPrefix, "");
			prev[propName] = vueTypes.attributes[cur];
			return prev;
		}, {} as Record<string, Partial<ComponentPropItem>>);

	return { tag, props };
}

function genTableHeaderRaw(header: string[]) {
	return "| " + header.join(" | ") + " |\n" + header.reduce(prev => prev + " --- |", "|") + "\n";
}

function genSlotsRaw(compData: PkgComponentData, locale: string) {
	const descKey = locale === "zh-CN" ? "cn" : "en";

	const slots = compData.tag.slots || {};

	const keys = Object.keys(slots);

	if (!keys || !keys.length) {
		return `| | |`;
	}

	return (
		keys.reduce((prev, cur) => {
			const item = slots[cur] as SlotsItem;
			return (
				prev +
				`| ${cur} | ${item[descKey]} | ${
					item.data ? `${item.data.type} \`${item.data.key}\` - ${item.data.desc}` : ""
				} |\n`
			);
		}, "") + "\n"
	);
}

function genPropsRaw(compData: PkgComponentData, locale: string) {
	const propNames = compData.tag.attributes;

	if (!propNames || !propNames.length) {
		return `| | | | | |`;
	}

	return (
		propNames.reduce((prev, cur) => {
			const item = compData.props[cur];

			const desc = get(item, `locales.${locale}.description`, item.description);

			return (
				prev +
				`| ${cur}${item.version ? ` \`${item.version}\`` : ""} | ${desc} | _${item.optionType.replace(
					/\|/g,
					"\\|"
				)}_ | ${item.default ? "`" + item.default + "`" : "-"} | ${
					item.options && item.options.length ? item.options.map((it: string) => "`" + it + "`").join(",") : "-"
				} |\n`
			);
		}, "") + "\n"
	);
}

function genUsageRaw(compData: PkgComponentData, locale: string) {
	const props = compData.props;

	return compData.tag.attributes.reduce((prev, cur, index) => {
		const propItem = props[cur];

		const name = get(propItem, `locales.${locale}.usageName`, cur);
		const desc = get(propItem, `locales.${locale}.usageDesc`, propItem.description);

		const usageCode = get(propItem, `locales.${locale}.usageCode`, propItem.usageCode) || "";

		return (
			prev +
			(index === 0 ? "" : "\n") +
			`### ${camelize(name, true)}
> ${desc}

\`\`\`html
${usageCode}
\`\`\`
`
		);
	}, "");
}

const DEFAULT_OPTS = {
	defaultLang: "en",
	i18n: {
		"zh-CN": {
			readme: {
				Introduction: "介绍",
				Install: "引入",
				Usage: "代码演示",
				Apis: "定义",
				Props: "属性",
				PropsHeader: "参数|说明|类型|默认值|可选值".split("|"),
				Events: "事件",
				Slots: "插槽",
				SlotsHeader: "名称|介绍|数据".split("|")
			}
		}
	}
};

/**
 *
 * Generate docs with component data
 *
 *
 *   fixed README.md If there is any custom added content, all items will be arranged backward
 *
 *   The fixed format is as follows:
 *
 *   ===
 *
 *   # __PKG_FULLNAME__
 *
 *   ## Introduction
 *
 *   Introcution Content in here
 *
 *   ## Install
 *
 *   ```html
 *   Install code in here
 *   ```
 *
 *   ## Usage
 *
 *   Usage Content in here
 *
 *   ## Apis
 *
 *   ### Props
 *
 *   Props content table in here
 *
 *   ### Slots
 *
 *   Slots content table in here
 *
 *   __USR_CUSTOM__
 *
 *   ===
 *
 * @param pkgData data of current package
 * @param componentData data of current vui package
 * @param opts options of current package docs generation
 */
export async function gen(pkgData: PkgData, componentData: ComponentData, opts: PkgDocOption) {
	opts = merge(DEFAULT_OPTS, opts);

	const compData = transformComponentData(componentData, pkgData.umdName);

	const locales = Object.keys(compData.tag.locales);

	if (!locales.includes("en")) locales.push("en");

	for (let l = locales.length; l--; ) {
		const locale = locales[l];

		const mdPath = path.resolve(pkgData.path, locale === opts.defaultLang ? "README.md" : `README.${locale}.md`);

		const exits = await fs.pathExists(mdPath);

		let mdContent = exits ? (await fs.readFile(mdPath)).toString() : README_TPL;

		const tokens = marked.lexer(mdContent);

		const slotsTokenText = get(opts.i18n, `${locale}.readme.Slots`, "Slots");

		const slotsIndex = tokens.findIndex(
			(p: Tokens.Heading) => p.type === "heading" && p.text === slotsTokenText && p.depth === 3
		);

		// not valid format
		if (!~slotsIndex) continue;

		mdContent = `# ${get(compData.tag, `locales.${locale}.name`, pkgData.umdName)}
		
## ${get(opts.i18n, `${locale}.readme.Introduction`, "Introduction")}

${get(compData.tag, `locales.${locale}.description`, compData.tag.description)}

## ${get(opts.i18n, `${locale}.readme.Install`, "Install")}

\`\`\`js
import { createApp } from "vue";
import ${pkgData.umdName} from "${pkgData.name}";
const app = createApp();
app.use(${pkgData.umdName});
\`\`\`

## ${get(opts.i18n, `${locale}.readme.Usage`, "Usage")}
${genUsageRaw(compData, locale)}

## ${get(opts.i18n, `${locale}.readme.Apis`, "Apis")}

### ${get(opts.i18n, `${locale}.readme.Props`, "Props")}

${
	genTableHeaderRaw(get(opts.i18n, `${locale}.readme.PropsHeader`, DEFAULT_PROPS_HEADER)) +
	genPropsRaw(compData, locale)
}

### ${slotsTokenText}

${
	genTableHeaderRaw(get(opts.i18n, `${locale}.readme.SlotsHeader`, DEFAULT_SLOTS_HEADER)) +
	genSlotsRaw(compData, locale)
}`;

		const customRaw = tokens.slice(slotsIndex + 2).reduce((prev, cur) => prev + cur.raw, "\n");

		await fs.writeFile(mdPath, mdContent + customRaw);
	}
}
