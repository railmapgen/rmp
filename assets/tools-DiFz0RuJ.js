import{a6 as q,j as e,g as j,O as r,aM as F,aN as f,aO as v,B as I,aP as T,aQ as g,a4 as W,aK as _,b1 as M,a7 as N,aE as K}from"./chakra-sjIlidOs.js";import{u as R,b}from"./react-hBmrxY6U.js";import{I as Q}from"./index.esm-mpiRtYyw.js";import{f as V,a as P,ao as U,ap as X,aq as G,ad as m,T as J,H as Y,l as E,m as $,b as l,S as Z,ar as ee,e as se,a8 as ae,as as oe}from"./index-XuSAskHZ.js";import{m as p}from"./misc-nodes-ks2fMDsE.js";import{s as O}from"./stations-ooKA5yuo.js";const d={justifyContent:"flex-start",p:0,w:"100%",h:10},w={p:2.5,h:10},A={p:0,display:"flex",flexDirection:"column"},te=e.jsx("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:e.jsx("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2",stroke:"currentColor",strokeDasharray:"2",fill:"none"})}),B=.3,xe=()=>{const{t}=R(),a=V(),{mode:n,theme:x,paletteAppClip:{output:i}}=P(s=>s.runtime),{preference:{unlockSimplePathAttempts:u,toolsPanel:{expand:c}}}=P(s=>s.app),h=q("white","var(--chakra-colors-gray-800)"),[H,S]=b.useState(!1);b.useEffect(()=>{H&&i&&(a(U(i)),S(!1))},[i==null?void 0:i.toString()]);const[o,C]=b.useState(c),L=()=>{c?C(!1):setTimeout(()=>C(!0),(B+.02)*1e3),a(oe(!c))},y=s=>a(m("station-".concat(s))),z=s=>a(m("line-".concat(s))),k=s=>a(m("misc-node-".concat(s)));return e.jsxs(j,{flexShrink:"0",direction:"column",width:c?450:10,maxWidth:"100%",height:"100%",bg:h,zIndex:"5",transition:"width ".concat(B,"s ease-in-out"),children:[e.jsx(r,{"aria-label":"Menu",leftIcon:o?e.jsx(X,{size:40,transform:"rotate(90)"}):e.jsx(G,{size:40,transform:"rotate(90)"}),onClick:L,sx:d,children:o?t("panel.tools.showLess"):void 0}),e.jsx(j,{className:"tools",overflow:"auto",children:e.jsxs(F,{width:"100%",allowMultiple:!0,defaultIndex:[0,1,2],children:[e.jsx(r,{"aria-label":"select",leftIcon:te,onClick:()=>a(m(n==="select"?"free":"select")),variant:n==="select"?"solid":"outline",sx:d,children:o?t("panel.tools.select"):void 0}),e.jsxs(f,{children:[e.jsxs(v,{sx:w,children:[o&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:t("panel.tools.section.lineDrawing")}),e.jsx(T,{})]}),e.jsxs(g,{sx:A,children:[e.jsxs(j,{children:[e.jsx(J,{theme:x,onClick:()=>{S(!0),a(Y(x))}}),e.jsx(W,{fontWeight:"600",pl:"1",alignSelf:"center",children:o?t("color"):void 0})]}),Object.values(E).filter(s=>!(s===E.Simple&&u>=0)).map(s=>e.jsx(r,{"aria-label":s,leftIcon:$[s].icon,onClick:()=>z(s),variant:n==="line-".concat(s)?"solid":"outline",sx:d,children:o?t($[s].metadata.displayName):void 0},s)),e.jsx(r,{"aria-label":l.Virtual,leftIcon:p[l.Virtual].icon,onClick:()=>k(l.Virtual),variant:n==="misc-node-".concat(l.Virtual)?"solid":"outline",sx:d,children:o?t(p[l.Virtual].metadata.displayName):void 0})]})]}),e.jsxs(f,{children:[e.jsxs(v,{sx:w,children:[o&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:t("panel.tools.section.stations")}),e.jsx(T,{})]}),e.jsxs(g,{sx:A,children:[Object.values(Z).map(s=>e.jsx(r,{"aria-label":s,leftIcon:O[s].icon,onClick:()=>y(s),variant:n==="station-".concat(s)?"solid":"outline",sx:d,children:o?t(O[s].metadata.displayName):void 0},s)),e.jsx(D,{type:"station",expand:o})]})]}),e.jsxs(f,{children:[e.jsxs(v,{sx:w,children:[o&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:t("panel.tools.section.miscellaneousNodes")}),e.jsx(T,{})]}),e.jsxs(g,{sx:A,children:[Object.values(l).filter(s=>s!==l.Virtual&&s!==l.I18nText).map(s=>e.jsx(r,{"aria-label":s,leftIcon:p[s].icon,onClick:()=>k(s),variant:n==="misc-node-".concat(s)?"solid":"outline",sx:d,children:o?t(p[s].metadata.displayName):void 0},s)),e.jsx(D,{type:"misc-node",expand:o})]})]})]})})]})},D=t=>{const{type:a,expand:n}=t,{t:x}=R(),i=V(),u=a==="misc-node"?"nodes":a==="station"?"stations":"line-styles",c=a==="line"?"xs":void 0,h=a==="line"?"30px":"40px";return e.jsxs(_,{fontSize:c,children:[a!=="line"&&e.jsx(M.Provider,{value:{style:{padding:5},size:h},children:e.jsx(ee,{})}),n&&e.jsxs(e.Fragment,{children:[e.jsx(N,{color:"teal.500",href:"https://github.com/railmapgen/rmp/blob/main/docs/".concat(u,".md"),isExternal:!0,children:x("panel.tools.learnHowToAdd.".concat(a))}),e.jsx(K,{as:se,color:"teal.500",mr:"auto"}),e.jsx(N,{color:"teal.500",onClick:()=>i(ae(!0)),isExternal:!0,children:x("panel.tools.learnHowToAdd.donate")}),a!=="line"&&e.jsx(M.Provider,{value:{style:{padding:5},color:"red",size:h},children:e.jsx(Q,{})})]})]})};export{D as LearnHowToAdd,xe as default};