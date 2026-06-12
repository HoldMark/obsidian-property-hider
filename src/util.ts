// Вспомогательные утилиты. string2list преобразует строку с запятыми в очищенный массив строк.
export function string2list(properties: string): string[] {
	return properties.replace(/\n|^\s*,|,\s*$/g, "").replace(/,,+/g, ",").split(",").map(p => p.trim());
}
