// Единственный файл с логикой плагина. Содержит класс плагина, настройки (MetadataHiderSettings),
// генерацию CSS (genAllCSS, updateCSS), отслеживание фокуса на контейнере метаданных,
// DOM-манипуляции для панели «All properties», миграцию старых настроек и весь UI настроек.
import { App, Notice, Plugin, PluginSettingTab, Setting, debounce, ButtonComponent, ToggleComponent } from 'obsidian';
import { Locals } from 'src/i18n';
import { string2list } from 'src/util'

interface entryHideSettings {
	tableInactive: boolean; // hide in .mod-root when .metadata-container is inactive
	tableActive: boolean;   // hide in .mod-root when .metadata-container is active
	fileProperties: boolean;
	allProperties: boolean;
}
interface entrySettings {
	name: string;
	hide: entryHideSettings;
}
interface MetadataHiderSettings {
	autoFold: boolean;
	hideEmptyEntry: boolean;
	hideEmptyEntryInSideDock: boolean;
	propertiesVisible: string;
	// propertiesInvisible: string;
	// propertiesInvisibleAlways: string;
	propertyHideAll: string;
	entries: entrySettings[];
}

const DEFAULT_SETTINGS: MetadataHiderSettings = {
	autoFold: false,
	hideEmptyEntry: true,
	hideEmptyEntryInSideDock: false,
	propertiesVisible: "",
	// propertiesInvisible: "",
	// propertiesInvisibleAlways: "",
	propertyHideAll: "hide",
	entries: [],
}



export default class MetadataHider extends Plugin {
	settings: MetadataHiderSettings;
	styleTag: HTMLStyleElement;

	isMetadataFocused: boolean;

	hideInAllProperties() {
		const metadataElement = document.querySelector('.workspace-leaf-content[data-type="all-properties"] .view-content');
		if (metadataElement == null) { return; }

		// let propertiesInvisible = string2list(this.settings.propertiesInvisible);
		let propertiesInvisible = this.settings.entries.filter(entry => entry.hide.allProperties).map(entry => entry.name);

		const items = metadataElement.querySelectorAll('.tree-item');
		items.forEach(item => {
			const inner = item.querySelector('.tree-item-inner');
			if (inner && inner.textContent && propertiesInvisible.includes(inner.textContent)) {
				item.classList.add('mh-hide');
			} else {
				item.classList.remove('mh-hide');
			}
		});
	}


	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MetadataHiderSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			setTimeout(() => { this.updateCSS(); }, 100);
		});

		this.app.workspace.on('active-leaf-change', (leaf) => {
			if (leaf && leaf.view.getViewType() == "all-properties") setTimeout(() => { this.hideInAllProperties(); }, 100);
		});

		this.registerDomEvent(document, 'focusin', (evt: MouseEvent) => {
			// console.log('focusin', evt);
			const target = evt.target;
			const metadataElement = document.querySelector('.workspace-leaf.mod-active .metadata-container');
			if (metadataElement === null) { return; }
			if (metadataElement?.contains(target as Node)) {
				// console.log(target)
				metadataElement.classList.add('is-active');
				this.isMetadataFocused = true;
				// @ts-ignore
				if (target?.classList?.contains("metadata-add-button")) {
					const clickEvent = new MouseEvent('click', {
						bubbles: true,
						cancelable: true,
						view: window
					});
					target.dispatchEvent(clickEvent);
				}
			} else if (this.isMetadataFocused) {
				this.isMetadataFocused = false;
				metadataElement.classList.remove('is-active');
			}
		});
		this.registerDomEvent(document, 'focusout', (evt: MouseEvent) => {
			// console.log('focusout', evt);
			const target = evt.target;
			const metadataElement = document.querySelector('.workspace-leaf.mod-active .metadata-container');
			if (metadataElement?.contains(target as Node)) {
				this.isMetadataFocused = false;
				setTimeout(() => {
					if (!this.isMetadataFocused) {
						metadataElement.classList.remove('is-active');
					}
				}, 100);
			}

		});

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (!this.settings.autoFold) { return; }
			const metadataElement = document.querySelector('.workspace-leaf.mod-active .metadata-container');
			if (!metadataElement?.classList.contains('is-collapsed')) {
				// @ts-ignore
				this.app.commands.executeCommandById(`editor:toggle-fold-properties`);
			}
		}));
	}

	onunload() {
		const parentElement = this.styleTag.parentElement;
		if (parentElement) {
			parentElement.removeChild(this.styleTag);
		} else {
			console.error('Parent element not found.');
		}
	}

	debounceUpdateCSS = debounce(this.updateCSS, 1000, true);
	updateCSS() {
		this.styleTag = document.createElement('style');
		this.styleTag.id = 'css-metadata-hider';
		// console.log(document.getElementsByTagName('head'))
		let headElement: HTMLElement = document.getElementsByTagName('head')[0];
		const existingStyleTag = headElement.querySelector('#' + this.styleTag.id) as HTMLStyleElement | null;

		if (existingStyleTag) {
			existingStyleTag.parentNode?.removeChild(existingStyleTag);
		}

		headElement.appendChild(this.styleTag);
		this.styleTag.innerText = genAllCSS(this);

		this.hideInAllProperties();
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.upgradeSettingsToVersion1();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	upgradeSettingsToVersion1() { // upgrade settings from version 0.x to 1.x
		if (this.settings.entries.length == 0 &&
			// @ts-ignore
			(this.settings.propertiesInvisible || this.settings.propertiesInvisibleAlways)) {
			// @ts-ignore
			const propertiesInvisible = string2list(this.settings.propertiesInvisible);
			// @ts-ignore
			const propertiesInvisibleAlways = string2list(this.settings.propertiesInvisibleAlways);
			const inter = propertiesInvisible.filter(x => propertiesInvisibleAlways.includes(x))
			const union = new Set([...propertiesInvisible, ...propertiesInvisibleAlways]);
			const diff1 = new Set([...union].filter(x => !propertiesInvisible.includes(x)));
			const diff2 = new Set([...union].filter(x => !propertiesInvisibleAlways.includes(x)));
			const entries: entrySettings[] = [];
			for (let key of inter) {
				entries.push({ name: key, hide: { tableInactive: true, tableActive: true } as unknown as entryHideSettings });
			}
			for (let key of diff1) {
				entries.push({ name: key, hide: { tableInactive: true, tableActive: true } as unknown as entryHideSettings });
			}
			for (let key of diff2) {
				entries.push({ name: key, hide: { tableInactive: true } as unknown as entryHideSettings });
			}
			this.settings.entries = entries;
			this.saveSettings();
		}
	}
}



