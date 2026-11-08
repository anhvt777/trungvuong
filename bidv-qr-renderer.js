/* BIDV QR Brand Renderer V1.0.0 - identical artwork for school & parent-portal QR export. */
(function(root){'use strict';
const MARK="data:image/png;base64,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";
const VERSION='1.0.0';
const getImage=src=>new Promise((resolve,reject)=>{if(!src){resolve(null);return}const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('QR_LOGO_FAILED'));im.src=src;});
function place(ctx,image,x,y,max){if(!image)return;const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,f=Math.min(max/w,max/h);ctx.drawImage(image,x-w*f/2,y-h*f/2,w*f,h*f)}
async function render(payload,opts={}){
 if(typeof QRCode==='undefined')throw Error('QR_LIBRARY_REQUIRED');
 if(typeof payload!=='string'||payload.length>650)throw Error('INVALID_QR_PAYLOAD');
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0';document.body.appendChild(host);
 try{
  const qr=new QRCode(host,{text:payload,width:380,height:380,correctLevel:QRCode.CorrectLevel.H});
  const matrix=qr._oQRCode;if(!matrix)throw Error('QR_MATRIX_UNAVAILABLE');
  const n=matrix.getModuleCount(),scale=Math.floor(408/(n+8));if(scale<3)throw Error('QR_TOO_DENSE_FOR_LOGO');
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=600;
  const c=canvas.getContext('2d');if(!c)throw Error('CANVAS_UNAVAILABLE');
  c.fillStyle='#fff';c.fillRect(0,0,480,600);c.fillStyle='#007e75';c.fillRect(0,0,480,6);
  const [mark,school]=await Promise.all([getImage(MARK),opts.schoolLogoData?getImage(opts.schoolLogoData):null]);
  if(school){place(c,school,172,46,57);place(c,mark,298,46,53)}else place(c,mark,240,46,59);
  c.fillStyle='#163d42';c.textAlign='center';c.font='bold 14px Arial';c.fillText('BIDV  |  QR THANH TOAN',240,86);
  const size=(n+8)*scale,x=Math.floor((480-size)/2),y=102;
  c.fillStyle='#fff';c.fillRect(x-2,y-2,size+4,size+4);c.fillStyle='#14252a';
  for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(matrix.isDark(r,col))c.fillRect(x+(col+4)*scale,y+(r+4)*scale,scale,scale);
  const centerX=x+size/2,centerY=y+size/2,logoSize=Math.min(43,Math.floor(n*scale*0.12));
  c.fillStyle='#fff';c.beginPath();c.roundRect(centerX-logoSize/2-3,centerY-logoSize/2-3,logoSize+6,logoSize+6,6);c.fill();place(c,mark,centerX,centerY,logoSize);
  const label=String(opts.label||'').replace(/\s+/g,' ').slice(0,75);let font=19;
  while(font>11){c.font='600 '+font+'px Arial';if(c.measureText(label).width<=442)break;font--}
  const bottom=y+size+23;c.fillStyle='#173b41';c.fillText(label,240,bottom);
  const amount=Number(opts.amount);if(!Number.isSafeInteger(amount)||amount<=0)throw Error('INVALID_QR_AMOUNT');
  c.fillStyle='#006b64';c.font='bold 16px Arial';c.fillText('So tien: '+amount.toLocaleString('vi-VN')+' VND',240,bottom+28);
  c.fillStyle='#60747a';c.font='12px Arial';c.fillText('Kiem tra ten thu huong va so tien truoc khi chuyen khoan',240,bottom+51);
  return canvas.toDataURL('image/png');
 }finally{host.remove()}
}
root.BIDVQRBrand=Object.freeze({version:VERSION,render});
})(typeof window!=='undefined'?window:globalThis);
