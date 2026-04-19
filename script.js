/**
 * My-Relative-Network - Core Logic
 */

// --- CONFIGURATION ---
const SHEET_ID = '1V2vwXcz2sg6zY2lORY9VX1gvJnx114TRbhgARX3vGEI';
const MEMBER_SHEET_NAME = 'members';
const ACTIVITY_SHEET_NAME = 'activities';
// const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyTpaC0zG4BMVkMQR_Ti4jCvVtENoH5VlHpM1UxP6LdDx_bYqU0UnPfca1t8G-C-8d3rQ/exec';
// const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyWS2dTF0hWF4OG3H_Hw8Tguz4nSSqTmbcfSFQAJvnf3CnGUQTdF6l3ir_emf8K3M09zA/exec';
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxR5wM-MXDtSFJqW2cmdgVD6FOsLpwesmc-9Kx6omilHkmgREIRcK6KsvwTNCiSP9RaJQ/exec';

// CORS Proxy — ใช้สำหรับดึงข้อมูลจาก Google Sheets
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * ตรวจว่ากำลังรันบน local environment หรือไม่
 * (file://, localhost, 127.0.0.1)
 */
function isLocalEnv() {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return proto === 'file:' || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
}

// Data storage
let membersData = [];
let activitiesData = [];
let adminPassword = ''; // Session storage for current session

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initScrollEffects();
    initBackToTop();

    // Check if SHEET_ID is set
    if (SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
        console.warn('Google Sheet ID not set. Loading mock data for demonstration.');
        loadMockData();
    } else {
        fetchSheetData();
    }

    // Initialize Admin Logic
    initAdminLogic();
    initUploadZones();
});

// --- MOBILE MENU ---
function initMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// --- SCROLL EFFECTS ---
function initScrollEffects() {
    const nav = document.querySelector('.navbar');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        // Navbar glass effect
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(15, 23, 42, 0.95)';
            nav.style.height = '70px';
        } else {
            nav.style.background = 'rgba(15, 23, 42, 0.8)';
            nav.style.height = '80px';
        }

        // Active link tracking
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// --- BACK TO TOP ---
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// --- DATA FETCHING ---
/**
 * ดึงข้อมูลจาก Google Sheets ด้วย 3 วิธี (fallback ตามลำดับ)
 *
 * Strategy 1 (Primary) — Apps Script JSONP
 *   ใช้ BACKEND_URL?action=getMembers&callback=fn
 *   ✅ ไม่มี CORS เลย ใช้ได้ทุกที่ (file://, localhost, GitHub Pages)
 *
 * Strategy 2 (Fallback) — Google Sheets gviz CSV โดยตรง
 *   ✅ ใช้ได้บน GitHub Pages / server (ถ้า Sheet เปิดสาธารณะ)
 *   ❌ อาจถูก block บน file://
 *
 * Strategy 3 (Last resort) — gviz CSV ผ่าน allorigins.win proxy
 *   ✅ ใช้ได้บน local ถ้า proxy ยังทำงานได้
 *   ❌ proxy อาจล่มหรือช้า
 */
async function fetchSheetData() {
    console.log('[fetchSheetData] Starting...');

    // ลองทีละ strategy จนกว่าจะสำเร็จ
    const strategies = [
        { name: 'Apps Script JSONP', fn: fetchViaJsonp },
        { name: 'Direct gviz CSV', fn: fetchViaDirectCsv },
        { name: 'Proxy gviz CSV', fn: fetchViaProxyCsv }
    ];

    let lastError = null;

    for (const strategy of strategies) {
        try {
            console.log('[fetchSheetData] Trying:', strategy.name);
            await strategy.fn();
            console.log('[fetchSheetData] ✅ Success via:', strategy.name);
            // ลบ error banner เก่า (ถ้ามี) เมื่อโหลดสำเร็จ
            const oldBanner = document.getElementById('fetchErrorBanner');
            if (oldBanner) oldBanner.remove();
            return; // สำเร็จแล้ว ออกจาก loop
        } catch (err) {
            console.warn('[fetchSheetData] ❌ Failed:', strategy.name, '-', err.message);
            lastError = { strategy: strategy.name, err };
        }
    }

    // ทุก strategy ล้มเหลว → โหลด mock data และแสดง error banner
    console.error('[fetchSheetData] All strategies failed. Showing mock data.');
    loadMockData();
    showFetchErrorBanner(lastError);
}