function genCSS(properties: string[], cssPrefix: string, cssSuffix: string, parentSelector: string = ""): string {
	let body: string[] = [];
	parentSelector = parentSelector ? parentSelector + " " : "";
	for (let property of properties) {
		body.push(`${parentSelector}.metadata-container > .metadata-content > .metadata-properties > .metadata-property[data-property-key="${property.trim()}"]`);
	}
	const sep = " ";
	return cssPrefix + sep + body.join(',' + sep) + sep + cssSuffix + sep + sep;
}

function genAllCSS(plugin: MetadataHider): string {
	const s = plugin.settings;
	let content: string[] = [];
	if (s.hideEmptyEntry) {
		content = content.concat([
			// Show all metadata when it is focused
			`.metadata-container.is-active .metadata-property { display: flex !important; }`,
			/* * Hide the metadata that is empty */
			`.metadata-property:has(.metadata-property-value .mod-truncate:empty),`,
			`.metadata-property:has(.metadata-property-value input.metadata-input[type="number"]:placeholder-shown),`,
			`.metadata-property[data-property-type="text"]:has(input[type="date"]),`,
			`.metadata-property:has(.metadata-property-value .multi-select-container > .multi-select-input:first-child) {`,
			`	display: none;`,
			`}`,
		]);
	}


	if (!s.hideEmptyEntryInSideDock) {
		content.push(`.mod-sidedock .metadata-property { display: flex !important; }`,)
	}

	if (s.propertyHideAll.trim()) {
		content.push([
			`.metadata-container:has(.metadata-property[data-property-key="${s.propertyHideAll.trim()}"] input[type="checkbox"]:checked) {`,
			`  display: none;`,
			`}`,
			``,
		].join('\n'));
	}

	content.push(genCSS(
		plugin.settings.entries.filter((e: entrySettings) => e.hide.fileProperties).map(e => e.name),
		'/* * Invisible in file properties */',
		' { display: none !important; }',
		`.workspace-leaf-content[data-type="file-properties"] `
	))
	content.push(genCSS(
		plugin.settings.entries.filter((e: entrySettings) => e.hide.tableInactive || e.hide.tableActive).map(e => e.name),
		'/* * Invisible in properties table (in .mod-root) */',
		' { display: none; }'
	))
	content.push(genCSS(
		plugin.settings.entries.filter((e: entrySettings) => e.hide.tableActive).map(e => e.name),
		'/* * Always invisible in properties table (in .mod-root) */',
		' { display: none !important; }',
		".workspace-split:not(.mod-sidedock) "
	))

	content.push(genCSS(
		string2list(plugin.settings.propertiesVisible),
		'/* * Always visible */',
		' { display: flex; }'
	))

	return content.join(' ')
}

