// ============================================================
// DATA STORE (localStorage-backed)
// ============================================================
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('lms_'+key)) || null; } catch { return null; } },
  set(key, val) { localStorage.setItem('lms_'+key, JSON.stringify(val)); },
  init() {
    if (!this.get('books')) {
      this.set('books', [
        { id:1, isbn:'9780735211292', title:'Atomic Habits', author:'James Clear', category:'Self-Help', emoji:'📗', shelfCount:3, netStock:5 },
        { id:2, isbn:'9780062315007', title:'The Alchemist', author:'Paulo Coelho', category:'Fiction', emoji:'📘', shelfCount:2, netStock:4 },
        { id:3, isbn:'9780132350884', title:'Clean Code', author:'Robert C. Martin', category:'Technology', emoji:'💻', shelfCount:2, netStock:3 },
        { id:4, isbn:'9780062316097', title:'Sapiens', author:'Yuval Noah Harari', category:'History', emoji:'📙', shelfCount:1, netStock:4 },
        { id:5, isbn:'9781455586691', title:'Deep Work', author:'Cal Newport', category:'Self-Help', emoji:'📕', shelfCount:2, netStock:3 }
      ]);
    }
    if (!this.get('members')) {
      this.set('members', [
        { id:1, name:'Aarav Sharma', email:'student@libraos.org', loginId:'aarav.sharma', password:'student123', role:'Student', joined:'2024-01-10' },
        { id:2, name:'Priya Singh', email:'priya@example.com', loginId:'priya.singh', password:'student456', role:'Student', joined:'2024-02-15' },
        { id:3, name:'Rohan Verma', email:'rohan@example.com', loginId:'rohan.verma', password:'faculty123', role:'Faculty', joined:'2023-11-01' }
      ]);
    }
    if (!this.get('loans')) {
      this.set('loans', [
        { id:1, bookId:1, bookTitle:'Atomic Habits', memberId:1, memberName:'Aarav Sharma', issuedDate:'2026-05-10', dueDate:'2026-05-24', returned:false, returnedDate:null },
        { id:2, bookId:3, bookTitle:'Clean Code', memberId:1, memberName:'Aarav Sharma', issuedDate:'2026-05-20', dueDate:'2026-06-03', returned:false, returnedDate:null },
        { id:3, bookId:2, bookTitle:'The Alchemist', memberId:3, memberName:'Rohan Verma', issuedDate:'2026-04-30', dueDate:'2026-05-14', returned:true, returnedDate:'2026-05-20' }
      ]);
    }
    if (!this.get('settings')) {
      this.set('settings', { finePerDay: 2, circulationDays: 14 });
    }
    if (!this.get('auditLogs')) {
      this.set('auditLogs', [
        { ts:'2026-05-20 11:13:51', actor:'Dean Harrison', category:'AUTH', action:'Session Gate Authentication', detail:'Acquired roles of [Admin] using bypass-authorization protocol.' },
        { ts:'2026-05-20 11:13:21', actor:'Dean Harrison', category:'AUTH', action:'Session Gate Exited', detail:'Session ended securely. Clearing security flags.' },
        { ts:'2026-05-20 11:12:22', actor:'Dean Harrison', category:'AUTH', action:'Session Gate Authentication', detail:'Acquired roles of [Admin] using bypass-authorization protocol.' },
        { ts:'2026-05-20 11:10:39', actor:'Sarah Jenkins', category:'AUTH', action:'Session Gate Exited', detail:'Session ended securely. Clearing security flags.' },
        { ts:'2026-05-20 11:10:12', actor:'Sarah Jenkins', category:'AUTH', action:'Session Gate Authentication', detail:'Acquired roles of [Librarian] using bypass-authorization protocol.' }
      ]);
    }
    if (!this.get('requests')) {
      this.set('requests', []);
    }
  }
};

DB.init();

// ============================================================
// APP STATE
// ============================================================
let currentUser = null;
let currentPage = '';

const USERS = {
  admin: { name:'Dean Harrison', email:'admin@lmsystem.org', avatar:'👨‍💼', role:'admin', badge:'ADMIN', badgeClass:'badge-admin' },
  librarian: { name:'Sarah Jenkins', email:'librarian@lmsystem.org', avatar:'👩‍🏫', role:'librarian', badge:'LIBRARIAN', badgeClass:'badge-librarian' },
  student: { name:'Aarav Sharma', email:'student@lmsystem.org', avatar:'👨‍🎓', role:'student', badge:'STUDENT', badgeClass:'badge-student' }
};

const NAV = {
  admin: [
    { id:'dashboard', icon:'⊞', label:'Dashboard' },
    { id:'catalog', icon:'📚', label:'Book Catalog' },
    { id:'members', icon:'👥', label:'Member Directory' },
    { id:'circulation', icon:'↻', label:'Issue / Return' },
    { id:'fines', icon:'₹', label:'Fines & Revenue' },
    { id:'settings', icon:'⚙', label:'System settings' },
    { id:'audit', icon:'📋', label:'Audit logs' }
  ],
  librarian: [
    { id:'dashboard', icon:'⊞', label:'Dashboard' },
    { id:'catalog', icon:'📚', label:'Book Catalog' },
    { id:'members', icon:'👥', label:'Member Directory' },
    { id:'circulation', icon:'↻', label:'Issue / Return' },
    { id:'fines', icon:'₹', label:'Fines & Revenue' }
  ],
  student: [
    { id:'portal', icon:'⊞', label:'My Portal' },
    { id:'catalog', icon:'📚', label:'Book Catalog' },
    { id:'penalties', icon:'₹', label:'My Penalty log' }
  ]
};

// ============================================================
// AUTH
// ============================================================
function quickLogin(role) {
  currentUser = { ...USERS[role], roleKey: role };
  startApp();
  addAuditLog(currentUser.name, 'AUTH', 'Session Gate Authentication', `Acquired roles of [${currentUser.badge}] using bypass-authorization protocol.`);
}

