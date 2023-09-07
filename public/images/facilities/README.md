# Optimize SVGs via SVGO

__Caution! All files end with `.svg` in this folder will be optimized by SVGO on every build! Files are supposed to be updated after manual changes!__

SVG files, especially those exported from various editors, usually contain a lot of redundant and useless information. This can include editor metadata, comments, hidden elements, default or non-optimal values and other stuff that can be safely removed or converted without affecting the SVG rendering result.

Furthermore, editors sometimes use the same class name for different SVG files. This is usually not a problem unless those SVGs are mixed into one file, but that is not the case in Rail Map Painter. During the export process of generating images, Rail Map Painter inserts all SVG files into the final SVG as `<symbol>` and replaces the `<image>` in facility nodes with `<use>`.

This is where the problem arises. The `<style>` element inside each SVG file may conflict with one another since they are all children of the root `<svg>` element. There are several possible fixes for this, but the one that does not require any advanced knowledge, manual class replacement, or code changes is to inline styles. This procedure involves moving and merging styles from `<style>` elements to element style attributes.

Fortunately, there is a tool specifically built for this purpose, called [SVGO](https://github.com/svg/svgo).

## How To Use

```bash
$ npm i -g svgo
$ svgo -f ./ --pretty --indent 2 --config ./svgo.config.js
```

The task at hand is to inline all styles into the style attributes of elements for every SVG file within the current folder. To accomplish this, a config file is provided to ensure that every style is properly inlined, as the default configuration might not address all styles and leave some unchanged.

## Minimal Bug Example

```svg
<svg xmlns="http://www.w3.org/2000/svg" id="canvas" style="position: fixed; top: 40px; left: 40px; user-select: none;" height="304.1421356201172" width="294.14208984375" viewBox="632.928955078125 102.92893981933594 294.14208984375 304.1421356201172" tabindex="0">
  <g id="misc_node_ak2el6yoGs" transform="translate(717.5, 177.5)">
    <use href="#airport" />
    <!-- PROBLEM HERE! The elements in airport will use the style defined in railway. -->
  </g>
  <g id="misc_node_7Pi-eOCbJy" transform="translate(717.5, 237.5)">
    <use href="#railway" />
  </g>
  <symbol version="1.1" id="airport" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="25" viewBox="0 0 25 25" style="enable-background:new 0 0 25 25;" xml:space="preserve">
    <!-- This style has a global effect! -->
    <style type="text/css">
      .st0{fill:#828282;}
      .st1{fill:#FFFFFF;}
      .st2{fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-miterlimit:10;}
    </style>
    <!-- Some circle/line/path... elements that have class st0, st1... -->
    <circle class="st0" cx="12.5" cy="12.5" r="11.5"></circle>
    <polyline class="st1" points="11.5,9.8 3.2,14.8 3.2,17.2 11.5,14.5 "></polyline>
    <polyline class="st1" points="13.5,9.8 21.8,14.8 21.8,17.2 13.5,14.5 "></polyline>
    <polyline class="st1" points="11.7,18.5 9.7,19.8 9.7,21.8 12.3,20.8 12.7,20.8 15.3,21.8 15.3,19.8 13.3,18.5 "></polyline>
    <line class="st2" x1="12.5" y1="4.3" x2="12.5" y2="4"></line>
    <path class="st1" d="M11.5,4.2l-0.2,8.3l0,0c0.1,1.6,0.2,3.1,0.2,4.7v1.7h2v-1.7c0-1.6,0.1-3.1,0.2-4.7l0,0l-0.2-8.3"></path>
  </symbol>
  <symbol version="1.1" id="railway" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25" height="25" viewBox="0 0 25 25" style="enable-background:new 0 0 25 25;" xml:space="preserve">
    <!-- This style also has a global effect and will conflict the one before! -->
    <style type="text/css">
      .st0{fill:#828282;}
      .st1{fill:none;}
      .st2{fill:#FFFFFF;}
      .st3{fill:none;stroke:#FFFFFF;stroke-width:2;stroke-miterlimit:10;}
    </style>
    <!-- Some circle/line/path... elements that have class st0, st1... -->
    <circle class="st0" cx="12.5" cy="12.5" r="11.5"></circle>
    <line class="st1" x1="10.8" y1="3.8" x2="10.8" y2="4.8"></line>
    <polyline class="st2" points="10.8,5 10.8,3.8 14.2,3.8 14.2,5 "></polyline>
    <circle class="st3" cx="12.5" cy="12.5" r="6.7"></circle>
    <polyline class="st0" points="10.2,17.3 8.8,20 12.5,21 16.2,19.7 14.8,17.3 "></polyline>
    <path class="st2" d="M15.3,12.9c0,0.7-0.6,1.3-1.3,1.3h-3c-0.7,0-1.3-0.6-1.3-1.3v-0.5c0-0.7,0.6-1.3,1.3-1.3h3c0.7,0,1.3,0.6,1.3,1.3V12.9z"></path>
    <path class="st2" d="M11.7,14.2"></path>
    <path class="st2" d="M11.7,13.2v5.4c0,0.5-0.3,1-0.8,1.2l0,0l-3.7,0.4v1.2h10.7v-1.2l-3.7-0.4l0,0c-0.5-0.2-0.8-0.7-0.8-1.2v-5.4H11.7z"></path>
  </symbol>
</svg>
```

## Issue Reference

The issue is reported at [#432](https://github.com/railmapgen/rmp/issues/432)
