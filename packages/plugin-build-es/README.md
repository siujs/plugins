# `@siujs/plugin-build-es`

将包内指定目录的文件转成对应的 es 模块文件，便于在其他业务项目使用时配合打包工具来实现按需加载

## Scope

当前插件只针对`siu build`流程进行了扩展, 其他`siu`的操作指令不参与；

## How to use

```js
// in `siu.config.js` without options
module.exports = {
	plugins: ["@siujs/build-es"]
};

// in `siu.config.js` with options
module.exports = {
	plugins: [
		[
			"@siujs/build-es",
			{
				custom: {
					build: { sourceDir: "lib", destDir: "es" }
				}
			}
		]
	]
};

// in `siu.config.js` with options and excludePkgs
module.exports = {
	plugins: [
		[
			"@siujs/build-es",
			{
				// `packages/foo` and `packages/bar` 将不会参与到@siujs/plugin-build-es的处理流程中
				excludePkgs: ["foo", "bar"],
				custom: {
					build: { sourceDir: "lib", destDir: "es" }
				}
			}
		]
	]
};
```

最后形成的产物可以配合`babel-plugin-import`:

```json
{
    "plugins":
    [
      [
        "import",
        {
          "libraryName": "类库名称",
          "libraryDirectory": "es",
          "style": "css"
        }
      ]
    ]
  }
}
```
