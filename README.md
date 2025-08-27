คุณสมบัติ:
- เปลี่ยนเส้นทางคำขอ HTTP
- ยกเลิกการเซ็นเซอร์
- เปลี่ยน AccountRSAKey เป็นคีย์สาธารณะที่กำหนดเอง (โดยค่าเริ่มต้น ใช้งานได้กับ [hoyo-sdk โดย xeondev](https://git.xeondev.com/reversedrooms/hoyo-sdk))

ปัจจุบัน ฟีเจอร์นี้ได้รับการทดสอบบน CNBETAWin3.1.53 เท่านั้น และอาจต้องมีการอัปเดตสำหรับเวอร์ชันถัดไป

หมายเหตุ: หากคุณวางแผนที่จะใช้ `mhypbase.dll` โปรดสร้างสำเนาไฟล์ต้นฉบับก่อน เผื่อในกรณีที่เกิดปัญหา หรือหากไม่ต้องการ ให้คัดลอก `hkrpg.dll` และ `launcher.exe` ลงในโฟลเดอร์เกม แล้วเรียกใช้ `launcher.exe` ในฐานะผู้ดูแลระบบ

หากต้องการสร้างไฟล์ mhypbase.dll,launcher.exe,hkrpg.dll
รันคำสั่งด้วย Administrator
```
cargo build -p hkrpg --release
cargo build -p mhypbase --release
cargo build -p launcher
```
หมายเหตุ: หาก `hkrpg.dll` ใช้งานไม่ได้ ให้ใช้ `mhypbase.dll` เปลี่ยนชื่อจาก mhypbase เป็น hkrpg แล้วนำไปแทนที่ไฟล์ `hkrpg.dll` เก่าของคุณ
----
ที่มา:

- [trigger-patch โดย xeondev](https://git.xeondev.com/ObolSquad/trigger-patch)
- [hk4e-patch-universal โดย oureveryday](https://github.com/oureveryday/hk4e-patch-universal)