System.register(["./chakra-legacy-C795P1qx.js","./index-legacy-Bs1Ga5R7.js","./react-legacy-B9RkHKhm.js","./clipboard-legacy-DlFOs6Uh.js","./master-manager-legacy-DqsKORUS.js","./change-type-modal-legacy-BSHqd-Tn.js","./tools-legacy-DbJMgvr0.js","./misc-nodes-legacy-Pf8BiF4V.js","./index-legacy-DlkxPhZP.js"],(function(e,t){"use strict";var n,i,r,s,a,l,d,o,c,u,p,h,g,m,x,j,b,f,y,w,v,A,N,S,C,E,z,k,W,O,I,R,P,T,D,L,_,F,U,M,$,V,B,H,K,Q,q,G,J,X,Y,Z,ee,te,ne;return{setters:[e=>{n=e.j,i=e.B,r=e.aw,s=e.ax,a=e.aK,l=e.O,d=e.aM,o=e.U,c=e.D,u=e._,p=e.$,h=e.a0,g=e.a1,m=e.a3,x=e.a5,j=e.a4},e=>{b=e.e,f=e.a,y=e.az,w=e.U,v=e.at,A=e.aA,N=e.v,S=e.w,C=e.o,E=e.ap,z=e.l,k=e.p,W=e.Q,O=e.aB,I=e.t,R=e._,P=e.$,T=e.j,D=e.m,L=e.y,_=e.au,F=e.ay,U=e.aC,M=e.aD,$=e.aE,V=e.aF,B=e.aw,H=e.n},e=>{K=e.u,Q=e.b},e=>{q=e.u,G=e.e},e=>{J=e.s},e=>{X=e.C,Y=e.c,Z=e.a,ee=e.b},e=>{te=e.LearnHowToAdd},e=>{ne=e.m},null],execute:function(){function t(){const{t:e}=K(),t=b(),{selected:u}=f((e=>e.runtime)),p=Q.useRef(window.graph),h=e=>{if(p.current.hasNode(e)){const t=p.current.getNodeAttributes(e),n=t.type;return e.startsWith("stn")?t[n].names.join("/"):n}if(p.current.hasEdge(e)){const[t,n]=p.current.extremities(e),i=p.current.getSourceAttributes(e),r=p.current.getTargetAttributes(e),s=i.type,a=r.type;return(t.startsWith("stn")?i[s].names[0]:s)+" - "+(n.startsWith("stn")?r[a].names[0]:a)}},[g,m]=Q.useState([]);Q.useEffect((()=>{m(["station","misc-node","line"])}),[u]);const[x,j]=Q.useState(!1);return n.jsxs(i,{children:[n.jsxs(r,{as:"h5",size:"sm",children:[e("panel.details.multipleSelection.selected")," ",u.size]}),n.jsxs(s,{m:"var(--chakra-space-1)",children:[n.jsxs(a,{w:"100%",children:[n.jsx(r,{as:"h5",size:"xs",w:"100%",children:e("panel.details.multipleSelection.show")}),n.jsx(y,{selections:[{label:e("panel.details.multipleSelection.station"),value:"station"},{label:e("panel.details.multipleSelection.miscNode"),value:"misc-node"},{label:e("panel.details.multipleSelection.edge"),value:"line"}],defaultValue:g,multiSelect:!0,onChange:e=>m(e)})]}),0!==g.length&&n.jsxs(n.Fragment,{children:[n.jsxs(l,{width:"100%",size:"sm",onClick:()=>j(!0),children:[e("panel.details.multipleSelection.change"),n.jsx(d,{label:e("header.settings.pro"),children:n.jsx(o,{ml:"1",color:"gray.50",background:"radial-gradient(circle, #3f5efb, #fc466b)",children:"PRO"})})]}),n.jsx(c,{})]}),[...u].filter((e=>g.includes("station")||!e.startsWith("stn"))).filter((e=>g.includes("misc-node")||!e.startsWith("misc"))).filter((e=>g.includes("line")||!e.startsWith("line"))).map((e=>{var i;return n.jsxs(a,{width:"100%",children:[n.jsx(l,{width:"100%",size:"sm",variant:"solid",onClick:()=>t(w(new Set([e]))),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"ruby",children:null===(i=h(e))||void 0===i?void 0:i.replaceAll("\\","⏎")}),n.jsx(l,{size:"sm",onClick:()=>t(v(e)),children:n.jsx(A,{})})]},e)}))]}),n.jsx(X,{isOpen:x,onClose:()=>j(!1),isSelect:!0,filter:g})]})}function ie(){const{t:e}=K(),t=b(),i=Q.useCallback((()=>{t(N()),t(S(o.current.export()))}),[t,N,S]),{preference:{autoParallel:r}}=f((e=>e.app)),{selected:s,theme:a}=f((e=>e.runtime)),[d]=s,o=Q.useRef(window.graph),[c,j]=Q.useState(!1),y=Q.useRef(null),w=Object.fromEntries(Object.entries(C).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),[v,A]=Q.useState(o.current.getEdgeAttribute(d,"type")),[I,R]=Q.useState(void 0),P=Object.fromEntries(Object.entries(E).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),[T,D]=Q.useState(o.current.getEdgeAttribute(d,"style")),[L,_]=Q.useState(void 0);Q.useEffect((()=>{A(o.current.getEdgeAttribute(d,"type")),D(o.current.getEdgeAttribute(d,"style"))}),[d]);const F=Object.values(z).filter((e=>!E[T].metadata.supportLinePathType.includes(e))),U=Object.values(k).filter((e=>!E[e].metadata.supportLinePathType.includes(v))),M=e=>{e&&(I?(I&&(Y(o.current,d,I,r),A(o.current.getEdgeAttribute(d,"type")),i()),R(void 0)):L&&(L&&(Z(o.current,d,L,a),D(o.current.getEdgeAttribute(d,"style")),i()),_(void 0))),j(!1)};return n.jsxs(n.Fragment,{children:[n.jsx(W,{label:e("panel.details.info.linePathType"),minW:"276",children:n.jsx(O,{options:w,disabledOptions:F,defaultValue:v,value:v,onChange:({target:{value:e}})=>{R(e),j(!0)}})}),n.jsx(W,{label:e("panel.details.info.lineStyleType"),minW:"276",children:n.jsx(O,{options:P,disabledOptions:U,defaultValue:T,value:T,onChange:({target:{value:e}})=>{_(e),j(!0)}})}),n.jsx(te,{type:"line",expand:!0}),n.jsx(u,{isOpen:c,leastDestructiveRef:y,onClose:()=>M(!1),children:n.jsx(p,{children:n.jsxs(h,{children:[n.jsx(g,{children:e("warning")}),n.jsx(m,{children:e("panel.details.changeLineTypeContent")}),n.jsxs(x,{children:[n.jsx(l,{ref:y,onClick:()=>M(!1),children:e("cancel")}),n.jsx(l,{ml:"2",colorScheme:"red",onClick:()=>M(!0),children:e("panel.details.changeType")})]})]})})})]})}function re(){const{t:e}=K(),t=b(),i=Q.useCallback((()=>{t(I()),t(S(a.current.export()))}),[t,I,S]),{selected:r}=f((e=>e.runtime)),[s]=r,a=Q.useRef(window.graph),[d,o]=Q.useState(!1),c=Q.useRef(null),[j,y]=Q.useState(void 0),w=a.current.getNodeAttribute(s,"type"),v=Object.fromEntries(Object.entries(J).map((([t,n])=>[t,e(n.metadata.displayName).toString()]))),A=e=>{e&&j&&(ee(a.current,s,j),i()),y(void 0),o(!1)};return n.jsxs(n.Fragment,{children:[n.jsx(W,{label:e("panel.details.info.stationType"),minW:"276",children:n.jsx(O,{options:v,disabledOptions:[w],value:w,onChange:({target:{value:e}})=>{y(e),o(!0)}})}),n.jsx(u,{isOpen:d,leastDestructiveRef:c,onClose:()=>A(!1),children:n.jsx(p,{children:n.jsxs(h,{children:[n.jsx(g,{children:e("warning")}),n.jsx(m,{children:e("panel.details.changeStationTypeContent")}),n.jsxs(x,{children:[n.jsx(l,{ref:c,onClick:()=>A(!1),children:e("cancel")}),n.jsx(l,{ml:"2",colorScheme:"red",onClick:()=>A(!0),children:e("panel.details.changeType")})]})]})})})]})}function se(){const{t:e}=K(),s=b(),a=Q.useCallback((()=>{s(I()),s(N()),s(S(u.current.export()))}),[s,I,N,S]),{activeSubscriptions:l}=f((e=>e.account)),{selected:d,parallelLinesCount:o}=f((e=>e.runtime)),[c]=d,u=Q.useRef(window.graph),p=e=>{u.current.setEdgeAttribute(c,"parallelIndex",e),s(N()),s(S(u.current.export()))},h=[];if(0===d.size);else if(1===d.size){if(h.push({type:"input",label:e("panel.details.info.id"),value:c,minW:276}),h.push({type:"select",label:e("panel.details.info.zIndex"),value:c?u.current.hasNode(c)?u.current.getNodeAttribute(c,"zIndex"):u.current.hasEdge(c)?u.current.getEdgeAttribute(c,"zIndex"):0:0,options:Object.fromEntries(Array.from({length:21},((e,t)=>[t-10,(t-10).toString()]))),onChange:e=>(e=>{const t=Math.min(Math.max(e,-10),10);u.current.hasNode(c)&&u.current.setNodeAttribute(c,"zIndex",t),u.current.hasEdge(c)&&u.current.setEdgeAttribute(c,"zIndex",t),a()})(Number(e))}),u.current.hasEdge(c)){const t=u.current.getEdgeAttributes(c),n=t.parallelIndex,i=l.RMP_CLOUD?R:P,r=o>i&&n<0,s=o>i&&n>=0;h.push({type:"switch",label:e("panel.details.info.parallel"),isDisabled:r,isChecked:n>=0,onChange:e=>((e,t)=>{let n=-1;if(e){const e=u.current.getEdgeAttributes(c),[i,r]=u.current.extremities(c);n=D(u.current,e.type,i,r,t)}p(n)})(e,t[t.type].startFrom),oneLine:!0,minW:276}),n>=0&&h.push({type:"input",label:e("panel.details.info.parallelIndex"),variant:"number",isDisabled:s,value:t.parallelIndex.toString(),onChange:e=>p(Number(e)),minW:276})}}else d.size>1&&h.push({type:"input",label:e("panel.details.info.type"),value:e("panel.details.multipleSelection.title"),minW:276});return n.jsxs(i,{p:1,children:[n.jsx(r,{as:"h5",size:"sm",children:e("panel.details.info.title")}),n.jsx(T,{fields:h,minW:130}),1===d.size&&c.startsWith("stn")&&u.current.hasNode(c)&&u.current.getNodeAttribute(c,"type")in J&&n.jsx(re,{}),1===d.size&&c.startsWith("line")&&u.current.hasEdge(c)&&u.current.getEdgeAttribute(c,"type")in C&&u.current.getEdgeAttribute(c,"style")in E&&n.jsx(ie,{}),d.size>1&&n.jsx(t,{})]})}function ae(){const{t:e}=K(),t=b(),{selected:s}=f((e=>e.runtime)),[a]=s,d=Q.useRef(window.graph),[o,c]=Q.useState("undefined"),[u,p]=Q.useState("undefined"),[h,g]=Q.useState("undefined"),[m,x]=Q.useState("undefined");Q.useEffect((()=>{if(null!=a&&a.startsWith("line")){const[r,s]=d.current.extremities(a);if(c(r),p(s),r.startsWith("stn")){var e,t;const n=d.current.getNodeAttribute(r,"type");g(null!==(e=null===(t=d.current.getNodeAttribute(r,n))||void 0===t?void 0:t.names.at(0))&&void 0!==e?e:"undefined")}if(s.startsWith("stn")){var n,i;const e=d.current.getNodeAttribute(s,"type");x(null!==(n=null===(i=d.current.getNodeAttribute(s,e))||void 0===i?void 0:i.names.at(0))&&void 0!==n?n:"undefined")}}}),[s]);const j=q((()=>{t(L()),t(_(o))})),y=q((()=>{t(L()),t(_(u))})),w=[{type:"custom",label:e("panel.details.lineExtremities.source"),component:n.jsx(l,{ml:"auto",size:"sm",variant:"link",onClick:j,children:o}),oneLine:!0,minW:"full"},{type:"input",label:e("panel.details.lineExtremities.sourceName"),value:h,minW:"full"},{type:"custom",label:e("panel.details.lineExtremities.target"),component:n.jsx(l,{ml:"auto",size:"sm",variant:"link",onClick:y,children:u}),oneLine:!0,minW:"full"},{type:"input",label:e("panel.details.lineExtremities.targetName"),value:m,minW:"full"}];return n.jsxs(i,{p:1,children:[n.jsx(r,{as:"h5",size:"sm",children:e("panel.details.lineExtremities.title")}),n.jsx(T,{fields:w,minW:130})]})}function le(){const{t:e}=K(),t=b(),s=Q.useCallback((()=>{t(I()),t(N()),t(S(o.current.export()))}),[t,I,N,S]),{selected:a,refresh:{nodes:l}}=f((e=>e.runtime)),[d]=a,o=Q.useRef(window.graph),[c,u]=Q.useState({x:0,y:0});Q.useEffect((()=>{if(null!=d&&d.startsWith("stn")||null!=d&&d.startsWith("misc_node_")){const e=o.current.getNodeAttribute(d,"x"),t=o.current.getNodeAttribute(d,"y");u({x:e,y:t})}}),[l,a]);const p=[{type:"input",label:e("panel.details.nodePosition.pos.x"),value:c.x.toString(),validator:e=>!Number.isNaN(e),onChange:e=>{o.current.mergeNodeAttributes(d,{x:Number(e)}),s()}},{type:"input",label:e("panel.details.nodePosition.pos.y"),value:c.y.toString(),validator:e=>!Number.isNaN(e),onChange:e=>{o.current.mergeNodeAttributes(d,{y:Number(e)}),s()}}];return n.jsxs(i,{p:1,children:[n.jsx(r,{as:"h5",size:"sm",children:e("panel.details.nodePosition.title")}),n.jsx(T,{fields:p,minW:130})]})}const de={...J,...ne},oe=()=>{var e;const t=b(),{selected:i}=f((e=>e.runtime)),{t:r}=K(),[s]=i,a=window.graph.getNodeAttribute(s,"type"),l=a in de&&de[a].attrsComponent,d=null!==(e=window.graph.getNodeAttribute(s,a))&&void 0!==e?e:{};return l?n.jsx(l,{id:s,attrs:d,handleAttrsUpdate:(e,n)=>{const i=window.graph.getNodeAttribute(e,"type");window.graph.mergeNodeAttributes(e,{[i]:n}),t(I()),t(S(window.graph.export()))}}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:r("panel.details.unknown.error",{category:r("panel.details.unknown.node")})})},ce=()=>{var e,t;const i=b(),{preference:{autoParallel:r}}=f((e=>e.app)),{selected:s}=f((e=>e.runtime)),{t:a}=K(),[l]=s,{type:d,style:o,parallelIndex:c,reconcileId:u}=window.graph.getEdgeAttributes(l),p=null!==(e=window.graph.getEdgeAttribute(l,d))&&void 0!==e?e:{},h=d in C&&C[d].attrsComponent,g=null!==(t=window.graph.getEdgeAttribute(l,o))&&void 0!==t?t:{},m=o in E&&E[o].attrsComponent;return n.jsxs(n.Fragment,{children:[h?n.jsx(h,{id:l,attrs:p,recalculateParallelIndex:e=>{let t=-1;if(r){const[n,i]=window.graph.extremities(e);t=D(window.graph,d,n,i,p.startFrom)}window.graph.setEdgeAttribute(e,"parallelIndex",t)},handleAttrsUpdate:(e,t)=>{window.graph.mergeEdgeAttributes(e,{[d]:t}),i(N()),i(S(window.graph.export()))},parallelIndex:c}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:a("panel.details.unknown.error",{category:a("panel.details.unknown.linePath")})}),m?n.jsx(m,{id:l,attrs:g,handleAttrsUpdate:(e,t)=>{window.graph.mergeEdgeAttributes(e,{[o]:t}),i(N()),i(S(window.graph.export()))},reconcileId:u}):n.jsx(j,{fontSize:"xs",m:"var(--chakra-space-1)",children:a("panel.details.unknown.error",{category:a("panel.details.unknown.lineStyle")})})]})};e("default",(()=>{const{t:e}=K(),t=b(),s=Q.useRef(window.graph),d=Q.useCallback((()=>{t(I()),t(N()),t(S(s.current.export()))}),[t,I,N,S]),{activeSubscriptions:o}=f((e=>e.account)),{selected:c,mode:u,active:p,masterNodesCount:h}=f((e=>e.runtime)),[g]=c,m=!o.RMP_CLOUD&&h+1>F;return n.jsxs(U,{isOpen:c.size>0&&!u.startsWith("line")&&!p,width:300,header:"Dummy header",alwaysOverlay:!0,children:[n.jsx(M,{onClose:()=>t(L()),children:e("panel.details.header")}),n.jsxs($,{children:[n.jsx(se,{}),1===c.size&&s.current.hasNode(g)&&n.jsx(le,{}),1===c.size&&s.current.hasEdge(g)&&n.jsx(ae,{}),1===c.size&&n.jsxs(i,{p:1,children:[n.jsx(r,{as:"h5",size:"sm",children:e("panel.details.specificAttrsTitle")}),window.graph.hasNode(g)&&n.jsx(oe,{}),window.graph.hasEdge(g)&&n.jsx(ce,{})]})]}),n.jsx(V,{children:n.jsxs(a,{children:[1===c.size&&s.current.hasNode(g)&&n.jsx(l,{size:"sm",variant:"outline",onClick:()=>(e=>{const n=structuredClone(s.current.getNodeAttributes(e));n.x+=50,n.y+=50;const i=e.startsWith("stn")?`stn_${H(10)}`:`misc_node_${H(10)}`;s.current.addNode(i,n),t(I()),t(S(s.current.export()))})(g),isDisabled:s.current.getNodeAttributes(g).type===B.Master&&m,children:e("panel.details.footer.duplicate")}),n.jsx(l,{size:"sm",variant:"outline",onClick:()=>(e=>{const t=G(s.current,e);navigator.clipboard.writeText(t)})(c),children:e("panel.details.footer.copy")}),n.jsx(l,{size:"sm",variant:"outline",onClick:()=>{return e=c,t(L()),e.forEach((e=>{s.current.hasNode(e)?s.current.dropNode(e):s.current.hasEdge(e)&&s.current.dropEdge(e)})),void d();var e},children:e("panel.details.footer.remove")})]})})]})}))}}}));
