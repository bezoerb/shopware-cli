Theme
=====

How to use the tooling in your theme...

## Javascript
Shopware uses it's own basic javascript compressor which strips whitespace and concatenates all javscript files provided by Theme and plugins.
To allow modular Javascript development on the one hand and meeting the shopware requirements on the other hand, the theme javascript is bundled in separate files.
When developing with browsersync, all theme related javascript changes are hot swapped without the need to reload the page.

| File      | Description
| --------- | -----------
| swag.js   | Only used for development.<br/>It contains the concatenated scripts from tneme inheritance and plugins the same way as it will be combined by the shopware build process except the theme's main js file which is handled by webpack.
| vendor.js | This file includes jquery as well as some globally required shopware core javascript files like e.g. `jquery.plugin.base`<br>**This file is referenced directly in `index/index.tpl` as it needs to be loaded before all other scripts.**<br/>**This file is auto generated if the theme does not extend the Shopware Responsive Theme. Otherwise it is not required.**
| main.js   | Theme's javascript main entry point.<br/>The transpiled script will be located in **frontend/_resources/js/main.js**. The transpiled version in frontend/_resourcess also the script which should be referenced in the Theme.php.<br/><br/>```protected $javascript = ['../_resources/js/main.js']```

All theme javascript files are parsed with [babel](https://babeljs.io/) so it's possible to write ES6.

### Include in smarty
Add the following smarty block to frontend/index/index.tpl

```
{* Scripts. *}
{* Use shopware compiled sources for production environments. *}
{* For other environments we use resources compiled by webpack *}
{block name="frontend_index_header_javascript_jquery_lib"}
  {if {env} ne 'node'}
    {* Vendor is only needed if the theme directly inherits Bare theme *}
    {* <script src="{asset file='js/vendor.js'}"></script> *}
    {compileJavascript timestamp={themeTimestamp} output="javascriptFiles"}
    {foreach $javascriptFiles as $file}
      <script{if $theme.asyncJavascriptLoading} async{/if} src="{$file}" id="main-script"></script>
    {/foreach}
  {else}
    {* Vendor is only needed if the theme directly inherits Bare theme *}
    {* <script src="/web/cache/vendor.js"></script> *}
    <script src="/web/cache/swag.js"></script>
    <script src="/web/cache/main.js" id="main-script"></script>
  {/if}
{/block}
```


### Javsacript structure

```
js
 ├── main.js         // Main entry point
 ├── components      // Mainly jQuery plugins
 │   ├── index.js    // Main component file requiring all needed components
 │   └── legacy      // Shopware (responsive) jquery plugins
 │       └── ...
 ├── modules         // All non-jquery scripts required by the theme
 │   ├── index.js    // Main module file requiring all needed modules
 │   ├── utils.js    // Some helper funktions  
 │   └── ...
 ├── polyfills       // Polyfills like requestAnimationFrame
 │   └── ...
 ├── sw              // Service worker specific files
 │   └── ...
 └── vendors         // Vendor scripts which can not be installed with npm
     └── ...
```


## CSS
Shopware 5 uses it's own less compiler to build the production css. This compiler bundles all less files (Plugins as well as the `all.less` file defined in the theme)
As this is doesn't play well with the style injection feature of browsersync, we simulate this behavior for development to get a better developer experience. 

### Include in smarty
Add the following smarty block to frontend/index/header.tpl

```
{* Stylesheets *}
{* Use shopware compiled sources for production environments. *}
{* For other environments we use resources compiled by webpack *}
{block name="frontend_index_header_css_screen"}
    {if {env} ne "node"}
        {{compileLess timestamp={themeTimestamp} output="lessFiles"}}
        {critical stylesheets=$lessFiles}
    {else}
        <link href="/dev.css" media="all" rel="stylesheet" type="text/css"/>
    {/if}
    {if $theme.additionalCssData}
        {$theme.additionalCssData}
    {/if}
{/block}
```

### CSS structure

Shopware requires a main less file: **_frontend/public/src/less/all.less**<br/>
The preferred structure looks like this:

```
less
 ├── settings   // Global variables, site-wide settings, config switches, etc.
 │   └── ...
 ├── tools      // Site-wide mixins and functions.
 │   └── ...
 ├── generic    // Low-specificity, far-reaching rulesets (e.g. resets).
 │   └── ...
 ├── elements   // Unclassed HTML elements (e.g. a {}, blockquote {}, address {}).
 │   └── ...
 ├── objects    // Objects, abstractions, and design patterns (e.g. .grid {}, media {}).
 │   └── ...
 ├── components // Components like buttons, teaser, etc.
 │   └── ...
 ├── vendor     // Vendor styles and e.g. theme overwrites.
 │   └── ...
 ├── utilities  // High-specificity, very explicit selectors. (e.g. .u-hidden {}).
 │   └── ...
 └── all.less   // Main entry point
```

See https://interlutions.atlassian.net/wiki/x/GgBHFg for further details.

## Smarty 

Smarty helpers

### asset
`{asset file="PATH RELATIVE TO frontend/_public/src"}`

Link to src files in the theme folder. This function automatically links to the optimized/hashed files in production mode.


### critical

`{critical stylesheets=$lessFiles}`

Inlines the generated critical css and loads stylesheets via [loadCSS](https://github.com/filamentgroup/loadCSS). If no critical css is available for the current page the files are linked normally. The files containing the critical css are autogenerated in the **build:critical** task.

The filename of the critical css is determined by the REQUEST_URI relative to **frontend/_public/src/css/critical/**<br/> 

For the *https://shop.com/category/123/* the critical css should be located in *frontend/_public/src/css/critical/category/123.css*

### env
`{env}`

Use this function to check the current environment. 

### icon
`{icon id="BASENAME" className="CUSTOM CLASSNAME" title="TITLE" viewBox="CUSTOM VIEWBOX"}`

Render a svg icon from the icon-sprite
The id refers to tie filename in **frontend/_public/src/img/icons/FILENAME.svg**

The resulting HTML looks like this:

```
<svg role="img" class="icon icon--BASENAME" aria-labelledby="svg_12123">
	<title id="svg_12123">TITLE</title>
	<use xlink:href="#BASENAME"/>
</svg>
```
When no title is available the icon is marked as `aria-hidden="true"`
```
<svg role="img" class="icon icon--BASENAME" aria-hidden="true">
		<use xlink:href="#BASENAME"/>
</svg>
```

### img

`{img image=IMAGESTRUCT className="CUSTOM CLASSNAME" sizes="SIZES DEFINITION"}` <br/>
`{img id="IMAGEID" ... }`<br/> 
`{img src="/media/image/..."}`<br/> 

Renders an image from the shopware media library with srcset based on the thumbnails generated by shopware.
**This function requires the ImageMapper service `itl_base.mapper.image`** from [interlutions/shopware-base](https://gitlab.interlutions.de/Interlutions/shopware-base) to be available.


### svg
`{svg id="MEDIA-ID"}`<br/>
`{svg src="PATH RELATIVE TO frontend/_public/src"}`

Inline an svg either from the media library or from inside the theme