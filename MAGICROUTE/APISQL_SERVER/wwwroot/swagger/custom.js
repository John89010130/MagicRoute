window.onload = function() {
  const logo = document.querySelector('.topbar');
  if (logo) {
    logo.innerHTML = `
      <a href="/" style="display:flex;align-items:center;gap:10px;color:#58a6ff;text-decoration:none;">
        <img src="/swagger/logo.png" alt="MagicRoute" style="height:30px;"> 
        <span>MagicRoute API</span>
      </a>`;
  }
};
