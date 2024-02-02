import{am as A,C as S,c as B,an as L,b,j as W,S as q}from"./index-F9Ppk60K.js";import{j as n}from"./chakra-eFP61t3-.js";import{b as i,u as F}from"./react-82wqd3vf.js";import{L as ce,M as K,F as le,b as de,f as me}from"./stations-_160XEJu.js";const he=o=>{const{id:e,x:t,y:s,handlePointerDown:l,handlePointerMove:r,handlePointerUp:a}=o,h=i.useCallback(m=>l(e,m),[e,l]),d=i.useCallback(m=>r(e,m),[e,r]),u=i.useCallback(m=>a(e,m),[e,a]);return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")rotate(45)"),onPointerDown:h,onPointerMove:d,onPointerUp:u,style:{cursor:"move"},children:[n.jsx("line",{x1:"-5",y1:"0",x2:"5",y2:"0",stroke:"black"}),n.jsx("line",{x1:"0",y1:"-5",x2:"0",y2:"5",stroke:"black"}),n.jsx("circle",{id:"virtual_circle_".concat(e),r:5,stroke:"black",fill:"white",fillOpacity:"0"})]})},ue={},xe=()=>n.jsx(A,{fields:[]}),ge=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,transform:"rotate(45)",focusable:!1,children:[n.jsx("circle",{cx:"12",cy:"12",r:"6",stroke:"currentColor",fill:"none"}),n.jsx("line",{x1:"6",y1:"12",x2:"18",y2:"12",stroke:"currentColor"}),n.jsx("line",{x1:"12",y1:"6",x2:"12",y2:"18",stroke:"currentColor"})]}),pe={component:he,icon:ge,defaultAttrs:ue,attrsComponent:xe,metadata:{displayName:"panel.details.nodes.virtual.displayName",tags:[]}},fe=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=_.num,color:u=_.color}=l!=null?l:_,[m,f]=d>=10?[22.67,10.75]:[21,10],g=i.useCallback(p=>r(e,p),[e,r]),c=i.useCallback(p=>a(e,p),[e,a]),x=i.useCallback(p=>h(e,p),[e,h]);return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:g,onPointerMove:c,onPointerUp:x,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],width:m,height:"22.67"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:f,y:"19",fill:u[3],fontSize:"21.33",letterSpacing:"-1.75",children:d}),n.jsx("text",{className:"rmp-name__zh",x:m+2,y:"12",fontSize:"14.67",children:"号线"}),n.jsxs("text",{className:"rmp-name__en",x:m+4,y:"21.5",fontSize:"8",children:["Line ",d]})]})},_={num:1,color:[S.Shanghai,"sh1","#E4002B",B.white]},be=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:_).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:_;return Number.isNaN(o)||(t.num=Number(o)),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.ShmetroNumLineBadge,defaultTheme:_.color})}],ye=()=>n.jsx(A,{fields:be}),je=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"10",height:"16"}),n.jsx("text",{x:"4",y:"18",fill:"white",children:"1"}),n.jsx("text",{x:"14",y:"10",fontSize:"5",children:"号线"}),n.jsx("text",{x:"14",y:"18",fontSize:"4",children:"Line 1"})]}),Be={component:fe,icon:je,defaultAttrs:_,attrsComponent:ye,metadata:{displayName:"panel.details.nodes.shmetroNumLineBadge.displayName",tags:[]}},Ne=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{names:d=H.names,color:u=H.color}=l!=null?l:H,m=i.useRef(null),[f,g]=i.useState({width:12});i.useEffect(()=>g(m.current.getBBox()),[...d,g,m]);const c=i.useCallback(y=>r(e,y),[e,r]),x=i.useCallback(y=>a(e,y),[e,a]),p=i.useCallback(y=>h(e,y),[e,h]);return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:c,onPointerMove:x,onPointerUp:p,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:f.width+7,height:"21"}),n.jsxs("g",{ref:m,children:[n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",dominantBaseline:"hanging",x:(f.width+7)/2,y:"4",fontSize:"10",fill:u[3],letterSpacing:"-0.25",children:d[0]}),n.jsx("text",{className:"rmp-name__en",textAnchor:"middle",dominantBaseline:"hanging",x:(f.width+7)/2,y:"13",fontSize:"5",fill:u[3],letterSpacing:"-0.25",children:d[1]})]})]})},H={names:["浦江线","Pujiang Line"],color:[S.Shanghai,"pjl","#B5B5B6",B.white]},we=o=>{const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"textarea",label:l("panel.details.nodes.common.nameZh"),value:t.names[0],onChange:a=>{t.names[0]=a,s(e,t)},minW:"full"},{type:"input",label:l("panel.details.nodes.common.nameEn"),value:t.names[1],onChange:a=>{t.names[1]=a,s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.ShmetroTextLineBadge,defaultTheme:H.color})}];return n.jsx(W,{fields:r})},Ce=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"6",width:"20",height:"12"}),n.jsx("text",{x:"5",y:"11",fontSize:"5",fill:"white",children:"浦江线"}),n.jsx("text",{x:"3",y:"16",fontSize:"4",fill:"white",children:"Pujiang Line"})]}),Se={component:Ne,icon:Ce,defaultAttrs:H,attrsComponent:we,metadata:{displayName:"panel.details.nodes.shmetroTextLineBadge.displayName",tags:[]}},Le=o=>{var x,p;const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{names:d=E.names,color:u=E.color,tram:m=E.tram}=l!=null?l:E,f=i.useCallback(y=>r(e,y),[e,r]),g=i.useCallback(y=>a(e,y),[e,a]),c=i.useCallback(y=>h(e,y),[e,h]);return n.jsx("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")scale(").concat(m?.5:1,")"),onPointerDown:f,onPointerMove:g,onPointerUp:c,style:{cursor:"move"},children:n.jsx(ce,{zhName:(x=d.at(0))!=null?x:"",enName:(p=d.at(1))!=null?p:"",zhClassName:"rmp-name__zh",enClassName:"rmp-name__en",foregroundColour:u[3],backgroundColour:u[2],spanDigits:!0})})},E={names:["1号线","Line 1"],color:[S.Guangzhou,"gz1","#F3D03E",B.black],tram:!1},ze=o=>{const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"input",label:l("panel.details.nodes.common.nameZh"),value:t.names[0],onChange:a=>{t.names[0]=a,s(e,t)},minW:"full"},{type:"input",label:l("panel.details.nodes.common.nameEn"),value:t.names[1],onChange:a=>{t.names[1]=a,s(e,t)},minW:"full"},{type:"switch",label:l("panel.details.nodes.gzmtrLineBadge.tram"),oneLine:!0,isChecked:t.tram,onChange:a=>{t.tram=a,s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.GzmtrLineBadge,defaultTheme:E.color})}];return n.jsx(W,{fields:r})},ve=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"5",width:"20",height:"14",rx:"1"}),n.jsx("text",{x:"6",y:"15",textAnchor:"middle",fontSize:"10",fill:"white",children:"1"}),n.jsx("text",{x:"15",y:"12",textAnchor:"middle",fontSize:"6",fill:"white",children:"号线"}),n.jsx("text",{x:"14.5",y:"17",textAnchor:"middle",fontSize:"4",fill:"white",children:"Line 1"})]}),Pe={component:Le,icon:ve,defaultAttrs:E,attrsComponent:ze,metadata:{displayName:"panel.details.nodes.gzmtrLineBadge.displayName",tags:[]}},X=11.84375,Te=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=M.num,color:u=M.color}=l!=null?l:M,m=i.useCallback(x=>r(e,x),[e,r]),f=i.useCallback(x=>a(e,x),[e,a]),g=i.useCallback(x=>h(e,x),[e,h]),c=u[3]===B.black?"#003670":B.white;return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:m,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:X+21,height:"16",rx:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:X/2+2,y:"13.5",fill:c,fontSize:"15",letterSpacing:"-1.5",children:d}),n.jsx("text",{className:"rmp-name__zh",x:X+(d>9?5.5:3),y:"8.5",fontSize:"7",fill:c,children:"号线"}),n.jsxs("text",{className:"rmp-name__en",x:X+(d>9?6:4.5),y:"13.5",fontSize:"4",fill:c,children:["Line ",d]})]})},M={num:1,color:[S.Beijing,"bj1","#c23a30",B.white]},Ae=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:M).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:M;return Number.isNaN(o)||(t.num=Number(o)),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.BjsubwayNumLineBadge,defaultTheme:M.color})}],ke=()=>n.jsx(A,{fields:Ae}),_e=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"2"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"1"}),n.jsx("text",{x:"11",y:"11",fill:"white",fontSize:"5",children:"号线"}),n.jsx("text",{x:"11",y:"17",fill:"white",fontSize:"4",children:"Line 1"})]}),Me={component:Te,icon:_e,defaultAttrs:M,attrsComponent:ke,metadata:{displayName:"panel.details.nodes.bjsubwayNumLineBadge.displayName",tags:[]}},$e=28.84375,Re=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{names:d=P.names,color:u=P.color}=l!=null?l:P,m=i.useRef(null),[f,g]=i.useState({width:12});i.useEffect(()=>g(m.current.getBBox()),[...d,g,m]);const c=i.useCallback(N=>r(e,N),[e,r]),x=i.useCallback(N=>a(e,N),[e,a]),p=i.useCallback(N=>h(e,N),[e,h]),y=Math.max($e,f.width),C=u[3]===B.black?"#003670":B.white;return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:c,onPointerMove:x,onPointerUp:p,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:y+4,height:"16",rx:"2"}),n.jsxs("g",{ref:m,children:[n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:(y+4)/2,y:"8",fontSize:"7",fill:C,children:d[0]}),n.jsx("text",{className:"rmp-name__en",textAnchor:"middle",x:(y+4)/2,y:"13.5",fontSize:"4",fill:C,children:d[1]})]})]})},P={names:["八通线","Batong Line"],color:[S.Beijing,"bj1","#c23a30",B.white]},Ue=[{type:"input",label:"panel.details.nodes.common.nameZh",value:o=>(o!=null?o:P).names[0],onChange:(o,e)=>{const t=e!=null?e:P;return t.names[0]=o.toString(),t}},{type:"input",label:"panel.details.nodes.common.nameEn",value:o=>(o!=null?o:P).names[1],onChange:(o,e)=>{const t=e!=null?e:P;return t.names[1]=o.toString(),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.BjsubwayTextLineBadge,defaultTheme:P.color})}],De=()=>n.jsx(A,{fields:Ue}),Ee=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"6",width:"20",height:"12",rx:"2"}),n.jsx("text",{x:"3",y:"12",fontSize:"6",fill:"white",children:"八通线"}),n.jsx("text",{x:"3",y:"16",fontSize:"3.2",fill:"white",children:"Batong Line"})]}),Ie={component:Re,icon:Ee,defaultAttrs:P,attrsComponent:De,metadata:{displayName:"panel.details.nodes.bjsubwayTextLineBadge.displayName",tags:[]}},We=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=z.num,branch:u=z.branch,color:m=z.color}=l!=null?l:z,f=i.useCallback(x=>r(e,x),[e,r]),g=i.useCallback(x=>a(e,x),[e,a]),c=i.useCallback(x=>h(e,x),[e,h]);return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:f,onPointerMove:g,onPointerUp:c,style:{cursor:"move"},children:[n.jsx("rect",{fill:m[2],width:"20",height:"20",rx:"2",ry:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",dominantBaseline:"middle",x:"10",y:"11.4",fill:m[3],fontSize:"15",letterSpacing:"-1",children:d}),u&&n.jsxs(n.Fragment,{children:[n.jsx("text",{className:"rmp-name__zh",x:20+2.5,y:"10",fontSize:"10",children:"支线"}),n.jsx("text",{className:"rmp-name__en",x:20+2.5,y:"18",fontSize:"5",fill:"gray",children:"Branch line"})]})]})},z={num:1,branch:!1,color:[S.Suzhou,"sz1","#78BA25",B.white]},Fe=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:z).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:z;return Number.isNaN(o)||(t.num=Number(o)),t}},{type:"switch",label:"panel.details.nodes.suzhouRTNumLineBadge.branch",isChecked:o=>{var e;return(e=o==null?void 0:o.branch)!=null?e:z.branch},onChange:(o,e)=>{const t=e!=null?e:z;return t.branch=o,t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.SuzhouRTNumLineBadge,defaultTheme:z.color})}],qe=()=>n.jsx(A,{fields:Fe}),He=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"4",y:"4",width:"16",height:"16",rx:"3",ry:"3"}),n.jsx("text",{x:"12",y:"13.4",textAnchor:"middle",dominantBaseline:"middle",fill:"white",fontSize:"14",children:"1"})]}),Oe={component:We,icon:He,defaultAttrs:z,attrsComponent:qe,metadata:{displayName:"panel.details.nodes.suzhouRTNumLineBadge.displayName",tags:[]}},Je=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=$.num,color:u=$.color}=l!=null?l:$,m=i.useCallback(x=>r(e,x),[e,r]),f=i.useCallback(x=>a(e,x),[e,a]),g=i.useCallback(x=>h(e,x),[e,h]),c=u[3];return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:m,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:"25",height:"15"}),n.jsxs("text",{className:"rmp-name__berlin",textAnchor:"middle",x:"12.5",y:"12.5",fill:c,fontSize:"14",letterSpacing:"1",children:["U",d]})]})},$={num:1,color:[S.Berlin,"bu1","#62AD2D",B.white]},Xe=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:$).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:$;return Number.isNaN(o)||(t.num=Number(o)),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.BerlinUBahnLineBadge,defaultTheme:$.color})}],Ze=()=>n.jsx(A,{fields:Xe}),Ge=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"U1"})]}),Qe={component:Je,icon:Ge,defaultAttrs:$,attrsComponent:Ze,metadata:{displayName:"panel.details.nodes.berlinUBahnLineBadge.displayName",tags:[]}},Ve=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=R.num,color:u=R.color}=l!=null?l:R,[m,f]=d>=10?[6,19.75]:[10,20],g=i.useCallback(y=>r(e,y),[e,r]),c=i.useCallback(y=>a(e,y),[e,a]),x=i.useCallback(y=>h(e,y),[e,h]),p=u[3];return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:g,onPointerMove:c,onPointerUp:x,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:"30",height:"15",rx:"8"}),n.jsx("text",{className:"rmp-name__berlin",textAnchor:"middle",x:m,y:"12.5",fill:p,fontSize:"14",letterSpacing:"0",children:"S"}),n.jsx("text",{className:"rmp-name__berlin",textAnchor:"middle",x:f,y:"12.5",fill:p,fontSize:"14",letterSpacing:"-0.2",children:d})]})},R={num:1,color:[S.Berlin,"bs1","#DD6CA6",B.white]},Ke=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:R).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:R;return Number.isNaN(o)||(t.num=Number(o)),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.BerlinSBahnLineBadge,defaultTheme:R.color})}],Ye=()=>n.jsx(A,{fields:Ke}),en=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"8"}),n.jsx("text",{x:"4.5",y:"16.5",fill:"white",fontSize:"14",children:"S1"})]}),nn={component:Ve,icon:en,defaultAttrs:R,attrsComponent:Ye,metadata:{displayName:"panel.details.nodes.berlinSBahnLineBadge.displayName",tags:[]}},tn=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=U.num,color:u=U.color}=l!=null?l:U,m=i.useCallback(C=>r(e,C),[e,r]),f=i.useCallback(C=>a(e,C),[e,a]),g=i.useCallback(C=>h(e,C),[e,h]),c=u[3],x=Number.isInteger(d)?16:15,[p,y]=Number.isInteger(d)?Number(d)>=10?[-1.2,1.5]:[0,5.5]:[0,2.55];return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:m,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:"20",height:"20",rx:"10",ry:"10"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"left",x:y,y:"10",fill:c,fontSize:x,letterSpacing:p,dominantBaseline:"central",children:d})]})},U={num:1,color:[S.Chongqing,"cq1","#e4002b",B.white]},on=[{type:"input",label:"panel.details.nodes.common.num",value:o=>(o!=null?o:U).num,validator:o=>!Number.isNaN(o),onChange:(o,e)=>{const t=e!=null?e:U;return Number.isNaN(Number(o))?t.num=o:t.num=Number(o),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.ChongqingRTNumLineBadge,defaultTheme:U.color})}],ln=()=>n.jsx(A,{fields:on}),an=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"8",y:"18",fill:"white",fontSize:"18",children:"1"})]}),sn={component:tn,icon:an,defaultAttrs:U,attrsComponent:ln,metadata:{displayName:"panel.details.nodes.chongqingRTNumLineBadge.displayName",tags:[]}},rn=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{names:d=T.names,color:u=T.color}=l!=null?l:T,m=i.useRef(null),f=i.useCallback(p=>r(e,p),[e,r]),g=i.useCallback(p=>a(e,p),[e,a]),c=i.useCallback(p=>h(e,p),[e,h]),x=u[3];return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:f,onPointerMove:g,onPointerUp:c,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:"20",height:"20",rx:"10",ry:"10"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:"10",y:"10.5",fill:x,fontSize:"6",letterSpacing:"0",children:d[0]}),n.jsx(K,{ref:m,text:d[1].split("\n"),className:"rmp-name__en",textAnchor:"middle",x:"10",y:"9.25",fill:x,fontSize:"2.5",letterSpacing:"0",lineHeight:2.25,grow:"down"})]})},T={names:["空港线","Konggang Line"],color:[S.Chongqing,"cq3","#003da5",B.white]},cn=[{type:"input",label:"panel.details.nodes.common.nameZh",value:o=>(o!=null?o:T).names[0],onChange:(o,e)=>{const t=e!=null?e:T;return t.names[0]=o.toString(),t}},{type:"textarea",label:"panel.details.nodes.common.nameEn",value:o=>(o!=null?o:T).names[1],onChange:(o,e)=>{const t=e!=null?e:T;return t.names[1]=o.toString(),t}},{type:"custom",label:"color",component:n.jsx(L,{type:b.ChongqingRTTextLineBadge,defaultTheme:T.color})}],dn=()=>n.jsx(A,{fields:cn}),mn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"4.5",y:"12.5",fill:"white",fontSize:"5",children:"空港线"}),n.jsx("text",{x:"4.5",y:"15",fill:"white",fontSize:"2",children:"Konggang Line"})]}),hn={component:rn,icon:mn,defaultAttrs:T,attrsComponent:dn,metadata:{displayName:"panel.details.nodes.chongqingRTTextLineBadge.displayName",tags:[]}},Z=11.84375,un=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=I.num,color:u=I.color,isBranch:m=I.isBranch}=l!=null?l:I,f=i.useCallback(D=>r(e,D),[e,r]),g=i.useCallback(D=>a(e,D),[e,a]),c=i.useCallback(D=>h(e,D),[e,h]),x=u[3]===B.black?"#003670":B.white,p=m?10:Z+(d>9?6.5:3),y=m?-1:0,C=m?11:Z+(d>9?7:3.5),N=m?6:Z/2+4;return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:f,onPointerMove:g,onPointerUp:c,style:{cursor:"move"},children:[n.jsx("rect",{fill:u[2],x:"0",width:Z+21,height:"16",rx:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:N,y:"13.5",fill:x,fontSize:"15",letterSpacing:"-1",children:d}),n.jsxs("text",{className:"rmp-name__zh",x:p,y:"9.5",fontSize:"6",fill:x,letterSpacing:y,children:["号线",m?"支线":""]}),n.jsxs("text",{className:"rmp-name__en",x:C,y:"13.5",fontSize:"3",fill:x,children:[m?"Branch":""," Line ",d]})]})},I={num:1,color:[S.Shenzhen,"sz1","#00b140",B.white],isBranch:!1},xn=o=>{const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(t.num),validator:a=>!Number.isNaN(a),onChange:a=>{t.num=Number(a),s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.ShenzhenMetroNumLineBadge,defaultTheme:I.color}),minW:"full"},{type:"switch",label:l("panel.details.nodes.shenzhenMetroNumLineBadge.branch"),oneLine:!0,isChecked:t.isBranch,onChange:a=>{t.isBranch=a,s(e,t)},minW:"full"}];return n.jsx(W,{fields:r})},gn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"2"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"1"}),n.jsx("text",{x:"11",y:"14",fill:"white",fontSize:"5",children:"号线"}),n.jsx("text",{x:"12",y:"17",fill:"white",fontSize:"3",children:"Line 1"})]}),pn={component:un,icon:gn,defaultAttrs:I,attrsComponent:xn,metadata:{displayName:"panel.details.nodes.shenzhenMetroNumLineBadge.displayName",tags:[]}},fn=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{num:d=O.num,color:u=O.color}=l!=null?l:O,m=i.useCallback(p=>r(e,p),[e,r]),f=i.useCallback(p=>a(e,p),[e,a]),g=i.useCallback(p=>h(e,p),[e,h]),c=u[3],x=u[2];return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:m,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("circle",{r:"6",fill:x}),n.jsx("text",{className:"rmp-name__mrt",textAnchor:"middle",x:"0",y:"0",width:"12",height:"12",fill:c,fontSize:"9",dominantBaseline:"central",letterSpacing:"-0.2",children:d})]})},O={num:1,color:[S.Singapore,"ewl","#009739",B.white]},bn=o=>{const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(t.num),validator:a=>!Number.isNaN(a),onChange:a=>{t.num=Number(a),s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.MRTDestinationNumbers,defaultTheme:O.color}),minW:"full"}];return n.jsx(W,{fields:r})},yn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"9",y:"17",fill:"white",fontSize:"14",children:"1"})]}),jn={component:fn,icon:yn,defaultAttrs:O,attrsComponent:bn,metadata:{displayName:"panel.details.nodes.mrtDestinationNumbers.displayName",tags:[]}},G=4,ee=7,Q=10,ae=5,Bn=5,w=Bn*Math.SQRT1_2,ne=.25,V=(w*Math.SQRT2-ne)/2*Math.SQRT2,Nn=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{names:d=k.names,num:u=k.num,color:m=k.color,crosshatchPatternFill:f=k.crosshatchPatternFill}=l!=null?l:k,g=i.useRef(null),[c,x]=i.useState({height:10,width:12});i.useEffect(()=>x(g.current.getBBox()),[...d,x,g]);const p=i.useCallback(N=>r(e,N),[e,r]),y=i.useCallback(N=>a(e,N),[e,a]),C=i.useCallback(N=>h(e,N),[e,h]);return n.jsxs("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")"),onPointerDown:p,onPointerMove:y,onPointerUp:C,style:{cursor:"move"},children:[n.jsxs("defs",{children:[n.jsxs("clipPath",{id:"jr_east_fill_pattern_clip_path",patternUnits:"userSpaceOnUse",children:[n.jsx("polygon",{points:"0,0 0,".concat(V," ").concat(V,",0")}),n.jsx("polygon",{points:"".concat(w,",").concat(w," ").concat(w-V,",").concat(w," ").concat(w,",").concat(w-V)})]}),n.jsxs("pattern",{id:"jr_east_".concat(e,"_fill_pattern_").concat(m[2]),width:w,height:w,patternUnits:"userSpaceOnUse",children:[n.jsx("rect",{width:w,height:w,fill:m[2]}),n.jsx("line",{x1:"0",y1:"0",x2:w,y2:w,stroke:"white",strokeWidth:ne,strokeOpacity:"33%",clipPath:"url(#jr_east_fill_pattern_clip_path)"}),n.jsx("line",{x1:w,y1:"0",x2:"0",y2:w,stroke:"white",strokeWidth:ne,strokeOpacity:"33%"})]})]}),n.jsx("rect",{fill:f?"url(#jr_east_".concat(e,"_fill_pattern_").concat(m[2],")"):m[2],x:"0",y:"-1",width:c.width+G+10,height:c.height+1,rx:"1",stroke:"black",strokeWidth:"0.25"}),n.jsx("circle",{r:G,cx:ee,cy:Q/2+1,stroke:"black",strokeWidth:"0.25",fill:m[3]}),n.jsx("text",{x:ee,y:Q/2+1.75,textAnchor:"middle",dominantBaseline:"middle",fill:m[3]==="#000"?"white":m[2],fontSize:u>9?7:8,className:"rmp-name__jreast_en",children:u}),n.jsx(K,{ref:g,text:d[0].split("\\"),x:ee+G+1,y:"-1",fill:m[3],fontSize:Q,lineHeight:Q,grow:"down",className:"rmp-name__jreast_ja"}),n.jsx(K,{text:d[1].split("\\"),textAnchor:"middle",dominantBaseline:"hanging",x:(c.width+G+10)/2,y:c.height+1,fontSize:ae,lineHeight:ae,baseOffset:0,grow:"down",className:"rmp-name__jreast_en"})]})},k={names:["山手線","Yamanote Line"],color:[S.Tokyo,"jy","#9ACD32",B.black],num:9,crosshatchPatternFill:!1},wn=o=>{const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(t.num),validator:a=>!Number.isNaN(a),onChange:a=>{t.num=Number(a),s(e,t)},minW:"full"},{type:"textarea",label:l("panel.details.nodes.common.nameJa"),value:t.names[0].replaceAll("\\","\n"),onChange:a=>{t.names[0]=a.replaceAll("\n","\\"),s(e,t)},minW:"full"},{type:"textarea",label:l("panel.details.nodes.common.nameEn"),value:t.names[1].replaceAll("\\","\n"),onChange:a=>{t.names[1]=a.replaceAll("\n","\\"),s(e,t)},minW:"full"},{type:"switch",label:l("panel.details.lines.jrEastLineBadge.crosshatchPatternFill"),oneLine:!0,isChecked:t.crosshatchPatternFill,onChange:a=>{t.crosshatchPatternFill=a,s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.JREastLineBadge,defaultTheme:k.color})}];return n.jsx(W,{fields:r})},Cn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"1",y:"6",width:"22",height:"7"}),n.jsx("circle",{cx:"3.5",cy:"9.25",r:"2",fill:"white"}),n.jsx("text",{x:"3",y:"10.5",fontSize:"3",children:"9"}),n.jsx("text",{x:"6",y:"11.25",fontSize:"5",fill:"white",children:"山手線"}),n.jsx("text",{x:"1.5",y:"16",fontSize:"3",children:"Yamanote Line"})]}),Sn={component:Nn,icon:Cn,defaultAttrs:k,attrsComponent:wn,metadata:{displayName:"panel.details.nodes.jrEastLineBadge.displayName",tags:[]}},Ln=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,{content:d=j.content,fontSize:u=j.fontSize,lineHeight:m=j.lineHeight,textAnchor:f=j.textAnchor,dominantBaseline:g=j.dominantBaseline,language:c=j.language,color:x=j.color,rotate:p=j.rotate,italic:y=j.italic,bold:C=j.bold}=l!=null?l:j,N=i.useRef(null),[D,te]=i.useState({x:0,y:0,width:32,height:16});i.useEffect(()=>te(N.current.getBBox()),[d,f,g,te,N]),i.useEffect(()=>{const v={mtr__zh:q.MTR,mtr__en:q.MTR,berlin:b.BerlinSBahnLineBadge,mrt:q.MRTBasic,jreast_ja:q.JREastBasic,jreast_en:q.JREastBasic}[c];if(v&&document.getElementById(le[v].cssName)===null){const oe=le[v].cssName,J=document.createElement("link");J.rel="stylesheet",J.id=oe,J.href="/rmp/styles/".concat(oe,".css"),document.head.append(J)}},[c]);const ie=i.useCallback(v=>r(e,v),[e,r]),se=i.useCallback(v=>a(e,v),[e,a]),re=i.useCallback(v=>h(e,v),[e,h]);return n.jsx("g",{id:e,transform:"translate(".concat(t,", ").concat(s,")rotate(").concat(p,")"),onPointerDown:ie,onPointerMove:se,onPointerUp:re,style:{cursor:"move"},children:n.jsx(K,{ref:N,text:d.split("\n"),lineHeight:m,grow:"down",className:"rmp-name__".concat(c),fontSize:u,textAnchor:f,dominantBaseline:g,fill:x[2],fontStyle:y,fontWeight:C})})},j={content:"Enter your text here",fontSize:16,lineHeight:16,textAnchor:"middle",dominantBaseline:"middle",language:"en",color:[S.Shanghai,"jsr","#000000",B.white],rotate:0,italic:"normal",bold:"normal"},zn=o=>{var a,h,d,u,m,f,g;const{id:e,attrs:t,handleAttrsUpdate:s}=o,{t:l}=F(),r=[{type:"textarea",label:l("panel.details.nodes.text.content"),value:(a=t.content)!=null?a:j.content,onChange:c=>{t.content=c.toString(),s(e,t)},minW:"full"},{type:"input",label:l("panel.details.nodes.text.fontSize"),value:((h=t.fontSize)!=null?h:j.fontSize).toString(),validator:c=>Number.isInteger(c)&&Number(c)>0,onChange:c=>{t.fontSize=Number(c),s(e,t)},minW:"full"},{type:"input",label:l("panel.details.nodes.text.lineHeight"),value:((d=t.lineHeight)!=null?d:j.lineHeight).toString(),validator:c=>Number.isInteger(c)&&Number(c)>0,onChange:c=>{t.lineHeight=Number(c),s(e,t)},minW:"full"},{type:"select",label:l("panel.details.nodes.text.textAnchor"),value:(u=t.textAnchor)!=null?u:j.textAnchor,options:{start:l("panel.details.nodes.text.start"),middle:l("panel.details.nodes.text.middle"),end:l("panel.details.nodes.text.end")},onChange:c=>{t.textAnchor=c,s(e,t)},minW:"full"},{type:"select",label:l("panel.details.nodes.text.dominantBaseline"),value:(m=t.dominantBaseline)!=null?m:j.dominantBaseline,options:{auto:l("panel.details.nodes.text.auto"),middle:l("panel.details.nodes.text.middle"),hanging:l("panel.details.nodes.text.hanging")},onChange:c=>{t.dominantBaseline=c,s(e,t)},minW:"full"},{type:"select",label:l("panel.details.nodes.text.language"),value:(f=t.language)!=null?f:j.language,options:{zh:l("panel.details.nodes.text.zh"),en:l("panel.details.nodes.text.en"),mtr__zh:l("panel.details.nodes.text.mtr__zh"),mtr__en:l("panel.details.nodes.text.mtr__en"),berlin:l("panel.details.nodes.text.berlin"),mrt:l("panel.details.nodes.text.mrt"),jreast_ja:l("panel.details.nodes.text.jreast_ja"),jreast_en:l("panel.details.nodes.text.jreast_en")},onChange:c=>{t.language=c.toString(),s(e,t)},minW:"full"},{type:"select",label:l("panel.details.nodes.text.rotate"),value:(g=t.rotate)!=null?g:j.rotate,options:{0:"0",45:"45",90:"90",135:"135",180:"180",225:"225",270:"270",315:"315"},onChange:c=>{t.rotate=Number(c),s(e,t)},minW:"full"},{type:"switch",label:l("panel.details.nodes.text.italic"),isChecked:t.italic==="italic",onChange:c=>{t.italic=c?"italic":"normal",s(e,t)},minW:"full"},{type:"switch",label:l("panel.details.nodes.text.bold"),isChecked:t.bold==="bold",onChange:c=>{t.bold=c?"bold":"normal",s(e,t)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:b.Text,defaultTheme:j.color})}];return n.jsx(W,{fields:r})},vn=n.jsx("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:n.jsx("text",{x:"12",y:"12",textAnchor:"middle",dominantBaseline:"middle",fontSize:"10",children:"Text"})}),Y={component:Ln,icon:vn,defaultAttrs:j,attrsComponent:zn,metadata:{displayName:"panel.details.nodes.text.displayName",tags:[]}},Pn=o=>{const{id:e,x:t,y:s,attrs:l,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h}=o,d=de();l.content=d(l.contents);const u=Y.component;return n.jsx(u,{id:e,x:t,y:s,handlePointerDown:r,handlePointerMove:a,handlePointerUp:h,attrs:l})},Tn={contents:{},...j},An={component:Pn,icon:Y.icon,defaultAttrs:Tn,attrsComponent:Y.attrsComponent,metadata:{displayName:"panel.details.nodes.i18nText.displayName",tags:[]}},Rn={[b.Virtual]:pe,[b.ShmetroNumLineBadge]:Be,[b.ShmetroTextLineBadge]:Se,[b.GzmtrLineBadge]:Pe,[b.BjsubwayNumLineBadge]:Me,[b.BjsubwayTextLineBadge]:Ie,[b.SuzhouRTNumLineBadge]:Oe,[b.BerlinSBahnLineBadge]:nn,[b.BerlinUBahnLineBadge]:Qe,[b.ChongqingRTNumLineBadge]:sn,[b.ChongqingRTTextLineBadge]:hn,[b.ShenzhenMetroNumLineBadge]:pn,[b.MRTDestinationNumbers]:jn,[b.JREastLineBadge]:Sn,[b.Facilities]:me,[b.Text]:Y,[b.I18nText]:An};export{Rn as m};