function manualLogin() {
  const emailOrId = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value.trim();
  
  // Check default admin/librarian/student accounts
  const map = {
    'admin@lmsystem.org': 'admin',
    'librarian@lmsystem.org': 'librarian',
    'student@lmsystem.org': 'student',
    'admin123': 'admin',
    'librarian123': 'librarian',
    'student123': 'student'
  };
  
  const role = map[emailOrId] || map[pw];
  if (role) {
    quickLogin(role);
    return;
  }
  
  // Check registered members (by login ID or email)
  const members = DB.get('members');
  const member = members.find(m => 
    (m.loginId.toLowerCase() === emailOrId.toLowerCase() || m.email.toLowerCase() === emailOrId.toLowerCase()) && 
    m.password === pw
  );
  
  if (member) {
    const avatar = member.role === 'Faculty' ? '👨‍🏫' : '👨‍🎓';
    const badge = member.role.toUpperCase();
    currentUser = { 
      name: member.name, 
      email: member.email, 
      avatar: avatar,
      role: member.role.toLowerCase(), 
      badge: badge, 
      badgeClass: member.role === 'Student' ? 'badge-student' : 'badge-faculty',
      memberId: member.id,
      isRegisteredMember: true,
      roleKey: 'student'
    };
    addAuditLog(member.name, 'AUTH', 'Member Login', `${member.name} (${badge}) logged in successfully.`);
    startApp();
  } else {
    showToast('Invalid credentials. Use login ID/email and password', 'error');
  }
}

function logout() {
  addAuditLog(currentUser.name, 'AUTH', 'Session Gate Exited', 'Session ended securely. Clearing security flags.');
  currentUser = null;
  document.getElementById('app').classList.remove('active');
  document.getElementById('login-page').style.display = 'flex';
}

function startApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').classList.add('active');
  setupSidebar();
  const defaultPage = currentUser.roleKey === 'student' ? 'portal' : 'dashboard';
  navigate(defaultPage);
}

function setupSidebar() {
  document.getElementById('user-avatar').textContent = currentUser.avatar;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
  const badge = document.getElementById('user-badge');
  badge.textContent = currentUser.badge;
  badge.className = `sidebar-user-badge ${currentUser.badgeClass}`;

  const nav = document.getElementById('nav-items');
  nav.innerHTML = '';
  NAV[currentUser.roleKey].forEach(item => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id = `nav-${item.id}`;
    el.innerHTML = `<span class="nav-icon">${item.icon}</span> ${item.label}`;
    el.onclick = () => navigate(item.id);
    nav.appendChild(el);
  });
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');
  renderPage(page);
}

// ============================================================
// PAGE RENDERER
// ============================================================
function renderPage(page) {
  const main = document.getElementById('main-content');
  switch(page) {
    case 'dashboard': main.innerHTML = renderDashboard(); break;
    case 'catalog': main.innerHTML = renderCatalog(); break;
    case 'members': main.innerHTML = renderMembers(); break;
    case 'circulation': main.innerHTML = renderCirculation(); break;
    case 'fines': main.innerHTML = renderFines(); break;
    case 'settings': main.innerHTML = renderSettings(); break;
    case 'audit': main.innerHTML = renderAudit(); break;
    case 'portal': main.innerHTML = renderPortal(); break;
    case 'penalties': main.innerHTML = renderPenalties(); break;
  }
  startClock();
  attachPageEvents(page);
}

