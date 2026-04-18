# Relative-Network 🌐

เว็บไซต์เครือข่ายสมาชิกครอบครัวและคลังภาพกิจกรรมสัมพันธ์  
พัฒนาด้วย HTML, CSS, JavaScript (Vanilla) — ไม่ต้องพึ่ง Framework ใดๆ

---

## โครงสร้างไฟล์ (Essential Files)

```
relative-network/
├── index.html        ← หน้าเว็บหลัก (UI + Admin Dashboard)
├── style.css         ← สไตล์ทั้งหมด (Dark Theme, Responsive, Mobile)
├── script.js         ← ตรรกะฝั่ง Frontend (Data Fetching, Admin, Upload)
├── Code.gs           ← Google Apps Script Backend (อัปโหลดไว้ใน GAS เท่านั้น)
├── manifest.json     ← PWA Manifest
├── config.json       ← ค่าคอนฟิกสำหรับ Local Dev Server
├── package.json      ← npm scripts (สำหรับรัน Local Server)
└── img/
    └── mobile_icon.png ← App Icon สำหรับ PWA / Bookmark
```

> **หมายเหตุ**: `Code.gs` ไม่ต้องอัปโหลดขึ้น GitHub — ให้ copy วางใน Google Apps Script Editor เท่านั้น

---

## คุณสมบัติ (Features)

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🎨 Dark Blue Premium Theme | ดีไซน์ทันสมัย ใช้ Glassmorphism + Gradient |
| 📱 Mobile-First Responsive | Bottom-Sheet Modal, Touch-Friendly Inputs, Native Date Picker |
| 📊 Live Data จาก Google Sheets | ดึงข้อมูลผ่าน Apps Script JSONP (ไม่มี CORS) |
| 🔒 Admin Dashboard | Login ด้วยรหัสผ่าน, เพิ่มสมาชิก/กิจกรรม |
| 📸 Drag & Drop / Upload | อัปโหลดรูปไปยัง Google Drive พร้อม Preview |
| 🔍 Advanced Real-time Search | ค้นหาตามชื่อ, รหัสรุ่น, โค้ดครอบครัว, โค้ดบุพการี และที่อยู่ พร้อมปุ่มกากบาทปัดทิ้ง |
| ✨ Instant Filtering | คลิกที่รหัสครอบครัวบนการ์ด เพื่อเรียกดูสมาชิกในเครือเดียวกันได้ในคลิกเดียว |
| ⏳ Premium Loading UI | แสดงข้อความและวงแหวนโหลดข้อมูลที่มี Pulse Effect น่าดึงดูดใจ |
| 🌐 3-Tier Data Fetching | Fallback อัตโนมัติ — ทำงานได้ทุก environment |

---

## การตั้งค่าเริ่มต้น (Setup)

### 1. เตรียม Google Sheet

สร้าง Google Sheet และตั้งชื่อ Tab ดังนี้:

**Sheet: `members`** — หัวตาราง:
```
Gener_code | Nickname | Fullname | Relation_type | Address | Image_URL | Family_code | Parent_code
```

**Sheet: `activities`** — หัวตาราง:
```
Date | Description | Image_act_URL
```

**Sheet: `admin`** — หัวตาราง:
```
password
(รหัสผ่าน Admin แถวที่ 2 เป็นต้นไป)
```

จากนั้น **Share** → "Anyone with the link" → **Viewer**

---

### 2. ตั้งค่า Google Apps Script Backend

