# README - วิธีใช้ HappyGenyuanImsactUpdate (v3.2.4) สำหรับเกม ZZZ (Zenless Zone Zero)

## ขั้นตอนการใช้งาน

1. **เตรียมไฟล์และโฟลเดอร์**

- โฟลเดอร์เกม (ตัวอย่าง):  
  `C:\Pro Player\PS\ZZZ PS\ZZZ_2.2.x`

- ไฟล์อัปเดต `.zip` (ตัวอย่าง):  
  `C:\Pro Player\PS\ZZZ PS\game_2.2.1_2.2.2_hdiff_blrGl9k8w8VRJdHq.zip`

2. **เปิด Command Prompt ในโฟลเดอร์โปรแกรม Updater**  
   เช่น:  
   `C:\Pro Player\PS\ZZZ PS\Release-windows7-x64\Updater`

3. **รันคำสั่งอัปเดต**

```bash
HappyGenyuanImsactUpdate.exe -patchAt "C:\Pro Player\PS\ZZZ PS\ZZZ_2.2.x" -checkmode 0 -zip_count 1 "C:\Pro Player\PS\ZZZ PS\game_2.2.1_2.2.2_hdiff_blrGl9k8w8VRJdHq.zip" --config_change_guidance false