/** Strategy 1: JSONP from Apps Script — ไม่มี CORS เลย */
function fetchViaJsonp() {
    return new Promise((resolve, reject) => {
        if (!BACKEND_URL) return reject(new Error('BACKEND_URL ไม่ได้ตั้งค่า'));

        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) reject(new Error('JSONP timeout (10s)'));
        }, 10000);

        let membersResult = null;
        let activitiesResult = null;

        function tryFinish() {
            if (membersResult && activitiesResult) {
                clearTimeout(timeout);
                resolved = true;

                if (!membersResult.success) throw new Error('getMembers: ' + membersResult.message);
                if (!activitiesResult.success) throw new Error('getActivities: ' + activitiesResult.message);

                membersData = membersResult.data || [];
                activitiesData = activitiesResult.data || [];

                renderMembers(membersData);
                renderActivities(activitiesData);
                initSearch();
                resolve();
            }
        }

        // Members
        const cbMembers = '_gasMembers_' + Date.now();
        window[cbMembers] = (data) => {
            membersResult = data;
            document.getElementById(cbMembers + '_script').remove();
            delete window[cbMembers];
            tryFinish();
        };
        const sMembers = document.createElement('script');
        sMembers.id = cbMembers + '_script';
        sMembers.src = BACKEND_URL + '?action=getMembers&callback=' + cbMembers + '&t=' + Date.now();
        sMembers.onerror = () => reject(new Error('JSONP script load error (members)'));
        document.head.appendChild(sMembers);

        // Activities
        const cbAct = '_gasActivities_' + Date.now();
        window[cbAct] = (data) => {
            activitiesResult = data;
            document.getElementById(cbAct + '_script').remove();
            delete window[cbAct];
            tryFinish();
        };
        const sAct = document.createElement('script');
        sAct.id = cbAct + '_script';
        sAct.src = BACKEND_URL + '?action=getActivities&callback=' + cbAct + '&t=' + Date.now();
        sAct.onerror = () => reject(new Error('JSONP script load error (activities)'));
        document.head.appendChild(sAct);
    });
}

/** Strategy 2: Direct gviz CSV (ไม่ผ่าน proxy) */
async function fetchViaDirectCsv() {
    const t = Date.now();
    const membersUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${MEMBER_SHEET_NAME}&t=${t}`;
    const activitiesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${ACTIVITY_SHEET_NAME}&t=${t}`;

    const [mRes, aRes] = await Promise.all([
        fetch(membersUrl, { cache: 'no-store' }),
        fetch(activitiesUrl, { cache: 'no-store' })
    ]);

    if (!mRes.ok || !aRes.ok) throw new Error(`HTTP error: members=${mRes.status}, activities=${aRes.status}`);

    const membersCsv = await mRes.text();
    const activitiesCsv = await aRes.text();

    // ถ้า Google ส่ง HTML error กลับมา ให้ throw
    if (membersCsv.trim().startsWith('<')) throw new Error('Got HTML instead of CSV (sheet may be private)');

    membersData = parseCSV(membersCsv);
    activitiesData = parseCSV(activitiesCsv);

    renderMembers(membersData);
    renderActivities(activitiesData);
    initSearch();
}

