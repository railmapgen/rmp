System.register(["./chakra-legacy-YGIgOwam.js","./index-legacy-brty8Nln.js","./react-legacy-T1GznqXM.js","./clipboard-legacy-7xURejCy.js","./stations-legacy-GsADD0Pv.js","./change-type-modal-legacy-cQQup_O-.js","./misc-nodes-legacy-ttMEYAZV.js","./graph-legacy-AlKSMKUR.js"],(function(e,t){"use strict";var n,i,s,r,a,l,d,o,c,u,p,h,g,m,x,j,f,b,y,w,v,N,S,A,C,E,z,k,W,O,R,T,P,_,I,D,F,U,V,L,$,M,q,B,K,G,H,J,Q;return{setters:[e=>{n=e.j,i=e.B,s=e.aw,r=e.ax,a=e.aK,l=e.O,d=e.aV,o=e.U,c=e.D,u=e._,p=e.$,h=e.a0,g=e.a1,m=e.a3,x=e.a5,j=e.a4},e=>{f=e.f,b=e.a,y=e.ag,w=e.ad,v=e.ae,N=e.ah,S=e.t,A=e.v,C=e.m,E=e.ab,z=e.l,k=e.o,W=e.ai,O=e.aj,R=e.q,T=e.j,P=e.x,_=e.af,I=e.ak,D=e.al,F=e.am,U=e.an,V=e.n},e=>{L=e.u,$=e.b},e=>{M=e.u,q=e.e},e=>{B=e.s},e=>{K=e.C,G=e.c,H=e.a,J=e.b},e=>{Q=e.m},null],execute:function(){function t(){const{t:e}=L(),t=f(),{selected:u}=b((e=>e.runtime)),p=$.useRef(window.graph),h=e=>{if(p.current.hasNode(e)){const t=p.current.getNodeAttributes(e),n=t.type;return e.startsWith("stn")?t[n].names.join("/"):n}if(p.current.hasEdge(e)){const[t,n]=p.current.extremities(e),i=p.current.getSourceAttributes(e),s=p.current.getTargetAttributes(e),r=i.type,a=s.type;return(t.startsWith("stn")?i[r].names[0]:r)+" - "+(n.startsWith("stn")?s[a].names[0]:a)}},[g,m]=$.useState([]);$.useEffect((()=>{m(["station","misc-node","line"])}),[u]);const[x,j]=$.useState(!1);return n.jsxs(i,{children:[n.jsxs(s,{as:"h5",size:"sm",children:[e("panel.details.multipleSelection.selected")," ",u.size]}),n.jsxs(r,{m:"var(--chakra-space-1)",children:[n.jsxs(a,{w:"100%",children:[n.jsx(s,{as:"h5",size:"xs",w:"100%",children:e("panel.details.multipleSelection.show")}),n.jsx(y,{selections:[{label:e("panel.details.multipleSelection.station"),value:"station"},{label:e("panel.details.multipleSelection.miscNode"),value:"misc-node"},{label:e("panel.details.multipleSelection.edge"),value:"line"}],defaultValue:g,multiSelect:!0,onChange:e=>m(e)})]}),0!==g.length&&n.jsxs(n.Fragment,{children:[n.jsxs(l,{width:"100%",size:"sm",onClick:()=>j(!0),children:[e("panel.details.multipleSelection.change"),n.jsx(d,{label:e("header.settings.pro"),children:n.jsx(o,{ml:"1",color:"gray.50",background:"radial-gradient(circle, #3f5efb, #fc466b)",children:"PRO"})})]}),n.jsx(c,{})]}),[...u].filter((e=>g.includes("station")||!e.startsWith("stn"))).filter((e=>g.includes("misc-node")||!e.startsWith("misc"))).filter((e=>g.includes("line")||!e.startsWith("line"))).map((e=>{var i;return n.jsxs(a,{width:"100%",children:[n.jsx(l,{width:"100%",size:"sm",variant:"solid",onClick:()=>t(w(new Set([e]))),overflow:"hidden",maxW:"270",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"ruby",children:null===(i=h(e))||void 0===i?void 0:i.replaceAll("\\","⏎")}),n.jsx(l,{size:"sm",onClick:()=>t(v(e)),children:n.jsx(N,{})})]},e)}))]}),n.jsx(K,{isOpen:x,onClose:()=>j(!1),isSelect:!0,filter:g})]})}function X(){const{t:e}=L(),t=f(),i=$.useCallback((()=>{t(S()),t(A(d.current.export()))}),[t,S,A]),{selected:s,theme:r}=b((e=>e.runtime)),[a]=s,d=$.useRef(window.graph),[o,c]=$.useState(!1),j=$.useRef(null),y=Object.fromEntries(Object.entries(C).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),[w,v]=$.useState(d.current.getEdgeAttribute(a,"type")),[N,R]=$.useState(void 0),T=Object.fromEntries(Object.entries(E).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),[P,_]=$.useState(d.current.getEdgeAttribute(a,"style")),[I,D]=$.useState(void 0),F=Object.values(z).filter((e=>!E[P].metadata.supportLinePathType.includes(e))),U=Object.values(k).filter((e=>!E[e].metadata.supportLinePathType.includes(w))),V=e=>{e&&(N?(N&&(G(d.current,a,N),v(d.current.getEdgeAttribute(a,"type")),i()),R(void 0)):I&&(I&&(H(d.current,a,I,r),_(d.current.getEdgeAttribute(a,"style")),i()),D(void 0))),c(!1)};return n.jsxs(n.Fragment,{children:[n.jsx(W,{label:e("panel.details.info.linePathType"),minW:"276",children:n.jsx(O,{options:y,disabledOptions:F,defaultValue:w,value:w,onChange:({target:{value:e}})=>{R(e),c(!0)}})}),n.jsx(W,{label:e("panel.details.info.lineStyleType"),minW:"276",children:n.jsx(O,{options:T,disabledOptions:U,defaultValue:P,value:P,onChange:({target:{value:e}})=>{D(e),c(!0)}})}),n.jsx(u,{isOpen:o,leastDestructiveRef:j,onClose:()=>V(!1),children:n.jsx(p,{children:n.jsxs(h,{children:[n.jsx(g,{children:e("warning")}),n.jsx(m,{children:e("panel.details.changeLineTypeContent")}),n.jsxs(x,{children:[n.jsx(l,{ref:j,onClick:()=>V(!1),children:e("cancel")}),n.jsx(l,{ml:"2",colorScheme:"red",onClick:()=>V(!0),children:e("panel.details.changeType")})]})]})})})]})}function Y(){const{t:e}=L(),t=f(),i=$.useCallback((()=>{t(R()),t(A(a.current.export()))}),[t,R,A]),{selected:s}=b((e=>e.runtime)),[r]=s,a=$.useRef(window.graph),[d,o]=$.useState(!1),c=$.useRef(null),[j,y]=$.useState(void 0),w=a.current.getNodeAttribute(r,"type"),v=Object.fromEntries(Object.entries(B).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),N=e=>{e&&j&&(J(a.current,r,j),i()),y(void 0),o(!1)};return n.jsxs(n.Fragment,{children:[n.jsx(W,{label:e("panel.details.info.stationType"),minW:"276",children:n.jsx(O,{options:v,disabledOptions:[w],value:w,onChange:({target:{value:e}})=>{y(e),o(!0)}})}),n.jsx(u,{isOpen:d,leastDestructiveRef:c,onClose:()=>N(!1),children:n.jsx(p,{children:n.jsxs(h,{children:[n.jsx(g,{children:e("warning")}),n.jsx(m,{children:e("panel.details.changeStationTypeContent")}),n.jsxs(x,{children:[n.jsx(l,{ref:c,onClick:()=>N(!1),children:e("cancel")}),n.jsx(l,{ml:"2",colorScheme:"red",onClick:()=>N(!0),children:e("panel.details.changeType")})]})]})})})]})}function Z(){const{t:e}=L(),r=f(),a=$.useCallback((()=>{r(R()),r(S()),r(A(o.current.export()))}),[r,S,A]),{selected:l}=b((e=>e.runtime)),[d]=l,o=$.useRef(window.graph),c=[];return 0===l.size||(1===l.size?(c.push({type:"input",label:e("panel.details.info.id"),value:d,minW:276}),c.push({type:"select",label:e("panel.details.info.zIndex"),value:d?o.current.hasNode(d)?o.current.getNodeAttribute(d,"zIndex"):o.current.hasEdge(d)?o.current.getEdgeAttribute(d,"zIndex"):0:0,options:Object.fromEntries(Array.from({length:11},((e,t)=>[t-5,(t-5).toString()]))),onChange:e=>(e=>{const t=Math.min(Math.max(e,-5),5);o.current.hasNode(d)&&o.current.setNodeAttribute(d,"zIndex",t),o.current.hasEdge(d)&&o.current.setEdgeAttribute(d,"zIndex",t),a()})(Number(e))})):l.size>1&&c.push({type:"input",label:e("panel.details.info.type"),value:e("panel.details.multipleSelection.title"),minW:276})),n.jsxs(i,{p:1,children:[n.jsx(s,{as:"h5",size:"sm",children:e("panel.details.info.title")}),n.jsx(T,{fields:c,minW:130}),1===l.size&&d.startsWith("stn")&&o.current.hasNode(d)&&o.current.getNodeAttribute(d,"type")in B&&n.jsx(Y,{}),1===l.size&&d.startsWith("line")&&o.current.hasEdge(d)&&o.current.getEdgeAttribute(d,"type")in C&&o.current.getEdgeAttribute(d,"style")in E&&n.jsx(X,{}),l.size>1&&n.jsx(t,{})]})}function ee(){const{t:e}=L(),t=f(),{selected:r}=b((e=>e.runtime)),[a]=r,d=$.useRef(window.graph),[o,c]=$.useState("undefined"),[u,p]=$.useState("undefined"),[h,g]=$.useState("undefined"),[m,x]=$.useState("undefined");$.useEffect((()=>{if(null!=a&&a.startsWith("line")){const[s,r]=d.current.extremities(a);if(c(s),p(r),s.startsWith("stn")){var e,t;const n=d.current.getNodeAttribute(s,"type");g(null!==(e=null===(t=d.current.getNodeAttribute(s,n))||void 0===t?void 0:t.names.at(0))&&void 0!==e?e:"undefined")}if(r.startsWith("stn")){var n,i;const e=d.current.getNodeAttribute(r,"type");x(null!==(n=null===(i=d.current.getNodeAttribute(r,e))||void 0===i?void 0:i.names.at(0))&&void 0!==n?n:"undefined")}}}),[r]);const j=M((()=>{t(P()),t(_(o))})),y=M((()=>{t(P()),t(_(u))})),w=[{type:"custom",label:e("panel.details.lineExtremities.source"),component:n.jsx(l,{flex:1,size:"sm",variant:"link",onClick:j,children:o}),minW:"full"},{type:"input",label:e("panel.details.lineExtremities.sourceName"),value:h,minW:"full"},{type:"custom",label:e("panel.details.lineExtremities.target"),component:n.jsx(l,{flex:1,size:"sm",variant:"link",onClick:y,children:u}),minW:"full"},{type:"input",label:e("panel.details.lineExtremities.targetName"),value:m,minW:"full"}];return n.jsxs(i,{p:1,children:[n.jsx(s,{as:"h5",size:"sm",children:e("panel.details.lineExtremities.title")}),n.jsx(T,{fields:w,minW:130})]})}function te(){const{t:e}=L(),t=f(),r=$.useCallback((()=>{t(R()),t(S()),t(A(o.current.export()))}),[t,R,S,A]),{selected:a,refresh:{nodes:l}}=b((e=>e.runtime)),[d]=a,o=$.useRef(window.graph),[c,u]=$.useState({x:0,y:0});$.useEffect((()=>{if(null!=d&&d.startsWith("stn")||null!=d&&d.startsWith("misc_node_")){const e=o.current.getNodeAttribute(d,"x"),t=o.current.getNodeAttribute(d,"y");u({x:e,y:t})}}),[l,a]);const p=[{type:"input",label:e("panel.details.nodePosition.pos.x"),value:c.x.toString(),validator:e=>!Number.isNaN(e),onChange:e=>{o.current.mergeNodeAttributes(d,{x:Number(e)}),r()}},{type:"input",label:e("panel.details.nodePosition.pos.y"),value:c.y.toString(),validator:e=>!Number.isNaN(e),onChange:e=>{o.current.mergeNodeAttributes(d,{y:Number(e)}),r()}}];return n.jsxs(i,{p:1,children:[n.jsx(s,{as:"h5",size:"sm",children:e("panel.details.nodePosition.title")}),n.jsx(T,{fields:p,minW:130})]})}const ne={...B,...Q},ie=()=>{var e;const t=f(),{selected:i}=b((e=>e.runtime)),{t:s}=L(),[r]=i,a=window.graph.getNodeAttribute(r,"type"),l=a in ne&&ne[a].attrsComponent,d=null!==(e=window.graph.getNodeAttribute(r,a))&&void 0!==e?e:{};return l?n.jsx(l,{id:r,attrs:d,handleAttrsUpdate:(e,n)=>{const i=window.graph.getNodeAttribute(e,"type");window.graph.mergeNodeAttributes(e,{[i]:n}),t(R()),t(A(window.graph.export()))}}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:s("panel.details.unknown.error",{category:s("panel.details.unknown.node")})})},se=()=>{var e,t;const i=f(),{selected:s}=b((e=>e.runtime)),{t:r}=L(),[a]=s,l=window.graph.getEdgeAttribute(a,"type"),d=null!==(e=window.graph.getEdgeAttribute(a,l))&&void 0!==e?e:{},o=l in C&&C[l].attrsComponent,c=window.graph.getEdgeAttribute(a,"style"),u=null!==(t=window.graph.getEdgeAttribute(a,c))&&void 0!==t?t:{},p=c in E&&E[c].attrsComponent;return n.jsxs(n.Fragment,{children:[o?n.jsx(o,{id:a,attrs:d,handleAttrsUpdate:(e,t)=>{window.graph.mergeEdgeAttributes(e,{[l]:t}),i(S()),i(A(window.graph.export()))}}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:r("panel.details.unknown.error",{category:r("panel.details.unknown.linePath")})}),p?n.jsx(p,{id:a,attrs:u,handleAttrsUpdate:(e,t)=>{window.graph.mergeEdgeAttributes(e,{[c]:t}),i(S()),i(A(window.graph.export()))}}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:r("panel.details.unknown.error",{category:r("panel.details.unknown.lineStyle")})})]})};e("default",(()=>{const{t:e}=L(),t=f(),r=$.useRef(window.graph),d=$.useCallback((()=>{t(R()),t(S()),t(A(r.current.export()))}),[t,R,S,A]),{selected:o,mode:c}=b((e=>e.runtime)),[u]=o;return n.jsxs(I,{isOpen:o.size>0&&!c.startsWith("line"),width:300,header:"Dummy header",alwaysOverlay:!0,children:[n.jsx(D,{onClose:()=>t(P()),children:e("panel.details.header")}),n.jsxs(F,{children:[n.jsx(Z,{}),1===o.size&&r.current.hasNode(u)&&n.jsx(te,{}),1===o.size&&r.current.hasEdge(u)&&n.jsx(ee,{}),1===o.size&&n.jsxs(i,{p:1,children:[n.jsx(s,{as:"h5",size:"sm",children:e("panel.details.specificAttrsTitle")}),window.graph.hasNode(u)&&n.jsx(ie,{}),window.graph.hasEdge(u)&&n.jsx(se,{})]})]}),n.jsx(U,{children:n.jsxs(a,{children:[1===o.size&&r.current.hasNode([...o].at(0))&&n.jsx(l,{size:"sm",variant:"outline",onClick:()=>(e=>{const n=structuredClone(r.current.getNodeAttributes(e));n.x+=50,n.y+=50;const i=e.startsWith("stn")?`stn_${V(10)}`:`misc_node_${V(10)}`;r.current.addNode(i,n),t(R()),t(A(r.current.export()))})([...o].at(0)),children:e("panel.details.footer.duplicate")}),n.jsx(l,{size:"sm",variant:"outline",onClick:()=>(e=>{const t=q(r.current,e);navigator.clipboard.writeText(t)})(o),children:e("panel.details.footer.copy")}),n.jsx(l,{size:"sm",variant:"outline",onClick:()=>{return e=o,t(P()),e.forEach((e=>{r.current.hasNode(e)?r.current.dropNode(e):r.current.hasEdge(e)&&r.current.dropEdge(e)})),void d();var e},children:e("panel.details.footer.remove")})]})})]})}))}}}));