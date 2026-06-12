# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm i              # install dependencies
npm run dev        # watch mode (dev build with inline sourcemaps)
npm run build      # production build (runs tsc type-check first, then esbuild)
npm run version    # bump version in manifest.json and versions.json
```

To test the plugin: copy `main.js`, `manifest.json`, and `styles.css` to `VaultFolder/.obsidian/plugins/metadata-hider/` and reload plugins in Obsidian.

## Architecture

This is a single-file Obsidian plugin. The entire plugin logic lives in `main.ts`; `src/i18n.ts` and `src/util.ts` are small helpers.

**Core mechanism — CSS injection:** The plugin works by dynamically injecting a `<style id="css-metadata-hider">` tag into the document `<head>`. `genAllCSS()` builds the full CSS string from current settings each time `updateCSS()` is called. There is no persistent CSS snippet file — the style tag is regenerated on every settings change (debounced 1 s) and on layout ready.

**Settings model (`MetadataHiderSettings`):**
- `entries: entrySettings[]` — the main per-property hide config. Each entry has four boolean flags (`tableInactive`, `tableActive`, `fileProperties`, `allProperties`) controlling where the property is hidden.
- `propertiesVisible` — comma-separated list of keys that are always shown (overrides hide-empty).
- `propertyHideAll` — a single property key; when its checkbox value is `true`, the entire metadata container is hidden.
- `autoFold`, `hideEmptyEntry`, `hideEmptyEntryInSideDock` — global behavioural toggles.

**Toggle semantics (enforced in the settings UI):**
- Toggle 1 (`tableInactive`): hide in properties table when unfocused.
- Toggle 2 (`tableActive`): always hide in properties table (even when focused). Enabling this forces toggle 1 on; disabling toggle 1 forces toggle 2 off.

**Focus tracking:** The plugin manually tracks metadata container focus via `focusin`/`focusout` DOM events, adding/removing `.is-active` on `.metadata-container`. This drives the CSS rule that reveals all properties when the user is editing them.

**All-properties side dock:** Hidden properties in the all-properties panel are handled differently — via DOM manipulation (`mh-hide` class on `.tree-item` nodes) in `hideInAllProperties()`, not CSS selectors, because the panel lacks `data-property-key` attributes.

**Settings migration:** `upgradeSettingsToVersion1()` runs on every load to convert the old flat string fields (`propertiesInvisible`, `propertiesInvisibleAlways`) to the `entries` array format.

**i18n:** `src/i18n.ts` provides EN/ZH strings. The settings UI also has several inline `{ en: ..., zh: ..., "zh-TW": ... }[lang]` lookups not covered by `Locals`.

**Release flow:** Tag a version with `make push tag=x.y.z`. The `npm run version` script keeps `manifest.json` and `versions.json` in sync.
