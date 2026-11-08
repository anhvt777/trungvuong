/* Shared QR SVG renderer, safe default: black squares, 4-module quiet zone. */
function renderSVG(payload,{style='standard',size=640,color='#000000'}={}){
 if(!['standard','dots-experimental'].includes(style))throw Error('Unsupported style');
 if(!Number.isInteger(size)||size<256||size>2048)throw Error('Invalid size');
 if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('Invalid color');
 const qr=new QRCore(-1,2);qr.addData(payload);qr.make();
 const n=qr.getModuleCount(),q=4,s=n+2*q;
 const items=[`<rect width="${s}" height="${s}" fill="#fff"/>`];
 if(style==='standard'){
  let path='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))path+=`M${x+q} ${y+q}h1v1h-1z`;
  items.push(`<path d="${path}" fill="${color}"/>`);
 }else{
  const finder=(r,c)=>(r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c)&&!finder(r,c))items.push(`<circle cx="${c+q+.5}" cy="${r+q+.5}" r="0.46" fill="${color}"/>`);
  for(const [r,c] of [[0,0],[0,n-7],[n-7,0]]){
   const x=c+q+3.5,y=r+q+3.5;items.push(`<circle cx="${x}" cy="${y}" r="3.45" fill="${color}"/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/><circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`);
  }
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}" shape-rendering="${style==='standard'?'crispEdges':'geometricPrecision'}">${items.join('')}</svg>`;
}