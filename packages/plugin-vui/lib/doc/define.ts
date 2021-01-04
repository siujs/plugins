export interface ComponentTag {
	/**
	 * vue component description which in `pacjage.json`'s description
	 */
	description?: string;
	/**
	 * prop-name list of vue component
	 */
	attributes: string[];
	/**
	 * required prop-name list
	 */
	required?: string[];
	/**
	 * <slot ...>...</slot> info
	 */
	slots?: Record<string, any>;
	/**
	 * emits(...,...) info
	 */
	events?: Record<string, any>;
	/**
	 * i18n config
	 */
	locales?: Record<string, any>;

	[key: string]: any;
}

export interface ComponentData {
	tags: Record<string, ComponentTag>;
	attributes: Record<string, Partial<ComponentPropItem>>;
}

export interface ComponentPropItem {
	description: string;

	default: any;
	required: boolean;
	version: string;

	options: string[];
	optionType: string;
	optionTypeFrom: string;

	usageName: string;
	usageDesc: string;
	usageCode: string;

	locales?: Record<string, any>;

	[key: string]: any;
}

export interface VueInterfaces {
	[key: string]: {
		/**
		 * vue component prop-name list
		 */
		props: Record<string, Partial<ComponentPropItem>>;
	};
}

export interface SlotsItem {
	en: string;
	cn: string;
	data?: {
		key: string;
		type: string;
		desc: string;
	};
}

export interface PkgComponentData {
	tag: ComponentTag;
	props: Record<string, Partial<ComponentPropItem>>;
}

export interface PkgDocOption {
	/**
	 * Default lang, default: 'en'
	 */
	defaultLang?: string;

	i18n?: Record<
		string,
		{
			componentDatas: Record<
				string,
				{
					name?: string;
					desc?: string;
					props: Record<string, Pick<ComponentPropItem, "description" | "usageCode" | "usageDesc" | "usageName">>;
				}
			>;
		}
	>;

	[key: string]: any;
}
