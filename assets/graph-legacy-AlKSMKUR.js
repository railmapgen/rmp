System.register(["./index-legacy-brty8Nln.js"],(function(t,e){"use strict";var r,s,o;return{setters:[t=>{r=t.S,s=t.b,o=t.L}],execute:function(){t("b",((t,e)=>t.filterEdges(((t,r,s,o,c,n,i)=>e.has(s)&&e.has(o))))),t("f",(t=>{const e=Object.fromEntries([...Object.values(r),Object.values(s)].map((t=>[t,!1])));return t.forEachNode((r=>{const s=t.getNodeAttribute(r,"type");e[s]=!0})),e})),t("a",((t,e,r,s,o)=>{const c=e<=s?e:s,n=r<=o?r:o,i=e<=s?s:e,u=r<=o?o:r;return t.filterNodes(((t,e)=>((t,e,r,s,o,c)=>t<=o&&o<=r&&e<=c&&c<=s)(c,n,i,u,e.x,e.y)))})),t("c",((t,e,r)=>{const s=[],c=new Set;return e.forEach((e=>{const r=t.getNodeAttributes(e).type,o=t.getNodeAttribute(e,r);if(void 0!==o.color){const t=o.color;c.has(t.toString())||(s.push(t),c.add(t.toString()))}})),r.filter((e=>o.includes(t.getEdgeAttribute(e,"style")))).forEach((e=>{const r=t.getEdgeAttributes(e),o=r[r.style].color;c.has(o.toString())||(s.push(o),c.add(o.toString()))})),s}))}}}));