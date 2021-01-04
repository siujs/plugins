/**
 *
 * Get `slots` metas
 *
 * 		use `@vue/compiler-sfc` to parse the template content of Vue,
 *
 */

import fs from "fs-extra";

import { AttributeNode, BaseElementNode, NodeTypes, parse, TemplateChildNode } from "@vue/compiler-dom";

import { SlotsItem } from "../define";

/**
 *
 * Get `<slot ...>...</slot>` description map data from "${pkgData.path}/render/index.vue"
 *
 * @param vueFilePath file path of current package's `index.vue`
 */
export async function getSlots(vueFilePath: string) {
	const exists = await fs.pathExists(vueFilePath);

	if (!exists) return {};

	const vueContent = (await fs.readFile(vueFilePath)).toString();

	const asts = parse(vueContent);

	if (!asts) return {};

	const slots = {} as Record<string, SlotsItem>;

	findSlotTags(
		asts.children.filter((p: any) => p.tag === "template"),
		slots
	);

	if ("default" in slots && !slots.default) {
		slots.default = { cn: "自定义默认", en: "Custom default" };
	}

	return slots;
}

function findSlotTags(childs: TemplateChildNode[], slotsMap: Record<string, SlotsItem>) {
	for (let i = 0, l = childs.length; i < l; i++) {
		const item = childs[i] as BaseElementNode;

		if (item.tag !== "slot") {
			item.children && item.children.length && findSlotTags(item.children, slotsMap);
			continue;
		}
		let slotName = "default";
		if (item.props && item.props.length) {
			const namePropIndex = item.props.findIndex(p => p.name === "name");
			if (namePropIndex > -1) {
				slotName = (item.props[namePropIndex] as AttributeNode).value.content;
			}
		}

		let comments = "";
		if (i > 0) {
			// Judge prev-node is CommentNode
			const prevNode = childs[i - 1];
			comments = prevNode.type === NodeTypes.COMMENT ? prevNode.content : "";
		} else {
			comments = slotName === "default" ? "Default Slot" : "";
		}

		slotsMap[slotName] = transformComments(comments);
	}
}

function transformComments(comments: string) {
	const commentKV = {
		en: comments,
		cn: ""
	};

	const matches = comments.match(/(@cn|@en|@data)\s+(.+)/g);

	const map = matches.reduce((prev, cur) => {
		if (~cur.indexOf("@cn")) {
			prev.cn = cur.replace(/@cn\s+/g, "");
		}
		if (~cur.indexOf("@data")) {
			prev.data = /\s?\{(?<type>.+)\}\s+(?<key>.+)\s+(?<desc>.+)/gi.exec(cur.replace(/@data\s+/g, "")).groups as {
				key: string;
				type: string;
				desc: string;
			};
		}
		if (~cur.indexOf("@en")) {
			prev.en = cur.replace(/@en\s+/g, "");
		}
		return prev;
	}, {} as SlotsItem);

	if (!map.en) {
		map.en = matches.reduce((prev, cur) => {
			return prev.replace(cur, "");
		}, comments);
	}

	return {
		...commentKV,
		...map
	};
}
