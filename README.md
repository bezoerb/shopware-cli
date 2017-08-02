# Shopware CLI

Convinienve CLI tool for shopware - **BETA**

## Features

* Install
```bash
$ shopware install
```

Install [shopware](https://github.com/shopware/shopware) with an opinionated folder structure for git projects.

```bash
├── plugins          # Plugins get symlinked to src/custom/plugins/...
├── plugins-legacy   # Legacy plugins get symlinked to src/engine/Shopware/Plugins/Local/...
│   ├── Backend
│   ├── Core
│   └── Frontend
├── src              # Shopware installation
└── themes
    └── Frontend     # Themes get symlinked to src/themes/Frontend/...
```
With this structure it's possible to keep shopware clean and out of your git repository


* Update

```bash
$ shopware update
```

Update submodule, plugins and theme and finally run migrations. Should be called after `git pull`

* Console

 ```bash
 $ shopware console command [options] [arguments]
 ```

Run shopware console commands from anywhere in the project.

* Official shopware CLI tools

 ```bash
 $ shopware phar command [options] [arguments]
 ```

Run the official [shopware CLI tools](https://github.com/shopwareLabs/sw-cli-tools) from anywhere in the project.