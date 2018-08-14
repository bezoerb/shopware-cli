Tasks
=====
Here's a small overview on the available gulp task which are utilized by the npm scripts mentioned in the main readme.


## exec 
Tasks which interact with shopware. Mostly utilizing shopware console commands

### sw:host
Set shopware host for a specific shop id. This command interacts with the database directly because the console command sets the host for all shops.

```gulp sw:host --shop 1 --host localhost```

### sw:config
Dumps the theme configuration into json files by calling the console command `sw:theme:dump:configuration`

### sw:compile
Generates theme caches. Compiles JS & LESS files via `sw:theme:cache:generate`

### sw:cl
Clear cache (use --env [node|dev|prod] for specific environment)

## images

### svgstore
Optimizes svg images located in **frontend/_public/src/img/icons** and create an svg sprite.<br/>
Include the icons with the approprieate smarty helpers 

* `{svg id=...}` _inline svg_
* `{icon id=...}` _reference &lt;use xlink:href=...&gt;_

### imagemin
Optimizes images and stores the optimized versions in **frontend/_resources/img/**<br/>
The optimized images will automatically be picked up by the `{img src=...}` smarty helper if you use paths relative to **frontend/_public/src/img/**  

## optimization

### optimization:critical
Generates critical css for pages listed in **[host]/sitemap.xml**. You can limit the checked pages by changing the `URL_REGEX` variable. The regular expression defaults to `/^(https?:\/\/[^/]+)?\/(([^/]+)\/){0,2}$/igm` which will take all pages within 2 subdirectories. 

* [host]/category/product/ -> **IN**
* [host]/category/subcategory/product/ -> **SKIPPED**

The critical css is stored in **frontend/_public/src/css/critical**. It will automatically be picked up if you use the `{critical stylesheets=$lessFiles}` smarty helper to include the stylesheets. See [Theme documentation](./theme.md) for more details on the smarty helper.

It is recommended to use run critical against the live data by specifying the live domain as proxy `gulp optimization:critical 

## psi
Runs PageSpeed Insights through a secure ngrok tunnel. The results are less meaningful as they represent the local dev environment.

### psi:desktop
Runs PageSpeed Insights for desktop

### psi:mobile
Runs PageSpeed Insights for mobile

## rev
Hash asset filenames based on content and create app/config/rev-manifest.json. The hased files are picked up by the `{img src=...}` smarty helper based on the info found in the manifest.json. The hashed filenames are required to increase cache times for assets which is essential for loading performance.

## scripts
Compiles ES2016 javascript files with webpack/babel and stores the compiled script in **frontend/_resources/js/main.js**<br/>
This file needs to be listed in the theme.php javascripts section to be picked up by the shopware theme compiler:

```
protected $javascript = [
    '../_resources/js/main.js',
];
```

## server
The server script exports the serve task as well as the `runServer` method which is used start a server for specific tasks like pagespeed insights, critical or the backstopjs regression tests.

### serve
Run dev server and watch files

## service-worker
Add offline support 

### generate-service-worker
Creates the service worker utilizing [workbox](https://developers.google.com/web/tools/workbox/)

## styles
The styles task is only used for development to compile the theme less files and autoinject them via browsersync so we don't need to compile the theme everytime we change styles

## tests
Run visual regression tests with [BackstopJS](https://garris.github.io/BackstopJS/)<br/>
One default szenario for the homepage is included. Add more scenarios by editing the `backstop.json` file in **THEME/tests/**

```
{
  "scenarios": [
    {
      "label": "My Scenario",
      "cookiePath": "cookies.json",
      "url": " ... ",
      "referenceUrl": "",
      "readyEvent": "",
      "readySelector": "",
      "delay": 500,
      "hideSelectors": [],
      "removeSelectors": [],
      "hoverSelector": "",
      "clickSelector": "",
      "postInteractionWait": "",
      "selectors": ["SELECTORS TO CHECK"],
      "selectorExpansion": true,
      "misMatchThreshold" : 0.1,
      "requireSameDimensions": true
    },
    ...
  ]
}
```

### regression:test
Runs regression tests

### regression:reference
Generate reference files to test against

### regression:approve
Approve tests - latest test results are the new reference

### jest
[Jest](https://jestjs.io/) is configured directly in the package.json for frontend unit tests (No gulp task needed).   
All test files (`*.test.js`) in **THEME/tests/** are automatically picked up.