function nowStr() {
  return new Date().toLocaleString('en-CA', {hour12:false}).replace('T',' ').replace(',','');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function startClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  el.textContent = new Date().toLocaleString('en-CA',{hour12:false}).replace('T',' ').replace(',','');
  setInterval(() => {
    const c = document.getElementById('live-clock');
    if (c) c.textContent = new Date().toLocaleString('en-CA',{hour12:false}).replace('T',' ').replace(',','');
  }, 1000);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const books = DB.get('books');
  const members = DB.get('members');
  const loans = DB.get('loans');
  const settings = DB.get('settings');
  const activeLoans = loans.filter(l => !l.returned);
  const overdue = activeLoans.filter(l => l.dueDate < todayStr());
  const requests = DB.get('requests').filter(r => r.status === 'pending');
  const fines = calcFines();
  const totalFines = fines.reduce((s,f) => s + f.amount, 0);

  const catCount = {};
  books.forEach(b => { catCount[b.category] = (catCount[b.category]||0)+1; });
  const donutData = Object.entries(catCount);

  const isAdmin = currentUser.roleKey === 'admin';

  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">System Command Center</div>
        <div class="page-subtitle">ROLE-LOCKED CONSOLE: ${currentUser.badge}</div>
      </div>
      <div class="page-meta">
        STANDARD UTC CLOCK<br>
        <span class="page-meta-time" id="live-clock">${nowStr()}</span>
      </div>
    </div>
    <div class="page-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">TOTAL CATALOG ITEMS</div>
          <div class="stat-value">${books.length}</div>
          <div class="stat-desc">Books registered</div>
          <div class="stat-icon" style="color:#4d9fff">〜</div>
          <div class="stat-pulse pulse-blue"></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">SUBSCRIBED MEMBERS</div>
          <div class="stat-value">${members.length}</div>
          <div class="stat-desc">Students/Faculty</div>
          <div class="stat-icon" style="color:var(--accent-green)">〜</div>
          <div class="stat-pulse pulse-green"></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ACTIVE LOANS</div>
          <div class="stat-value">${activeLoans.length}</div>
          <div class="stat-desc">Items in circulation</div>
          <div class="stat-icon" style="color:var(--accent-orange)">〜</div>
          <div class="stat-pulse pulse-orange"></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">OVERDUE DUES</div>
          <div class="stat-value">${overdue.length}</div>
          <div class="stat-desc">Needs urgent return</div>
          <div class="stat-icon" style="color:var(--accent-red)">〜</div>
          <div class="stat-pulse pulse-red"></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">INCOMING SELF-SERVE REQUESTS</div>
          <div class="stat-value">${requests.length}</div>
          <div class="stat-desc">Awaiting approval</div>
          <div class="stat-icon" style="color:var(--accent-purple)">〜</div>
          <div class="stat-pulse pulse-purple"></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ASSESSED REVENUE</div>
          <div class="stat-value">₹${totalFines}</div>
          <div class="stat-desc">Outstanding penalty value</div>
          <div class="stat-icon" style="color:#4d9fff">〜</div>
          <div class="stat-pulse pulse-blue"></div>
        </div>
      </div>
      <div class="dashboard-bottom">
        <div class="card">
          <div class="section-label">CORE CATALOG RESOURCE ALLOCATION</div>
          <div class="chart-container">
            <canvas id="donut-canvas" width="200" height="200"></canvas>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-dot" style="background:#4d9fff"></div>Fiction</div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--accent-green)"></div>Self-Help</div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--accent-orange)"></div>Technology</div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--accent-red)"></div>History</div>
          </div>
        </div>
        <div class="card" style="display:flex;flex-direction:column">
          <div class="section-label">PRIVILEGED SYSTEM NOTICES</div>
          <div class="notices">
            <div class="notice">
              <div class="notice-title">System Integration Success</div>
              <div class="notice-desc">Multi-entity authorization schemas registered with high security indicators.</div>
            </div>
            <div class="notice warn">
              <div class="notice-title">Audit System Active</div>
              <div class="notice-desc">All administrative transactions, book registration additions, log state shifts are cataloged in telemetry.</div>
            </div>
          </div>
          <div class="terminal-bar">
            <span>TERMINAL STATUS: LIVE</span>
            <span>NETWORK: OK</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function attachPageEvents(page) {
  if (page === 'dashboard') {
    setTimeout(() => drawDonut(), 50);
  }
  if (page === 'catalog') {
    const search = document.getElementById('catalog-search');
    if (search) search.addEventListener('input', () => renderBookGrid());
    const filter = document.getElementById('catalog-filter');
    if (filter) filter.addEventListener('change', () => renderBookGrid());
    renderBookGrid();
  }
  if (page === 'members') {
    const search = document.getElementById('member-search');
    if (search) search.addEventListener('input', () => renderMemberTable());
    renderMemberTable();
  }
  if (page === 'circulation') {
    populateCirculation();
  }
  if (page === 'audit') {
    renderAuditTable();
  }
  if (page === 'fines') {
    renderFinesTable();
  }
  if (page === 'portal' || page === 'penalties') {
    // already rendered
  }
}

function drawDonut() {
  const canvas = document.getElementById('donut-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const books = DB.get('books');
  const catCount = {};
  books.forEach(b => { catCount[b.category] = (catCount[b.category]||0)+1; });
  const colors = { Fiction:'#4d9fff', 'Self-Help':'#00c48c', Technology:'#ff8c42', History:'#ff4d6d' };
  const vals = Object.entries(catCount);
  const total = vals.reduce((s,[,v]) => s+v, 0);
  let angle = -Math.PI/2;
  const cx = 100, cy = 100, r = 80, inner = 50;
  ctx.clearRect(0,0,200,200);
  vals.forEach(([cat, count]) => {
    const slice = (count/total)*2*Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle+slice);
    ctx.closePath();
    ctx.fillStyle = colors[cat] || '#888';
    ctx.fill();
    angle += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2*Math.PI);
  const isDark = !document.body.classList.contains('light');
  ctx.fillStyle = isDark ? '#0a0d14' : '#f0f2f8';
  ctx.fill();
}

// ============================================================
// BOOK CATALOG
// ============================================================
function renderCatalog() {
  const isAdmin = currentUser.roleKey !== 'student';
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">Academic Book Catalog</div>
        <div class="page-subtitle">Core inventory and research collections</div>
      </div>
      ${(currentUser.roleKey === 'admin' || currentUser.roleKey === 'librarian') ? `<button class="btn-add" onclick="openAddBook()">+ Add Resource Asset</button>` : ''}
    </div>
    <div class="page-content">
      <div class="catalog-toolbar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-box" id="catalog-search" placeholder="Search books by title, author, category or ISBN...">
        </div>
        <select class="filter-select" id="catalog-filter">
          <option value="">All</option>
          <option value="Fiction">Fiction</option>
          <option value="Self-Help">Self-Help</option>
          <option value="Technology">Technology</option>
          <option value="History">History</option>
        </select>
      </div>
      <div class="books-grid" id="books-grid"></div>
    </div>
  </div>`;
}

function renderBookGrid() {
  const search = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  const filter = document.getElementById('catalog-filter')?.value || '';
  let books = DB.get('books');
  if (search) books = books.filter(b => b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search) || b.isbn.includes(search) || b.category.toLowerCase().includes(search));
  if (filter) books = books.filter(b => b.category === filter);

  const grid = document.getElementById('books-grid');
  if (!grid) return;
  if (!books.length) { grid.innerHTML = '<div class="empty-state">No books found.</div>'; return; }

  const loans = DB.get('loans');
  const myActiveLoanBookIds = loans.filter(l => !l.returned && l.memberId === 1).map(l => l.bookId);
  const catClass = { Fiction:'cat-fiction', 'Self-Help':'cat-selfhelp', Technology:'cat-technology', History:'cat-history' };

  grid.innerHTML = books.map(b => {
    const isBorrowing = myActiveLoanBookIds.includes(b.id);
    const isStudent = currentUser.roleKey === 'student';
    const isAdmin = currentUser.roleKey === 'admin' || currentUser.roleKey === 'librarian';

    let actionHTML = '';
    if (isStudent) {
      if (isBorrowing) {
        actionHTML = `<button class="btn-borrow btn-borrow-active">CURRENTLY BORROWING</button>`;
      } else {
        actionHTML = `<button class="btn-borrow btn-borrow-request" onclick="requestBorrow(${b.id})">REQUEST BORROW</button>`;
      }
    } else {
      actionHTML = `
        <span class="book-admin-label">ADMIN CONTROLS</span>
        <div class="stock-control">
          <button class="stock-btn" onclick="adjustStock(${b.id},-1)">−</button>
          <span class="stock-val">Net Stock: ${b.netStock}</span>
          <button class="stock-btn" onclick="adjustStock(${b.id},1)">+</button>
        </div>`;
    }

    return `
    <div class="book-card">
      <div class="book-cover">
        <span>${b.emoji}</span>
        <span class="book-isbn">${b.isbn}</span>
      </div>
      <div class="book-info">
        <span class="book-category ${catClass[b.category]||''}">${b.category.toUpperCase()}</span>
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author}</div>
        <div class="book-counts">
          <span class="in-shelf">${b.shelfCount} IN LIBRARY SHELF</span>
          <span>${b.netStock} NET COUNT</span>
        </div>
        <div class="book-actions">${actionHTML}</div>
      </div>
    </div>`;
  }).join('');
}

function adjustStock(id, delta) {
  const books = DB.get('books');
  const b = books.find(x => x.id === id);
  if (!b) return;
  b.netStock = Math.max(0, b.netStock + delta);
  if (delta > 0) b.shelfCount = Math.min(b.shelfCount + 1, b.netStock);
  DB.set('books', books);
  addAuditLog(currentUser.name, 'CATALOG', 'Stock Adjusted', `${b.title}: stock changed by ${delta > 0 ? '+' : ''}${delta}. New stock: ${b.netStock}`);
  renderBookGrid();
  showToast(`Stock updated: ${b.title} → ${b.netStock}`, 'info');
}

function requestBorrow(bookId) {
  const books = DB.get('books');
  const b = books.find(x => x.id === bookId);
  if (!b || b.shelfCount < 1) { showToast('Book not available on shelf', 'error'); return; }
  const requests = DB.get('requests');
  requests.push({ id: Date.now(), bookId, bookTitle: b.title, memberId: 1, memberName: currentUser.name, requestedDate: todayStr(), status: 'pending' });
  DB.set('requests', requests);
  addAuditLog(currentUser.name, 'CIRC', 'Borrow Requested', `Self-serve request for "${b.title}".`);
  showToast(`Borrow request sent for "${b.title}"`, 'success');
  renderBookGrid();
}

function openAddBook() {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Add Resource Asset</div>
    <div class="modal-field"><label class="modal-label">TITLE</label><input class="modal-input" id="m-title" placeholder="Book title"></div>
    <div class="modal-field"><label class="modal-label">AUTHOR</label><input class="modal-input" id="m-author" placeholder="Author name"></div>
    <div class="modal-field"><label class="modal-label">ISBN</label><input class="modal-input" id="m-isbn" placeholder="ISBN number"></div>
    <div class="modal-field"><label class="modal-label">CATEGORY</label>
      <select class="modal-select" id="m-cat">
        <option>Fiction</option><option>Self-Help</option><option>Technology</option><option>History</option>
      </select>
    </div>
    <div class="modal-field"><label class="modal-label">STOCK</label><input type="number" class="modal-input" id="m-stock" value="1" min="1"></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-confirm" onclick="addBook()">Add Book</button>
    </div>`;
  openModal();
}

function addBook() {
  const title = document.getElementById('m-title').value.trim();
  const author = document.getElementById('m-author').value.trim();
  const isbn = document.getElementById('m-isbn').value.trim();
  const category = document.getElementById('m-cat').value;
  const stock = parseInt(document.getElementById('m-stock').value) || 1;
  if (!title || !author) { showToast('Title and Author are required', 'error'); return; }
  const books = DB.get('books');
  const emojis = { Fiction:'📘', 'Self-Help':'📗', Technology:'💻', History:'📙' };
  books.push({ id: Date.now(), isbn: isbn || String(Math.floor(Math.random()*9e12+1e12)), title, author, category, emoji: emojis[category]||'📖', shelfCount: stock, netStock: stock });
  DB.set('books', books);
  addAuditLog(currentUser.name, 'CATALOG', 'Book Added', `"${title}" by ${author} added to catalog.`);
  closeModal();
  showToast(`"${title}" added to catalog`, 'success');
  navigate('catalog');
}

// ============================================================
// MEMBERS
// ============================================================
function renderMembers() {
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">Library Member Directory</div>
        <div class="page-subtitle">Verify credentials, access privileges, and lending telemetry</div>
      </div>
      <button class="btn-add" onclick="openRegisterMember()">+ Register New Member</button>
    </div>
    <div class="page-content">
      <div class="search-wrapper" style="margin-bottom:16px">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-box" id="member-search" placeholder="Search registry by name, email, role...">
      </div>
      <div class="card" style="padding:0">
        <div class="table-header">
          <span>IDENTITY</span>
          <span>SECURITY PRIVILEGE STATUS</span>
          <span>ONBOARDED</span>
          <span>CIRCULATION VOLUME</span>
          <span>ROLE OVERRIDE</span>
        </div>
        <div id="member-table-body"></div>
      </div>
    </div>
  </div>`;
}

function renderMemberTable() {
  const search = (document.getElementById('member-search')?.value || '').toLowerCase();
  let members = DB.get('members');
  if (search) members = members.filter(m => m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search) || m.role.toLowerCase().includes(search));
  const loans = DB.get('loans');
  const body = document.getElementById('member-table-body');
  if (!body) return;
  if (!members.length) { body.innerHTML = '<div class="empty-state">No members found.</div>'; return; }
  body.innerHTML = members.map(m => {
    const vol = loans.filter(l => l.memberId === m.id).length;
    const roleClass = m.role === 'Faculty' ? 'role-faculty' : m.role === 'Staff' ? 'role-staff' : 'role-student';
    return `
    <div class="table-row">
      <div class="member-info">
        <div class="member-avatar" style="background:${stringToColor(m.name)}">${m.name[0]}</div>
        <div>
          <div class="member-name">${m.name}</div>
          <div class="member-email">${m.email.toUpperCase()}</div>
        </div>
      </div>
      <div><span class="role-badge ${roleClass}">${m.role.toUpperCase()}</span></div>
      <div style="font-family:var(--mono);font-size:12px;color:var(--text-secondary)">${m.joined}</div>
      <div><div class="vol-count">${vol}</div><div class="vol-label">LENT VOLUMES</div></div>
      <div class="action-group">
        <button class="toggle-btn" onclick="toggleRole(${m.id})">TOGGLE PRIVILEGE</button>
        <button class="delete-btn" onclick="deleteMember(${m.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function stringToColor(str) {
  let hash = 0;
  for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  const colors = ['#5b4fff','#00c48c','#ff8c42','#ff4d6d','#ffc542','#4d9fff'];
  return colors[Math.abs(hash) % colors.length];
}

function toggleRole(id) {
  const members = DB.get('members');
  const m = members.find(x => x.id === id);
  if (!m) return;
  const roles = ['Student', 'Faculty', 'Staff'];
  m.role = roles[(roles.indexOf(m.role)+1) % roles.length];
  DB.set('members', members);
  addAuditLog(currentUser.name, 'MEMBER', 'Role Toggled', `${m.name}'s role changed to ${m.role}.`);
  renderMemberTable();
  showToast(`${m.name} role → ${m.role}`, 'info');
}

function deleteMember(id) {
  const members = DB.get('members');
  const m = members.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Delete ${m.name}?`)) return;
  DB.set('members', members.filter(x => x.id !== id));
  addAuditLog(currentUser.name, 'MEMBER', 'Member Deleted', `${m.name} removed from directory.`);
  renderMemberTable();
  showToast(`${m.name} removed`, 'error');
}

function openRegisterMember() {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Register Member</div>
    <div class="modal-field"><label class="modal-label">FULL NAME</label><input class="modal-input" id="m-name" placeholder="Johnathan Doe"></div>
    <div class="modal-field"><label class="modal-label">ACADEMIC EMAIL</label><input type="email" class="modal-input" id="m-email" placeholder="johndoe@academia.edu"></div>
    <div class="modal-field"><label class="modal-label">LOGIN ID (Username)</label><input class="modal-input" id="m-loginId" placeholder="john.doe"></div>
    <div class="modal-field"><label class="modal-label">PASSWORD</label><input type="password" class="modal-input" id="m-password" placeholder="Min 6 characters"></div>
    <div class="modal-field"><label class="modal-label">ACADEMIC PRIVILEGE STATUS</label>
      <select class="modal-select" id="m-role"><option>Student</option><option>Faculty</option><option>Staff</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-confirm" onclick="registerMember()">Register Member</button>
    </div>`;
  openModal();
}

function registerMember() {
  const name = document.getElementById('m-name').value.trim();
  const email = document.getElementById('m-email').value.trim();
  const loginId = document.getElementById('m-loginId').value.trim();
  const password = document.getElementById('m-password').value.trim();
  const role = document.getElementById('m-role').value;
  
  // Validation
  if (!name || !email || !loginId || !password) { 
    showToast('All fields required', 'error'); 
    return; 
  }
  if (password.length < 6) { 
    showToast('Password must be at least 6 characters', 'error'); 
    return; 
  }
  
  // Check if login ID already exists
  const members = DB.get('members');
  if (members.some(m => m.loginId === loginId.toLowerCase())) {
    showToast('Login ID already exists', 'error');
    return;
  }
  
  members.push({ id: Date.now(), name, email: email.toLowerCase(), loginId: loginId.toLowerCase(), password, role, joined: todayStr() });
  DB.set('members', members);
  addAuditLog(currentUser.name, 'MEMBER', 'Member Registered', `${name} (${role}) onboarded with credentials.`);
  closeModal();
  showToast(`${name} registered with login: ${loginId}`, 'success');
  navigate('members');
}

// ============================================================
// CIRCULATION
// ============================================================
function renderCirculation() {
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">Resource Circulation Desk</div>
        <div class="page-subtitle">Issue resources, ledger-logs, checkouts, and student requested approvals</div>
      </div>
    </div>
    <div class="page-content">
      <div class="circulation-grid">
        <div class="card">
          <div class="section-label">CIRCULATION ACTIONS</div>
          <div class="form-group">
            <label class="form-label">BOOK TO ISSUE</label>
            <select class="form-select" id="issue-book">
              <option value="">-- Choose Book Asset --</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">DESIGNATED MEMBER</label>
            <select class="form-select" id="issue-member">
              <option value="">-- Choose Member Profile --</option>
            </select>
          </div>
          <button class="btn-issue" onclick="issueBook()">Authorize Manual Issue</button>

          <div class="returns-divider">INSTANT RETURNS</div>
          <div class="form-group">
            <label class="form-label">SELECT LENDING RECORD</label>
            <select class="form-select" id="return-loan">
              <option value="">-- Active lending logs --</option>
            </select>
          </div>
          <button class="btn-return" onclick="returnBook()">Process Return Receipt</button>
        </div>
        <div class="card">
          <div class="registry-header">
            <div class="section-label">LIVE LENDING REGISTRY LOG</div>
            <span class="loans-badge" id="loans-count-badge">0 LOANS IN CUSTODY</span>
          </div>
          <div class="registry-table-head">
            <span>BOOK & MEMBER</span>
            <span>LENDING LOGISTICS</span>
            <span>CIRCULATION STATUS</span>
          </div>
          <div id="registry-body"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function populateCirculation() {
  const books = DB.get('books');
  const members = DB.get('members');
  const loans = DB.get('loans');

  const bookSel = document.getElementById('issue-book');
  if (bookSel) {
    books.filter(b => b.shelfCount > 0).forEach(b => {
      const o = document.createElement('option');
      o.value = b.id;
      o.textContent = `${b.title} (${b.shelfCount} available)`;
      bookSel.appendChild(o);
    });
  }

  const memberSel = document.getElementById('issue-member');
  if (memberSel) {
    members.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      memberSel.appendChild(o);
    });
  }

  const returnSel = document.getElementById('return-loan');
  const activeLoans = loans.filter(l => !l.returned);
  if (returnSel) {
    activeLoans.forEach(l => {
      const o = document.createElement('option');
      o.value = l.id;
      o.textContent = `${l.bookTitle} — ${l.memberName} (Due: ${l.dueDate})`;
      returnSel.appendChild(o);
    });
  }

  // Render registry
  const badge = document.getElementById('loans-count-badge');
  if (badge) badge.textContent = `${activeLoans.length} LOANS IN CUSTODY`;
  const body = document.getElementById('registry-body');
  if (body) {
    if (!activeLoans.length) { body.innerHTML = '<div class="empty-state">No active loans.</div>'; return; }
    body.innerHTML = activeLoans.map(l => {
      const overdue = l.dueDate < todayStr();
      return `
      <div class="registry-row">
        <div>
          <div class="registry-book">${l.bookTitle}</div>
          <div class="registry-member">${l.memberName.toUpperCase()}</div>
        </div>
        <div>
          <div class="registry-due">Due: ${l.dueDate}</div>
          <div class="registry-issued">ISSUED: ${l.issuedDate}</div>
        </div>
        <div><span class="${overdue ? 'status-overdue' : 'status-good'}">${overdue ? 'OVERDUE' : 'GOOD STANDING'}</span></div>
      </div>`;
    }).join('');
  }
}

