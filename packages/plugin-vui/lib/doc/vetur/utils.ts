import ts from "typescript";

import { tsquery } from "@phenomnomnominal/tsquery";

import { VueInterfaces } from "../define";

const SELECTOR_INTERFACE = tsquery.parse("InterfaceDeclaration > Identifier");

const SELECTOR_INTERFACE_PROPS = tsquery.parse("InterfaceDeclaration > PropertySignature > Identifier");

const SELECTOR_DOCTAG = tsquery.parse("JSDocTag > Identifier");

const SELECTOR_TYPE_ALIAS = tsquery.parse("TypeAliasDeclaration > Identifier");

export function trim(input: string) {
	return input.replace(/^\s*|\s*$/, "");
}

/**
 *
 * find all interface define
 *
 * @param ast source file ast
 */
export function getIntfMaps(ast: ts.SourceFile) {
	const nodes = tsquery.match(ast, SELECTOR_INTERFACE);

	const intfKV = nodes.reduce((prev, cur) => {
		prev[cur.getText()] = {
			props: {}
		};
		return prev;
	}, {} as VueInterfaces);

	const propsNodes = tsquery.match(ast, SELECTOR_INTERFACE_PROPS);

	propsNodes.forEach(node => {
		const intfName = findIntfOfProp(node);

		if (!intfName) return;

		intfKV[intfName].props[node.getText()] = {
			optionType: getTypeNameOfProp(node),
			required: isRequiredProp(node),
			...getCommentOfProp(node)
		};
	});

	return intfKV;
}

/**
 *
 * Find interface name of current `PropertySignature>Identifier` node
 *
 * @param node PropertySignature>Identifier node
 */
export function findIntfOfProp(node: ts.Node) {
	const nodes = node.parent.parent.getChildren();

	const index = nodes.findIndex(node => node.getText() === "interface");

	return index > -1 ? nodes[index + 1].getText() : "";
}

/**
 *
 * Find type name of current `PropertySignature>Identifier` node
 *
 * @param node PropertySignature>Identifier node
 */
export function getTypeNameOfProp(node: ts.Node) {
	const nodes = node.parent.getChildren();

	const index = nodes.findIndex(node => node.getText() === ":");

	return index > -1 ? nodes[index + 1].getText() : "";
}

/**
 *
 * Whether current prop is required
 *
 * @param node PropertySignature>Identifier node
 */
export function isRequiredProp(node: ts.Node) {
	const nodes = node.parent.getChildren();
	return !~nodes.findIndex(node => node.getText() === "?");
}

/**
 *
 * Get JSDoc comments of prop
 *
 * @param node PropertySignature>Identifier node
 */
export function getCommentOfProp(node: ts.Node) {
	const jsDocNodes = (node.parent as any).jsDoc as ts.Node[];

	const targetNode = jsDocNodes[jsDocNodes.length - 1];

	const nodes = tsquery.match(targetNode, SELECTOR_DOCTAG);

	return nodes.reduce(
		(prev, cur) => {
			prev[cur.getText()] = trim((cur.parent as any).comment);
			return prev;
		},
		{
			description: trim((targetNode as any).comment || "")
		} as Record<string, any>
	);
}

export function getAllTypeAlias(ast: ts.SourceFile) {
	const nodes = tsquery.match(ast, SELECTOR_TYPE_ALIAS);

	return nodes.reduce((prev, node) => {
		const tokens = node.parent.getChildren();

		const index = tokens.findIndex(t => t.getText() === "=");

		if (~index) {
			prev[node.getText()] = tokens[index + 1].getText();
		}
		return prev;
	}, {} as Record<string, any>);
}