/** Strategy 3: gviz CSV ผ่าน allorigins.win proxy */
async function fetchViaProxyCsv() {
    const t = Date.now();
    const membersUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${MEMBER_SHEET_NAME}&t=${t}`;
    const activitiesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${ACTIVITY_SHEET_NAME}&t=${t}`;

    const [mRes, aRes] = await Promise.all([
        fetch(CORS_PROXY + encodeURIComponent(membersUrl), { cache: 'no-store' }),
        fetch(CORS_PROXY + encodeURIComponent(activitiesUrl), { cache: 'no-store' })
    ]);

    if (!mRes.ok || !aRes.ok) throw new Error(`Proxy HTTP error: members=${mRes.status}, activities=${aRes.status}`);

    const membersCsv = await mRes.text();
    const activitiesCsv = await aRes.text();

    if (membersCsv.trim().startsWith('<')) throw new Error('Got HTML instead of CSV via proxy');

    membersData = parseCSV(membersCsv);
    activitiesData = parseCSV(activitiesCsv);

    renderMembers(membersData);
    renderActivities(activitiesData);
    initSearch();
}

/** แสดง error banner เมื่อทุก strategy ล้มเหลว */
function showFetchErrorBanner(lastError) {
    const old = document.getElementById('fetchErrorBanner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.id = 'fetchErrorBanner';
    banner.style.cssText = 'background:rgba(239,68,68,0.1);border:1px solid #ef4444;color:#f87171;padding:16px 20px;border-radius:10px;margin:20px auto;max-width:1200px;text-align:center;';

    const proto = window.location.protocol;
    let hint = '';
    if (proto === 'file:') {
        hint = '⚠️ เปิดด้วย <code>file://</code> — แนะนำใช้ <strong>Live Server</strong> หรือ <code>npm run dev</code> แทน';
    } else if (!BACKEND_URL) {
        hint = 'โปรดตั้งค่า <strong>BACKEND_URL</strong> ใน script.js ให้ถูกต้อง';
    } else {
        hint = 'ตรวจสอบว่า Google Sheet <strong>แชร์แบบสาธารณะ</strong> และ Apps Script <strong>Deploy แล้ว</strong>';
    }

    banner.innerHTML = `
        <strong>⚠️ ไม่สามารถเชื่อมต่อข้อมูลได้ (กำลังแสดงข้อมูลจำลอง)</strong>
        <br><small style="display:block;margin-top:6px;opacity:0.8;">${hint}</small>
        ${lastError ? `<small style="display:block;margin-top:4px;opacity:0.5;">Last error: ${lastError.strategy} — ${lastError.err.message}</small>` : ''}
    `;
    document.querySelector('.hero').after(banner);
}


// Robust CSV Parser
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = parseLine(lines[0]).map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index].trim() : '';
        });
        result.push(obj);
    }
    return result;
}

// Function to parse a single CSV line correctly handling quotes
function parseLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

// Helper to reliably find Image URL regardless of capitalization in Google Sheet
function parseImageUrl(obj) {
    if (!obj) return null;
    for (const key in obj) {
        if (key.toLowerCase().includes('image') && typeof obj[key] === 'string' && obj[key].startsWith('http')) {
            return obj[key];
        }
    }
    return null;
}

