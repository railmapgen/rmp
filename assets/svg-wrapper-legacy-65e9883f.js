!function(){function e(t){return e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},e(t)}function t(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function r(e){for(var r=1;r<arguments.length;r++){var i=null!=arguments[r]?arguments[r]:{};r%2?t(Object(i),!0).forEach((function(t){n(e,t,i[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(i)):t(Object(i)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(i,t))}))}return e}function n(t,r,n){return(r=function(t){var r=function(t,r){if("object"!==e(t)||null===t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var i=n.call(t,r||"default");if("object"!==e(i))return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===r?String:Number)(t)}(t,"string");return"symbol"===e(r)?r:String(r)}(r))in t?Object.defineProperty(t,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[r]=n,t}function i(e){return function(e){if(Array.isArray(e))return a(e)}(e)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||u(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,i,o,u,a=[],c=!0,l=!1;try{if(o=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;c=!1}else for(;!(c=(n=o.call(r)).done)&&(a.push(n.value),a.length!==t);c=!0);}catch(s){l=!0,i=s}finally{try{if(!c&&null!=r.return&&(u=r.return(),Object(u)!==u))return}finally{if(l)throw i}}return a}}(e,t)||u(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function u(e,t){if(e){if("string"==typeof e)return a(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?a(e,t):void 0}}function a(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}System.register(["./chakra-legacy-fe32153b.js","./react-legacy-9060605e.js","./useEvent-legacy-807ba54e.js","./index-legacy-1d787828.js","./stations-legacy-d84186c4.js","./misc-nodes-legacy-5fb0836b.js","./helpers-legacy-a86c0368.js"],(function(e,t){"use strict";var a,c,l,s,f,y,d,p,g,v,h,b,m,x,A,w,j,E,S,k,N,I,O,P,D,L,W,z,_,C,T,K,B,M;return{setters:[function(e){a=e.j},function(e){c=e.b,l=e.r},function(e){s=e.u},function(e){f=e.ac,y=e.l,d=e.e,p=e.z,g=e.ad,v=e.j,h=e.ae,b=e.s,m=e.f,x=e.ab,A=e.S,w=e.J,j=e.n,E=e.c,S=e.r,k=e.F,N=e.h,I=e.L,O=e.P,P=e.q,D=e.p,L=e.a1,W=e.a3},function(e){z=e.s},function(e){_=e.m},function(e){C=e.a,T=e.r,K=e.f,B=e.F,M=e.i}],execute:function(){var t=function(e){var t=e.id,r=e.type,n=e.attrs,i=e.styleType,u=e.styleAttrs,l=void 0===u?f[i].defaultAttrs:u,s=e.newLine,d=e.handleClick,p=e.x1,g=e.y1,v=e.x2,h=e.y2,b=o(c.useState("M 0,0 L 0,0"),2),m=b[0],x=b[1];c.useEffect((function(){x(y[r].generatePath(p,v,g,h,n))}),[r,JSON.stringify(n),p,v,g,h]);var A=f[i].component;return c.useMemo((function(){return a.jsx(A,{id:t,type:r,path:m,styleAttrs:l,newLine:s,handleClick:d})}),[t,r,m,i,JSON.stringify(l),s,d])},R=function(e){var t,r={},n=function(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!r){if(Array.isArray(e)||(r=u(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0,i=function(){};return{s:i,n:function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}},e:function(e){throw e},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,a=!0,c=!1;return{s:function(){r=r.call(e)},n:function(){var e=r.next();return a=e.done,e},e:function(e){c=!0,o=e},f:function(){try{a||null==r.return||r.return()}finally{if(c)throw o}}}}(e.filterDirectedEdges((function(e,t,r,n,i,o,u){return e.startsWith("line")&&""!==t.reconcileId})));try{for(n.s();!(t=n.n()).done;){var i=t.value,o=e.getEdgeAttribute(i,"reconcileId");o in r?r[o].push(i):r[o]=[i]}}catch(a){n.e(a)}finally{n.f()}return r},F=function(e){var t=R(e),r=[],n=[];return Object.values(t).forEach((function(t){if(1!==t.length){var u=e.getEdgeAttribute(t.at(0),"type");if(t.every((function(t){return e.getEdgeAttribute(t,"type")===u}))){var a=e.getEdgeAttribute(t.at(0),"style");if(t.every((function(t){return e.getEdgeAttribute(t,"style")===a}))){var c={},l=new Set,s=new Set,f=Object.fromEntries(t.map((function(t){var r,n,i=o(e.extremities(t),2),u=i[0],a=i[1];return c[u]=(null!==(r=c[u])&&void 0!==r?r:0)+1,c[a]=(null!==(n=c[a])&&void 0!==n?n:0)+1,l.add(u),s.add(a),[u,[t,a]]}))),y=Array.from(l).filter((function(e){return 1===c[e]})),d=Array.from(s).filter((function(e){return 1===c[e]}));if(1===y.length&&1===d.length){var p=y[0],g=d[0];if(p!==g){for(var v=[f[p][0]],h=f[p][1],b=1;b<t.length;b+=1){var m,x=null===(m=f[h])||void 0===m?void 0:m.at(1);if(!x)return void n.push.apply(n,i(t));v.push(f[h][0]),h=x}h===g&&v.length===t.length?r.push(v):n.push.apply(n,i(t))}else n.push.apply(n,i(t))}else n.push.apply(n,i(t))}else n.push.apply(n,i(t))}else n.push.apply(n,i(t))}else n.push.apply(n,i(t))})),{allReconciledLines:r,danglingLines:n}},U=function(e){return e.filterNodes((function(e,t){return e.startsWith("stn")})).map((function(t){return[t,e.getNodeAttributes(t)]})).filter((function(e){var t=o(e,2);t[0];return t[1].visible})).sort((function(e,t){return e[1].zIndex-t[1].zIndex})).map((function(e){var t=o(e,2),r=t[0],i=t[1];return n({node:r,visible:i.visible,zIndex:i.zIndex,x:i.x,y:i.y,type:i.type},i.type,i[i.type])}))},V=function(e){return e.filterDirectedEdges((function(e,t,r,n,i,o,u){return e.startsWith("line")&&t.visible&&""===t.reconcileId})).sort((function(t,r){return e.getEdgeAttribute(t,"zIndex")-e.getEdgeAttribute(r,"zIndex")})).map((function(t){var r=e.getEdgeAttribute(t,"type"),n=e.getEdgeAttribute(t,r),i=e.getEdgeAttribute(t,"style"),u=e.getEdgeAttribute(t,i),a=o(e.extremities(t),2),c=a[0],l=a[1],s=e.getNodeAttributes(c),f=e.getNodeAttributes(l);return{edge:t,x1:s.x,y1:s.y,x2:f.x,y2:f.y,type:r,attr:n,style:i,styleAttr:u}}))},J=function(e){return e.filterNodes((function(e,t){return e.startsWith("misc_node")})).map((function(t){return[t,e.getNodeAttributes(t)]})).filter((function(e){var t=o(e,2);t[0];return t[1].visible})).sort((function(e,t){return e[1].zIndex-t[1].zIndex})).map((function(e){var t=o(e,2),r=t[0],i=t[1];return n({node:r,visible:i.visible,zIndex:i.zIndex,x:i.x,y:i.y,type:i.type},i.type,i[i.type])}))},Y=function(){var e=d(),u=c.useRef(window.graph),l=p((function(e){return e.app})).telemetry.project,O=p((function(e){return e.param})).svgViewBoxZoom,P=p((function(e){return e.runtime})),D=P.selected,L=P.refresh,W=L.nodes,K=L.edges,B=P.mode,M=P.active,R=P.keepLastPath,Y=P.theme,Z=o(c.useState({x:0,y:0}),2),q=Z[0],H=Z[1],X=o(c.useState({x:0,y:0}),2),$=X[0],G=X[1],Q=s((function(t,r){r.stopPropagation();var n=r.currentTarget,i=C(r),o=i.x,u=i.y;n.setPointerCapture(r.pointerId),H({x:o,y:u}),e(g(t)),!r.shiftKey&&D.length<=1&&e(v()),e(h(t))})),ee=s((function(t,n){n.stopPropagation();var i=C(n),o=i.x,a=i.y;"free"===B&&M===t?(D.forEach((function(e){u.current.updateNodeAttributes(e,(function(e){return r(r({},e),{},{x:T(e.x-(q.x-o)*O/100,n.altKey?1:5),y:T(e.y-(q.y-a)*O/100,n.altKey?1:5)})}))})),e(b()),e(m())):B.startsWith("line")&&G({x:(q.x-o)*O/100,y:(q.y-a)*O/100})})),te=s((function(t,r){if(r.stopPropagation(),B.startsWith("line")){R||e(x("free"));var o=[].concat(i(Object.values(A)),[w.Virtual]),a=u.current.hasNode(M)&&o.includes(u.current.getNodeAttribute(M,"type"));["stn_core_","virtual_circle_"].forEach((function(e){var t,i=null===(t=document.elementsFromPoint(r.clientX,r.clientY)[0].attributes)||void 0===t||null===(t=t.getNamedItem("id"))||void 0===t?void 0:t.value,o=null==i?void 0:i.startsWith(e);if(a&&o){var c,s=B.slice(5),f="line_".concat(j(10));u.current.addDirectedEdgeWithKey(f,M,i.slice(e.length),(n(c={visible:!0,zIndex:0,type:s},s,structuredClone(y[s].defaultAttrs)),n(c,"style",E.SingleColor),n(c,E.SingleColor,{color:Y}),n(c,"reconcileId",""),c)),l&&S.event(k.ADD_LINE,{type:s})}})),e(m()),e(N(u.current.export()))}else if("free"===B)if(M){var c=C(r),s=c.x,f=c.y;q.x-s==0&&q.y-f==0?e(h(t)):e(N(u.current.export()))}else e(h(t));e(g(void 0))})),re=s((function(t,r){e(v()),e(h(t))})),ne=o(c.useState(U(u.current)),2),ie=ne[0],oe=ne[1],ue=o(c.useState(J(u.current)),2),ae=ue[0],ce=ue[1],le=o(c.useState(V(u.current)),2),se=le[0],fe=le[1],ye=o(c.useState([]),2),de=ye[0],pe=ye[1],ge=o(c.useState([]),2),ve=ge[0],he=ge[1];return c.useEffect((function(){oe(U(u.current)),ce(J(u.current))}),[W]),c.useEffect((function(){fe(V(u.current));var e=F(u.current),t=e.allReconciledLines,r=e.danglingLines;pe(t),he(r)}),[]),c.useEffect((function(){fe(V(u.current));var e=F(u.current),t=e.allReconciledLines,r=e.danglingLines;pe(t),he(r)}),[K]),a.jsxs(a.Fragment,{children:[ve.map((function(e){var r=o(u.current.extremities(e),2),n=r[0],i=r[1],c=u.current.getNodeAttributes(n),l=u.current.getNodeAttributes(i);return a.jsx(t,{id:e,x1:c.x,y1:c.y,x2:l.x,y2:l.y,newLine:!1,type:I.Simple,attrs:y[I.Simple].defaultAttrs,styleType:E.SingleColor,styleAttrs:{color:["","","#c0c0c0","#fff"]},handleClick:re},e)})),de.map((function(e){var t=function(e,t){if(t.every((function(t){return e.hasEdge(t)}))){for(var r=t.map((function(t){var r,n=o(e.extremities(t),2),i=n[0],u=n[1],a=e.getNodeAttributes(i),c=e.getNodeAttributes(u),l=e.getEdgeAttribute(t,"type"),s=null!==(r=e.getEdgeAttribute(t,l))&&void 0!==r?r:y[l].defaultAttrs;return y[l].generatePath(a.x,c.x,a.y,c.y,s)})),n="".concat(r[0]," "),i=1;i<t.length;i+=1)n+=r[i].replace(/M\s*-?\d+(\.\d+)?(\s*|,)-?\d+(\.*\d+)?\s*/i,"");return n}}(u.current,e);if(!t)return a.jsx(a.Fragment,{});var r=e.at(0),n=u.current.getEdgeAttribute(r,"type"),i=u.current.getEdgeAttribute(r,"style"),c=u.current.getEdgeAttribute(r,i),l=f[i].component;return a.jsx(l,{id:r,type:n,path:t,styleAttrs:c,newLine:!1,handleClick:re},r)})),se.map((function(e){var r=e.edge,n=e.x1,i=e.y1,o=e.x2,u=e.y2,c=e.type,l=e.attr,s=e.style,f=e.styleAttr;return a.jsx(t,{id:r,x1:n,y1:i,x2:o,y2:u,newLine:!1,type:c,attrs:l,styleType:s,styleAttrs:f,handleClick:re},r)})),ae.map((function(e){var t=e.node,r=e.x,n=e.y,i=e.type,o=_[i].component;return a.jsx(o,{id:t,x:r,y:n,attrs:e[i],handlePointerDown:Q,handlePointerMove:ee,handlePointerUp:te},t)})),ie.map((function(e){var t=e.node,r=e.x,i=e.y,o=e.type,u=z[o].component;return a.jsx(u,{id:t,x:r,y:i,attrs:n({},o,e[o]),handlePointerDown:Q,handlePointerMove:ee,handlePointerUp:te},t)})),B.startsWith("line")&&M&&a.jsx(t,{id:"create_in_progress___no_use",x1:u.current.getNodeAttribute(M,"x"),y1:u.current.getNodeAttribute(M,"y"),x2:u.current.getNodeAttribute(M,"x")-$.x,y2:u.current.getNodeAttribute(M,"y")-$.y,newLine:!0,type:B.slice(5),attrs:y[B.slice(5)].defaultAttrs,styleType:E.SingleColor,styleAttrs:{color:Y}})]})};e("default",(function(){var e,t,r=d(),i=c.useRef(window.graph),u=function(){r(b()),r(m()),r(N(i.current.export()))},f=p((function(e){return e.app})).telemetry.project,y=p((function(e){return e.param})),h=y.svgViewBoxZoom,A=y.svgViewBoxMin,w=p((function(e){return e.runtime})),E=w.mode,I=w.lastTool,R=w.active,F=w.selected,U=w.keepLastPath,V=w.theme,J=w.refresh.nodes;c.useEffect((function(){var e=K(i.current);Object.entries(e).filter((function(e){var t=o(e,2),r=t[0];return t[1]&&r in B})).map((function(e){var t=o(e,2),r=t[0];t[1];return r})).filter((function(e){return B[e]&&null===document.getElementById(B[e].cssName)})).map((function(e){return B[e].cssName})).filter((function(e,t,r){return t===r.findIndex((function(t){return t===e}))})).forEach((function(e){var t=document.createElement("link");t.rel="stylesheet",t.id=e,t.href="/rmp/"+"styles/".concat(e,".css"),document.head.append(t)}))}),[J]);var Z,q,H,X=o(c.useState({x:0,y:0}),2),$=X[0],G=X[1],Q=o(c.useState({x:0,y:0}),2),ee=Q[0],te=Q[1],re=s((function(e){var t=C(e),o=t.x,a=t.y;if(E.startsWith("station")){r(x("free"));var c=j(10),l=E.slice(8),s=structuredClone(z[l].defaultAttrs);"color"in s&&(s.color=V),i.current.addNode("stn_".concat(c),n({visible:!0,zIndex:0,x:T(o*h/100+A.x,10),y:T(a*h/100+A.y,10),type:l},l,s)),u(),f&&S.event(k.ADD_STATION,{type:l})}else if(E.startsWith("misc-node")){r(x("free"));var y=j(10),d=E.slice(10);i.current.addNode("misc_node_".concat(y),n({visible:!0,zIndex:0,x:T(o*h/100+A.x,10),y:T(a*h/100+A.y,10),type:d},d,structuredClone(_[d].defaultAttrs))),u(),f&&S.event(k.ADD_STATION,{type:d})}else("free"===E||E.startsWith("line"))&&(E.startsWith("line")&&(r(x("free")),U&&r(O(!1))),G({x:o,y:a}),te(A),e.shiftKey||(r(g("background")),r(v())))})),ne=s((function(e){if("background"===R){var t=C(e),n=t.x,i=t.y;r(P({x:ee.x+($.x-n)*h/100,y:ee.y+($.y-i)*h/100}))}})),ie=s((function(e){"background"!==R||e.shiftKey||r(g(void 0))})),oe=s((function(e){var t=h;e.deltaY>0&&h+10<400?t=h+10:e.deltaY<0&&h-10>0&&(t=h-10),r(D(t));var n=C(e),i=n.x,o=n.y,u=e.currentTarget.getBoundingClientRect(),a=i/u.width,c=o/u.height;r(P({x:A.x+i*h/100-le*t/100*a,y:A.y+o*h/100-ce*t/100*c}))})),ue=s((function(e){if(M?"Backspace"===e.key:"Delete"===e.key)F.length>0&&F.filter((function(e){return i.current.hasNode(e)||i.current.hasEdge(e)})).forEach((function(e){r(v()),i.current.hasNode(e)?i.current.dropNode(e):i.current.dropEdge(e),u()}));else if(e.key.startsWith("Arrow")){var t=e.key.endsWith("Left")?-1:e.key.endsWith("Right")?1:0,n=e.key.endsWith("Up")?-1:e.key.endsWith("Down")?1:0;r(P({x:A.x+100*h/100*t,y:A.y+100*h/100*n}))}else if("i"===e.key||"j"===e.key||"k"===e.key||"l"===e.key){var o=10*("j"===e.key?-1:"l"===e.key?1:0),a=10*("i"===e.key?-1:"k"===e.key?1:0);F.length>0&&F.filter((function(e){return i.current.hasNode(e)})).forEach((function(e){i.current.updateNodeAttribute(e,"x",(function(e){return(null!=e?e:0)+o})),i.current.updateNodeAttribute(e,"y",(function(e){return(null!=e?e:0)+a})),u()}))}else"f"===e.key&&I?r(x(I)):"z"===e.key&&(M?e.metaKey&&!e.shiftKey:e.ctrlKey)?(M&&e.preventDefault(),r(L())):(M&&"z"===e.key&&e.metaKey&&e.shiftKey||!M&&"y"===e.key&&e.ctrlKey)&&r(W())})),ae=(Z=o(l.useState({width:void 0,height:void 0}),2),q=Z[0],H=Z[1],l.useEffect((function(){function e(){H({width:window.innerWidth,height:window.innerHeight})}return window.addEventListener("resize",e),e(),function(){return window.removeEventListener("resize",e)}}),[]),q),ce=(null!==(e=ae.height)&&void 0!==e?e:1280)-40,le=(null!==(t=ae.width)&&void 0!==t?t:720)-40;return a.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",id:"canvas",style:{position:"fixed",top:40,left:40},height:ce,width:le,viewBox:"".concat(A.x," ").concat(A.y," ").concat(le*h/100," ").concat(ce*h/100),onPointerDown:re,onPointerMove:ne,onPointerUp:ie,onWheel:oe,tabIndex:0,onKeyDown:ue,children:a.jsx(Y,{})})}))}}}))}();