1. เปิด [script.google.com](https://script.google.com) → สร้าง Project ใหม่
2. Copy โค้ดจาก `Code.gs` ไปวางในไฟล์ `Code.gs` ของ Apps Script
3. แก้ไข `FOLDER_ID_MEMBERS` และ `FOLDER_ID_ACTIVITIES` ให้ตรงกับโฟลเดอร์ใน Google Drive ของคุณ:
   ```javascript
   const CONFIG = {
     FOLDER_ID_MEMBERS:    'YOUR_MEMBERS_FOLDER_ID',
     FOLDER_ID_ACTIVITIES: 'YOUR_ACTIVITIES_FOLDER_ID',
   };
   ```
4. **Deploy** → **New Deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. คัดลอก URL ที่ได้ (ลงท้ายด้วย `/exec`)

---

### 3. ตั้งค่า `script.js`

เปิดไฟล์ `script.js` แล้วแก้ไขตัวแปรใน `--- CONFIGURATION ---`:

```javascript
const SHEET_ID    = 'YOUR_GOOGLE_SHEET_ID';   // ID จาก URL ของ Google Sheet
const BACKEND_URL = 'YOUR_GAS_WEB_APP_URL';   // URL จาก Deploy
```

---

## การรันบน Local Development

### วิธีที่ 1: VS Code Live Server (แนะนำ ✅)
1. ติดตั้ง Extension **"Live Server"** ใน VS Code
2. คลิกขวาที่ `index.html` → **"Open with Live Server"**
3. เปิดที่ `http://localhost:5500`

### วิธีที่ 2: npm (Node.js)
```bash
npm install
npm start
# เปิดที่ http://localhost:3000
```

### วิธีที่ 3: เปิดไฟล์โดยตรง (file://)
- ดับเบิลคลิก `index.html` ได้เลย
- ระบบจะพยายามดึงข้อมูลผ่าน **3 วิธีอัตโนมัติ** (ดูด้านล่าง)
- หากล้มเหลวทุกวิธี จะแสดง **"ข้อมูลจำลอง"** แทน

---

## กลไกดึงข้อมูล: 3-Tier Fallback

ระบบจะลองดึงข้อมูลตามลำดับนี้อัตโนมัติ:

```
1. Apps Script JSONP  ← หลัก (ไม่มี CORS เลย ใช้ได้ทุกที่)
        ↓ ล้มเหลว
2. Direct gviz CSV   ← ใช้ได้บน GitHub Pages (Sheet ต้องเปิดสาธารณะ)
        ↓ ล้มเหลว
3. allorigins Proxy  ← Last resort สำหรับ local (ขึ้นอยู่กับ proxy)
        ↓ ล้มเหลวทุกวิธี
   แสดงข้อมูลจำลอง + Error Banner
```

---

## การ Deploy ขึ้น GitHub Pages

```bash
# Push ไฟล์ทั้งหมด (ยกเว้น Code.gs) ขึ้น GitHub
git add index.html script.js style.css manifest.json config.json package.json img/
git commit -m "Deploy Relative-Network"
git push origin main
```

จากนั้น:
1. ไปที่ **Settings** → **Pages**
2. Source: **Branch `main`** → **`/ (root)`**
3. คลิก **Save**

เว็บไซต์จะออนไลน์ที่ `https://[username].github.io/[repo-name]/`

---

## Admin Dashboard

| ฟังก์ชัน | รายละเอียด |
|---|---|
| เข้าสู่ระบบ | กดไอคอน 🛡️ ในเมนู → ใส่รหัสผ่านจาก Sheet `admin` |
| เพิ่มสมาชิก | กรอกข้อมูล + อัปโหลดรูป (รองรับกล้องมือถือโดยตรง) |
| เพิ่มกิจกรรม | เลือกวันที่จากปฏิทิน + อัปโหลดรูปกิจกรรม |
| รูปภาพ | อัปโหลดไปยัง Google Drive อัตโนมัติ ขนาดไม่เกิน 5 MB |

---

## การแก้ไขปัญหาเบื้องต้น

**❌ "ไม่สามารถเชื่อมต่อข้อมูลได้"**
- ตรวจสอบ `SHEET_ID` และ `BACKEND_URL` ใน `script.js`
- ตรวจสอบว่า Google Sheet แชร์เป็น "Anyone with the link"
- ตรวจสอบว่า Apps Script Deploy ถูกต้อง (Anyone, Execute as Me)

**❌ อัปโหลดรูปภาพไม่ได้**
- รัน `runDiagnostics()` ใน Apps Script Editor เพื่อตรวจสอบสิทธิ์
- ตรวจสอบ `FOLDER_ID` ใน `Code.gs` ว่ายังมีอยู่และมีสิทธิ์เขียน

**❌ Login ไม่ผ่าน**
- ตรวจสอบว่า Sheet `admin` มีรหัสผ่านใน column แรก แถวที่ 2 เป็นต้นไป
- หลังแก้ไข `Code.gs` ต้อง **Deploy ใหม่** ทุกครั้ง

---

พัฒนาโดย **Tech for Ummah** — Powered by Antigravity AI
