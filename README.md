# ให้ githup รันไฟล์ทุก 5 นาทีหรือมากกว่านั้น
1. กดที่ Settings
2. ด้านซ้ายหาเมนู Secrets and variables > Actions
3. กดปุ่ม New repository secret เพื่อเพิ่มทีละตัว

![alt text](Traditional\image.png)

# สิ่งที่ต้องเพิ่ม
## 1. ชื่อ

Name *
```
ใส่คว่า NAME
```
Secret *
```
ไม่ต้องใส่อะไร
```
เพิ่มเสร็จกด Add secret

เพราะชื่อเราได้ตั้งไว้ในไฟล์ run.yml แล้ว

![alt text](Traditional\image-3.png)

## 2. Webhook

Name *
```
ใส่ WEPHOOK หรือชื่อที่ตั้งไว้ในไฟล์ run.yml
```
Secret *
```
ใส่ลิ้งค์ Webhook ดิสคอดของเรา
```

เพิ่มเสร็จกด Add secret

![alt text](Traditional\image-1.png)
## คุณก็จะได้
![alt text](Traditional\image-2.png)

พอเพิ่มครบแล้ว เวลา GitHub Actions มันรัน มันจะใช้ค่าเหล่านี้ในการดึงประกาศเกมไปโพสต์ที่ Discord ของคุณ

ตั้งค่าไฟล์ run.yml ให้เรียบร้อย

![alt text](Traditional\image-4.png)

# ขั้นต่อไป

1. ไปที่ Settings → Actions → General ของโปรเจ็คของคุณ
  - ตรง Workflow permissions เลือกเป็น
  - ✅ Read and write permissions
  - กด Save

2. เสร็จแล้วไปที่แท็บ Actions ของรีโป

  - น่าจะเห็น Workflow “ชื่อที่เราตั้งไว้ในไฟล์” หรือใกล้เคียง
  - กดเข้าไปแล้วลองกด Run workflow เพื่อทดสอบได้เลย

ถ้า Secrets ถูกต้อง → workflow จะดึงประกาศจากเกมมาโพสต์ใน Discord channel ของคุณอัตโนมัติ

![alt text](Traditional\image-5.png)

## ขั้นที่ 1: ตั้ง Permissions ของ Workflow
    - เข้าไปที่รีโปของคุณ → Settings → Actions → General
    - หาคำว่า Workflow permissions
    - เลือกเป็น ✅ Read and write permissions
    - กด Save
    - ขั้นนี้สำคัญ เพราะ workflow จะต้องเขียนข้อมูล (post ข้อความไป Discord)
## ขั้นที่ 2: รัน Workflow
    - ไปที่แท็บ Actions ของรีโป
    - น่าจะเห็น workflow ชื่อประมาณ GI-GameNotice
    - คลิกเข้าไป → ด้านขวาจะมีปุ่ม Run workflow
    - เลือก branch เป็น main (หรือ branch ที่คุณใช้อยู่)
    - กด Run workflow
## ขั้นที่ 3: ตรวจสอบผลลัพธ์
    - Workflow จะเริ่มทำงาน
    - หลังจากรันเสร็จ จะโพสต์ข้อความตัวอย่างหรือประกาศใหม่ของเกมไป Discord ของคุณ ผ่าน Webhook
    - ถ้ามี error → GitHub Actions จะแสดง log ให้ดู


![alt text](Traditional\image-7.png)