// --- RENDERING ---
function renderMembers(data) {
    const container = document.getElementById('memberList');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading">ไม่พบข้อมูลสมาชิก</div>';
        return;
    }

    container.innerHTML = data.map(member => `
        <div class="member-card">
            <img src="${parseImageUrl(member) || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=500'}" alt="${member.Fullname}" class="member-img">
            <div class="member-info">
                <span class="nickname">${member.Nickname || 'Unknown'}</span>
                <h3>${member.Fullname}</h3>
                <span class="relation-tag">${member.Relation_type}</span>
                <div class="member-meta">
                    <p style="flex-wrap: wrap;">
                        <i class="fas fa-fingerprint"></i> ${member.Gener_code} ${member.Parent_code ? '[' + member.Parent_code + ']' : ''}
                        ${member.Family_code ? `<button type="button" class="btn-family-filter" onclick="applyFilter('${member.Family_code}')"><i class="fas fa-users"></i> บุคคลในครอบครัว</button>` : ''}
                    </p>
                    <p><i class="fas fa-map-marker-alt"></i> ${member.Address || '-'}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderActivities(data) {
    const container = document.getElementById('activityList');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading">ไม่พบข้อมูลกิจกรรม</div>';
        return;
    }

    container.innerHTML = data.map(act => `
        <div class="activity-card">
            <div class="activity-img-container">
                <img src="${parseImageUrl(act) || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800'}" alt="activity" class="activity-img">
            </div>
            <div class="activity-body">
                <span class="activity-date">${act.Date}</span>
                <p class="activity-desc">${act.Description}</p>
            </div>
        </div>
    `).join('');
}

// --- SEARCH ---
function initSearch() {
    const searchInput = document.getElementById('memberSearch');
    const clearBtn = document.getElementById('clearSearch');

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (clearBtn) {
            clearBtn.style.display = term.length > 0 ? 'block' : 'none';
        }

        const filtered = membersData.filter(m =>
            m.Fullname.toLowerCase().includes(term) ||
            m.Nickname.toLowerCase().includes(term) ||
            m.Gener_code.toLowerCase().includes(term) ||
            (m.Family_code || '').toLowerCase().includes(term) ||
            (m.Parent_code || '').toLowerCase().includes(term) ||
            (m.Address || '').toLowerCase().includes(term)
        );
        renderMembers(filtered);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
}

function applyFilter(term) {
    const searchInput = document.getElementById('memberSearch');
    if (searchInput) {
        searchInput.value = term;
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);

        const membersSection = document.getElementById('members');
        if (membersSection) {
            const yOffset = -80;
            const y = membersSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }
}

// --- MOCK DATA FOR PREVIEW ---
function loadMockData() {
    membersData = [
        { Gener_code: 'G1-001', Nickname: 'พ่อใหญ่', Fullname: 'สมชาย รักครอบครัว', Relation_type: 'หัวหน้าครอบครัว', Address: 'กรุงเทพฯ', Image_URL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500' },
        { Gener_code: 'G1-002', Nickname: 'แม่ใหญ่', Fullname: 'สมศรี รักครอบครัว', Relation_type: 'ภรรยา', Address: 'กรุงเทพฯ', Image_URL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500' },
        { Gener_code: 'G2-001', Nickname: 'เก่ง', Fullname: 'อภิชาติ รักครอบครัว', Relation_type: 'บุตรชาย', Address: 'เชียงใหม่', Image_URL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500' },
        { Gener_code: 'G2-002', Nickname: 'ก้อย', Fullname: 'ธิดา รักครอบครัว', Relation_type: 'บุตรสาว', Address: 'ระยอง', Image_URL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500' }
    ];

    activitiesData = [
        { Date: '12 เม.ย. 2024', Description: 'รวมญาติวันสงกรานต์ ประจำปี 2567 ณ บ้านพักตากอากาศ', Image_act_URL: 'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=800' },
        { Date: '1 ม.ค. 2024', Description: 'งานเลี้ยงสังสรรค์ส่งท้ายปีเก่าต้อนรับปีใหม่ 2567', Image_act_URL: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800' },
        { Date: '23 ธ.ค. 2023', Description: 'ทริปครอบครัวเที่ยวโครงการหลวงดอยอ่างขาง', Image_act_URL: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800' }
    ];

    renderMembers(membersData);
    renderActivities(activitiesData);
    initSearch();
}

// --- ADMIN SYSTEM LOGIC ---
function initAdminLogic() {
    const adminNavLink = document.getElementById('adminNavLink');
    const loginModal = document.getElementById('loginModal');
    const adminDashboard = document.getElementById('adminDashboard');
    const closeModals = document.querySelectorAll('.close-modal');
    const loginBtn = document.getElementById('loginBtn');
    const adminPasswordInput = document.getElementById('adminPassword');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Modal Control
    adminNavLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (adminPassword) {
            adminDashboard.classList.add('show');
        } else {
            loginModal.classList.add('show');
        }
    });

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.classList.remove('show');
            adminDashboard.classList.remove('show');
        });
    });

    // Login Action
    loginBtn.addEventListener('click', async () => {
        const password = adminPasswordInput.value;
        if (!password) {
            showToast('โปรดระบุรหัสผ่าน', 'error');
            return;
        }

        if (!BACKEND_URL) {
            showToast('โปรดตั้งค่า BACKEND_URL ใน script.js ก่อนใช้งานระบบหลังบ้าน', 'error');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'กำลังตรวจสอบ...';

        try {
            const res = await gasPost({ action: 'login', adminPassword: password });
            const result = await res.json();

            if (result.success) {
                adminPassword = password;
                loginModal.classList.remove('show');
                adminDashboard.classList.add('show');
                adminPasswordInput.value = '';
                showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!', 'success');
            } else {
                showToast(result.message || 'รหัสผ่านไม่ถูกต้อง', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ หรือคุณยังไม่ได้ตั้งค่า CORS/Deployment ใน Apps Script', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'เข้าสู่ระบบ';
        }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        adminPassword = '';
        adminDashboard.classList.remove('show');
    });

    // Form Submissions
    document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const member = Object.fromEntries(formData.entries());

        // Handle image file
        const fileInput = document.getElementById('memberImageFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            // Validate file size (5 MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('ไฟล์รูปภาพขนาดใหญ่เกินไป (สูงสุด 5 MB)', 'error');
                return;
            }
            showUploadProgress('member', true);
            animateProgress('member', 0, 60);
            const base64 = await fileToBase64(file);
            member.imageFile = {
                base64: base64,
                type: file.type,
                name: file.name
            };
            animateProgress('member', 60, 80);
        }

        await submitAdminAction('addMember', { member }, 'member');
        form.reset();
        clearImagePreview('member');
    });

    document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const activity = Object.fromEntries(formData.entries());

        // แปลงวันที่จาก input[type=date] (YYYY-MM-DD) เป็นภาษาไทย
        if (activity.Date_raw) {
            try {
                const d = new Date(activity.Date_raw + 'T00:00:00');
                activity.Date = d.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (_) {
                activity.Date = activity.Date_raw;
            }
            delete activity.Date_raw;
        } else {
            activity.Date = new Date().toLocaleDateString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        }

        // Handle image file
        const fileInput = document.getElementById('activityImageFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            // Validate file size (5 MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('ไฟล์รูปภาพขนาดใหญ่เกินไป (สูงสุด 5 MB)', 'error');
                return;
            }
            showUploadProgress('activity', true);
            animateProgress('activity', 0, 60);
            const base64 = await fileToBase64(file);
            activity.imageFile = {
                base64: base64,
                type: file.type,
                name: file.name
            };
            animateProgress('activity', 60, 80);
        }

        await submitAdminAction('addActivity', { activity }, 'activity');
        form.reset();
        clearImagePreview('activity');
    });
}

// Helper to convert File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function submitAdminAction(action, data, progressKey) {
    if (!adminPassword || !BACKEND_URL) return;

    const submitBtnId = action === 'addMember' ? 'addMemberSubmitBtn' : 'addActivitySubmitBtn';
    const btn = document.getElementById(submitBtnId);
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.textContent = 'กำลังบันทึก...';

    try {
        if (progressKey) animateProgress(progressKey, 80, 95);

        const response = await gasPost({
            action: action,
            adminPassword: adminPassword,
            ...data
        });
        const result = await response.json();

        if (progressKey) {
            animateProgress(progressKey, 95, 100);
            setTimeout(() => showUploadProgress(progressKey, false), 1000);
        }

        if (result.success) {
            showToast(result.message, 'success');
            fetchSheetData();
        } else {
            showToast('ล้มเหลว: ' + result.message, 'error');
            if (progressKey) showUploadProgress(progressKey, false);
        }
    } catch (error) {
        console.error('Action error:', error);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        if (progressKey) showUploadProgress(progressKey, false);
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
    }
}

/**
 * gasPost — ส่ง POST ไปยัง Google Apps Script
 * • บน server (GitHub Pages): ส่งตรงพร้อม Content-Type: text/plain
 *   เพื่อหลีกเลี่ยง CORS preflight
 * • บน local (file://, localhost): ใช้ allorigins.win proxy เพื่อ wrap request
 *   เพราะ browser บาง version ยัง block แม้ไม่มี preflight
 */
async function gasPost(payload) {
    const bodyStr = JSON.stringify(payload);

    if (isLocalEnv()) {
        // Local: ส่งผ่าน allorigins proxy (wraps POST → GET)
        // สำหรับ payload ที่มีรูปภาพ (base64) อาจใหญ่ — ลองตรงก่อน
        console.log('[gasPost] Local env detected, trying direct then proxy...');
        try {
            return await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                body: bodyStr
            });
        } catch (directErr) {
            console.warn('[gasPost] Direct failed, using proxy:', directErr);
            // Fallback: ใช้ proxy
            const proxyUrl = CORS_PROXY + encodeURIComponent(BACKEND_URL);
            return await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: bodyStr
            });
        }
    }

    // Server (GitHub Pages): ส่งตรง
    return await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: bodyStr
    });
}

// --- UPLOAD ZONE LOGIC ---
function initUploadZones() {
    setupUploadZone('member', 'memberUploadZone', 'memberImageFile', 'memberPreview', 'memberPreviewImg', 'memberPreviewName', 'removeMemberImg');
    setupUploadZone('activity', 'activityUploadZone', 'activityImageFile', 'activityPreview', 'activityPreviewImg', 'activityPreviewName', 'removeActivityImg');
}

function setupUploadZone(key, zoneId, fileInputId, previewWrapId, previewImgId, previewNameId, removeBtnId) {
    const zone = document.getElementById(zoneId);
    const fileInput = document.getElementById(fileInputId);
    const previewWrap = document.getElementById(previewWrapId);
    const previewImg = document.getElementById(previewImgId);
    const previewName = document.getElementById(previewNameId);
    const removeBtn = document.getElementById(removeBtnId);

    if (!zone || !fileInput) return;

    // Explicit zone click fallback for some mobile browsers
    zone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    // File selected via click
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelected(file, previewWrap, previewImg, previewName);
    });

    // Drag & Drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            // Sync to actual input
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            handleFileSelected(file, previewWrap, previewImg, previewName);
        } else if (file) {
            showToast('โปรดเลือกไฟล์รูปภาพเท่านั้น', 'error');
        }
    });

    // Remove button
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            fileInput.value = '';
            clearImagePreview(key);
        });
    }
}

function handleFileSelected(file, previewWrap, previewImg, previewName) {
    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 5 MB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        previewWrap.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function clearImagePreview(key) {
    const previewWrap = document.getElementById(key + 'Preview');
    const previewImg = document.getElementById(key + 'PreviewImg');
    const previewName = document.getElementById(key + 'PreviewName');
    if (previewWrap) previewWrap.classList.remove('has-image');
    if (previewImg) previewImg.src = '';
    if (previewName) previewName.textContent = '';
    showUploadProgress(key, false);
}

function showUploadProgress(key, show) {
    const bar = document.getElementById(key + 'UploadProgress');
    if (!bar) return;
    if (show) {
        bar.classList.add('show');
        setProgressValue(key, 0);
    } else {
        setTimeout(() => {
            bar.classList.remove('show');
            setProgressValue(key, 0);
        }, 400);
    }
}

function setProgressValue(key, pct) {
    const fill = document.getElementById(key + 'ProgressBar');
    const label = document.getElementById(key + 'ProgressPct');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
}

function animateProgress(key, from, to) {
    let current = from;
    const step = (to - from) / 20;
    const interval = setInterval(() => {
        current = Math.min(current + step, to);
        setProgressValue(key, Math.round(current));
        if (current >= to) clearInterval(interval);
    }, 30);
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
