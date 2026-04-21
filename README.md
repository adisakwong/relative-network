# Relative-Network 🌐

เว็บไซต์เครือข่ายสมาชิกครอบครัวและคลังภาพกิจกรรมสัมพันธ์  
พัฒนาด้วย HTML, CSS, JavaScript (Vanilla) — เน้นความเร็ว สวยงาม และรองรับการใช้งานบนมือถืออย่างสมบูรณ์

---

## โครงสร้างไฟล์ (Essential Files)

```
relative-network/
├── index.html        ← หน้าเว็บหลัก (UI + Admin Dashboard)
├── style.css         ← สไตล์ทั้งหมด (Dark Theme, Glassmorphism, Responsive)
├── script.js         ← ตรรกะฝั่ง Frontend (Filtering, Search, Admin Logic)
├── Code.gs           ← Google Apps Script Backend (สำหรับจัดการข้อมูลและอัปโหลดรูป)
├── manifest.json     ← PWA Manifest สำหรับติดตั้งบนมือถือ
├── package.json      ← สำหรับการรัน Local Dev Server
└── img/              ← ไอคอนและทรัพยากรภาพ
```

> **หมายเหตุ**: ไฟล์ `Code.gs` ใช้สำหรับติดตั้งภายใน Google Apps Script เท่านั้น ไม่ต้องอัปโหลดขึ้นเว็บโฮสติ้ง

---

## คุณสมบัติเด่น (Key Features)

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🎨 **Premium Aesthetics** | ดีไซน์ Dark Mode ทันสมัยด้วย Glassmorphism, Gradients และ Micro-animations |
| 📊 **Real-time Statistics** | ระบบนับจำนวนสมาชิกแยกตามรุ่น (Generations) แสดงผลใน Dropdown โดยอัตโนมัติ |
| 🔍 **Advanced Filtering** | ระบบกรองรุ่น (PG1-PG5) พร้อมการค้นหาชื่อ-ที่อยู่ ที่แม่นยำและลื่นไหล |
| 👨‍👩‍👧‍👦 **Smart Family View** | ปุ่ม "บุคคลในครอบครัว" ที่แสดงเฉพาะ [ตนเอง + คู่สมรส + ลูกๆ] เพื่อความกระชับ |
| 🛡️ **Admin Control Panel** | ระบบเพิ่ม/แก้ไขสมาชิกและกิจกรรม ความปลอดภัยด้วยรหัสผ่าน และ UI ที่จัดการง่าย |
| 📸 **Cloud Photo Storage** | อัปโหลดรูปภาพผ่าน Google Drive พร้อมระบบ Live Preview ก่อนบันทึก |
| 📱 **Mobile Optimized** | ออกแบบมาเพื่อมือถือโดยเฉพาะ ทั้ง Bottom-Sheet และปุ่มกดขนาดใหญ่ที่แตะง่าย |
| ⚡ **No-Reload Logic** | การค้นหาและกรองข้อมูลทำงานทันทีบนเบราว์เซอร์ ไม่ต้องโหลดหน้าใหม่ |

---

## การเตรียมฐานข้อมูล (Google Sheets Setup)

สร้าง Google Sheet และตั้งชื่อ Tab ตามที่กำหนด (หัวตารางต้องตรงกัน):

### 1. Sheet: `members` (ข้อมูลสมาชิก)
หัวตารางที่ต้องมี:
`Gener_code` | `Nickname` | `Fullname` | `Relation_type` | `Address` | `Image_URL` | `Family_code` | `Parent_code` | `Person_gen` | `Head_family`

- **Person_gen**: ระบุรุ่น เช่น PG1, PG2 (สำหรับตัวกรองในหน้าเว็บ)
- **Head_family**: ใส่ค่า `1` หากเป็นสายหลัก (ปุ่มครอบครัวจะเป็นสีเน้นพิเศษ)

### 2. Sheet: `activities` (ภาพกิจกรรม)
หัวตาราง: `Date` | `Description` | `Image_act_URL`

### 3. Sheet: `admin` (รหัสผ่าน)
หัวตาราง: `password` (รหัสผ่านจะอ่านจากแถวที่ 2 เป็นต้นไป)

---

## การติดตั้งและการใช้งาน (Setup Guide)

### 1. ตั้งค่า Backend
1. คัดลอกโค้ดจาก `Code.gs` ไปวางใน [Google Apps Script](https://script.google.com)
2. แก้ไข `FOLDER_ID` ใน `CONFIG` ให้เป็น ID โฟลเดอร์ Google Drive ของคุณ
3. สั่ง **Deploy as Web App** (ตั้งค่าเป็น Anyone counts access) แล้วคัดลอก URL ที่ได้

### 2. ตั้งค่า Frontend
เปิดไฟล์ `script.js` และแก้ไขส่วนกอนฟิก:
```javascript
const SHEET_ID    = 'YOUR_SHEET_ID';
const BACKEND_URL = 'YOUR_APP_SCRIPT_URL';
```

### 3. การใช้งาน Admin
- คลิกไอคอน 🛡️ (หรือปุ่มจัดการ) เพื่อเข้าสู่ระบบ
- **เพิ่มสมาชิก:** กรอกข้อมูลและเลือกรูปภาพ ระบบจะจัดการ 2x2 Grid สำหรับรหัสโค้ดต่างๆ ให้โดยอัตโนมัติ
- **แก้ไขสมาชิก:** ค้นหารายชื่อแล้วกดแก้ไขเพื่อปรับปรุงข้อมูลหรือเปลี่ยนรูปภาพใหม่

---

## เทคนิคการค้นหาและกรองข้อมูล
- **Dropdown รุ่น:** แสดงจำนวนคนในแต่ละรุ่นให้เห็นทันที
- **ปุ่มบุคคลในครอบครัว:** กรองสมาชิกที่แชร์ `Family_code` เดียวกัน (คู่สมรส) หรือมี `Parent_code` ตรงกับเรา (ลูกๆ)
- **การพิมพ์ค้นหา:** ระบบจะค้นหาเฉพาะ ชื่อ, ชื่อเล่น, ที่อยู่ และความสัมพันธ์ เพื่อความรวดเร็วและแม่นยำ

---

พัฒนาโดยทีมงาน **Tech for Ummah** — ยกระดับการเชื่อมโยงความสัมพันธ์ด้วยเทคโนโลยี