function issueBook() {
  const bookId = parseInt(document.getElementById('issue-book').value);
  const memberId = parseInt(document.getElementById('issue-member').value);
  if (!bookId || !memberId) { showToast('Please select a book and member', 'error'); return; }

  const books = DB.get('books');
  const members = DB.get('members');
  const loans = DB.get('loans');
  const settings = DB.get('settings');

  const b = books.find(x => x.id === bookId);
  const m = members.find(x => x.id === memberId);
  if (!b || !m) return;
  if (b.shelfCount < 1) { showToast('No copies available on shelf', 'error'); return; }

  b.shelfCount--;
  DB.set('books', books);

  const today = todayStr();
  const due = addDays(today, settings.circulationDays);
  loans.push({ id: Date.now(), bookId, bookTitle: b.title, memberId, memberName: m.name, issuedDate: today, dueDate: due, returned: false, returnedDate: null });
  DB.set('loans', loans);

  addAuditLog(currentUser.name, 'CIRC', 'Book Issued', `"${b.title}" issued to ${m.name}. Due: ${due}`);
  showToast(`"${b.title}" issued to ${m.name}`, 'success');
  navigate('circulation');
}

function returnBook() {
  const loanId = parseInt(document.getElementById('return-loan').value);
  if (!loanId) { showToast('Please select a lending record', 'error'); return; }

  const loans = DB.get('loans');
  const books = DB.get('books');
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;

  loan.returned = true;
  loan.returnedDate = todayStr();
  DB.set('loans', loans);

  const b = books.find(x => x.id === loan.bookId);
  if (b) { b.shelfCount++; DB.set('books', books); }

  // Calculate fine
  const settings = DB.get('settings');
  const today = new Date(todayStr());
  const due = new Date(loan.dueDate);
  if (today > due) {
    const days = Math.floor((today - due)/(1000*60*60*24));
    const amount = days * settings.finePerDay;
    const fines = DB.get('loans'); // fines are derived from loans
    showToast(`Book returned. Fine: ₹${amount} (${days} days overdue)`, 'error');
  } else {
    showToast(`"${loan.bookTitle}" returned successfully`, 'success');
  }

  addAuditLog(currentUser.name, 'CIRC', 'Book Returned', `"${loan.bookTitle}" returned by ${loan.memberName}.`);
  navigate('circulation');
}

