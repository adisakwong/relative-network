/**
 * My-Relative-Network - Core Logic
 */

// --- CONFIGURATION ---
// Replace this with your Google Sheet ID
const SHEET_ID = '1V2vwXcz2sg6zY2lORY9VX1gvJnx114TRbhgARX3vGEI';
const MEMBER_SHEET_NAME = 'members';
const ACTIVITY_SHEET_NAME = 'activities';

// Data storage
let membersData = [];
let activitiesData = [];

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
async function fetchSheetData() {
    try {
        console.log("Fetching data from Google Sheets...");
        // Fetch Members
        const membersUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${MEMBER_SHEET_NAME}`;
        const activitiesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${ACTIVITY_SHEET_NAME}`;

        const [membersRes, activitiesRes] = await Promise.all([
            fetch(membersUrl),
            fetch(activitiesUrl)
        ]);

        if (!membersRes.ok || !activitiesRes.ok) {
            throw new Error('Network response was not ok');
        }

        const membersCsv = await membersRes.text();
        const activitiesCsv = await activitiesRes.text();

        membersData = parseCSV(membersCsv);
        activitiesData = parseCSV(activitiesCsv);

        console.log("Data loaded successfully:", { members: membersData.length, activities: activitiesData.length });

        renderMembers(membersData);
        renderActivities(activitiesData);
        initSearch();

    } catch (error) {
        console.error('Error fetching data:', error);
        let errorMsg = 'ไม่สามารถโหลดข้อมูลได้';
        
        if (window.location.protocol === 'file:') {
            errorMsg += '<br><small style="font-size: 0.8rem; display: block; margin-top: 10px; color: #f87171;">' + 
                        '⚠️ การเปิดไฟล์แบบดับเบิลคลิก (file://) อาจถูกบล็อกโดยระบบความปลอดภัยของเบราว์เซอร์ (CORS)<br>' + 
                        'แนะนำให้อัปโหลดไฟล์ขึ้น GitHub Pages เพื่อใช้งานจริง</small>';
        } else {
            errorMsg += '<br><small style="font-size: 0.8rem; display: block; margin-top: 10px;">' + 
                        'โปรดตรวจสอบความถูกต้องของชื่อ Sheet และการตั้งค่าการแชร์ (Anyone with the link can view)</small>';
        }
        
        document.getElementById('memberList').innerHTML = `<div class="loading">${errorMsg}</div>`;
        document.getElementById('activityList').innerHTML = `<div class="loading">ไม่สามารถโหลดข้อมูลกิจกรรมได้</div>`;
    }
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

// --- RENDERING ---
function renderMembers(data) {
    const container = document.getElementById('memberList');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading">ไม่พบข้อมูลสมาชิก</div>';
        return;
    }

    container.innerHTML = data.map(member => `
        <div class="member-card">
            <img src="${member.Image_URL || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=500'}" alt="${member.Fullname}" class="member-img">
            <div class="member-info">
                <span class="nickname">${member.Nickname || 'Unknown'}</span>
                <h3>${member.Fullname}</h3>
                <span class="relation-tag">${member.Relation_type}</span>
                <div class="member-meta">
                    <p><i class="fas fa-fingerprint"></i> ${member.Gener_code}</p>
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
                <img src="${act.Image_act_URL || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800'}" alt="activity" class="activity-img">
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
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = membersData.filter(m =>
            m.Fullname.toLowerCase().includes(term) ||
            m.Nickname.toLowerCase().includes(term) ||
            m.Gener_code.toLowerCase().includes(term)
        );
        renderMembers(filtered);
    });
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
