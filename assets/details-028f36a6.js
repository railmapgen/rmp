import{j as e,A as V,M as q,m as G,n as Z,p as J,r as K,s as N,$ as z,a0 as I,ae as ee}from"./chakra-594c63ee.js";import{c as R,i as A,y as w,A as m,j as C,ai as _,aj as U,z as b,t as Q,N as W,q as te,v as ne,n as B,D as k,ah as F,ak as se,al as ae,am as re,an as ie,p as H}from"./index-d7b6fa05.js";import{b as d}from"./react-2c0b8364.js";import{s as X}from"./stations-9dced6bd.js";import{d as oe,e as le,f as ce}from"./change-types-c590e788.js";import{u as $}from"./useEvent-92f02ca1.js";import{m as de}from"./misc-nodes-73dcff8a.js";function pe(){const{t}=R(),a=A(),r=d.useCallback(()=>{a(w()),a(m(n.current.export()))},[a,w,m]),{selected:l}=C(y=>y.runtime),s=l.at(0),n=d.useRef(window.graph),[i,h]=d.useState(!1),c=d.useRef(null),[u,o]=d.useState(void 0),p=n.current.getNodeAttribute(s,"type"),j=Object.fromEntries(Object.entries(X).map(([y,S])=>[y,t(S.metadata.displayName).toString()])),f=()=>{u&&(oe(n.current,s,u),r())},x=y=>{y&&f(),o(void 0),h(!1)};return e.jsxs(e.Fragment,{children:[e.jsx(_,{label:t("panel.details.info.stationType"),minW:"276",children:e.jsx(U,{options:j,disabledOptions:[p],value:p,onChange:({target:{value:y}})=>{o(y),h(!0)}})}),e.jsx(V,{isOpen:i,leastDestructiveRef:c,onClose:()=>x(!1),children:e.jsx(q,{children:e.jsxs(G,{children:[e.jsx(Z,{children:t("warning")}),e.jsx(J,{children:t("panel.details.changeStationTypeContent")}),e.jsxs(K,{children:[e.jsx(N,{ref:c,onClick:()=>x(!1),children:t("cancel")}),e.jsx(N,{ml:"2",colorScheme:"red",onClick:()=>x(!0),children:t("panel.details.changeType")})]})]})})})]})}function ue(){const{t}=R(),a=A(),r=d.useCallback(()=>{a(b()),a(m(i.current.export()))},[a,b,m]),{selected:l,theme:s}=C(g=>g.runtime),n=l.at(0),i=d.useRef(window.graph),[h,c]=d.useState(!1),u=d.useRef(null),o=Object.fromEntries(Object.entries(Q).map(([g,M])=>[g,t(M.metadata.displayName).toString()])),[p,j]=d.useState(i.current.getEdgeAttribute(n,"type")),[f,x]=d.useState(void 0),y=Object.fromEntries(Object.entries(W).map(([g,M])=>[g,t(M.metadata.displayName).toString()])),[S,P]=d.useState(i.current.getEdgeAttribute(n,"style")),[T,O]=d.useState(void 0),v=Object.values(te).filter(g=>!W[S].metadata.supportLinePathType.includes(g)),E=Object.values(ne).filter(g=>!W[g].metadata.supportLinePathType.includes(p)),L=()=>{f&&(le(i.current,n,f),j(i.current.getEdgeAttribute(n,"type")),r())},Y=()=>{T&&(ce(i.current,n,T,s),P(i.current.getEdgeAttribute(n,"style")),r())},D=g=>{g&&(f?(L(),x(void 0)):T&&(Y(),O(void 0))),c(!1)};return e.jsxs(e.Fragment,{children:[e.jsx(_,{label:t("panel.details.info.linePathType"),minW:"276",children:e.jsx(U,{options:o,disabledOptions:v,defaultValue:p,value:p,onChange:({target:{value:g}})=>{x(g),c(!0)}})}),e.jsx(_,{label:t("panel.details.info.lineStyleType"),minW:"276",children:e.jsx(U,{options:y,disabledOptions:E,defaultValue:S,value:S,onChange:({target:{value:g}})=>{O(g),c(!0)}})}),e.jsx(V,{isOpen:h,leastDestructiveRef:u,onClose:()=>D(!1),children:e.jsx(q,{children:e.jsxs(G,{children:[e.jsx(Z,{children:t("warning")}),e.jsx(J,{children:t("panel.details.changeLineTypeContent")}),e.jsxs(K,{children:[e.jsx(N,{ref:u,onClick:()=>D(!1),children:t("cancel")}),e.jsx(N,{ml:"2",colorScheme:"red",onClick:()=>D(!0),children:t("panel.details.changeType")})]})]})})})]})}function he(){const{t}=R(),a=A(),r=d.useCallback(()=>{a(w()),a(b()),a(m(n.current.export()))},[a,b,m]),{selected:l}=C(c=>c.runtime),s=l.at(0),n=d.useRef(window.graph),i=c=>{const u=Math.min(Math.max(c,-5),5);n.current.hasNode(s)&&n.current.setNodeAttribute(s,"zIndex",u),n.current.hasEdge(s)&&n.current.setEdgeAttribute(s,"zIndex",u),r()},h=[{type:"input",label:t("panel.details.info.id"),value:l.length>0?l.join(", "):"undefined",minW:276},{type:"select",label:t("panel.details.info.zIndex"),value:s?n.current.hasNode(s)?n.current.getNodeAttribute(s,"zIndex"):n.current.hasEdge(s)?n.current.getEdgeAttribute(s,"zIndex"):0:0,options:Object.fromEntries(Array.from({length:11},(c,u)=>[u-5,(u-5).toString()])),onChange:c=>i(Number(c))}];return l.length===0||l.length>1&&h.push({type:"input",label:t("panel.details.info.type"),value:"multiple selection",minW:276}),e.jsxs(z,{p:1,children:[e.jsx(I,{as:"h5",size:"sm",children:t("panel.details.info.title")}),e.jsx(B,{fields:h,minW:130}),l.length===1&&s.startsWith("stn")&&n.current.hasNode(s)&&e.jsx(pe,{}),l.length===1&&s.startsWith("line")&&n.current.hasEdge(s)&&e.jsx(ue,{})]})}function ge(){const{t}=R(),a=A(),{selected:r}=C(S=>S.runtime),l=r.at(0),s=d.useRef(window.graph),[n,i]=d.useState("undefined"),[h,c]=d.useState("undefined"),[u,o]=d.useState("undefined"),[p,j]=d.useState("undefined");d.useEffect(()=>{var S,P,T,O;if(l!=null&&l.startsWith("line")){const[v,E]=s.current.extremities(l);if(i(v),c(E),v.startsWith("stn")){const L=s.current.getNodeAttribute(v,"type");o((P=(S=s.current.getNodeAttribute(v,L))==null?void 0:S.names.at(0))!=null?P:"undefined")}if(E.startsWith("stn")){const L=s.current.getNodeAttribute(E,"type");j((O=(T=s.current.getNodeAttribute(E,L))==null?void 0:T.names.at(0))!=null?O:"undefined")}}},[r]);const f=$(()=>{a(k()),a(F(n))}),x=$(()=>{a(k()),a(F(h))}),y=[{type:"custom",label:t("panel.details.lineExtremities.source"),component:e.jsx(N,{flex:1,size:"sm",variant:"link",onClick:f,children:n})},{type:"custom",label:t("panel.details.lineExtremities.target"),component:e.jsx(N,{flex:1,size:"sm",variant:"link",onClick:x,children:h})},{type:"input",label:t("panel.details.lineExtremities.sourceName"),value:u},{type:"input",label:t("panel.details.lineExtremities.targetName"),value:p}];return e.jsxs(z,{p:1,children:[e.jsx(I,{as:"h5",size:"sm",children:t("panel.details.lineExtremities.title")}),e.jsx(B,{fields:y,minW:130})]})}function me(){const{t}=R(),a=A(),r=d.useCallback(()=>{a(w()),a(b()),a(m(i.current.export()))},[a,w,b,m]),{selected:l,refresh:{nodes:s}}=C(o=>o.runtime),n=l.at(0),i=d.useRef(window.graph),[h,c]=d.useState({x:0,y:0});d.useEffect(()=>{if(n!=null&&n.startsWith("stn")||n!=null&&n.startsWith("misc_node_")){const o=i.current.getNodeAttribute(n,"x"),p=i.current.getNodeAttribute(n,"y");c({x:o,y:p})}},[s,l]);const u=[{type:"input",label:t("panel.details.nodePosition.pos.x"),value:h.x.toString(),validator:o=>!Number.isNaN(o),onChange:o=>{i.current.mergeNodeAttributes(n,{x:Number(o)}),r()}},{type:"input",label:t("panel.details.nodePosition.pos.y"),value:h.y.toString(),validator:o=>!Number.isNaN(o),onChange:o=>{i.current.mergeNodeAttributes(n,{y:Number(o)}),r()}}];return e.jsxs(z,{p:1,children:[e.jsx(I,{as:"h5",size:"sm",children:t("panel.details.nodePosition.title")}),e.jsx(B,{fields:u,minW:130})]})}const fe={...X,...de},xe=()=>{var h;const t=A(),{selected:a}=C(c=>c.runtime),r=a.at(0),l=window.graph.getNodeAttribute(r,"type"),s=fe[l].attrsComponent,n=(h=window.graph.getNodeAttribute(r,l))!=null?h:{},i=(c,u)=>{const o=window.graph.getNodeAttribute(c,"type");window.graph.mergeNodeAttributes(c,{[o]:u}),t(w()),t(m(window.graph.export()))};return s&&e.jsx(s,{id:r,attrs:n,handleAttrsUpdate:i})},ye=()=>{var p,j;const t=A(),{selected:a}=C(f=>f.runtime),r=a.at(0),l=window.graph.getEdgeAttribute(r,"type"),s=(p=window.graph.getEdgeAttribute(r,l))!=null?p:{},n=Q[l].attrsComponent,i=window.graph.getEdgeAttribute(r,"style"),h=(j=window.graph.getEdgeAttribute(r,i))!=null?j:{},c=W[i].attrsComponent,u=(f,x)=>{window.graph.mergeEdgeAttributes(f,{[l]:x}),t(b()),t(m(window.graph.export()))},o=(f,x)=>{window.graph.mergeEdgeAttributes(f,{[i]:x}),t(b()),t(m(window.graph.export()))};return e.jsxs(e.Fragment,{children:[n&&e.jsx(n,{id:r,attrs:s,handleAttrsUpdate:u}),c&&e.jsx(c,{id:r,attrs:h,handleAttrsUpdate:o})]})},Te=()=>{const{t}=R(),a=A(),r=d.useRef(window.graph),l=d.useCallback(()=>{a(w()),a(b()),a(m(r.current.export()))},[a,w,b,m]),{selected:s,mode:n}=C(o=>o.runtime),i=s.at(0),h=()=>a(k()),c=o=>{const p=structuredClone(r.current.getNodeAttributes(o));p.x+=50,p.y+=50;const j=o.startsWith("stn")?`stn_${H(10)}`:`misc_node_${H(10)}`;r.current.addNode(j,p),a(w()),a(m(r.current.export()))},u=o=>{a(k()),o.forEach(p=>{r.current.hasNode(p)?(r.current.dropNode(p),l()):r.current.hasEdge(p)&&(r.current.dropEdge(p),a(b()),a(m(r.current.export())))})};return e.jsxs(se,{isOpen:s.length>0&&!n.startsWith("line"),width:300,header:"Dummy header",alwaysOverlay:!0,children:[e.jsx(ae,{onClose:h,children:t("panel.details.header")}),e.jsxs(re,{children:[e.jsx(he,{}),s.length===1&&r.current.hasNode(i)&&e.jsx(me,{}),s.length===1&&r.current.hasEdge(i)&&e.jsx(ge,{}),s.length===1&&e.jsxs(z,{p:1,children:[e.jsx(I,{as:"h5",size:"sm",children:t("panel.details.specificAttrsTitle")}),window.graph.hasNode(i)&&e.jsx(xe,{}),window.graph.hasEdge(i)&&e.jsx(ye,{})]})]}),e.jsx(ie,{children:e.jsxs(ee,{children:[s.length===1&&r.current.hasNode(s.at(0))&&e.jsx(N,{size:"sm",variant:"outline",onClick:()=>c(s.at(0)),children:t("panel.details.footer.duplicate")}),e.jsx(N,{size:"sm",variant:"outline",onClick:()=>u(s),children:t("panel.details.footer.remove")})]})})]})};export{Te as default};