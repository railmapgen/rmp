import{S as f,e as u}from"./index-e60786d3.js";const p=(n,e)=>n.filterEdges((t,s,o,c,r,a,d)=>e.has(o)&&e.has(c)),E=n=>{const e=Object.fromEntries([...Object.values(f),Object.values(u)].map(t=>[t,!1]));return n.forEachNode(t=>{const s=n.getNodeAttribute(t,"type");e[s]=!0}),e},N=(n,e,t,s,o,c)=>n<=o&&o<=t&&e<=c&&c<=s,b=(n,e,t,s,o)=>{const c=e<=s?e:s,r=t<=o?t:o,a=e<=s?s:e,d=t<=o?o:t;return n.filterNodes((g,i)=>N(c,r,a,d,i.x,i.y))};export{b as a,p as b,E as f};