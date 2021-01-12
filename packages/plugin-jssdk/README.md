# `@siujs/plugin-jssdk`

专门针对`jssdk`这样类型的类库项目

## Scope

当前插件会扩展如下操作:

- `siu create`: 辅助`jssdk`类型项目的`packages/package`的创建，避免手动 copy 带来的一些问题；
- `siu build`: 辅助`jssdk`类型项目的`package`的构建流程

## Usage

```js
// in `siu.config.js` without options
module.exports = {
	plugins: ["@siujs/jssdk"]
};

// in `siu.config.js` with options
module.exports = {
	plugins: [
		[
			"@siujs/jssdk",
			{
				custom: {
					create: { install: true },
					build: {
						format: "es,cjs,umd,umd-min",
						dts: true,
						transformConfig(config) {
							config.treeshake({
								moduleSideEffects: true
							});
							config.plugin("esbuild").tap(args => {
								args[0].importeeAlias = id => {
									const parts = id.split(/[/\\]/);
									id = parts.shift();
									if (id.startsWith("@jsbridge")) {
										return path.resolve(__dirname, "./packages/", parts.join("/"));
									}
									return id;
								};
								return args;
							});
						}
					}
				}
			}
		]
	]
};

// in `siu.config.js` with options and excludePkgs
module.exports = {
	plugins: [
		[
			"@siujs/jssdk",
			{
				// `packages/foo` and `packages/bar` 将不会参与到@siujs/plugin-build-es的处理流程中
				excludePkgs: ["foo", "bar"],
				custom: {
					create: { install: true },
					build: {
						format: "es,cjs,umd,umd-min",
						dts: true,
						transformConfig(config) {
							config.treeshake({
								moduleSideEffects: true
							});
							config.plugin("esbuild").tap(args => {
								args[0].importeeAlias = id => {
									const parts = id.split(/[/\\]/);
									id = parts.shift();
									if (id.startsWith("@jsbridge")) {
										return path.resolve(__dirname, "./packages/", parts.join("/"));
									}
									return id;
								};
								return args;
							});
						}
					}
				}
			}
		]
	]
};
```
