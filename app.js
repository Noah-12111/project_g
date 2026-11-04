const products = [
  {id:'gunpla-action',name:'Gunpla Action Display Kit',series:'GUNDAM / MODEL KIT',category:'gundam',tag:'GUNPLA',desc:'Bộ mô hình robot lắp ráp với tạo dáng hành động và phụ kiện trưng bày.',price:'1.250.000₫',image:'https://p-bandai.com/files/seller-products/FSP0000854001/JKcF1ESODp4ymL9SA0Jq.jpg',source:'https://p-bandai.com/us/item/F2628638001',sourceLabel:'Premium Bandai'},
  {id:'mika-bluearchive',name:'Mika — Call of the Stars',series:'BLUE ARCHIVE / FIGURE',category:'anime',tag:'ANIME',desc:'Figure nhân vật Mika với tông màu pastel và tạo hình trang trí tinh tế.',price:'1.650.000₫',image:'https://resize.cdn.otakumode.com/ex/800.1200/shop/product/9d4d3ad4296b427f905495301813047f.jpg',source:'https://otakumode.com/shop/66873f0f4a2e4900285a2d3e/Blue-Archive-Mika-Call-of-the-Stars-1-7-Scale-Figure',sourceLabel:'Tokyo Otaku Mode'},
  {id:'hina-bluearchive',name:'Sorasaki Hina 1/7',series:'BLUE ARCHIVE / FIGURE',category:'anime',tag:'ANIME',desc:'Figure Hina với trang phục tông tím, phụ kiện và đế trưng bày.',price:'1.790.000₫',image:'https://images.bigbadtoystore.com/images/product/94517/a8b12dfc-db46-4e56-837a-d95c1aaf3213/original.jpg',source:'https://www.bigbadtoystore.com/product/blue-archive-sorasaki-hina-1_7-scale-figure-94517',sourceLabel:'BigBadToyStore'},
  {id:'link-zelda',name:'Link — Tears of the Kingdom',series:'THE LEGEND OF ZELDA / FIGURE',category:'game',tag:'GAMING',desc:'Mô hình Link trong tạo hình phiêu lưu, phù hợp góc trưng bày game.',price:'890.000₫',image:'https://sw6.elbenwald.de/media/5d/79/77/1774258194/E1091001_13.jpg',source:'https://www.elbenwald.de/zelda/zelda-tears-of-the-kingdom-link-figur',sourceLabel:'Elbenwald'},
  {id:'mario-statue',name:'Mario Question Block Statue',series:'SUPER MARIO / STATUE',category:'game',tag:'GAMING',desc:'Tượng Mario cùng khối Question Block, gợi lại phong cách game kinh điển.',price:'750.000₫',image:'https://i.etsystatic.com/38819111/c/1371/1371/338/82/il/7607bc/6536833651/il_600x600.6536833651_fldn.jpg',source:'https://www.etsy.com/market/nintendo_mario_statue',sourceLabel:'Etsy'},
  {id:'atreus-gow',name:'Atreus — God of War',series:'GOD OF WAR / STATUE',category:'game',tag:'GAMING',desc:'Tượng nhân vật Atreus với trang phục phiêu lưu và bệ đá trưng bày.',price:'2.100.000₫',image:'https://img.cloud360.top/uploader/99c96d4bc347a54622717c34883af77e.jpg',source:'https://toybuddyland.com/products/god-of-war-20th-anniversary-collector-statue-series',sourceLabel:'Toybuddyland'}
];

