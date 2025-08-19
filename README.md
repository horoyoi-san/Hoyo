# README - วิธีใช้ HappyGenyuanImsactUpdate (v3.2.4) สำหรับเกม HoYo 

## ขั้นตอนการใช้งาน

1. **เตรียมไฟล์และโฟลเดอร์**

- โฟลเดอร์เกม (ตัวอย่าง):  
  `C:\hoyogame_1.0.0`

- ไฟล์อัปเดต `.zip` (ตัวอย่าง):  
  `C:\game_1.1.0_1.1.2_hdiff_XXXXXXXXXXX.zip`

2. **เปิด Command Prompt ในโฟลเดอร์โปรแกรม Updater**  
   เช่น:  
   `C:\Release-windows7-x64\Updater`

3. **รันคำสั่งอัปเดต**

```bash
HappyGenyuanImsactUpdate.exe -patchAt "C:\hoyogame_1.0.0" -checkmode 0 -zip_count 1 "C:\game_1.1.0_1.1.2_hdiff_XXXXXXXXXXX.zip" --config_change_guidance false