class MetadataHiderSettingTab extends PluginSettingTab {
	plugin: MetadataHider;
	// debouncedGenerate: Function;

	constructor(app: App, plugin: MetadataHider) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getLang(): string {
		let lang = window.localStorage.getItem('language');
		if (lang == null || ["en", "ru"].indexOf(lang) == -1) { lang = "en"; }
		return lang;
	}

	display(): void {
		const { containerEl } = this;
		const ts = Locals.get().setting;
		const lang = this.getLang();

		containerEl.empty();

		new Setting(containerEl)
			.setName(ts.autoFold.name)
			.setDesc(ts.autoFold.desc)// Specific path/tags are not supported yet.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoFold)
					.onChange(async (value) => {
						this.plugin.settings.autoFold = value;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					});
			});




		new Setting(containerEl)
			.setName({ en: "Metadata properties that keep displaying", ru: "Свойства метаданных, которые всегда отображаются" }[lang] as string)
			.setDesc({ en: "Metadata properties will always display even if their value are empty. Metadata property keys are separated by comma (`,`).", ru: "Свойства метаданных будут отображаться всегда, даже если их значение пустое. Ключи разделяются запятой (`,`)." }[lang] as string)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.propertiesVisible)
					.onChange(async (value) => {
						this.plugin.settings.propertiesVisible = value;
						await this.plugin.saveSettings();;
						this.plugin.debounceUpdateCSS();
					})
			);
		// new Setting(containerEl)
		// 	.setName({ en: "Metadata properties to hide", ru: "Свойства метаданных для скрытия" }[lang] as string)
		// 	.setDesc({ en: "Metadata properties will always hide even if their value are not empty, but will display when the metadata properties table is focused. Metadata property keys are separated by comma (`,`)", ru: "Свойства метаданных будут скрыты, даже если их значение не пустое, но отображаться при фокусе на таблице. Ключи разделяются запятой (`,`)" }[lang] as string)
		// 	.addTextArea((text) =>
		// 		text
		// 			.setValue(this.plugin.settings.propertiesInvisible)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.propertiesInvisible = value;
		// 				await this.plugin.saveSettings();
		// 				this.plugin.debounceUpdateCSS();
		// 			})
		// 	);




		// new Setting(containerEl)
		// 	.setName({ en: "Metadata properties always to hide", ru: "Свойства метаданных, которые всегда скрыты" }[lang] as string)
		// 	.setDesc({ en: "Metadata properties will always hide even if their value are not empty or the metadata properties table is focused. Metadata property keys are separated by comma (`,`)", ru: "Свойства метаданных будут скрыты всегда, даже если их значение не пустое или таблица в фокусе. Ключи разделяются запятой (`,`)" }[lang] as string)
		// 	.addTextArea((text) =>
		// 		text
		// 			.setValue(this.plugin.settings.propertiesInvisibleAlways)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.propertiesInvisibleAlways = value;
		// 				await this.plugin.saveSettings();
		// 				this.plugin.debounceUpdateCSS();
		// 			})
		// 	);


		containerEl.createEl("h3", { text: ts.headings.hide });

		new Setting(containerEl)
			.setName({ en: 'Hide empty metadata properties', ru: "Скрывать пустые свойства метаданных" }[lang] as string)
			.setDesc('')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hideEmptyEntry)
					.onChange(async (value) => {
						this.plugin.settings.hideEmptyEntry = value;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
						this.display();
					});
			});
		if (this.plugin.settings.hideEmptyEntry) {
			new Setting(containerEl)
				.setName({ en: 'Hide empty metadata properties also in side dock', ru: "Скрывать пустые свойства также в боковой панели" }[lang] as string)
				.setDesc('')
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.hideEmptyEntryInSideDock)
						.onChange(async (value) => {
							this.plugin.settings.hideEmptyEntryInSideDock = value;
							await this.plugin.saveSettings();
							this.plugin.debounceUpdateCSS();
						});
				});
		}
		new Setting(containerEl)
			.setName({ en: "Key to hide the whole metadata properties table", ru: "Ключ для скрытия всей таблицы свойств метаданных" }[lang] as string)
			.setDesc({ en: `when its value is true, the whole metadata properties table will be hidden`, ru: `когда его значение истинно, вся таблица свойств метаданных будет скрыта` }[lang] as string)
			.addText((cb) => {
				cb.setPlaceholder({ en: "entry name", ru: "имя свойства" }[lang] as string)
					.setValue(this.plugin.settings.propertyHideAll)
					.onChange(async (newValue) => {
						this.plugin.settings.propertyHideAll = newValue;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					});
			})


		let addEntryButton = new Setting(containerEl)
			.setName(ts.entries.addEntryToHide)
			// .setDesc(t.settingAddIconDesc)
			.addButton((button: ButtonComponent) => {
				button.setTooltip("Add new icon")
					.setButtonText("+")
					.setCta().onClick(async () => {
						if (this.plugin.settings.entries.filter(e => e.name === "").length > 0) {
							new Notice(`There is still unnamed entry!`);
							return;
						}
						this.plugin.settings.entries.push({
							name: "",
							hide: {
								tableInactive: true,
								tableActive: false,
								fileProperties: false,
								allProperties: false,
							}
						});
						await this.plugin.saveSettings();
						this.display();
					});
			})
		addEntryButton.descEl.append(
			createDiv({ text: `${ts.entries.toggle} 1: ${ts.entries.hide.tableInactive}` }),
			createDiv({ text: `${ts.entries.toggle} 2: ${ts.entries.hide.tableActive}` }),
			createDiv({ text: `${ts.entries.toggle} 3: ${ts.entries.hide.fileProperties}` }),
			createDiv({ text: `${ts.entries.toggle} 4: ${ts.entries.hide.allProperties}` }),
		)
		this.plugin.settings.entries.forEach((entrySetting, index) => {
			const s = new Setting(this.containerEl);
			s.setClass("metadata-hider-setting-entry");
			s.addText((cb) => {
				cb.setPlaceholder("entry name")
					.setValue(entrySetting.name)
					.onChange(async (newValue) => {
						this.plugin.settings.entries[index].name = newValue.trim();
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					});
			})

			let toggles: { [key: string]: ToggleComponent } = {};
			for (let key of ["tableInactive", "tableActive", "fileProperties", "allProperties"]) {
				s.addToggle((toggle) => {
					toggles[key] = toggle;
					toggle
						.setValue(this.plugin.settings.entries[index].hide[key as keyof entryHideSettings])
						// @ts-ignore
						.setTooltip(ts.entries.hide[key])
						.onChange(async (value) => {
							this.plugin.settings.entries[index].hide[key as keyof entryHideSettings] = value;

							if (key === "tableInactive" && value === false) {
								this.plugin.settings.entries[index].hide.tableActive = false;
								toggles["tableActive"].setValue(false);
							}

							if (key === "tableActive" && value === true) {
								this.plugin.settings.entries[index].hide.tableInactive = true;
								toggles["tableInactive"].setValue(true);
							}

							await this.plugin.saveSettings();
							this.plugin.debounceUpdateCSS();
						});
				});
			}
			s.addExtraButton((cb) => {
				cb.setIcon("cross")
					.setTooltip("Delete Entry")
					.onClick(async () => {
						this.plugin.settings.entries.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
						this.plugin.debounceUpdateCSS();
					});
			});

		});


		let noteEl = containerEl.createEl("p", {
			text: {
				en: `When the metadata properties table is focused, (i.e. inputting metadata properties), all metadata properties will be displayed, except metadata properties that are marked as "Always hide".`,
				ru: `Когда таблица свойств метаданных в фокусе (т.е. при вводе метаданных), все свойства метаданных будут отображаться, кроме тех, что помечены как «Всегда скрывать».`,
			}[lang] as string
		});
		noteEl.setAttribute("style", "color: gray; font-style: italic; margin-top: 30px;")
	}
}
