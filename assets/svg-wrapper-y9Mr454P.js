import{j as k}from"./chakra-77DnoTeR.js";import{m as L,ab as re,l as O,f as pe,a as R,aa as W,ac as Z,ad as U,ae as de,af as ue,q as me,t as oe,S as ke,b as we,n as ie,o as X,r as ce,E as ae,v as le,x as G,J as Ee,F as se,D as Ne,$ as Ce,a1 as Pe}from"./index-SXvpcI89.js";import{b as v}from"./react-hBmrxY6U.js";import{u as j,e as Me,i as Ie}from"./clipboard-fhxFmH4G.js";import{s as be,u as je,F as Le,l as _e}from"./stations-bfzM70nW.js";import{f as De,a as Ke,b as We}from"./graph-4Cld9EJe.js";import{a as T,r as z,g as ze,p as K,i as B}from"./helpers--8-2mJFL.js";import{m as ve}from"./misc-nodes-ol_kzvAd.js";const fe=t=>t.filterNodes((e,r)=>e.startsWith("stn")).map(e=>[e,t.getNodeAttributes(e)]).filter(([e,r])=>r.visible).sort((e,r)=>e[1].zIndex-r[1].zIndex).map(([e,r])=>({node:e,visible:r.visible,zIndex:r.zIndex,x:r.x,y:r.y,type:r.type,[r.type]:r[r.type]})),ye=t=>t.filterDirectedEdges((e,r,i,n,d,u,f)=>e.startsWith("line")&&r.visible&&r.reconcileId==="").sort((e,r)=>t.getEdgeAttribute(e,"zIndex")-t.getEdgeAttribute(r,"zIndex")).map(e=>{const r=t.getEdgeAttribute(e,"type"),i=t.getEdgeAttribute(e,r),n=t.getEdgeAttribute(e,"style"),d=t.getEdgeAttribute(e,n),[u,f]=t.extremities(e),y=t.getNodeAttributes(u),x=t.getNodeAttributes(f);return{edge:e,x1:y.x,y1:y.y,x2:x.x,y2:x.y,type:r,attr:i,style:n,styleAttr:d}}),xe=t=>t.filterNodes((e,r)=>e.startsWith("misc_node")).map(e=>[e,t.getNodeAttributes(e)]).filter(([e,r])=>r.visible).sort((e,r)=>e[1].zIndex-r[1].zIndex).map(([e,r])=>({node:e,visible:r.visible,zIndex:r.zIndex,x:r.x,y:r.y,type:r.type,[r.type]:r[r.type]})),Te=t=>{const e=t.filterDirectedEdges((i,n,d,u,f,y,x)=>i.startsWith("line")&&n.reconcileId!==""),r={};for(const i of e){const n=t.getEdgeAttribute(i,"reconcileId");n in r?r[n].push(i):r[n]=[i]}return r},$e=t=>{const e=Te(t),r=[],i=[];return Object.values(e).forEach(n=>{var _;if(n.length===1){i.push(...n);return}const d=t.getEdgeAttribute(n.at(0),"type");if(!n.every(h=>t.getEdgeAttribute(h,"type")===d)){i.push(...n);return}const u=t.getEdgeAttribute(n.at(0),"style");if(!n.every(h=>t.getEdgeAttribute(h,"style")===u)){i.push(...n);return}const f={},y=new Set,x=new Set,b=Object.fromEntries(n.map(h=>{var F,$;const[M,I]=t.extremities(h);return f[M]=((F=f[M])!=null?F:0)+1,f[I]=(($=f[I])!=null?$:0)+1,y.add(M),x.add(I),[M,[h,I]]})),A=Array.from(y).filter(h=>f[h]===1),N=Array.from(x).filter(h=>f[h]===1);if(A.length!==1||N.length!==1){i.push(...n);return}const C=A[0],P=N[0];if(C===P){i.push(...n);return}const E=[b[C][0]];let S=b[C][1];for(let h=1;h<n.length;h=h+1){const M=(_=b[S])==null?void 0:_.at(1);if(!M){i.push(...n);return}E.push(b[S][0]),S=M}if(S!==P||E.length!==n.length){i.push(...n);return}r.push(E)}),{allReconciledLines:r,danglingLines:i}},Be=(t,e)=>{if(!e.every(n=>t.hasEdge(n)))return;const r=e.map(n=>{var A,N,C;const[d,u]=t.extremities(n),f=t.getNodeAttributes(d),y=t.getNodeAttributes(u),x=t.getEdgeAttribute(n,"type"),b=(A=t.getEdgeAttribute(n,x))!=null?A:L[x].defaultAttrs;return(C=(N=L[x])==null?void 0:N.generatePath(f.x,y.x,f.y,y.y,b))!=null?C:"M ".concat(f.x," ").concat(f.y," L ").concat(y.x," ").concat(y.y)});let i="".concat(r[0]," ");for(let n=1;n<e.length;n=n+1)i+=r[n].replace(/M\s*-?\d+(\.\d+)?(\s*|,)-?\d+(\.*\d+)?\s*/i,"");return i},ge=t=>{const{id:e,x:r,y:i,handlePointerDown:n,handlePointerMove:d,handlePointerUp:u}=t,f=v.useCallback(b=>n(e,b),[e,n]),y=v.useCallback(b=>d(e,b),[e,d]),x=v.useCallback(b=>u(e,b),[e,u]);return k.jsx("g",{id:e,transform:"translate(".concat(r-6.4," ").concat(i-6.4,")scale(0.025)"),onPointerDown:f,onPointerMove:y,onPointerUp:x,style:{cursor:"move"},children:k.jsx("path",{id:"stn_core_".concat(e),fillRule:"evenodd",clipRule:"evenodd",d:"M256 0c70.69 0 134.7 28.66 181.02 74.98C483.34 121.31 512 185.31 512 256c0 70.69-28.66 134.7-74.98 181.02C390.7 483.34 326.69 512 256 512c-70.69 0-134.69-28.66-181.02-74.98C28.66 390.7 0 326.69 0 256c0-70.69 28.66-134.69 74.98-181.02C121.31 28.66 185.31 0 256 0zm-21.91 302.69v-2.07c.16-13.72 1.51-24.59 4.15-32.67 2.59-8.08 6.32-14.65 11.18-19.63 4.87-5.02 10.72-9.58 17.56-13.72 4.4-2.8 8.39-5.9 11.91-9.37 3.52-3.42 6.32-7.41 8.38-11.91 2.07-4.46 3.11-9.42 3.11-14.91 0-6.53-1.55-12.18-4.66-16.99-3.05-4.77-7.19-8.44-12.27-11.08-5.13-2.59-10.82-3.89-17.09-3.89-5.65 0-11.03 1.15-16.21 3.53-5.12 2.33-9.42 6-12.79 10.97-3.36 4.98-5.33 11.35-5.85 19.11h-33.56c.53-13.21 3.89-24.39 10.05-33.55 6.21-9.16 14.4-16.11 24.55-20.82 10.2-4.71 21.49-7.04 33.81-7.04 13.57 0 25.38 2.48 35.52 7.56 10.15 5.02 18.08 12.06 23.72 21.08 5.59 9 8.44 19.47 8.44 31.48 0 8.23-1.29 15.64-3.88 22.21-2.59 6.58-6.22 12.48-10.98 17.61-4.77 5.18-10.41 9.73-17.03 13.67-6.27 3.94-11.35 7.97-15.18 12.17-3.88 4.19-6.68 9.17-8.44 14.86-1.76 5.74-2.75 12.84-2.9 21.33v2.07h-31.54zm16.68 70.67c-6.06 0-11.24-2.18-15.59-6.48-4.34-4.29-6.47-9.53-6.47-15.63 0-6.01 2.12-11.19 6.47-15.49 4.35-4.3 9.53-6.47 15.59-6.47 5.95 0 11.12 2.19 15.48 6.47 4.39 4.31 6.58 9.48 6.58 15.49 0 4.04-1.05 7.76-3.06 11.08-2.02 3.35-4.66 6.07-7.97 8.03-3.31 1.96-6.99 3-11.03 3z"})})},Ae=t=>{const{id:e,path:r,handleClick:i}=t,n=v.useCallback(d=>i(e,d),[e,i]);return k.jsx("path",{id:e,d:r,fill:"none",stroke:"grey",strokeWidth:"5",strokeLinecap:"round",cursor:"pointer",onClick:n})},ne=t=>{var P,E;const{id:e,type:r,attrs:i=L[r].defaultAttrs,styleType:n,styleAttrs:d=re[n].defaultAttrs,newLine:u,handleClick:f}=t,{x1:y,y1:x,x2:b,y2:A}=t,N=v.useMemo(()=>Oe(e,r,y,x,b,A,i),[r,JSON.stringify(i),y,b,x,A]),C=(E=(P=re[n])==null?void 0:P.component)!=null?E:Ae;return k.jsx(C,{id:e,type:r,path:N,styleAttrs:d,newLine:u,handleClick:f})},Oe=(t,e,r,i,n,d,u)=>{if(!(e in L))return"M ".concat(r," ").concat(i," L ").concat(n," ").concat(d);const f=Fe(t,e,r,i,n,d,u);if(f){const{x1:y,y1:x,x2:b,y2:A,offset:N}=f;return L[O.Simple].generatePath(y,b,x,A,{offset:N})}return L[e].generatePath(r,n,i,d,u)},Fe=(t,e,r,i,n,d,u)=>{if(!("offsetFrom"in u)||!("offsetTo"in u)||Number.isNaN(u.offsetFrom)||Number.isNaN(u.offsetTo))return;if(u.offsetFrom===u.offsetTo)return he(e,r,i,n,d)?{x1:r,y1:i,x2:n,y2:d,offset:u.offsetFrom}:void 0;const[f,y]=[u.offsetFrom,u.offsetTo];for(let x=0;x<Math.PI;x+=Math.PI/8)for(let b=x,A=0;A<2;A++,b+=Math.PI){const[N,C,P,E]=[Math.sin(x)*f,Math.cos(x)*f,Math.sin(b)*y,Math.cos(b)*y];if(he(e,r+N,i+C,n+P,d+E))return{x1:r+N,y1:i+C,x2:n+P,y2:d+E,offset:0}}},he=(t,e,r,i,n)=>!!((e===i||r===n)&&[O.Diagonal,O.Perpendicular].includes(t)||Math.abs((n-r)/(i-e))===1&&[O.Diagonal,O.RotatePerpendicular].includes(t)),Re=()=>{const t=pe(),e=v.useRef(window.graph),{telemetry:{project:r}}=R(a=>a.app),{svgViewBoxZoom:i}=R(a=>a.param),{selected:n,refresh:{nodes:d,edges:u},mode:f,active:y,keepLastPath:x,theme:b}=R(a=>a.runtime),[A,N]=v.useState({x:0,y:0}),[C,P]=v.useState({x:0,y:0}),E=j((a,g)=>{g.stopPropagation(),f==="select"&&t(W("free"));const s=g.currentTarget,{x:o,y:c}=T(g);s.setPointerCapture(g.pointerId),N({x:o,y:c}),t(Z(a)),g.shiftKey?n.has(a)?t(de(a)):t(ue(a)):n.has(a)||t(U(new Set([a])))}),S=j((a,g)=>{const{x:s,y:o}=T(g);f==="free"&&y===a?(n.forEach(c=>{e.current.hasNode(c)&&e.current.updateNodeAttributes(c,p=>({...p,x:z(p.x-(A.x-s)*i/100,g.altKey?1:5),y:z(p.y-(A.y-o)*i/100,g.altKey?1:5)}))}),t(me()),t(oe())):f.startsWith("line")&&P({x:(A.x-s)*i/100,y:(A.y-o)*i/100})}),_=j((a,g)=>{if(f.startsWith("line")){x||t(W("free"));const s=[...Object.values(ke),we.Virtual],o=e.current.hasNode(y)&&s.includes(e.current.getNodeAttribute(y,"type"));["stn_core_","virtual_circle_"].forEach(p=>{var D,V;const l=(V=(D=document.elementsFromPoint(g.clientX,g.clientY)[0].attributes)==null?void 0:D.getNamedItem("id"))==null?void 0:V.value,w=l==null?void 0:l.startsWith(p);if(o&&w){const Y=f.slice(5),Se="line_".concat(ie(10));e.current.addDirectedEdgeWithKey(Se,y,l.slice(p.length),{visible:!0,zIndex:0,type:Y,[Y]:structuredClone(L[Y].defaultAttrs),style:X.SingleColor,[X.SingleColor]:{color:b},reconcileId:""}),r&&ce.event(ae.ADD_LINE,{type:Y})}}),t(oe()),t(le(e.current.export()))}else if(f==="free"&&y){const{x:s,y:o}=T(g);A.x-s===0&&A.y-o===0||t(le(e.current.export()))}t(Z(void 0))}),h=j((a,g)=>{g.shiftKey||t(G()),g.shiftKey&&n.has(a)?t(de(a)):t(ue(a))}),[M,I]=v.useState(fe(e.current)),[F,$]=v.useState(xe(e.current)),[q,J]=v.useState(ye(e.current)),[H,Q]=v.useState([]),[ee,te]=v.useState([]);return v.useEffect(()=>{I(fe(e.current)),$(xe(e.current))},[d]),v.useEffect(()=>{J(ye(e.current));const{allReconciledLines:a,danglingLines:g}=$e(e.current);Q(a),te(g)},[u]),k.jsxs(k.Fragment,{children:[ee.map(a=>{const[g,s]=e.current.extremities(a),o=e.current.getNodeAttributes(g),c=e.current.getNodeAttributes(s);return k.jsx(ne,{id:a,x1:o.x,y1:o.y,x2:c.x,y2:c.y,newLine:!1,type:O.Simple,attrs:L[O.Simple].defaultAttrs,styleType:X.SingleColor,styleAttrs:{color:["","","#c0c0c0","#fff"]},handleClick:h},a)}),H.map(a=>{var l,w;const g=Be(e.current,a);if(!g)return k.jsx(k.Fragment,{});const s=a.at(0),o=e.current.getEdgeAttribute(s,"type"),c=e.current.getEdgeAttribute(s,"style"),p=e.current.getEdgeAttribute(s,c),m=(w=(l=re[c])==null?void 0:l.component)!=null?w:Ae;return k.jsx(m,{id:s,type:o,path:g,styleAttrs:p,newLine:!1,handleClick:h},s)}),q.map(({edge:a,x1:g,y1:s,x2:o,y2:c,type:p,attr:m,style:l,styleAttr:w})=>k.jsx(ne,{id:a,x1:g,y1:s,x2:o,y2:c,newLine:!1,type:p,attrs:m,styleType:l,styleAttrs:w,handleClick:h},a)),F.map(a=>{var m,l;const{node:g,x:s,y:o,type:c}=a,p=(l=(m=ve[c])==null?void 0:m.component)!=null?l:ge;return k.jsx(p,{id:g,x:s,y:o,attrs:a[c],handlePointerDown:E,handlePointerMove:S,handlePointerUp:_},g)}),M.map(a=>{var m,l;const{node:g,x:s,y:o,type:c}=a,p=(l=(m=be[c])==null?void 0:m.component)!=null?l:ge;return k.jsx(p,{id:g,x:s,y:o,attrs:{[c]:a[c]},handlePointerDown:E,handlePointerMove:S,handlePointerUp:_},g)}),f.startsWith("line")&&y&&k.jsx(ne,{id:"create_in_progress___no_use",x1:e.current.getNodeAttribute(y,"x"),y1:e.current.getNodeAttribute(y,"y"),x2:e.current.getNodeAttribute(y,"x")-C.x,y2:e.current.getNodeAttribute(y,"y")-C.y,newLine:!0,type:f.slice(5),attrs:L[f.slice(5)].defaultAttrs,styleType:X.SingleColor,styleAttrs:{color:b}})]})},He=()=>{const t=pe(),e=v.useRef(window.graph),r=()=>{t(me()),t(oe()),t(le(e.current.export()))},{telemetry:{project:i}}=R(s=>s.app),{svgViewBoxZoom:n,svgViewBoxMin:d}=R(s=>s.param),{mode:u,lastTool:f,active:y,selected:x,keepLastPath:b,theme:A,refresh:{nodes:N}}=R(s=>s.runtime),C=je(),{height:P,width:E}=ze(C);v.useEffect(()=>{const s=De(e.current);Object.entries(s).filter(([o,c])=>c&&o in Le).forEach(([o])=>_e(o))},[N]);const[S,_]=v.useState({x:0,y:0}),[h,M]=v.useState({x:0,y:0}),[I,F]=v.useState({x:0,y:0}),[$,q]=v.useState({x:0,y:0}),J=j(s=>{const{x:o,y:c}=T(s);if(u.startsWith("station")){t(W("free"));const p=ie(10),m="stn_".concat(p),l=u.slice(8),w=structuredClone(be[l].defaultAttrs);"color"in w&&(w.color=A);const{x:D,y:V}=K(o,c,n,d);e.current.addNode(m,{visible:!0,zIndex:0,x:z(D,5),y:z(V,5),type:l,[l]:w}),r(),i&&ce.event(ae.ADD_STATION,{type:l}),t(U(new Set([m])))}else if(u.startsWith("misc-node")){t(W("free"));const p=ie(10),m="misc_node_".concat(p),l=u.slice(10),{x:w,y:D}=K(o,c,n,d);e.current.addNode(m,{visible:!0,zIndex:0,x:z(w,5),y:z(D,5),type:l,[l]:structuredClone(ve[l].defaultAttrs)}),r(),i&&ce.event(ae.ADD_STATION,{type:l}),t(U(new Set([m])))}else u==="free"||u.startsWith("line")?(u.startsWith("line")&&(t(W("free")),b&&t(Ee(!1))),F({x:o,y:c}),q(d),s.shiftKey||(t(Z("background")),t(G()))):u==="select"&&(_(K(o,c,n,d)),M(K(o,c,n,d)))}),H=j(s=>{if(u==="select"){if(S.x!=0&&S.y!=0){const{x:o,y:c}=T(s);M(K(o,c,n,d))}}else if(y==="background"){const{x:o,y:c}=T(s);t(se({x:$.x+(I.x-o)*n/100,y:$.y+(I.y-c)*n/100}))}}),Q=j(s=>{if(u==="select"){const{x:o,y:c}=T(s),{x:p,y:m}=K(o,c,n,d),l=Ke(e.current,S.x,S.y,p,m),w=We(e.current,new Set(l));t(U(new Set([...s.shiftKey?x:[],...l,...w]))),t(W("free")),_({x:0,y:0}),M({x:0,y:0})}y==="background"&&!s.shiftKey&&t(Z(void 0))}),ee=j(s=>{let o=n;s.deltaY>0&&n+10<400?o=n+10:s.deltaY<0&&n-10>0&&(o=n-10),t(Ne(o));const{x:c,y:p}=T(s),m=s.currentTarget.getBoundingClientRect(),[l,w]=[c/m.width,p/m.height];t(se({x:d.x+c*n/100-E*o/100*l,y:d.y+p*n/100-P*o/100*w}))}),te=j(async s=>{if(B?s.key==="Backspace":s.key==="Delete")x.size>0&&(x.forEach(o=>{e.current.hasNode(o)?e.current.dropNode(o):e.current.hasEdge(o)&&e.current.dropEdge(o)}),t(G()),r());else if(s.key.startsWith("Arrow")){const c=s.key.endsWith("Left")?-1:s.key.endsWith("Right")?1:0,p=s.key.endsWith("Up")?-1:s.key.endsWith("Down")?1:0;t(se(K(100*c,100*p,n,d)))}else if(s.key==="i"||s.key==="j"||s.key==="k"||s.key==="l"){const c=(s.key==="j"?-1:s.key==="l"?1:0)*10,p=(s.key==="i"?-1:s.key==="k"?1:0)*10;x.size>0&&x.forEach(m=>{e.current.hasNode(m)&&(e.current.updateNodeAttribute(m,"x",l=>(l!=null?l:0)+c),e.current.updateNodeAttribute(m,"y",l=>(l!=null?l:0)+p),r())})}else if(s.key==="f"&&f)t(W(f));else if(s.key==="z"&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey))B&&s.preventDefault(),t(Ce());else if(s.key==="s")t(W("select"));else if((s.key==="c"||s.key==="x")&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey)){const o=Me(e.current,x);navigator.clipboard.writeText(o),s.key==="x"&&(t(G()),x.forEach(c=>{e.current.hasNode(c)?e.current.dropNode(c):e.current.hasEdge(c)&&e.current.dropEdge(c)}),r())}else if(s.key==="v"&&(B?s.metaKey&&!s.shiftKey:s.ctrlKey)){const o=await navigator.clipboard.readText(),{x:c,y:p}=K(E/2,P/2,n,d),{nodes:m,edges:l}=Ie(o,e.current,z(c,5),z(p,5));r();const w=structuredClone(m);l.forEach(D=>w.add(D)),t(U(w))}else(B&&s.key==="z"&&s.metaKey&&s.shiftKey||!B&&s.key==="y"&&s.ctrlKey)&&t(Pe())}),[a,g]=v.useState({sx:0,sy:0,ex:0,ey:0});return v.useEffect(()=>{g({sx:S.x<=h.x?S.x:h.x,ex:S.x>h.x?S.x:h.x,sy:S.y<=h.y?S.y:h.y,ey:S.y>h.y?S.y:h.y})},[h.x,h.y]),k.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",id:"canvas",style:{position:"fixed",top:40,left:40,userSelect:"none"},height:P,width:E,viewBox:"".concat(d.x," ").concat(d.y," ").concat(E*n/100," ").concat(P*n/100),onPointerDown:J,onPointerMove:H,onPointerUp:Q,onWheel:ee,tabIndex:0,onKeyDown:te,children:[k.jsx(Re,{}),u==="select"&&S.x!=0&&S.y!=0&&k.jsx("rect",{x:a.sx,y:a.sy,width:a.ex-a.sx,height:a.ey-a.sy,rx:"2",stroke:"#b5b5b6",strokeWidth:"2",strokeOpacity:"0.4",fill:"#b5b5b6",opacity:"0.75"}),k.jsx("defs",{children:k.jsxs("pattern",{id:"opaque",width:"5",height:"5",patternUnits:"userSpaceOnUse",children:[k.jsx("rect",{x:"0",y:"0",width:"2.5",height:"2.5",fill:"black",fillOpacity:"50%"}),k.jsx("rect",{x:"2.5",y:"2.5",width:"2.5",height:"2.5",fill:"black",fillOpacity:"50%"})]})})]})};export{He as default};