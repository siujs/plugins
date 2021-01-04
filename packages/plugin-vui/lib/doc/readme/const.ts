export const DEFAULT_PROPS_HEADER = "Attribute|Description|Type|Default|Options".split("|");
export const DEFAULT_SLOTS_HEADER = "Name|Description|Data".split("|");

export const README_TPL = `# __PKG_NAME__

## Introduction

__PKG_DESP__

## Install

\`\`\`js
import { createApp } from "vue";
import __PKG_UMDNAME__ from "__PKG_NAME__";
const app = createApp();
app.use(__PKG_UMDNAME__);
\`\`\`

## Usage

## Api

### Props

| Attribute | Description | Type | Default | Options |
| --- | --- | --- | --- | --- |
|     |     |     |     |     |

### Slots

| Name | Description | Data |
| ---  | ----------- | ---- |
|      |           	 |      | 

### Events

| Event | Description | Arguments |
| ----- | ----- | ----- |
|       | 			|				|
`;