// ============================================================
// FINES
// ============================================================
function calcFines() {
  const loans = DB.get('loans');
  const settings = DB.get('settings');
  const fines = [];
  loans.forEach(l => {
    const due = new Date(l.dueDate);
    const ret = l.returned ? new Date(l.returnedDate) : new Date(todayStr());
    if (ret > due) {
      const days = Math.floor((ret - due)/(1000*60*60*24));
      fines.push({ loanId: l.id, borrower: l.memberName, book: l.bookTitle, dueDate: l.dueDate, returnedDate: l.returnedDate, amount: days * settings.finePerDay, settled: l.returned });
    }
  });
  return fines;
}

function renderFines() {
  const fines = calcFines();
  const total = fines.reduce((s,f) => s+f.amount, 0);
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">Revenue & Fines Module</div>
        <div class="page-subtitle">Penalty assessments, overdue calculations, and simulated payment receipt histories</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;letter-spacing:2px;color:var(--text-muted);font-weight:600">ASSESSED OUTSTANDING VALUES</div>
        <div style="font-size:36px;font-weight:700;color:var(--accent-red);font-family:var(--mono)">₹${total}</div>
      </div>
    </div>
    <div class="page-content">
      <div class="card" style="padding:0">
        <div class="fines-table-head">
          <span>BORROWER / RESOURCE</span>
          <span>CIRCULATION DATES</span>
          <span>OVERDUE VALUES</span>
          <span>STATUS ACTION</span>
        </div>
        <div id="fines-table-body"></div>
      </div>
    </div>
  </div>`;
}

function renderFinesTable() {
  const fines = calcFines();
  const body = document.getElementById('fines-table-body');
  if (!body) return;
  if (!fines.length) { body.innerHTML = '<div class="empty-state">No fines recorded.</div>'; return; }
  body.innerHTML = fines.map(f => `
    <div class="fines-row">
      <div>
        <div class="fine-borrower">${f.borrower}</div>
        <div class="fine-book">${f.book.toUpperCase()}</div>
      </div>
      <div>
        <div class="fine-due">Due: ${f.dueDate}</div>
        <div class="fine-returned">Returned: ${f.returnedDate || 'Not yet'}</div>
      </div>
      <div class="fine-amount">₹${f.amount}</div>
      <div>${f.settled ? `<span class="settled-badge">FULLY SETTLED</span>` : `<button class="settle-btn" onclick="settleFine(${f.loanId})">SETTLE</button>`}</div>
    </div>`).join('');
}

function settleFine(loanId) {
  const loans = DB.get('loans');
  const l = loans.find(x => x.id === loanId);
  if (l) { l.returned = true; l.returnedDate = l.returnedDate || todayStr(); DB.set('loans', loans); }
  addAuditLog(currentUser.name, 'FINE', 'Fine Settled', `Fine for loan #${loanId} settled.`);
  showToast('Fine settled', 'success');
  navigate('fines');
}

