// Локализация строк интерфейса. Содержит переводы EN и RU.
// Locals.get() возвращает нужный объект строк по языку Obsidian (localStorage.language).
const EN = {
	command: {
	},
	setting: {
		entries: {
			hide: {
				tableInactive: "Hide in property table",
				tableActive: "Always hide in property table",
				fileProperties: "Hide in file properties (side dock)",
				allProperties: "Hide in all properties (side dock)",
			},
			toggle: "Toggle",
			addEntryToHide: "Add metadata property entry to hide",
		},
		autoFold: {
			name: "Auto fold metadata properties table",
			desc: "Auto fold when opening a note."
		},
		headings: {
			hide: "Hide metadata properties",
		},
	}

}

const RU = {
	command: {
	},
	setting: {
		entries: {
			hide: {
				tableInactive: "Скрыть в таблице свойств",
				tableActive: "Всегда скрывать в таблице свойств",
				fileProperties: "Скрыть в свойствах файла (боковая панель)",
				allProperties: "Скрыть во всех свойствах (боковая панель)",
			},
			toggle: "Переключатель",
			addEntryToHide: "Добавить свойство метаданных для скрытия",
		},
		autoFold: {
			name: "Автосворачивание таблицы свойств",
			desc: "Автоматически сворачивать при открытии заметки."
		},
		headings: {
			hide: "Скрыть свойства метаданных",
		},
	}
}


export class Locals {
	static get() {
		const lang = window.localStorage.getItem("language");
		switch (lang?.toLowerCase()) {
			case "ru":
				return RU;
			default:
				return EN;
		}
	}
}
