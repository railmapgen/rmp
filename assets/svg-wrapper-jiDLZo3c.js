import{j as k}from"./chakra-h-ATOMu2.js";import{m as _,H as oe,l as O,f as me,a as F,ab as W,ac as q,ad as U,ae as ue,af as fe,q as be,t as ie,S as we,b as Ee,n as ce,o as X,r as ae,E as le,v as de,x as Z,K as Ne,F as ne,D as Ce,a0 as Pe,a2 as Ie}from"./index-LVKmZ1vF.js";import{b as v}from"./react-hBmrxY6U.js";import{u as j,e as Me,i as je}from"./clipboard-nJMJqSWt.js";import{s as ve,u as _e,F as G}from"./stations-p4lqCXjB.js";import{a as T,r as z,g as Le,f as Ke,p as D,b as De,d as We,i as B}from"./helpers-QRaYxeb3.js";import{m as Ae}from"./misc-nodes-AAWcmHwJ.js";const ye=t=>t.filterNodes((e,r)=>e.startsWith("stn")).map(e=>[e,t.getNodeAttributes(e)]).filter(([e,r])=>r.visible).sort((e,r)=>e[1].zIndex-r[1].zIndex).map(([e,r])=>({node:e,visible:r.visible,zIndex:r.zIndex,x:r.x,y:r.y,type:r.type,[r.type]:r[r.type]})),xe=t=>t.filterDirectedEdges((e,r,c,n,d,u,f)=>e.startsWith("line")&&r.visible&&r.reconcileId==="").sort((e,r)=>t.getEdgeAttribute(e,"zIndex")-t.getEdgeAttribute(r,"zIndex")).map(e=>{const r=t.getEdgeAttribute(e,"type"),c=t.getEdgeAttribute(e,r),n=t.getEdgeAttribute(e,"style"),d=t.getEdgeAttribute(e,n),[u,f]=t.extremities(e),y=t.getNodeAttributes(u),x=t.getNodeAttributes(f);return{edge:e,x1:y.x,y1:y.y,x2:x.x,y2:x.y,type:r,attr:c,style:n,styleAttr:d}}),ge=t=>t.filterNodes((e,r)=>e.startsWith("misc_node")).map(e=>[e,t.getNodeAttributes(e)]).filter(([e,r])=>r.visible).sort((e,r)=>e[1].zIndex-r[1].zIndex).map(([e,r])=>({node:e,visible:r.visible,zIndex:r.zIndex,x:r.x,y:r.y,type:r.type,[r.type]:r[r.type]})),ze=t=>{const e=t.filterDirectedEdges((c,n,d,u,f,y,x)=>c.startsWith("line")&&n.reconcileId!==""),r={};for(const c of e){const n=t.getEdgeAttribute(c,"reconcileId");n in r?r[n].push(c):r[n]=[c]}return r},Te=t=>{const e=ze(t),r=[],c=[];return Object.values(e).forEach(n=>{var L;if(n.length===1){c.push(...n);return}const d=t.getEdgeAttribute(n.at(0),"type");if(!n.every(p=>t.getEdgeAttribute(p,"type")===d)){c.push(...n);return}const u=t.getEdgeAttribute(n.at(0),"style");if(!n.every(p=>t.getEdgeAttribute(p,"style")===u)){c.push(...n);return}const f={},y=new Set,x=new Set,b=Object.fromEntries(n.map(p=>{var R,$;const[I,M]=t.extremities(p);return f[I]=((R=f[I])!=null?R:0)+1,f[M]=(($=f[M])!=null?$:0)+1,y.add(I),x.add(M),[I,[p,M]]})),A=Array.from(y).filter(p=>f[p]===1),N=Array.from(x).filter(p=>f[p]===1);if(A.length!==1||N.length!==1){c.push(...n);return}const C=A[0],P=N[0];if(C===P){c.push(...n);return}const E=[b[C][0]];let S=b[C][1];for(let p=1;p<n.length;p=p+1){const I=(L=b[S])==null?void 0:L.at(1);if(!I){c.push(...n);return}E.push(b[S][0]),S=I}if(S!==P||E.length!==n.length){c.push(...n);return}r.push(E)}),{allReconciledLines:r,danglingLines:c}},$e=(t,e)=>{if(!e.every(n=>t.hasEdge(n)))return;const r=e.map(n=>{var A,N,C;const[d,u]=t.extremities(n),f=t.getNodeAttributes(d),y=t.getNodeAttributes(u),x=t.getEdgeAttribute(n,"type"),b=(A=t.getEdgeAttribute(n,x))!=null?A:_[x].defaultAttrs;return(C=(N=_[x])==null?void 0:N.generatePath(f.x,y.x,f.y,y.y,b))!=null?C:"M ".concat(f.x," ").concat(f.y," L ").concat(y.x," ").concat(y.y)});let c="".concat(r[0]," ");for(let n=1;n<e.length;n=n+1)c+=r[n].replace(/M\s*-?\d+(\.\d+)?(\s*|,)-?\d+(\.*\d+)?\s*/i,"");return c},he=t=>{const{id:e,x:r,y:c,handlePointerDown:n,handlePointerMove:d,handlePointerUp:u}=t,f=v.useCallback(b=>n(e,b),[e,n]),y=v.useCallback(b=>d(e,b),[e,d]),x=v.useCallback(b=>u(e,b),[e,u]);return k.jsx("g",{id:e,transform:"translate(".concat(r-6.4," ").concat(c-6.4,")scale(0.025)"),onPointerDown:f,onPointerMove:y,onPointerUp:x,style:{cursor:"move"},children:k.jsx("path",{id:"stn_core_".concat(e),fillRule:"evenodd",clipRule:"evenodd",d:"M256 0c70.69 0 134.7 28.66 181.02 74.98C483.34 121.31 512 185.31 512 256c0 70.69-28.66 134.7-74.98 181.02C390.7 483.34 326.69 512 256 512c-70.69 0-134.69-28.66-181.02-74.98C28.66 390.7 0 326.69 0 256c0-70.69 28.66-134.69 74.98-181.02C121.31 28.66 185.31 0 256 0zm-21.91 302.69v-2.07c.16-13.72 1.51-24.59 4.15-32.67 2.59-8.08 6.32-14.65 11.18-19.63 4.87-5.02 10.72-9.58 17.56-13.72 4.4-2.8 8.39-5.9 11.91-9.37 3.52-3.42 6.32-7.41 8.38-11.91 2.07-4.46 3.11-9.42 3.11-14.91 0-6.53-1.55-12.18-4.66-16.99-3.05-4.77-7.19-8.44-12.27-11.08-5.13-2.59-10.82-3.89-17.09-3.89-5.65 0-11.03 1.15-16.21 3.53-5.12 2.33-9.42 6-12.79 10.97-3.36 4.98-5.33 11.35-5.85 19.11h-33.56c.53-13.21 3.89-24.39 10.05-33.55 6.21-9.16 14.4-16.11 24.55-20.82 10.2-4.71 21.49-7.04 33.81-7.04 13.57 0 25.38 2.48 35.52 7.56 10.15 5.02 18.08 12.06 23.72 21.08 5.59 9 8.44 19.47 8.44 31.48 0 8.23-1.29 15.64-3.88 22.21-2.59 6.58-6.22 12.48-10.98 17.61-4.77 5.18-10.41 9.73-17.03 13.67-6.27 3.94-11.35 7.97-15.18 12.17-3.88 4.19-6.68 9.17-8.44 14.86-1.76 5.74-2.75 12.84-2.9 21.33v2.07h-31.54zm16.68 70.67c-6.06 0-11.24-2.18-15.59-6.48-4.34-4.29-6.47-9.53-6.47-15.63 0-6.01 2.12-11.19 6.47-15.49 4.35-4.3 9.53-6.47 15.59-6.47 5.95 0 11.12 2.19 15.48 6.47 4.39 4.31 6.58 9.48 6.58 15.49 0 4.04-1.05 7.76-3.06 11.08-2.02 3.35-4.66 6.07-7.97 8.03-3.31 1.96-6.99 3-11.03 3z"})})},Se=t=>{const{id:e,path:r,handleClick:c}=t,n=v.useCallback(d=>c(e,d),[e,c]);return k.jsx("path",{id:e,d:r,fill:"none",stroke:"grey",strokeWidth:"5",strokeLinecap:"round",cursor:"pointer",onClick:n})},re=t=>{var P,E;const{id:e,type:r,attrs:c=_[r].defaultAttrs,styleType:n,styleAttrs:d=oe[n].defaultAttrs,newLine:u,handleClick:f}=t,{x1:y,y1:x,x2:b,y2:A}=t,N=v.useMemo(()=>Be(e,r,y,x,b,A,c),[r,JSON.stringify(c),y,b,x,A]),C=(E=(P=oe[n])==null?void 0:P.component)!=null?E:Se;return k.jsx(C,{id:e,type:r,path:N,styleAttrs:d,newLine:u,handleClick:f})},Be=(t,e,r,c,n,d,u)=>{if(!(e in _))return"M ".concat(r," ").concat(c," L ").concat(n," ").concat(d);const f=Oe(t,e,r,c,n,d,u);if(f){const{x1:y,y1:x,x2:b,y2:A,offset:N}=f;return _[O.Simple].generatePath(y,b,x,A,{offset:N})}return _[e].generatePath(r,n,c,d,u)},Oe=(t,e,r,c,n,d,u)=>{if(!("offsetFrom"in u)||!("offsetTo"in u)||Number.isNaN(u.offsetFrom)||Number.isNaN(u.offsetTo))return;if(u.offsetFrom===u.offsetTo)return pe(e,r,c,n,d)?{x1:r,y1:c,x2:n,y2:d,offset:u.offsetFrom}:void 0;const[f,y]=[u.offsetFrom,u.offsetTo];for(let x=0;x<Math.PI;x+=Math.PI/8)for(let b=x,A=0;A<2;A++,b+=Math.PI){const[N,C,P,E]=[Math.sin(x)*f,Math.cos(x)*f,Math.sin(b)*y,Math.cos(b)*y];if(pe(e,r+N,c+C,n+P,d+E))return{x1:r+N,y1:c+C,x2:n+P,y2:d+E,offset:0}}},pe=(t,e,r,c,n)=>!!((e===c||r===n)&&[O.Diagonal,O.Perpendicular].includes(t)||Math.abs((n-r)/(c-e))===1&&[O.Diagonal,O.RotatePerpendicular].includes(t)),Re=()=>{const t=me(),e=v.useRef(window.graph),{telemetry:{project:r}}=F(a=>a.app),{svgViewBoxZoom:c}=F(a=>a.param),{selected:n,refresh:{nodes:d,edges:u},mode:f,active:y,keepLastPath:x,theme:b}=F(a=>a.runtime),[A,N]=v.useState({x:0,y:0}),[C,P]=v.useState({x:0,y:0}),E=j((a,g)=>{g.stopPropagation(),f==="select"&&t(W("free"));const s=g.currentTarget,{x:o,y:i}=T(g);s.setPointerCapture(g.pointerId),N({x:o,y:i}),t(q(a)),g.shiftKey?n.has(a)?t(ue(a)):t(fe(a)):n.has(a)||t(U(new Set([a])))}),S=j((a,g)=>{const{x:s,y:o}=T(g);f==="free"&&y===a?(n.forEach(i=>{e.current.hasNode(i)&&e.current.updateNodeAttributes(i,h=>({...h,x:z(h.x-(A.x-s)*c/100,g.altKey?1:5),y:z(h.y-(A.y-o)*c/100,g.altKey?1:5)}))}),t(be()),t(ie())):f.startsWith("line")&&P({x:(A.x-s)*c/100,y:(A.y-o)*c/100})}),L=j((a,g)=>{if(f.startsWith("line")){x||t(W("free"));const s=[...Object.values(we),Ee.Virtual],o=e.current.hasNode(y)&&s.includes(e.current.getNodeAttribute(y,"type"));["stn_core_","virtual_circle_"].forEach(h=>{var K,V;const l=(V=(K=document.elementsFromPoint(g.clientX,g.clientY)[0].attributes)==null?void 0:K.getNamedItem("id"))==null?void 0:V.value,w=l==null?void 0:l.startsWith(h);if(o&&w){const Y=f.slice(5),ke="line_".concat(ce(10));e.current.addDirectedEdgeWithKey(ke,y,l.slice(h.length),{visible:!0,zIndex:0,type:Y,[Y]:structuredClone(_[Y].defaultAttrs),style:X.SingleColor,[X.SingleColor]:{color:b},reconcileId:""}),r&&ae.event(le.ADD_LINE,{type:Y})}}),t(ie()),t(de(e.current.export()))}else if(f==="free"&&y){const{x:s,y:o}=T(g);A.x-s===0&&A.y-o===0||t(de(e.current.export()))}t(q(void 0))}),p=j((a,g)=>{g.shiftKey||t(Z()),g.shiftKey&&n.has(a)?t(ue(a)):t(fe(a))}),[I,M]=v.useState(ye(e.current)),[R,$]=v.useState(ge(e.current)),[H,J]=v.useState(xe(e.current)),[Q,ee]=v.useState([]),[te,se]=v.useState([]);return v.useEffect(()=>{M(ye(e.current)),$(ge(e.current))},[d]),v.useEffect(()=>{J(xe(e.current));const{allReconciledLines:a,danglingLines:g}=Te(e.current);ee(a),se(g)},[u]),k.jsxs(k.Fragment,{children:[te.map(a=>{const[g,s]=e.current.extremities(a),o=e.current.getNodeAttributes(g),i=e.current.getNodeAttributes(s);return k.jsx(re,{id:a,x1:o.x,y1:o.y,x2:i.x,y2:i.y,newLine:!1,type:O.Simple,attrs:_[O.Simple].defaultAttrs,styleType:X.SingleColor,styleAttrs:{color:["","","#c0c0c0","#fff"]},handleClick:p},a)}),Q.map(a=>{var l,w;const g=$e(e.current,a);if(!g)return k.jsx(k.Fragment,{});const s=a.at(0),o=e.current.getEdgeAttribute(s,"type"),i=e.current.getEdgeAttribute(s,"style"),h=e.current.getEdgeAttribute(s,i),m=(w=(l=oe[i])==null?void 0:l.component)!=null?w:Se;return k.jsx(m,{id:s,type:o,path:g,styleAttrs:h,newLine:!1,handleClick:p},s)}),H.map(({edge:a,x1:g,y1:s,x2:o,y2:i,type:h,attr:m,style:l,styleAttr:w})=>k.jsx(re,{id:a,x1:g,y1:s,x2:o,y2:i,newLine:!1,type:h,attrs:m,styleType:l,styleAttrs:w,handleClick:p},a)),R.map(a=>{var m,l;const{node:g,x:s,y:o,type:i}=a,h=(l=(m=Ae[i])==null?void 0:m.component)!=null?l:he;return k.jsx(h,{id:g,x:s,y:o,attrs:a[i],handlePointerDown:E,handlePointerMove:S,handlePointerUp:L},g)}),I.map(a=>{var m,l;const{node:g,x:s,y:o,type:i}=a,h=(l=(m=ve[i])==null?void 0:m.component)!=null?l:he;return k.jsx(h,{id:g,x:s,y:o,attrs:{[i]:a[i]},handlePointerDown:E,handlePointerMove:S,handlePointerUp:L},g)}),f.startsWith("line")&&y&&k.jsx(re,{id:"create_in_progress___no_use",x1:e.current.getNodeAttribute(y,"x"),y1:e.current.getNodeAttribute(y,"y"),x2:e.current.getNodeAttribute(y,"x")-C.x,y2:e.current.getNodeAttribute(y,"y")-C.y,newLine:!0,type:f.slice(5),attrs:_[f.slice(5)].defaultAttrs,styleType:X.SingleColor,styleAttrs:{color:b}})]})},qe=()=>{const t=me(),e=v.useRef(window.graph),r=()=>{t(be()),t(ie()),t(de(e.current.export()))},{telemetry:{project:c}}=F(s=>s.app),{svgViewBoxZoom:n,svgViewBoxMin:d}=F(s=>s.param),{mode:u,lastTool:f,active:y,selected:x,keepLastPath:b,theme:A,refresh:{nodes:N}}=F(s=>s.runtime),C=_e(),{height:P,width:E}=Le(C);v.useEffect(()=>{const s=Ke(e.current);Object.entries(s).filter(([o,i])=>i&&o in G).map(([o,i])=>o).filter(o=>G[o]&&document.getElementById(G[o].cssName)===null).map(o=>G[o].cssName).filter((o,i,h)=>i===h.findIndex(m=>m===o)).forEach(o=>{const i=document.createElement("link");i.rel="stylesheet",i.id=o,i.href="/rmp/styles/".concat(o,".css"),document.head.append(i)})},[N]);const[S,L]=v.useState({x:0,y:0}),[p,I]=v.useState({x:0,y:0}),[M,R]=v.useState({x:0,y:0}),[$,H]=v.useState({x:0,y:0}),J=j(s=>{const{x:o,y:i}=T(s);if(u.startsWith("station")){t(W("free"));const h=ce(10),m="stn_".concat(h),l=u.slice(8),w=structuredClone(ve[l].defaultAttrs);"color"in w&&(w.color=A);const{x:K,y:V}=D(o,i,n,d);e.current.addNode(m,{visible:!0,zIndex:0,x:z(K,5),y:z(V,5),type:l,[l]:w}),r(),c&&ae.event(le.ADD_STATION,{type:l}),t(U(new Set([m])))}else if(u.startsWith("misc-node")){t(W("free"));const h=ce(10),m="misc_node_".concat(h),l=u.slice(10),{x:w,y:K}=D(o,i,n,d);e.current.addNode(m,{visible:!0,zIndex:0,x:z(w,5),y:z(K,5),type:l,[l]:structuredClone(Ae[l].defaultAttrs)}),r(),c&&ae.event(le.ADD_STATION,{type:l}),t(U(new Set([m])))}else u==="free"||u.startsWith("line")?(u.startsWith("line")&&(t(W("free")),b&&t(Ne(!1))),R({x:o,y:i}),H(d),s.shiftKey||(t(q("background")),t(Z()))):u==="select"&&(L(D(o,i,n,d)),I(D(o,i,n,d)))}),Q=j(s=>{if(u==="select"){if(S.x!=0&&S.y!=0){const{x:o,y:i}=T(s);I(D(o,i,n,d))}}else if(y==="background"){const{x:o,y:i}=T(s);t(ne({x:$.x+(M.x-o)*n/100,y:$.y+(M.y-i)*n/100}))}}),ee=j(s=>{if(u==="select"){const{x:o,y:i}=T(s),{x:h,y:m}=D(o,i,n,d),l=De(e.current,S.x,S.y,h,m),w=We(e.current,new Set(l));t(U(new Set([...s.shiftKey?x:[],...l,...w]))),t(W("free")),L({x:0,y:0}),I({x:0,y:0})}y==="background"&&!s.shiftKey&&t(q(void 0))}),te=j(s=>{let o=n;s.deltaY>0&&n+10<400?o=n+10:s.deltaY<0&&n-10>0&&(o=n-10),t(Ce(o));const{x:i,y:h}=T(s),m=s.currentTarget.getBoundingClientRect(),[l,w]=[i/m.width,h/m.height];t(ne({x:d.x+i*n/100-E*o/100*l,y:d.y+h*n/100-P*o/100*w}))}),se=j(async s=>{if(B?s.key==="Backspace":s.key==="Delete")x.size>0&&(x.forEach(o=>{e.current.hasNode(o)?e.current.dropNode(o):e.current.hasEdge(o)&&e.current.dropEdge(o)}),t(Z()),r());else if(s.key.startsWith("Arrow")){const i=s.key.endsWith("Left")?-1:s.key.endsWith("Right")?1:0,h=s.key.endsWith("Up")?-1:s.key.endsWith("Down")?1:0;t(ne(D(100*i,100*h,n,d)))}else if(s.key==="i"||s.key==="j"||s.key==="k"||s.key==="l"){const i=(s.key==="j"?-1:s.key==="l"?1:0)*10,h=(s.key==="i"?-1:s.key==="k"?1:0)*10;x.size>0&&x.forEach(m=>{e.current.hasNode(m)&&(e.current.updateNodeAttribute(m,"x",l=>(l!=null?l:0)+i),e.current.updateNodeAttribute(m,"y",l=>(l!=null?l:0)+h),r())})}else if(s.key==="f"&&f)t(W(f));else if(s.key==="z"&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey))B&&s.preventDefault(),t(Pe());else if(s.key==="s")t(W("select"));else if((s.key==="c"||s.key==="x")&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey)){const o=Me(e.current,x);navigator.clipboard.writeText(o),s.key==="x"&&(t(Z()),x.forEach(i=>{e.current.hasNode(i)?e.current.dropNode(i):e.current.hasEdge(i)&&e.current.dropEdge(i)}),r())}else if(s.key==="v"&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey)){const o=await navigator.clipboard.readText(),{x:i,y:h}=D(E/2,P/2,n,d),{nodes:m,edges:l}=je(o,e.current,z(i,5),z(h,5));r();const w=structuredClone(m);l.forEach(K=>w.add(K)),t(U(w))}else(B&&s.key==="z"&&s.metaKey&&s.shiftKey||!B&&s.key==="y"&&s.ctrlKey)&&t(Ie())}),[a,g]=v.useState({sx:0,sy:0,ex:0,ey:0});return v.useEffect(()=>{g({sx:S.x<=p.x?S.x:p.x,ex:S.x>p.x?S.x:p.x,sy:S.y<=p.y?S.y:p.y,ey:S.y>p.y?S.y:p.y})},[p.x,p.y]),k.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",id:"canvas",style:{position:"fixed",top:40,left:40,userSelect:"none"},height:P,width:E,viewBox:"".concat(d.x," ").concat(d.y," ").concat(E*n/100," ").concat(P*n/100),onPointerDown:J,onPointerMove:Q,onPointerUp:ee,onWheel:te,tabIndex:0,onKeyDown:se,children:[k.jsx(Re,{}),u==="select"&&S.x!=0&&S.y!=0&&k.jsx("rect",{x:a.sx,y:a.sy,width:a.ex-a.sx,height:a.ey-a.sy,rx:"2",stroke:"#b5b5b6",strokeWidth:"2",strokeOpacity:"0.4",fill:"#b5b5b6",opacity:"0.75"}),k.jsx("defs",{children:k.jsxs("pattern",{id:"opaque",width:"5",height:"5",patternUnits:"userSpaceOnUse",children:[k.jsx("rect",{x:"0",y:"0",width:"2.5",height:"2.5",fill:"black",fillOpacity:"50%"}),k.jsx("rect",{x:"2.5",y:"2.5",width:"2.5",height:"2.5",fill:"black",fillOpacity:"50%"})]})})]})};export{qe as default};