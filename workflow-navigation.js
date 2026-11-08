// Workflow navigation mirrors the Liên cấp CĐSP menu without changing financial data.
(()=>{
'use strict';
const NAV_PAGE_GROUPS={
  fees:'collections','fee-setup':'collections',
  'bidv-export':'bidv',qr:'bidv',notices:'bidv',
  imports:'reconciliation','cash-collection':'reconciliation','manual-import':'reconciliation',
  history:'reports',receipts:'reports'
};
function setNavGroupExpanded(group,expanded){
  document.querySelectorAll('[data-nav-section]').forEach(section=>{
    const active=section.dataset.navSection===group;
    const button=section.querySelector('[data-nav-group]'),submenu=section.querySelector('.nav-submenu');
    const open=active&&expanded;
    if(button)button.setAttribute('aria-expanded',String(open));
    if(submenu)submenu.hidden=!open;
    section.classList.toggle('expanded',open);
  });
}
function prepareWorkflowPages(){
  const main=document.querySelector('.main-area');if(!main)return;
  const destination=(id,eyebrow,title,description)=>{
    let page=document.getElementById('page-'+id);if(page)return page;
    page=document.createElement('section');page.className='page';page.id='page-'+id;
    const heading=document.createElement('div');heading.className='page-heading';
    const wrap=document.createElement('div'),sub=document.createElement('span'),h=document.createElement('h1'),p=document.createElement('p');
    sub.className='eyebrow';sub.textContent=eyebrow;h.textContent=title;p.textContent=description;
    wrap.append(sub,h,p);heading.appendChild(wrap);page.appendChild(heading);
    main.appendChild(page);return page;
  };
  const cash=destination('cash-collection','GHI NHẬN THANH TOÁN','Thu tiền mặt theo phiên','Ghi nhận theo học sinh, từng khoản và đối chiếu số thực nhận trước khi đồng bộ.');
  const manual=destination('manual-import','CÁC NGUỒN THU NGOÀI BIDV','Nhập thu ngoài BIDV','Nhập file các khoản đã thu qua thủ quỹ hoặc chuyển trực tiếp.');
  for(const selector of ['.cash-session-card','.cash-entry-card','#cashierFileInput']){
    const el=document.querySelector(selector);if(el)cash.appendChild(el);
  }
  for(const selector of ['.cash-file-card','#manualCollectionFileInput']){
    const el=document.querySelector(selector);if(el)manual.appendChild(el);
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  prepareWorkflowPages();
  document.querySelectorAll('[data-nav-group]').forEach(button=>button.addEventListener('click',()=>setNavGroupExpanded(button.dataset.navGroup,button.getAttribute('aria-expanded')!=='true')));
  const showPage=window.setPage;
  window.setPage=function(page){
    if(page==='insurance')page='dashboard';
    showPage(page);
    const group=NAV_PAGE_GROUPS[page]||'';
    setNavGroupExpanded(group,!!group);
    document.querySelectorAll('.nav-group-toggle').forEach(button=>button.classList.toggle('active',button.dataset.navGroup===group));
    document.querySelectorAll('.nav-item[data-page]').forEach(button=>{
      if(button.dataset.page===page)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    const titles={'cash-collection':['Thu tiền mặt theo phiên','Ghi nhận và đối chiếu các khoản tiền mặt thực nhận'],'manual-import':['Nhập thu ngoài BIDV','Nhập danh sách đã thu qua thủ quỹ hoặc chuyển khoản trực tiếp']};
    if(titles[page]){document.getElementById('topTitle').textContent=titles[page][0];document.getElementById('topSubtitle').textContent=titles[page][1]}
  };
  document.querySelector('[data-page="dashboard"]').setAttribute('aria-current','page');
});
})();