// ============================================================
// SETTINGS
// ============================================================
function renderSettings() {
  const s = DB.get('settings');
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">System Calibration Panel</div>
        <div class="page-subtitle">Fine tune calculation parameters and database configuration (Master Lock)</div>
      </div>
    </div>
    <div class="page-content">
      <div class="settings-grid">
        <div class="card">
          <div class="settings-title">FINE RATE CONFIGURATIONS</div>
          <div class="settings-field">
            <label class="settings-label">FINE PER DAY OVERDUE (₹)</label>
            <input type="number" class="settings-input" id="s-fine" value="${s.finePerDay}" min="1">
          </div>
          <div class="settings-field">
            <label class="settings-label">DEFAULT CIRCULATION PERIOD (DAYS)</label>
            <input type="number" class="settings-input" id="s-days" value="${s.circulationDays}" min="1">
          </div>
          <button class="btn-calibrate" onclick="saveSettings()">Calibrate calculations variables</button>
        </div>
        <div class="card">
          <div class="settings-title">MASTER DATABASE RECOVERY RESET</div>
          <p class="reset-desc">This resets all customized books, audit telemetry, student borrow requests and resets standard credentials profiles to manufacturing default values. This is completely safe to test.</p>
          <button class="btn-reset" onclick="fullReset()">Run full database reset</button>
        </div>
      </div>
    </div>
  </div>`;
}

function saveSettings() {
  const fine = parseInt(document.getElementById('s-fine').value) || 2;
  const days = parseInt(document.getElementById('s-days').value) || 14;
  DB.set('settings', { finePerDay: fine, circulationDays: days });
  addAuditLog(currentUser.name, 'SYS', 'Settings Calibrated', `Fine: ₹${fine}/day, Circulation: ${days} days.`);
  showToast('Settings saved', 'success');
}

function fullReset() {
  if (!confirm('Reset ALL data to defaults? This cannot be undone.')) return;
  ['books','members','loans','settings','auditLogs','requests'].forEach(k => localStorage.removeItem('lms_'+k));
  DB.init();
  addAuditLog('SYSTEM', 'SYS', 'Full Database Reset', 'All data reset to manufacturing defaults.');
  showToast('Database reset complete', 'info');
  navigate('dashboard');
}

// ============================================================
// AUDIT
// ============================================================
function renderAudit() {
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">System Audit Ledger</div>
        <div class="page-subtitle">Standard security log telemetry track (Admin Lock)</div>
      </div>
      <button class="btn-clear-logs" onclick="clearLogs()">Clear Telemetry logs</button>
    </div>
    <div class="page-content">
      <div class="card" style="padding:0">
        <div class="audit-table-head">
          <span>TIMESTAMP</span>
          <span>ACTOR / CATEGORY</span>
          <span>ACTION BRIEF</span>
          <span>DETAILS BRIEF</span>
        </div>
        <div id="audit-body"></div>
      </div>
    </div>
  </div>`;
}

