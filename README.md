# HSR Hdiff
1. ติดตั้ง customtkinter
รันใน Command Prompt หรือ PowerShell
```pip install customtkinter```
2. ใช้คำสั่ง build แบบนี้
```
pyinstaller --onefile --noconsole ^
    --name HSR_HdiffPatch ^
    --icon=image.ico ^
    --add-data "image.ico;." ^
    --add-data "hdiffz.exe;." ^
    --add-data "hpatchz.exe;." main.py
```

--add-data "image.ico;." คือการบอกว่าให้ copy image.ico ไปไว้ใน root ของ bundle