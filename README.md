# My-Relative-Network

เว็บไซต์เครือข่ายสมาชิกครอบครัวและคลังภาพกิจกรรมสัมพันธ์ พัฒนาด้วย HTML, CSS, และ JavaScript แบบ Responsive สำหรับการแสดงผลบนมือถือและคอมพิวเตอร์

## คุณสมบัติ (Features)
- **Premium Dark Blue Theme**: ดีไซน์ทันสมัย สไตล์ Dark Mode ที่ดูพรีเมียม
- **Responsive Design**: รองรับการใช้งานทุกอุปกรณ์ ตั้งแต่สมือถือจนถึงจอคอมพิวเตอร์
- **Dynamic Data**: ดึงข้อมูลโดยตรงจาก Google Sheets (ตาราง members และ activities)
- **Search System**: ระบบค้นหาสมาชิกตามชื่อหรือรหัสสมาชิกแบบ Real-time
- **GitHub Pages Ready**: พร้อมสำหรับ部署ไปยัง GitHub Pages ได้ทันที

## วิธีการเชื่อมต่อกับ Google Sheets
เพื่อให้เว็บไซต์แสดงข้อมูลของคุณเอง ให้ทำตามขั้นตอนดังนี้:

1. **เตรียม Google Sheet**: 
   - สร้าง Google Sheet และตั้งชื่อ Sheet (Tab) ว่า `members` และ `activities`
   - ใน Sheet `members` ต้องมีหัวตารางดังนี้: `Gener_code`, `Nickname`, `Fullname`, `Relation_type`, `Address`, `Father_code`, `Mather_code`, `Image_URL`
   - ใน Sheet `activities` ต้องมีหัวตารางดังนี้: `Date`, `Description`, `Image_act_URL`
2. **ตั้งค่าการเข้าถึง**:
   - คลิกปุ่ม **Share** ตรงมุมขวาบน
   - เปลี่ยน General access เป็น **"Anyone with the link"** (เลือกสิทธิ์เป็น Viewer)
3. **นำ Sheet ID มาใส่ในโค้ด**:
   - คัดลอก ID จาก URL ของ Google Sheet (อยู่ระหว่าง `/d/` และ `/edit`)
   - เปิดไฟล์ `script.js` และแทนที่ค่าในตัวแปร `SHEET_ID`:
     ```javascript
     const SHEET_ID = 'ใส่ ID ของ Google Sheet ตรงนี้';
     ```

## วิธีการ Deployment ไปยัง GitHub
1. อัปโหลดไฟล์ทั้งหมดขึ้นไปยัง Repository ใน GitHub ของคุณ
2. ไปที่ **Settings** > **Pages**
3. เลือก Branch เป็น `main` (หรือ branch หลักของคุณ) และโฟลเดอร์เป็น `/ (root)`
4. คลิก **Save** และรอสักครู่ เว็บไซต์จะออนไลน์ตาม URL ที่ GitHub กำหนดให้

---
พัฒนาโดย **Antigravity AI Assistant**