function renderAuditTable() {
  const logs = (DB.get('auditLogs') || []).slice().reverse();
  const body = document.getElementById('audit-body');
  if (!body) return;
  if (!logs.length) { body.innerHTML = '<div class="empty-state">No audit logs.</div>'; return; }
  const tagMap = { AUTH:'tag-auth', CATALOG:'tag-catalog', MEMBER:'tag-member', CIRC:'tag-circ', FINE:'tag-fine', SYS:'tag-sys' };
  body.innerHTML = logs.map(l => `
    <div class="audit-row">
      <div class="audit-timestamp">${l.ts}</div>
      <div>
        <div class="audit-actor">${l.actor}</div>
        <span class="audit-tag ${tagMap[l.category]||'tag-sys'}">${l.category}</span>
      </div>
      <div class="audit-action">${l.action}</div>
      <div class="audit-detail">${l.detail}</div>
    </div>`).join('');
}

function clearLogs() {
  if (!confirm('Clear all audit logs?')) return;
  DB.set('auditLogs', []);
  renderAuditTable();
  showToast('Audit logs cleared', 'info');
}

function addAuditLog(actor, category, action, detail) {
  const logs = DB.get('auditLogs') || [];
  const now = new Date();
  const ts = now.toISOString().replace('T',' ').substring(0,19);
  logs.push({ ts, actor, category, action, detail });
  DB.set('auditLogs', logs);
}

