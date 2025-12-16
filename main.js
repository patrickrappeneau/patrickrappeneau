document.addEventListener('DOMContentLoaded', function(){
  // highlight active nav link based on current filename
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach(a=>{
    const href = a.getAttribute('href');
    if(href === path || (href === 'index.html' && (path === '' || path === 'index.html'))){
      a.classList.add('active');
    }
    // close nav on link click (mobile)
    a.addEventListener('click', ()=>{
      const nl = document.querySelector('.nav-list');
      if(nl && nl.classList.contains('open')) nl.classList.remove('open');
    });
  });

  const toggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  if(toggle && navList){
    toggle.addEventListener('click', ()=> navList.classList.toggle('open'));
  }
});
