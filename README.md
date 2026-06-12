# Property Hider

Obsidian plugin for hiding metadata properties.

## Features

- Hide a metadata property if its value is empty.
- Keep specific properties always visible even when empty.
- Hide specific properties always — in the properties table, file properties panel, or all-properties panel.
- Show all properties when editing, except those set to always hidden.

## Usage

Open **Settings → Community Plugins → Property Hider** and configure which properties to hide or always show.

## Install

### Manually

- Download the latest release from [Releases](https://github.com/HoldMark/obsidian-property-hider/releases/latest)
- Copy `main.js`, `manifest.json`, `styles.css` to `VaultFolder/.obsidian/plugins/property-hider/`
- Reload plugins in Community Plugins and enable **Property Hider**

### Via [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)

- Install the BRAT plugin
- In BRAT settings, click **Add Beta plugin**
- Enter `https://github.com/HoldMark/obsidian-property-hider`
- Enable **Property Hider** in Community Plugins

## Build

```bash
git clone https://github.com/HoldMark/obsidian-property-hider
npm i
npm run dev   # watch mode
npm run build # production build
```
