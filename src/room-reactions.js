/* Local illustration deformation. Boundary vertices stay fixed to avoid seams. */
(()=>{
 function triangle(c,img,source,dest){c.save();c.beginPath();dest.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();const [a,b,d]=source,[p,q,r]=dest;const det=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);const aa=((q[0]-p[0])*(d[1]-a[1])-(r[0]-p[0])*(b[1]-a[1]))/det,cc=((r[0]-p[0])*(b[0]-a[0])-(q[0]-p[0])*(d[0]-a[0]))/det,bb=((q[1]-p[1])*(d[1]-a[1])-(r[1]-p[1])*(b[1]-a[1]))/det,dd=((r[1]-p[1])*(b[0]-a[0])-(q[1]-p[1])*(d[0]-a[0]))/det;c.transform(aa,bb,cc,dd,p[0]-aa*a[0]-cc*a[1],p[1]-bb*a[0]-dd*a[1]);c.drawImage(img,0,0);c.restore();}
 function patch(c,img,w,h,rect,warp){const cols=8,rows=12;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const uv=[[i/cols,j/rows],[(i+1)/cols,j/rows],[(i+1)/cols,(j+1)/rows],[i/cols,(j+1)/rows]],s=uv.map(([u,v])=>[(rect[0]+u*rect[2])*img.naturalWidth,(rect[1]+v*rect[3])*img.naturalHeight]),d=uv.map(([u,v])=>{const move=warp(u,v),edge=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);return[(rect[0]+u*rect[2])*w+move[0]*w*edge,(rect[1]+v*rect[3])*h+move[1]*h*edge];});triangle(c,img,[s[0],s[1],s[2]],[d[0],d[1],d[2]]);triangle(c,img,[s[0],s[2],s[3]],[d[0],d[2],d[3]]);}}
 function create(){let bed=0,curtain=0,plant=0;return{draw(c,img,w,h,pose,dt,quiet){c.clearRect(0,0,w,h);const k=1-Math.exp(-dt*6),touch=pose?.touch||0;bed+=((pose?.contact||0)-bed)*k;curtain+=(pose?.target==='sill'?touch-curtain:-curtain)*k;plant+=(pose?.target==='desk'?touch-plant:-plant)*k;const t=pose?.elapsed||0;
   if(bed>.001)patch(c,img,w,h,[.19,.735,.255,.2],(_u,v)=>[0,bed*.008*(1-v*.4)]);
   if(!quiet&&curtain>.002)patch(c,img,w,h,[.578,.06,.13,.68],(_u,v)=>[Math.sin(t*8)*curtain*.006*v,0]);
   if(!quiet&&plant>.002)patch(c,img,w,h,[.855,.35,.145,.34],(_u,v)=>[Math.sin(t*11)*plant*.005*(1-v),Math.cos(t*9)*plant*.002]);
   return{bed,curtain,plant};
  }};}
 window.ROOM_REACTIONS={create};
})();