// ============================================================
// STUDENT PORTAL
// ============================================================
function renderPortal() {
  const loans = DB.get('loans');
  const myLoans = loans.filter(l => l.memberId === 1);
  const activeLoans = myLoans.filter(l => !l.returned);
  const requests = DB.get('requests').filter(r => r.memberId === 1 && r.status === 'pending');
  const completed = myLoans.filter(l => l.returned);

  // Calculate dues
  const settings = DB.get('settings');
  let totalDues = 0;
  activeLoans.forEach(l => {
    const due = new Date(l.dueDate);
    const today = new Date(todayStr());
    if (today > due) {
      totalDues += Math.floor((today-due)/(1000*60*60*24)) * settings.finePerDay;
    }
  });

  return `
  <div class="page active">
    <div class="page-content" style="padding-top:32px">
      <div class="portal-hero">
        <div>
          <div class="portal-tag">STUDENT SELF-SERVICE PORTAL</div>
          <div class="portal-welcome">Welcome, ${currentUser.name}</div>
          <div class="portal-desc">Search academic copies, coordinate self-serve borrows, and trace your outstanding lending status.</div>
        </div>
        <div class="portal-dues-card">
          <div class="dues-label">UNPAID DUES</div>
          <div class="dues-value">₹${totalDues}</div>
          <div class="dues-standing">${totalDues === 0 ? 'In Good Standing ✓' : '⚠ Outstanding dues'}</div>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card">
          <div class="stat-label">ACTIVE ISSUED COPIES</div>
          <div class="stat-value">${activeLoans.length}</div>
          <div class="stat-desc">Under current custody</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">AWAITING SELF-SERVICE APPROVALS</div>
          <div class="stat-value">${requests.length}</div>
          <div class="stat-desc">Awaiting Librarian review</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">HISTORICAL LOANS COMPLETE</div>
          <div class="stat-value">${completed.length}</div>
          <div class="stat-desc">Returned resources</div>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div style="padding:16px 16px 0;font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:1px">MY HANDHELD RESOURCES & LOGS</div>
        <div class="loans-header">
          <span>BOOK RESOURCE</span>
          <span>LOGISTICS</span>
          <span>ACCURED DUES</span>
          <span>STATUS</span>
        </div>
        ${myLoans.length ? myLoans.map(l => {
          const due = new Date(l.dueDate);
          const today = new Date(todayStr());
          let accured = 0;
          if (today > due) accured = Math.floor((today-due)/(1000*60*60*24)) * settings.finePerDay;
          return `
          <div class="loans-row">
            <div>
              <div class="loan-book">${l.bookTitle}</div>
            </div>
            <div>
              <div class="loan-date">Due: ${l.dueDate}</div>
              <div class="loan-lent">LENT ON ${l.issuedDate}</div>
            </div>
            <div class="loan-due-amount">₹${accured}</div>
            <div><span class="${l.returned ? 'returned-badge' : 'checkout-badge'}">${l.returned ? 'RETURNED' : 'CHECKED OUT'}</span></div>
          </div>`;
        }).join('') : '<div class="empty-state">No loans yet.</div>'}
      </div>
    </div>
  </div>`;
}

function renderPenalties() {
  const loans = DB.get('loans');
  const settings = DB.get('settings');
  const myLoans = loans.filter(l => l.memberId === 1);
  const fines = [];
  myLoans.forEach(l => {
    const due = new Date(l.dueDate);
    const ret = l.returned ? new Date(l.returnedDate) : new Date(todayStr());
    if (ret > due) {
      const days = Math.floor((ret - due)/(1000*60*60*24));
      fines.push({ borrower: l.memberName, book: l.bookTitle, dueDate: l.dueDate, returnedDate: l.returnedDate, amount: days * settings.finePerDay, settled: l.returned });
    }
  });
  const total = fines.reduce((s,f) => s+f.amount, 0);
  return `
  <div class="page active">
    <div class="page-header">
      <div>
        <div class="page-title">My Lending Penalties</div>
        <div class="page-subtitle">Penalty assessments, overdue calculations, and simulated payment receipt histories</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;letter-spacing:2px;color:var(--text-muted);font-weight:600">ASSESSED OUTSTANDING VALUES</div>
        <div style="font-size:36px;font-weight:700;color:var(--accent-red);font-family:var(--mono)">₹${total}</div>
      </div>
    </div>
    <div class="page-content">
      <div class="card" style="padding:0">
        <div class="fines-table-head">
          <span>BORROWER / RESOURCE</span>
          <span>CIRCULATION DATES</span>
          <span>OVERDUE VALUES</span>
          <span>STATUS ACTION</span>
        </div>
        ${fines.length ? fines.map(f => `
        <div class="fines-row">
          <div><div class="fine-borrower">${f.borrower}</div><div class="fine-book">${f.book.toUpperCase()}</div></div>
          <div><div class="fine-due">Due: ${f.dueDate}</div><div class="fine-returned">Returned: ${f.returnedDate||'Not yet'}</div></div>
          <div class="fine-amount">₹${f.amount}</div>
          <div>${f.settled ? '<span class="settled-badge">FULLY SETTLED</span>' : '<span style="color:var(--accent-red);font-size:12px">OUTSTANDING</span>'}</div>
        </div>`).join('') : '<div class="empty-state">NO PENALTY LEDGER ENTRIES DISCOVERED. HAPPY BORROWING!</div>'}
      </div>
    </div>
  </div>`;
}

// ============================================================
// MODAL
// ============================================================
function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ============================================================
// THEME
// ============================================================
function toggleTheme() {
  document.body.classList.toggle('light');
  setTimeout(() => drawDonut(), 50);
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});