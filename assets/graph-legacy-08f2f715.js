!function(){function t(t){return function(t){if(Array.isArray(t))return r(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,n){if(!t)return;if("string"==typeof t)return r(t,n);var e=Object.prototype.toString.call(t).slice(8,-1);"Object"===e&&t.constructor&&(e=t.constructor.name);if("Map"===e||"Set"===e)return Array.from(t);if("Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e))return r(t,n)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function r(t,r){(null==r||r>t.length)&&(r=t.length);for(var n=0,e=new Array(r);n<r;n++)e[n]=t[n];return e}System.register(["./index-legacy-bbd0376c.js"],(function(r,n){"use strict";var e,o;return{setters:[function(t){e=t.S,o=t.e}],execute:function(){r("b",(function(t,r){return t.filterEdges((function(t,n,e,o,u,i,a){return r.has(e)&&r.has(o)}))})),r("f",(function(r){var n=Object.fromEntries([].concat(t(Object.values(e)),[Object.values(o)]).map((function(t){return[t,!1]})));return r.forEachNode((function(t){var e=r.getNodeAttribute(t,"type");n[e]=!0})),n})),r("a",(function(t,r,n,e,o){var u=r<=e?r:e,i=n<=o?n:o,a=r<=e?e:r,c=n<=o?o:n;return t.filterNodes((function(t,r){return function(t,r,n,e,o,u){return t<=o&&o<=n&&r<=u&&u<=e}(u,i,a,c,r.x,r.y)}))}))}}}))}();
