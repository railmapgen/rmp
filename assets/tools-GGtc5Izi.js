import{Q as oe,j as e,h as L,t as d,aG as te,aH as R,aI as v,B as I,aJ as y,aK as C,N as ie,x as P,ax as le,av as ce,aL as re,R as de,ap as xe}from"./chakra-CHkbW1Nc.js";import{u as q,b as D}from"./react-3Z_4zUxA.js";import{S as l,aF as n,l as o,c as he,d as N,aR as ue,W as me,aI as pe,aS as je,aT as Te,az as T,X as fe,k as O,o as $,aU as Me,b as Se,aV as ge}from"./index-B-cKnrBO.js";import{m as u}from"./misc-nodes-fxyVgFWI.js";import{s as H}from"./master-manager-nlL0nJOI.js";const m=Object.values(l),_=[l.LondonTubeBasic,l.LondonTubeInt,l.LondonRiverServicesInt,l.MRTBasic,l.MRTInt,l.MTR],F=[l.JREastBasic,l.JREastImportant,l.TokyoMetroBasic,l.TokyoMetroInt],be={"zh-Hans":m,"zh-Hant":m,en:[..._,...m.filter(t=>!_.includes(t))],ja:[...F,...m.filter(t=>!F.includes(t))],ko:m},p=Object.values(n),f=[n.Facilities,n.Text],V=[n.LondonArrow,n.BerlinSBahnLineBadge,n.BerlinUBahnLineBadge,n.MRTDestinationNumbers,n.MRTLineBadge],J=[n.JREastLineBadge],Le={"zh-Hans":p,"zh-Hant":p,en:[...f,...V,...p.filter(t=>![...V,...f].includes(t))],ja:[...f,...J,...p.filter(t=>![...J,...f].includes(t))],ko:p},j=Object.values(o),M=[o.SingleColor],U=[o.LondonTubeTerminal,o.LondonTubeInternalInt,o.LondonTube10MinWalk,o.LondonRail,o.LondonSandwich,o.LondonLutonAirportDART,o.LondonIFSCloudCableCar,o.MRTUnderConstruction,o.MRTSentosaExpress,o.MTRRaceDays,o.MTRLightRail,o.MTRUnpaidArea,o.MTRPaidArea],W=[o.JREastSingleColor,o.JREastSingleColorPattern],Ae={"zh-Hans":j,"zh-Hant":j,en:[...M,...U,...j.filter(t=>![...U,...M].includes(t))],ja:[...M,...W,...j.filter(t=>![...W,...M].includes(t))],ko:j},x={justifyContent:"flex-start",p:0,w:"100%",h:10},k={p:2.5,h:10},A={p:0,display:"flex",flexDirection:"column"},Re=e.jsx("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:e.jsx("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2",stroke:"currentColor",strokeDasharray:"2",fill:"none"})}),X=.3,ve=()=>{var E,z;const{i18n:t,t:a}=q(),r=he(),{activeSubscriptions:S}=N(s=>s.account),{preference:{unlockSimplePathAttempts:g,toolsPanel:{expand:h}}}=N(s=>s.app),{mode:c,masterNodesCount:G}=N(s=>s.runtime),K=oe("white","var(--chakra-colors-gray-800)"),Q=D.useCallback(s=>{r(ue(s))},[]),{theme:Y,requestThemeChange:Z}=me({onThemeApplied:Q}),[i,B]=D.useState(h),ee=()=>{h?B(!1):setTimeout(()=>B(!0),(X+.02)*1e3),r(ge(!h))},se=s=>r(T("station-".concat(s))),ne=s=>r(T("line-".concat(s))),b=s=>r(T("misc-node-".concat(s))),ae=!S.RMP_CLOUD&&G+1>pe;return e.jsxs(L,{flexShrink:"0",direction:"column",width:h?450:10,maxWidth:"100%",height:"100%",bg:K,zIndex:"5",transition:"width ".concat(X,"s ease-in-out"),children:[e.jsx(d,{"aria-label":"Menu",leftIcon:i?e.jsx(je,{size:40,transform:"rotate(90)"}):e.jsx(Te,{size:40,transform:"rotate(90)"}),onClick:ee,sx:x,children:i?a("panel.tools.showLess"):void 0}),e.jsx(L,{className:"tools",overflow:"auto",children:e.jsxs(te,{width:"100%",allowMultiple:!0,defaultIndex:[0,1,2],children:[e.jsx(d,{"aria-label":"select",leftIcon:Re,onClick:()=>r(T(c==="select"?"free":"select")),variant:c==="select"?"solid":"outline",sx:x,children:i?a("panel.tools.select"):void 0}),e.jsxs(R,{children:[e.jsxs(v,{sx:k,children:[i&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:a("panel.tools.section.lineDrawing")}),e.jsx(y,{})]}),e.jsxs(C,{sx:A,children:[e.jsxs(L,{children:[e.jsx(fe,{theme:Y,onClick:Z}),e.jsx(ie,{fontWeight:"600",pl:"1",alignSelf:"center",children:i?a("color"):void 0})]}),Object.values(O).filter(s=>!(s===O.Simple&&g>=0)).map(s=>e.jsx(d,{"aria-label":s,leftIcon:$[s].icon,onClick:()=>ne(s),variant:c==="line-".concat(s)?"solid":"outline",sx:x,children:i?a($[s].metadata.displayName):void 0},s)),e.jsx(d,{"aria-label":n.Virtual,leftIcon:u[n.Virtual].icon,onClick:()=>b(n.Virtual),variant:c==="misc-node-".concat(n.Virtual)?"solid":"outline",sx:x,children:i?a(u[n.Virtual].metadata.displayName):void 0})]})]}),e.jsxs(R,{children:[e.jsxs(v,{sx:k,children:[i&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:a("panel.tools.section.stations")}),e.jsx(y,{})]}),e.jsxs(C,{sx:A,children:[(E=be[t.language])==null?void 0:E.map(s=>e.jsx(d,{"aria-label":s,leftIcon:H[s].icon,onClick:()=>se(s),variant:c==="station-".concat(s)?"solid":"outline",sx:x,children:i?a(H[s].metadata.displayName):void 0},s)),e.jsx(w,{type:"station",expand:i})]})]}),e.jsxs(R,{children:[e.jsxs(v,{sx:k,children:[i&&e.jsx(I,{as:"span",flex:"1",textAlign:"left",children:a("panel.tools.section.miscellaneousNodes")}),e.jsx(y,{})]}),e.jsxs(C,{sx:A,children:[e.jsxs(d,{"aria-label":n.Master,leftIcon:u[n.Master].icon,onClick:()=>b(n.Master),variant:c==="misc-node-".concat(n.Master)?"solid":"outline",isDisabled:ae,sx:x,children:[i?a(u[n.Master].metadata.displayName):void 0,i?e.jsxs(e.Fragment,{children:[e.jsx(P,{ml:"1",colorScheme:"green",children:"New"}),e.jsx(le,{label:a("header.settings.proWithTrial"),children:e.jsx(P,{ml:"1",color:"gray.50",background:"radial-gradient(circle, #3f5efb, #fc466b)",mr:"auto",children:"PRO"})})]}):void 0]}),(z=Le[t.language])==null?void 0:z.filter(s=>s!==n.Virtual&&s!==n.I18nText&&s!==n.Master).map(s=>e.jsx(d,{"aria-label":s,leftIcon:u[s].icon,onClick:()=>b(s),variant:c==="misc-node-".concat(s)?"solid":"outline",sx:x,children:i?a(u[s].metadata.displayName):void 0},s)),e.jsx(w,{type:"misc-node",expand:i})]})]})]})})]})},w=t=>{const{type:a,expand:r}=t,{t:S}=q(),g=a==="misc-node"?"nodes":a==="station"?"stations":"line-styles",h=a==="line"?"xs":void 0,c=a==="line"?"30px":"40px";return e.jsxs(ce,{fontSize:h,children:[a!=="line"&&e.jsx(re.Provider,{value:{style:{padding:5},size:c},children:e.jsx(Me,{})}),r&&e.jsxs(e.Fragment,{children:[e.jsx(de,{color:"teal.500",href:"https://github.com/railmapgen/rmp/blob/main/docs/".concat(g,".md"),isExternal:!0,children:S("panel.tools.learnHowToAdd.".concat(a))}),e.jsx(xe,{as:Se,color:"teal.500",mr:"auto"})]})]})},we=Object.freeze(Object.defineProperty({__proto__:null,LearnHowToAdd:w,default:ve},Symbol.toStringTag,{value:"Module"}));export{w as L,Ae as l,we as t};