const grid = document.querySelector('#product-grid');
const searchInput = document.querySelector('#search-input');
const wishlistKey = 'hobbyverse-wishlist-v1';
let activeFilter = 'all';
let wishlist = new Set(JSON.parse(localStorage.getItem(wishlistKey) || '[]'));
let chatHistory = [];
let toastTimer;

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
function updateWishlistCount() {
  document.querySelector('#wishlist-count').textContent = wishlist.size;
}
function toggleWishlist(id) {
  if (wishlist.has(id)) wishlist.delete(id); else wishlist.add(id);
  localStorage.setItem(wishlistKey, JSON.stringify([...wishlist]));
  updateWishlistCount(); renderProducts();
  toast(wishlist.has(id) ? 'Đã lưu vào danh sách yêu thích.' : 'Đã bỏ khỏi danh sách yêu thích.');
}
function imageMarkup(product) {
  return `<img src="${product.image}" alt="${product.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')">`;
}
function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase('vi');
  let visible = products.filter(p => (activeFilter === 'all' || p.category === activeFilter) && `${p.name} ${p.series} ${p.desc}`.toLocaleLowerCase('vi').includes(query));
  if (activeFilter === 'wishlist') visible = visible.filter(p => wishlist.has(p.id));
  grid.innerHTML = visible.length ? visible.map(p => `
    <article class="product-card">
      <div class="product-image"><span class="product-tag">${p.tag}</span>${imageMarkup(p)}<button class="heart-button ${wishlist.has(p.id) ? 'active' : ''}" data-heart="${p.id}" type="button" aria-label="${wishlist.has(p.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${wishlist.has(p.id) ? '♥' : '♡'}</button></div>
      <div class="product-info"><div class="product-series">${p.series}</div><h3>${p.name}</h3><p class="product-desc">${p.desc}</p><div class="product-bottom"><div><span class="price-label">GIÁ MINH HỌA</span><span class="product-price">${p.price}</span></div><div class="product-actions"><button class="small-action" data-detail="${p.id}" type="button">Chi tiết</button><button class="small-action" data-ask="${p.id}" type="button">Hỏi AI ✦</button></div></div></div>
    </article>`).join('') : '<div class="empty-state">Không tìm thấy mô hình phù hợp. Thử từ khóa khác nhé.</div>';
}
function openChat(prefill='') {
  const panel = document.querySelector('#chat-panel');
  panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
  if (prefill) document.querySelector('#chat-input').value = prefill;
  document.querySelector('#chat-input').focus();
}
function closeChat() {
  const panel = document.querySelector('#chat-panel');
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
}
function openProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  document.querySelector('#modal-content').innerHTML = `<div class="modal-layout"><img src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer"><div><div class="eyebrow">${p.series}</div><h2 id="modal-title">${p.name}</h2><p>${p.desc}</p><p><strong>Giá minh họa: ${p.price}</strong></p><p>Website demo chưa xác minh giá, hàng còn hay chính sách bán thực tế.</p><a class="modal-source" href="${p.source}" target="_blank" rel="noopener noreferrer">Tham khảo nguồn hình ảnh ↗ · ${p.sourceLabel}</a><div style="margin-top:22px"><button class="button button-primary" id="modal-ask">Hỏi AI về mô hình này ✦</button></div></div></div>`;
  document.querySelector('#product-modal').classList.add('open');
  document.querySelector('#product-modal').setAttribute('aria-hidden','false');
  document.querySelector('#modal-ask').addEventListener('click', () => { closeModal(); openChat(`Hãy tư vấn cho mình về ${p.name}. Mô hình này phù hợp với ai và cần lưu ý gì khi sưu tầm?`); });
}
function closeModal() { document.querySelector('#product-modal').classList.remove('open'); document.querySelector('#product-modal').setAttribute('aria-hidden','true'); }
function addMessage(role, content, extra='') {
  const holder = document.querySelector('#chat-messages');
  const node = document.createElement('div'); node.className = `message ${role} ${extra}`; node.textContent = content;
  holder.appendChild(node); holder.scrollTop = holder.scrollHeight; return node;
}
async function sendChat(message) {
  const trimmed = message.trim(); if (!trimmed) return;
  addMessage('user', trimmed);
  const input = document.querySelector('#chat-input'); const send = document.querySelector('.chat-form button');
  input.value = '';
  if (window.location.protocol === 'file:') {
    addMessage('assistant', 'Bạn đang mở index.html trực tiếp nên phần giao diện có thể xem, nhưng AI cần máy chủ Node.js để hoạt động. Hãy giải nén toàn bộ ZIP, nhấp đúp start.bat trong thư mục dự án, rồi mở http://127.0.0.1:3000.');
    return;
  }
  send.disabled = true;
  const typing = addMessage('assistant', 'HobbyVerse AI đang suy nghĩ…', 'typing');
  try {
    const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:trimmed,history:chatHistory})});
    const data = await response.json(); typing.remove();
    if (!response.ok) throw new Error(data.error || 'Không thể kết nối AI.');
    addMessage('assistant', data.answer);
    chatHistory.push({role:'user',content:trimmed},{role:'assistant',content:data.answer});
    chatHistory = chatHistory.slice(-8);
  } catch (error) {
    typing.remove(); addMessage('assistant', error.message, 'error');
  } finally { send.disabled = false; input.focus(); }
}

grid.addEventListener('click', e => {
  const heart = e.target.closest('[data-heart]'); if (heart) return toggleWishlist(heart.dataset.heart);
  const detail = e.target.closest('[data-detail]'); if (detail) return openProduct(detail.dataset.detail);
  const ask = e.target.closest('[data-ask]'); if (ask) { const p=products.find(x=>x.id===ask.dataset.ask); openChat(`Hãy tư vấn cho mình về ${p.name}.`); }
});
document.querySelectorAll('.filter-tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter-tab').forEach(x => x.classList.remove('active'));
  btn.classList.add('active'); activeFilter = btn.dataset.filter; renderProducts();
}));
searchInput.addEventListener('input', renderProducts);
document.querySelector('#wishlist-header').addEventListener('click', () => {
  activeFilter = 'wishlist';
  document.querySelectorAll('.filter-tab').forEach(x=>x.classList.remove('active'));
  renderProducts(); document.querySelector('#catalog').scrollIntoView({behavior:'smooth'});
  if (!wishlist.size) toast('Danh sách yêu thích của bạn đang trống.');
});
document.querySelector('#chat-launcher').addEventListener('click', () => openChat());
document.querySelector('#chat-close').addEventListener('click', closeChat);
document.querySelector('#hero-ai').addEventListener('click', () => openChat('Mình muốn tìm hiểu các loại mô hình đang có. Hãy tư vấn cho mình nhé.'));
document.querySelector('#feature-ai').addEventListener('click', () => openChat());
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => sendChat(btn.dataset.prompt)));
document.querySelector('#chat-form').addEventListener('submit', e => { e.preventDefault(); sendChat(document.querySelector('#chat-input').value); });
document.querySelector('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.querySelector('#chat-form').requestSubmit(); } });
document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#product-modal').addEventListener('click', e => { if (e.target.id === 'product-modal') closeModal(); });
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('open'));
document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click',()=>document.querySelector('.main-nav').classList.remove('open')));
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k') {e.preventDefault(); searchInput.focus();} if (e.key==='Escape') {closeChat();closeModal();} });
updateWishlistCount(); renderProducts();
