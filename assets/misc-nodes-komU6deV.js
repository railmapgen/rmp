import{at as T,C,c as B,au as L,b as p,j as I}from"./index-AiiFDJKG.js";import{j as n}from"./chakra-sjIlidOs.js";import{b as a,u as q}from"./react-hBmrxY6U.js";import{L as ne,M as Y,d as te,t as G,c as oe,f as le}from"./stations-asPvsqDK.js";const ie=t=>{const{id:e,x:o,y:r,handlePointerDown:l,handlePointerMove:s,handlePointerUp:i}=t,m=a.useCallback(c=>l(e,c),[e,l]),d=a.useCallback(c=>s(e,c),[e,s]),h=a.useCallback(c=>i(e,c),[e,i]);return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")rotate(45)"),onPointerDown:m,onPointerMove:d,onPointerUp:h,style:{cursor:"move"},children:[n.jsx("line",{x1:"-5",y1:"0",x2:"5",y2:"0",stroke:"black"}),n.jsx("line",{x1:"0",y1:"-5",x2:"0",y2:"5",stroke:"black"}),n.jsx("circle",{id:"virtual_circle_".concat(e),r:5,stroke:"black",fill:"white",fillOpacity:"0"})]})},se={},ae=()=>n.jsx(T,{fields:[]}),re=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,transform:"rotate(45)",focusable:!1,children:[n.jsx("circle",{cx:"12",cy:"12",r:"6",stroke:"currentColor",fill:"none"}),n.jsx("line",{x1:"6",y1:"12",x2:"18",y2:"12",stroke:"currentColor"}),n.jsx("line",{x1:"12",y1:"6",x2:"12",y2:"18",stroke:"currentColor"})]}),ce={component:ie,icon:re,defaultAttrs:se,attrsComponent:ae,metadata:{displayName:"panel.details.nodes.virtual.displayName",tags:[]}},de=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=_.num,color:h=_.color}=l!=null?l:_,[c,y]=d>=10?[22.67,10.75]:[21,10],f=a.useCallback(x=>s(e,x),[e,s]),g=a.useCallback(x=>i(e,x),[e,i]),u=a.useCallback(x=>m(e,x),[e,m]);return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:f,onPointerMove:g,onPointerUp:u,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],width:c,height:"22.67"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:y,y:"19",fill:h[3],fontSize:"21.33",letterSpacing:"-1.75",children:d}),n.jsx("text",{className:"rmp-name__zh",x:c+2,y:"12",fontSize:"14.67",children:"号线"}),n.jsxs("text",{className:"rmp-name__en",x:c+4,y:"21.5",fontSize:"8",children:["Line ",d]})]})},_={num:1,color:[C.Shanghai,"sh1","#E4002B",B.white]},me=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:_).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:_;return Number.isNaN(t)||(o.num=Number(t)),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.ShmetroNumLineBadge,defaultTheme:_.color})}],he=()=>n.jsx(T,{fields:me}),ue=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"10",height:"16"}),n.jsx("text",{x:"4",y:"18",fill:"white",children:"1"}),n.jsx("text",{x:"14",y:"10",fontSize:"5",children:"号线"}),n.jsx("text",{x:"14",y:"18",fontSize:"4",children:"Line 1"})]}),xe={component:de,icon:ue,defaultAttrs:_,attrsComponent:he,metadata:{displayName:"panel.details.nodes.shmetroNumLineBadge.displayName",tags:[]}},ge=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{names:d=F.names,color:h=F.color}=l!=null?l:F,c=a.useRef(null),[y,f]=a.useState({width:12});a.useEffect(()=>f(c.current.getBBox()),[...d,f,c]);const g=a.useCallback(b=>s(e,b),[e,s]),u=a.useCallback(b=>i(e,b),[e,i]),x=a.useCallback(b=>m(e,b),[e,m]);return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:g,onPointerMove:u,onPointerUp:x,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:y.width+7,height:"21"}),n.jsxs("g",{ref:c,children:[n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",dominantBaseline:"hanging",x:(y.width+7)/2,y:"4",fontSize:"10",fill:h[3],letterSpacing:"-0.25",children:d[0]}),n.jsx("text",{className:"rmp-name__en",textAnchor:"middle",dominantBaseline:"hanging",x:(y.width+7)/2,y:"13",fontSize:"5",fill:h[3],letterSpacing:"-0.25",children:d[1]})]})]})},F={names:["浦江线","Pujiang Line"],color:[C.Shanghai,"pjl","#B5B5B6",B.white]},pe=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"textarea",label:l("panel.details.nodes.common.nameZh"),value:o.names[0],onChange:i=>{o.names[0]=i,r(e,o)},minW:"full"},{type:"input",label:l("panel.details.nodes.common.nameEn"),value:o.names[1],onChange:i=>{o.names[1]=i,r(e,o)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.ShmetroTextLineBadge,defaultTheme:F.color})}];return n.jsx(I,{fields:s})},fe=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"6",width:"20",height:"12"}),n.jsx("text",{x:"5",y:"11",fontSize:"5",fill:"white",children:"浦江线"}),n.jsx("text",{x:"3",y:"16",fontSize:"4",fill:"white",children:"Pujiang Line"})]}),ye={component:ge,icon:fe,defaultAttrs:F,attrsComponent:pe,metadata:{displayName:"panel.details.nodes.shmetroTextLineBadge.displayName",tags:[]}},be=t=>{var x,b;const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{names:d=k.names,color:h=k.color,tram:c=k.tram,span:y=k.span}=l!=null?l:k,f=a.useCallback(j=>s(e,j),[e,s]),g=a.useCallback(j=>i(e,j),[e,i]),u=a.useCallback(j=>m(e,j),[e,m]);return n.jsx("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")scale(").concat(c?.5:1,")"),onPointerDown:f,onPointerMove:g,onPointerUp:u,style:{cursor:"move"},children:n.jsx(ne,{zhName:(x=d.at(0))!=null?x:"",enName:(b=d.at(1))!=null?b:"",zhClassName:"rmp-name__zh",enClassName:"rmp-name__en",foregroundColour:h[3],backgroundColour:h[2],spanDigits:y})})},k={names:["1号线","Line 1"],color:[C.Guangzhou,"gz1","#F3D03E",B.black],tram:!1,span:!0},je=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"input",label:l("panel.details.nodes.common.nameZh"),value:o.names[0],onChange:i=>{o.names[0]=i,r(e,o)},minW:"full"},{type:"input",label:l("panel.details.nodes.common.nameEn"),value:o.names[1],onChange:i=>{o.names[1]=i,r(e,o)},minW:"full"},{type:"switch",label:l("panel.details.nodes.gzmtrLineBadge.tram"),oneLine:!0,isChecked:o.tram,onChange:i=>{o.tram=i,r(e,o)},minW:"full"},{type:"switch",label:l("panel.details.nodes.gzmtrLineBadge.span"),oneLine:!0,isChecked:o.span,onChange:i=>{o.span=i,r(e,o)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.GzmtrLineBadge,defaultTheme:k.color})}];return n.jsx(I,{fields:s})},Be=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"5",width:"20",height:"14",rx:"1"}),n.jsx("text",{x:"6",y:"15",textAnchor:"middle",fontSize:"10",fill:"white",children:"1"}),n.jsx("text",{x:"15",y:"12",textAnchor:"middle",fontSize:"6",fill:"white",children:"号线"}),n.jsx("text",{x:"14.5",y:"17",textAnchor:"middle",fontSize:"4",fill:"white",children:"Line 1"})]}),Ne={component:be,icon:Be,defaultAttrs:k,attrsComponent:je,metadata:{displayName:"panel.details.nodes.gzmtrLineBadge.displayName",tags:[]}},X=11.84375,we=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=$.num,color:h=$.color}=l!=null?l:$,c=a.useCallback(u=>s(e,u),[e,s]),y=a.useCallback(u=>i(e,u),[e,i]),f=a.useCallback(u=>m(e,u),[e,m]),g=h[3]===B.black?"#003670":B.white;return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:c,onPointerMove:y,onPointerUp:f,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:X+21,height:"16",rx:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:X/2+2,y:"13.5",fill:g,fontSize:"15",letterSpacing:"-1.5",children:d}),n.jsx("text",{className:"rmp-name__zh",x:X+(d>9?5.5:3),y:"8.5",fontSize:"7",fill:g,children:"号线"}),n.jsxs("text",{className:"rmp-name__en",x:X+(d>9?6:4.5),y:"13.5",fontSize:"4",fill:g,children:["Line ",d]})]})},$={num:1,color:[C.Beijing,"bj1","#c23a30",B.white]},Ce=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:$).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:$;return Number.isNaN(t)||(o.num=Number(t)),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.BjsubwayNumLineBadge,defaultTheme:$.color})}],Le=()=>n.jsx(T,{fields:Ce}),Se=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"2"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"1"}),n.jsx("text",{x:"11",y:"11",fill:"white",fontSize:"5",children:"号线"}),n.jsx("text",{x:"11",y:"17",fill:"white",fontSize:"4",children:"Line 1"})]}),ze={component:we,icon:Se,defaultAttrs:$,attrsComponent:Le,metadata:{displayName:"panel.details.nodes.bjsubwayNumLineBadge.displayName",tags:[]}},Pe=28.84375,Te=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{names:d=z.names,color:h=z.color}=l!=null?l:z,c=a.useRef(null),[y,f]=a.useState({width:12});a.useEffect(()=>f(c.current.getBBox()),[...d,f,c]);const g=a.useCallback(N=>s(e,N),[e,s]),u=a.useCallback(N=>i(e,N),[e,i]),x=a.useCallback(N=>m(e,N),[e,m]),b=Math.max(Pe,y.width),j=h[3]===B.black?"#003670":B.white;return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:g,onPointerMove:u,onPointerUp:x,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:b+4,height:"16",rx:"2"}),n.jsxs("g",{ref:c,children:[n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:(b+4)/2,y:"8",fontSize:"7",fill:j,children:d[0]}),n.jsx("text",{className:"rmp-name__en",textAnchor:"middle",x:(b+4)/2,y:"13.5",fontSize:"4",fill:j,children:d[1]})]})]})},z={names:["八通线","Batong Line"],color:[C.Beijing,"bj1","#c23a30",B.white]},ve=[{type:"input",label:"panel.details.nodes.common.nameZh",value:t=>(t!=null?t:z).names[0],onChange:(t,e)=>{const o=e!=null?e:z;return o.names[0]=t.toString(),o}},{type:"input",label:"panel.details.nodes.common.nameEn",value:t=>(t!=null?t:z).names[1],onChange:(t,e)=>{const o=e!=null?e:z;return o.names[1]=t.toString(),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.BjsubwayTextLineBadge,defaultTheme:z.color})}],ke=()=>n.jsx(T,{fields:ve}),Ae=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"6",width:"20",height:"12",rx:"2"}),n.jsx("text",{x:"3",y:"12",fontSize:"6",fill:"white",children:"八通线"}),n.jsx("text",{x:"3",y:"16",fontSize:"3.2",fill:"white",children:"Batong Line"})]}),Me={component:Te,icon:Ae,defaultAttrs:z,attrsComponent:ke,metadata:{displayName:"panel.details.nodes.bjsubwayTextLineBadge.displayName",tags:[]}},_e=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=S.num,branch:h=S.branch,color:c=S.color}=l!=null?l:S,y=a.useCallback(u=>s(e,u),[e,s]),f=a.useCallback(u=>i(e,u),[e,i]),g=a.useCallback(u=>m(e,u),[e,m]);return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:y,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:c[2],width:"20",height:"20",rx:"2",ry:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",dominantBaseline:"middle",x:"10",y:"11.4",fill:c[3],fontSize:"15",letterSpacing:"-1",children:d}),h&&n.jsxs(n.Fragment,{children:[n.jsx("text",{className:"rmp-name__zh",x:20+2.5,y:"10",fontSize:"10",children:"支线"}),n.jsx("text",{className:"rmp-name__en",x:20+2.5,y:"18",fontSize:"5",fill:"gray",children:"Branch line"})]})]})},S={num:1,branch:!1,color:[C.Suzhou,"sz1","#78BA25",B.white]},$e=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:S).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:S;return Number.isNaN(t)||(o.num=Number(t)),o}},{type:"switch",label:"panel.details.nodes.suzhouRTNumLineBadge.branch",isChecked:t=>{var e;return(e=t==null?void 0:t.branch)!=null?e:S.branch},onChange:(t,e)=>{const o=e!=null?e:S;return o.branch=t,o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.SuzhouRTNumLineBadge,defaultTheme:S.color})}],Ue=()=>n.jsx(T,{fields:$e}),De=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"4",y:"4",width:"16",height:"16",rx:"3",ry:"3"}),n.jsx("text",{x:"12",y:"13.4",textAnchor:"middle",dominantBaseline:"middle",fill:"white",fontSize:"14",children:"1"})]}),Re={component:_e,icon:De,defaultAttrs:S,attrsComponent:Ue,metadata:{displayName:"panel.details.nodes.suzhouRTNumLineBadge.displayName",tags:[]}},Ee=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=U.num,color:h=U.color}=l!=null?l:U,c=a.useCallback(u=>s(e,u),[e,s]),y=a.useCallback(u=>i(e,u),[e,i]),f=a.useCallback(u=>m(e,u),[e,m]),g=h[3];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:c,onPointerMove:y,onPointerUp:f,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:"25",height:"15"}),n.jsxs("text",{className:"rmp-name__berlin",textAnchor:"middle",x:"12.5",y:"12.5",fill:g,fontSize:"14",letterSpacing:"1",children:["U",d]})]})},U={num:1,color:[C.Berlin,"bu1","#62AD2D",B.white]},Ie=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:U).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:U;return Number.isNaN(t)||(o.num=Number(t)),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.BerlinUBahnLineBadge,defaultTheme:U.color})}],qe=()=>n.jsx(T,{fields:Ie}),We=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"U1"})]}),Fe={component:Ee,icon:We,defaultAttrs:U,attrsComponent:qe,metadata:{displayName:"panel.details.nodes.berlinUBahnLineBadge.displayName",tags:[]}},He=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=D.num,color:h=D.color}=l!=null?l:D,[c,y]=d>=10?[6,19.75]:[10,20],f=a.useCallback(b=>s(e,b),[e,s]),g=a.useCallback(b=>i(e,b),[e,i]),u=a.useCallback(b=>m(e,b),[e,m]),x=h[3];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:f,onPointerMove:g,onPointerUp:u,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:"30",height:"15",rx:"8"}),n.jsx("text",{className:"rmp-name__berlin",textAnchor:"middle",x:c,y:"12.5",fill:x,fontSize:"14",letterSpacing:"0",children:"S"}),n.jsx("text",{className:"rmp-name__berlin",textAnchor:"middle",x:y,y:"12.5",fill:x,fontSize:"14",letterSpacing:"-0.2",children:d})]})},D={num:1,color:[C.Berlin,"bs1","#DD6CA6",B.white]},Xe=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:D).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:D;return Number.isNaN(t)||(o.num=Number(t)),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.BerlinSBahnLineBadge,defaultTheme:D.color})}],Oe=()=>n.jsx(T,{fields:Xe}),Qe=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"8"}),n.jsx("text",{x:"4.5",y:"16.5",fill:"white",fontSize:"14",children:"S1"})]}),Je={component:He,icon:Qe,defaultAttrs:D,attrsComponent:Oe,metadata:{displayName:"panel.details.nodes.berlinSBahnLineBadge.displayName",tags:[]}},Ze=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=R.num,color:h=R.color}=l!=null?l:R,c=a.useCallback(j=>s(e,j),[e,s]),y=a.useCallback(j=>i(e,j),[e,i]),f=a.useCallback(j=>m(e,j),[e,m]),g=h[3],u=Number.isInteger(d)?16:15,[x,b]=Number.isInteger(d)?Number(d)>=10?[-1.2,1.5]:[0,5.5]:[0,2.55];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:c,onPointerMove:y,onPointerUp:f,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:"20",height:"20",rx:"10",ry:"10"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"left",x:b,y:"10",fill:g,fontSize:u,letterSpacing:x,dominantBaseline:"central",children:d})]})},R={num:1,color:[C.Chongqing,"cq1","#e4002b",B.white]},Ge=[{type:"input",label:"panel.details.nodes.common.num",value:t=>(t!=null?t:R).num,validator:t=>!Number.isNaN(t),onChange:(t,e)=>{const o=e!=null?e:R;return Number.isNaN(Number(t))?o.num=t:o.num=Number(t),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.ChongqingRTNumLineBadge,defaultTheme:R.color})}],Ve=()=>n.jsx(T,{fields:Ge}),Ye=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"8",y:"18",fill:"white",fontSize:"18",children:"1"})]}),Ke={component:Ze,icon:Ye,defaultAttrs:R,attrsComponent:Ve,metadata:{displayName:"panel.details.nodes.chongqingRTNumLineBadge.displayName",tags:[]}},en=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{names:d=P.names,color:h=P.color}=l!=null?l:P,c=a.useRef(null),y=a.useCallback(x=>s(e,x),[e,s]),f=a.useCallback(x=>i(e,x),[e,i]),g=a.useCallback(x=>m(e,x),[e,m]),u=h[3];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:y,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:"20",height:"20",rx:"10",ry:"10"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:"10",y:"10.5",fill:u,fontSize:"6",letterSpacing:"0",children:d[0]}),n.jsx(Y,{ref:c,text:d[1].split("\n"),className:"rmp-name__en",textAnchor:"middle",x:"10",y:"9.25",fill:u,fontSize:"2.5",letterSpacing:"0",lineHeight:2.25,grow:"down"})]})},P={names:["空港线","Konggang Line"],color:[C.Chongqing,"cq3","#003da5",B.white]},nn=[{type:"input",label:"panel.details.nodes.common.nameZh",value:t=>(t!=null?t:P).names[0],onChange:(t,e)=>{const o=e!=null?e:P;return o.names[0]=t.toString(),o}},{type:"textarea",label:"panel.details.nodes.common.nameEn",value:t=>(t!=null?t:P).names[1],onChange:(t,e)=>{const o=e!=null?e:P;return o.names[1]=t.toString(),o}},{type:"custom",label:"color",component:n.jsx(L,{type:p.ChongqingRTTextLineBadge,defaultTheme:P.color})}],tn=()=>n.jsx(T,{fields:nn}),on=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"4.5",y:"12.5",fill:"white",fontSize:"5",children:"空港线"}),n.jsx("text",{x:"4.5",y:"15",fill:"white",fontSize:"2",children:"Konggang Line"})]}),ln={component:en,icon:on,defaultAttrs:P,attrsComponent:tn,metadata:{displayName:"panel.details.nodes.chongqingRTTextLineBadge.displayName",tags:[]}},O=11.84375,sn=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=E.num,color:h=E.color,isBranch:c=E.isBranch}=l!=null?l:E,y=a.useCallback(v=>s(e,v),[e,s]),f=a.useCallback(v=>i(e,v),[e,i]),g=a.useCallback(v=>m(e,v),[e,m]),u=h[3]===B.black?"#003670":B.white,x=c?10:O+(d>9?6.5:3),b=c?-1:0,j=c?11:O+(d>9?7:3.5),N=c?6:O/2+4;return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:y,onPointerMove:f,onPointerUp:g,style:{cursor:"move"},children:[n.jsx("rect",{fill:h[2],x:"0",width:O+21,height:"16",rx:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"middle",x:N,y:"13.5",fill:u,fontSize:"15",letterSpacing:"-1",children:d}),n.jsxs("text",{className:"rmp-name__zh",x,y:"9.5",fontSize:"6",fill:u,letterSpacing:b,children:["号线",c?"支线":""]}),n.jsxs("text",{className:"rmp-name__en",x:j,y:"13.5",fontSize:"3",fill:u,children:[c?"Branch":""," Line ",d]})]})},E={num:1,color:[C.Shenzhen,"sz1","#00b140",B.white],isBranch:!1},an=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(o.num),validator:i=>!Number.isNaN(i),onChange:i=>{o.num=Number(i),r(e,o)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.ShenzhenMetroNumLineBadge,defaultTheme:E.color}),minW:"full"},{type:"switch",label:l("panel.details.nodes.shenzhenMetroNumLineBadge.branch"),oneLine:!0,isChecked:o.isBranch,onChange:i=>{o.isBranch=i,r(e,o)},minW:"full"}];return n.jsx(I,{fields:s})},rn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"4",width:"20",height:"16",rx:"2"}),n.jsx("text",{x:"4",y:"17",fill:"white",fontSize:"14",children:"1"}),n.jsx("text",{x:"11",y:"14",fill:"white",fontSize:"5",children:"号线"}),n.jsx("text",{x:"12",y:"17",fill:"white",fontSize:"3",children:"Line 1"})]}),cn={component:sn,icon:rn,defaultAttrs:E,attrsComponent:an,metadata:{displayName:"panel.details.nodes.shenzhenMetroNumLineBadge.displayName",tags:[]}},dn=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=H.num,color:h=H.color}=l!=null?l:H,c=a.useCallback(x=>s(e,x),[e,s]),y=a.useCallback(x=>i(e,x),[e,i]),f=a.useCallback(x=>m(e,x),[e,m]),g=h[3],u=h[2];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:c,onPointerMove:y,onPointerUp:f,style:{cursor:"move"},children:[n.jsx("circle",{r:"6",fill:u}),n.jsx("text",{className:"rmp-name__mrt",textAnchor:"middle",x:"0",y:"0",width:"12",height:"12",fill:g,fontSize:"9",dominantBaseline:"central",letterSpacing:"-0.2",children:d})]})},H={num:1,color:[C.Singapore,"ewl","#009739",B.white]},mn=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(o.num),validator:i=>!Number.isNaN(i),onChange:i=>{o.num=Number(i),r(e,o)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.MRTDestinationNumbers,defaultTheme:H.color}),minW:"full"}];return n.jsx(I,{fields:s})},hn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"2",rx:"10",ry:"10",width:"20",height:"20"}),n.jsx("text",{x:"9",y:"17",fill:"white",fontSize:"14",children:"1"})]}),un={component:dn,icon:hn,defaultAttrs:H,attrsComponent:mn,metadata:{displayName:"panel.details.nodes.mrtDestinationNumbers.displayName",tags:[]}},Q=4,V=7,J=10,ee=5,xn=5,w=xn*Math.SQRT1_2,K=.25,Z=(w*Math.SQRT2-K)/2*Math.SQRT2,gn=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{names:d=A.names,num:h=A.num,color:c=A.color,crosshatchPatternFill:y=A.crosshatchPatternFill}=l!=null?l:A,f=a.useRef(null),[g,u]=a.useState({height:10,width:12});a.useEffect(()=>u(f.current.getBBox()),[...d,u,f]);const x=a.useCallback(N=>s(e,N),[e,s]),b=a.useCallback(N=>i(e,N),[e,i]),j=a.useCallback(N=>m(e,N),[e,m]);return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:x,onPointerMove:b,onPointerUp:j,style:{cursor:"move"},children:[n.jsxs("defs",{children:[n.jsxs("clipPath",{id:"jr_east_fill_pattern_clip_path",patternUnits:"userSpaceOnUse",children:[n.jsx("polygon",{points:"0,0 0,".concat(Z," ").concat(Z,",0")}),n.jsx("polygon",{points:"".concat(w,",").concat(w," ").concat(w-Z,",").concat(w," ").concat(w,",").concat(w-Z)})]}),n.jsxs("pattern",{id:"jr_east_".concat(e,"_fill_pattern_").concat(c[2]),width:w,height:w,patternUnits:"userSpaceOnUse",children:[n.jsx("rect",{width:w,height:w,fill:c[2]}),n.jsx("line",{x1:"0",y1:"0",x2:w,y2:w,stroke:"white",strokeWidth:K,strokeOpacity:"33%",clipPath:"url(#jr_east_fill_pattern_clip_path)"}),n.jsx("line",{x1:w,y1:"0",x2:"0",y2:w,stroke:"white",strokeWidth:K,strokeOpacity:"33%"})]})]}),n.jsx("rect",{fill:y?"url(#jr_east_".concat(e,"_fill_pattern_").concat(c[2],")"):c[2],x:"0",y:"-1",width:g.width+Q+10,height:g.height+1,rx:"1",stroke:"black",strokeWidth:"0.25"}),n.jsx("circle",{r:Q,cx:V,cy:J/2+1,stroke:"black",strokeWidth:"0.25",fill:c[3]}),n.jsx("text",{x:V,y:J/2+1.75,textAnchor:"middle",dominantBaseline:"middle",fill:c[3]==="#000"?"white":c[2],fontSize:h>9?7:8,className:"rmp-name__jreast_en",children:h}),n.jsx(Y,{ref:f,text:d[0].split("\\"),x:V+Q+1,y:"-1",fill:c[3],fontSize:J,lineHeight:J,grow:"down",className:"rmp-name__jreast_ja"}),n.jsx(Y,{text:d[1].split("\\"),textAnchor:"middle",dominantBaseline:"hanging",x:(g.width+Q+10)/2,y:g.height+1,fontSize:ee,lineHeight:ee,baseOffset:0,grow:"down",className:"rmp-name__jreast_en"})]})},A={names:["山手線","Yamanote Line"],color:[C.Tokyo,"jy","#9ACD32",B.black],num:9,crosshatchPatternFill:!1},pn=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"input",label:l("panel.details.nodes.common.num"),value:String(o.num),validator:i=>!Number.isNaN(i),onChange:i=>{o.num=Number(i),r(e,o)},minW:"full"},{type:"textarea",label:l("panel.details.nodes.common.nameJa"),value:o.names[0].replaceAll("\\","\n"),onChange:i=>{o.names[0]=i.replaceAll("\n","\\"),r(e,o)},minW:"full"},{type:"textarea",label:l("panel.details.nodes.common.nameEn"),value:o.names[1].replaceAll("\\","\n"),onChange:i=>{o.names[1]=i.replaceAll("\n","\\"),r(e,o)},minW:"full"},{type:"switch",label:l("panel.details.nodes.jrEastLineBadge.crosshatchPatternFill"),oneLine:!0,isChecked:o.crosshatchPatternFill,onChange:i=>{o.crosshatchPatternFill=i,r(e,o)},minW:"full"},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.JREastLineBadge,defaultTheme:A.color})}];return n.jsx(I,{fields:s})},fn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"1",y:"6",width:"22",height:"7"}),n.jsx("circle",{cx:"3.5",cy:"9.25",r:"2",fill:"white"}),n.jsx("text",{x:"3",y:"10.5",fontSize:"3",children:"9"}),n.jsx("text",{x:"6",y:"11.25",fontSize:"5",fill:"white",children:"山手線"}),n.jsx("text",{x:"1.5",y:"16",fontSize:"3",children:"Yamanote Line"})]}),yn={component:gn,icon:fn,defaultAttrs:A,attrsComponent:pn,metadata:{displayName:"panel.details.nodes.jrEastLineBadge.displayName",tags:[]}},bn=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,{num:d=M.num,numEn:h=M.numEn,color:c=M.color,showText:y=M.showText}=l!=null?l:M,f=a.useCallback(W=>s(e,W),[e,s]),g=a.useCallback(W=>i(e,W),[e,i]),u=a.useCallback(W=>m(e,W),[e,m]),x=c[3],[b,j,N,v]=Number(d)>=10?[-2.4,0,10.25,20]:[0,4,10,22];return n.jsxs("g",{id:e,transform:"translate(".concat(o,", ").concat(r,")"),onPointerDown:f,onPointerMove:g,onPointerUp:u,style:{cursor:"move"},children:[n.jsx("rect",{fill:c[2],x:"0",width:"20",height:"20",rx:"2",ry:"2"}),n.jsx("text",{className:"rmp-name__zh",textAnchor:"left",x:j,y:N,fill:x,fontSize:v,fontWeight:"bold",letterSpacing:b,dominantBaseline:"central",children:d}),y&&n.jsxs(n.Fragment,{children:[n.jsx("text",{className:"rmp-name__zh",x:"22",y:"10.5",fontSize:"13",children:"号线"}),n.jsxs("text",{className:"rmp-name__en",x:"22.5",y:"19.5",fontSize:"8",children:["Line ",h]})]})]})},M={num:1,numEn:"1",showText:!0,color:[C.Qingdao,"qd1","#eaaa00",B.white]},jn=t=>{const{id:e,attrs:o,handleAttrsUpdate:r}=t,{t:l}=q(),s=[{type:"input",label:l("panel.details.nodes.common.num"),value:o.num.toString(),onChange:i=>{o.num=Number(i),o.numEn=i,r(e,o)}},{type:"input",label:l("panel.details.nodes.qingdaoMetroNumLineBadge.numEn"),value:o.numEn.toString(),onChange:i=>{o.numEn=i,r(e,o)}},{type:"switch",label:l("panel.details.nodes.qingdaoMetroNumLineBadge.showText"),isChecked:o.showText,oneLine:!0,onChange:i=>{o.showText=i,r(e,o)}},{type:"custom",label:l("color"),component:n.jsx(L,{type:p.QingdaoMetroNumLineBadge,defaultTheme:M.color})}];return n.jsx(I,{fields:s,minW:"full"})},Bn=n.jsxs("svg",{viewBox:"0 0 24 24",height:40,width:40,focusable:!1,children:[n.jsx("rect",{fill:"currentColor",x:"2",y:"6",rx:"1",ry:"1",width:"10",height:"10"}),n.jsx("text",{x:"4",y:"15",fill:"white",fontSize:"12",children:"1"}),n.jsx("text",{x:"12",y:"11.5",fill:"black",fontSize:"6",children:"号线"}),n.jsx("text",{x:"12",y:"15.5",fill:"black",fontSize:"4",children:"Line1"})]}),Nn={component:bn,icon:Bn,defaultAttrs:M,attrsComponent:jn,metadata:{displayName:"panel.details.nodes.qingdaoMetroNumLineBadge.displayName",tags:[]}},wn=t=>{const{id:e,x:o,y:r,attrs:l,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m}=t,d=oe();l.content=d(l.contents);const h=G.component;return n.jsx(h,{id:e,x:o,y:r,handlePointerDown:s,handlePointerMove:i,handlePointerUp:m,attrs:l})},Cn={contents:{},...te},Ln={component:wn,icon:G.icon,defaultAttrs:Cn,attrsComponent:G.attrsComponent,metadata:{displayName:"panel.details.nodes.i18nText.displayName",tags:[]}},vn={[p.Virtual]:ce,[p.ShmetroNumLineBadge]:xe,[p.ShmetroTextLineBadge]:ye,[p.GzmtrLineBadge]:Ne,[p.BjsubwayNumLineBadge]:ze,[p.BjsubwayTextLineBadge]:Me,[p.SuzhouRTNumLineBadge]:Re,[p.BerlinSBahnLineBadge]:Je,[p.BerlinUBahnLineBadge]:Fe,[p.ChongqingRTNumLineBadge]:Ke,[p.ChongqingRTTextLineBadge]:ln,[p.ShenzhenMetroNumLineBadge]:cn,[p.MRTDestinationNumbers]:un,[p.JREastLineBadge]:yn,[p.QingdaoMetroNumLineBadge]:Nn,[p.Facilities]:le,[p.Text]:G,[p.I18nText]:Ln};export{vn as m};
