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
</symbol>
</svg>
```

## Issue Reference

The issue is reported at [#432](https://github.com/railmapgen/rmp/issues/432)
