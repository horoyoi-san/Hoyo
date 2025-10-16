import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import requests
import threading
import queue
import urllib.parse
import hashlib
import time
import os
import logging
from datetime import timedelta # For better time formatting

# --- Configuration ---
# Hoyoverse API URL that fetches multiple game packages
API_BASE_URL = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages"
# These game_ids are already present in your original URL.
# We'll parse them from the full URL or define them here for clarity.
# For simplicity, we'll use the full URL as the base for fetching all data first.
FULL_HOYO_API_URL = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?&launcher_id=VYTpXlbWo8"

DOWNLOAD_TIMEOUT = 30 # seconds for each request
CHUNK_SIZE = 8192 # bytes for file chunks

# --- Logging Setup ---
logging.basicConfig(filename='downloader.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

class HoyoAPIViewerApp:
    def __init__(self, master):
        self.master = master
        master.title("🌟 Hoyo API Viewer & Downloader")
        master.geometry("900x750") # Slightly larger window
        master.resizable(True, True)

        self._setup_variables()
        self._setup_styles()
        self._create_widgets()

        self.all_game_packages_data = {} # Stores all fetched game data, keyed by game_id or biz
        self.packages_to_download = [] # List to store (type, name, url, md5) for download buttons
        self.stop_download_flag = False
        self.download_queue = queue.Queue()
        self.active_download_threads = []

    def _setup_variables(self):
        """Initializes Tkinter variables for dynamic UI updates."""
        self.download_speed_var = tk.StringVar(value="ความเร็ว: N/A")
        self.time_remaining_var = tk.StringVar(value="เวลาที่เหลือ: N/A")
        self.current_file_var = tk.StringVar(value="ไฟล์ปัจจุบัน: N/A")
        self.progress_var = tk.IntVar(value=0)
        self.status_message_var = tk.StringVar(value="พร้อมใช้งาน")
        self.selected_game_var = tk.StringVar() # For Combobox selection

    def _setup_styles(self):
        """Configures ttk styles for a consistent look."""
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TFrame', background='#f0f0f0')
        style.configure('TButton', font=('Segoe UI', 10), padding=8)
        style.map('TButton', background=[('active', '#e0e0e0')])
        style.configure('TLabel', background='#f0f0f0', font=('Segoe UI', 11))
        style.configure('TProgressbar', thickness=15)
        style.configure('Status.TLabel', font=('Segoe UI', 10, 'italic'), foreground='#555555')
        style.configure('TCombobox', font=('Segoe UI', 10))

    def _create_widgets(self):
        """Creates and lays out all GUI widgets."""
        main_frame = ttk.Frame(self.master, padding=15)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # --- JSON Data Section ---
        json_frame = ttk.LabelFrame(main_frame, text="ข้อมูล Hoyoverse API", padding=10)
        json_frame.pack(fill=tk.X, pady=10)

        # Load Data Button
        ttk.Label(json_frame, text="🔄 คลิกเพื่อโหลดข้อมูลจาก Hoyoverse API:", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(0, 5))
        self.btn_load = ttk.Button(json_frame, text="โหลดข้อมูลเกมทั้งหมด", command=self._load_all_game_data)
        self.btn_load.pack(pady=5)

        # Game Selection Combobox
        game_selection_frame = ttk.Frame(json_frame)
        game_selection_frame.pack(fill=tk.X, pady=10)
        ttk.Label(game_selection_frame, text="🎮 เลือกเกมที่ต้องการ:", font=("Segoe UI", 11)).pack(side=tk.LEFT, padx=(0, 10))
        self.game_combobox = ttk.Combobox(game_selection_frame, textvariable=self.selected_game_var, state="readonly")
        self.game_combobox.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.game_combobox.bind("<<ComboboxSelected>>", self._on_game_selected)
        self.game_combobox.config(values=[]) # Initialize with empty values

        # --- Output Text Area ---
        output_frame = ttk.LabelFrame(main_frame, text="รายละเอียดข้อมูลและ Log", padding=10)
        output_frame.pack(fill=tk.BOTH, expand=True, pady=10)

        self.output_text = tk.Text(output_frame, wrap=tk.WORD, font=("Consolas", 10), height=15,
                                   bg="#ffffff", fg="#333333", relief=tk.FLAT, padx=5, pady=5)
        self.output_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(output_frame, command=self.output_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.output_text.config(yscrollcommand=scrollbar.set)

        # --- Download Progress and Controls Section ---
        download_frame = ttk.LabelFrame(main_frame, text="สถานะการดาวน์โหลด", padding=10)
        download_frame.pack(fill=tk.X, pady=10)

        ttk.Label(download_frame, textvariable=self.current_file_var, font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(0, 5))

        self.progress_bar = ttk.Progressbar(download_frame, orient='horizontal', mode='determinate', variable=self.progress_var)
        self.progress_bar.pack(fill=tk.X, pady=5)

        status_labels_frame = ttk.Frame(download_frame)
        status_labels_frame.pack(fill=tk.X, pady=(0, 5))
        ttk.Label(status_labels_frame, textvariable=self.download_speed_var, font=("Segoe UI", 10)).pack(side=tk.LEFT, expand=True, anchor="w")
        ttk.Label(status_labels_frame, textvariable=self.time_remaining_var, font=("Segoe UI", 10)).pack(side=tk.RIGHT, expand=True, anchor="e")

        # --- Control Buttons ---
        button_frame = ttk.Frame(download_frame)
        button_frame.pack(pady=5)

        self.btn_stop = ttk.Button(button_frame, text="⏸️ หยุดดาวน์โหลด", command=self._stop_download, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.LEFT, padx=5)

        self.btn_copy = ttk.Button(button_frame, text="📋 คัดลอกข้อความ", command=self._copy_text)
        self.btn_copy.pack(side=tk.LEFT, padx=5)

        # --- Dynamic Download Buttons Container ---
        self.dynamic_buttons_frame = ttk.LabelFrame(main_frame, text="เลือกแพ็คเกจดาวน์โหลด", padding=10)
        self.dynamic_buttons_frame.pack(fill=tk.X, pady=10)
        self.dynamic_buttons_canvas = tk.Canvas(self.dynamic_buttons_frame, borderwidth=0, background="#f0f0f0")
        self.dynamic_buttons_scrollframe = ttk.Frame(self.dynamic_buttons_canvas)
        self.dynamic_buttons_scrollbar = ttk.Scrollbar(self.dynamic_buttons_frame, orient="vertical", command=self.dynamic_buttons_canvas.yview)
        self.dynamic_buttons_canvas.configure(yscrollcommand=self.dynamic_buttons_scrollbar.set)

        self.dynamic_buttons_scrollbar.pack(side="right", fill="y")
        self.dynamic_buttons_canvas.pack(side="left", fill="both", expand=True)
        self.dynamic_buttons_canvas.create_window((0, 0), window=self.dynamic_buttons_scrollframe, anchor="nw", tags="self.dynamic_buttons_scrollframe")

        self.dynamic_buttons_scrollframe.bind("<Configure>", lambda e: self.dynamic_buttons_canvas.configure(scrollregion=self.dynamic_buttons_canvas.bbox("all")))
        self.dynamic_buttons_canvas.bind_all("<MouseWheel>", self._on_mousewheel)


        # --- Global Status Message ---
        ttk.Label(main_frame, textvariable=self.status_message_var, style='Status.TLabel').pack(fill=tk.X, pady=(5, 0))

    def _on_mousewheel(self, event):
        self.dynamic_buttons_canvas.yview_scroll(int(-1*(event.delta/120)), "units")

    def _update_status(self, message, log_level=logging.INFO):
        """Updates the status message in the GUI and logs it."""
        self.status_message_var.set(message)
        self.output_text.insert(tk.END, f"{message}\n")
        self.output_text.see(tk.END)
        if log_level == logging.INFO:
            logging.info(message)
        elif log_level == logging.WARNING:
            logging.warning(message)
        elif log_level == logging.ERROR:
            logging.error(message)

    def _fetch_all_game_data(self):
        """Fetches all game package data from the predefined Hoyoverse API URL."""
        self.output_text.delete(1.0, tk.END)
        self._update_status("🔄 กำลังดึงข้อมูลเกมทั้งหมดจาก Hoyoverse API...", logging.INFO)
        self.all_game_packages_data.clear() # Clear previous data
        self.packages_to_download.clear() # Clear previous packages
        self.game_combobox.set('') # Clear combobox selection
        self.game_combobox.config(values=[]) # Clear combobox options

        # Clear dynamic buttons
        for widget in self.dynamic_buttons_scrollframe.winfo_children():
            widget.destroy()

        try:
            response = requests.get(FULL_HOYO_API_URL, timeout=DOWNLOAD_TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("retcode") != 0:
                raise Exception(data.get("message", "Unknown API error"))

            game_packages = data.get("data", {}).get("game_packages", [])
            if not game_packages:
                self._update_status("⚠️ ไม่พบข้อมูลแพ็คเกจใน Hoyoverse API", logging.WARNING)
                return None

            # Store data keyed by game name (biz) for easy lookup
            game_names = []
            for gp in game_packages:
                biz = gp.get("game", {}).get("biz", "Unknown Game")
                self.all_game_packages_data[biz] = gp
                game_names.append(biz)

            self.master.after(0, lambda: self.game_combobox.config(values=sorted(game_names)))
            if game_names:
                self.master.after(0, lambda: self.game_combobox.set(sorted(game_names)[0])) # Select first game by default
                self.master.after(0, lambda: self._on_game_selected(None)) # Trigger display for the first game

            self._update_status("✅ ดึงข้อมูลเกมทั้งหมดจาก Hoyoverse API สำเร็จ", logging.INFO)
            return game_packages

        except requests.exceptions.Timeout:
            self._update_status("❌ ดึงข้อมูลล้มเหลว: หมดเวลาการเชื่อมต่อ (Timeout)", logging.ERROR)
        except requests.exceptions.RequestException as e:
            self._update_status(f"❌ ดึงข้อมูลล้มเหลว: ข้อผิดพลาดในการเชื่อมต่อหรือ HTTP: {e}", logging.ERROR)
        except ValueError as e:
            self._update_status(f"❌ ดึงข้อมูลล้มเหลว: ข้อมูล JSON ไม่ถูกต้อง: {e}", logging.ERROR)
        except Exception as e:
            self._update_status(f"❌ ดึงข้อมูลล้มเหลว: ข้อผิดพลาดที่ไม่คาดคิด: {e}", logging.ERROR)
        return None

    def _load_all_game_data(self):
        """Wrapper to fetch all JSON data in a thread."""
        self.btn_load.config(state=tk.DISABLED)
        threading.Thread(target=self._fetch_all_game_data, daemon=True).start()
        self.master.after(0, lambda: self.btn_load.config(state=tk.NORMAL))

    def _on_game_selected(self, event):
        """Called when a game is selected from the combobox."""
        selected_biz = self.selected_game_var.get()
        if selected_biz and selected_biz in self.all_game_packages_data:
            selected_game_data = self.all_game_packages_data[selected_biz]
            self._display_single_game_packages(selected_game_data)
        else:
            self.output_text.delete(1.0, tk.END)
            self.output_text.insert(tk.END, "⚠️ กรุณาเลือกเกมที่ถูกต้อง\n")
            # Clear dynamic buttons
            for widget in self.dynamic_buttons_scrollframe.winfo_children():
                widget.destroy()
            self.packages_to_download.clear()


    def _display_single_game_packages(self, gp):
        """แสดงข้อมูลแพ็คเกจเกมและสร้างปุ่มดาวน์โหลด"""
        self.output_text.delete(1.0, tk.END)
        self.packages_to_download.clear()  # เคลียร์รายการดาวน์โหลดเดิม

        # เคลียร์ปุ่มดาวน์โหลดเดิม
        for widget in self.dynamic_buttons_scrollframe.winfo_children():
            widget.destroy()

        # กำหนด style ของข้อความ
        self.output_text.tag_configure("subtitle", font=("Arial", 14, "bold"))
        self.output_text.tag_configure("section", font=("Arial", 12, "bold"))
        self.output_text.tag_configure("normal", font=("Arial", 10))
        self.output_text.tag_configure("url", foreground="blue", underline=True)

        game_id = gp.get("game", {}).get("id", "N/A")
        biz = gp.get("game", {}).get("biz", "N/A")
        self.output_text.insert(tk.END, f"🎮 เกม: {biz} ({game_id})\n", "subtitle")

        main = gp.get("main", {})
        major = main.get("major", {})
        version = major.get("version", "N/A")
        self.output_text.insert(tk.END, f"🔖 เวอร์ชันหลัก: {version}\n\n", "section")

        # แสดงแพ็คเกจหลัก (major)
        game_pkgs = major.get("game_pkgs", [])
        audio_pkgs = major.get("audio_pkgs", [])

        if game_pkgs:
            self.output_text.insert(tk.END, "📦 แพ็คเกจเกมหลัก:\n", "section")
            for i, pkg in enumerate(game_pkgs, 1):
                size_gb = int(pkg.get("size", "0")) / (1024**3)
                md5 = pkg.get("md5", "N/A")
                url = pkg.get("url", "")
                self.output_text.insert(tk.END, f"  {i}. ขนาด: {size_gb:.2f} GB | MD5: {md5}\n", "normal")
                self.output_text.insert(tk.END, "     URL: ", "normal")
                self.output_text.insert(tk.END, f"{url}\n", "url")
                self.packages_to_download.append(("GamePkg", f"{biz} v{version} part {i}", url, md5))
            self.output_text.insert(tk.END, "\n")

        if audio_pkgs:
            self.output_text.insert(tk.END, "🔊 แพ็คเกจเสียง:\n", "section")
            for i, pkg in enumerate(audio_pkgs, 1):
                lang = pkg.get("language", "N/A")
                size_gb = int(pkg.get("size", "0")) / (1024**3)
                md5 = pkg.get("md5", "N/A")
                url = pkg.get("url", "")
                self.output_text.insert(tk.END, f"  {i}. ภาษา: {lang} | ขนาด: {size_gb:.2f} GB | MD5: {md5}\n", "normal")
                self.output_text.insert(tk.END, "     URL: ", "normal")
                self.output_text.insert(tk.END, f"{url}\n", "url")
                self.packages_to_download.append(("AudioPkg", f"{biz} v{version} audio {lang}", url, md5))
            self.output_text.insert(tk.END, "\n")

        main = gp.get("main", {})
        print("DEBUG main keys:", main.keys())  # ดูว่ามี pre_download หรือไม่
        pre_download = main.get("pre_download", None)
        print("DEBUG pre_download:", pre_download)

        # แสดงแพ็คเกจ pre_download
        pre_download = main.get("pre_download", {})
        if pre_download:
            self.output_text.insert(tk.END, "📦 แพ็คเกจดาวน์โหลดล่วงหน้า:\n", "section")
            pre_download_game_pkgs = pre_download.get("game_pkgs", [])
            pre_download_audio_pkgs = pre_download.get("audio_pkgs", [])

            if pre_download_game_pkgs:
                self.output_text.insert(tk.END, "  - แพ็คเกจเกมหลัก (Pre-download):\n", "section")
                for i, pkg in enumerate(pre_download_game_pkgs, 1):
                    size_gb = int(pkg.get("size", "0")) / (1024**3)
                    md5 = pkg.get("md5", "N/A")
                    url = pkg.get("url", "")
                    self.output_text.insert(tk.END, f"    {i}. ขนาด: {size_gb:.2f} GB | MD5: {md5}\n", "normal")
                    self.output_text.insert(tk.END, "       URL: ", "normal")
                    self.output_text.insert(tk.END, f"{url}\n", "url")
                    self.packages_to_download.append(("PreGamePkg", f"{biz} v{version} pre-download part {i}", url, md5))
                self.output_text.insert(tk.END, "\n")

            if pre_download_audio_pkgs:
                self.output_text.insert(tk.END, "  - แพ็คเกจเสียง (Pre-download):\n", "section")
                for i, pkg in enumerate(pre_download_audio_pkgs, 1):
                    lang = pkg.get("language", "N/A")
                    size_gb = int(pkg.get("size", "0")) / (1024**3)
                    md5 = pkg.get("md5", "N/A")
                    url = pkg.get("url", "")
                    self.output_text.insert(tk.END, f"    {i}. ภาษา: {lang} | ขนาด: {size_gb:.2f} GB | MD5: {md5}\n", "normal")
                    self.output_text.insert(tk.END, "       URL: ", "normal")
                    self.output_text.insert(tk.END, f"{url}\n", "url")
                    self.packages_to_download.append(("PreAudioPkg", f"{biz} v{version} pre-download audio {lang}", url, md5))
                self.output_text.insert(tk.END, "\n")

        self.output_text.insert(tk.END, "🔽 คลิกปุ่มด้านล่างเพื่อดาวน์โหลดไฟล์แต่ละแพ็คเกจ\n\n", "section")

        # สร้างปุ่มดาวน์โหลดแบบไดนามิก
        for ptype, pname, url, md5 in self.packages_to_download:
            btn = ttk.Button(self.dynamic_buttons_scrollframe, text=f"⬇️ ดาวน์โหลด {ptype}: {pname}",
                             command=lambda u=url, m=md5, n=pname: self._start_single_download(u, m, n))
            btn.pack(pady=2, anchor='w', fill=tk.X)

        self._update_status(f"ข้อมูลแพ็คเกจสำหรับ {biz} พร้อมใช้งาน", logging.INFO)

    def _start_single_download(self, url, md5_checksum, package_name):
        """Initiates a single file download process."""
        if self.stop_download_flag:
            messagebox.showwarning("Warning", "กำลังหยุดดาวน์โหลด ไม่สามารถเริ่มใหม่ได้")
            return

        initial_file_name = url.split("/")[-1]
        # Suggest a more descriptive file name
        suggested_file_name = f"{package_name.replace(' ', '_').replace(':', '')}_{initial_file_name}"

        save_path = filedialog.asksaveasfilename(defaultextension=".zip",
                                                 initialfile=suggested_file_name,
                                                 filetypes=[("ZIP files", "*.zip"), ("All files", "*.*")])
        if not save_path:
            self._update_status("การดาวน์โหลดถูกยกเลิกโดยผู้ใช้", logging.INFO)
            return

        self.stop_download_flag = False
        self.progress_var.set(0)
        self.download_speed_var.set("ความเร็ว: 0 KB/s")
        self.time_remaining_var.set("เวลาที่เหลือ: N/A")
        self.current_file_var.set(f"ไฟล์ปัจจุบัน: {os.path.basename(save_path)}")

        # Disable all download buttons and load button
        for widget in self.dynamic_buttons_scrollframe.winfo_children():
            widget.config(state=tk.DISABLED)
        self.btn_load.config(state=tk.DISABLED)
        self.game_combobox.config(state=tk.DISABLED) # Disable combobox during download
        self.btn_stop.config(state=tk.NORMAL)

        self.download_queue.put((url, save_path, md5_checksum))
        self._update_status(f"⬇️ เพิ่มไฟล์ {os.path.basename(save_path)} ลงในคิว", logging.INFO)

        t = threading.Thread(target=self._process_download_queue, daemon=True)
        self.active_download_threads.append(t)
        t.start()

    def _process_download_queue(self):
        """Processes items in the download queue."""
        while not self.download_queue.empty():
            url, path, md5_checksum = self.download_queue.get()
            self._download_file(url, path, md5_checksum)
            self.download_queue.task_done()

        # Re-enable buttons after all downloads in queue are done
        self.master.after(100, lambda: self.btn_load.config(state=tk.NORMAL))
        self.master.after(100, lambda: self.btn_stop.config(state=tk.DISABLED))
        self.master.after(100, lambda: self.game_combobox.config(state="readonly")) # Re-enable combobox
        self.master.after(100, lambda: self.current_file_var.set("ไฟล์ปัจจุบัน: ไม่มี"))
        self.master.after(100, lambda: self.status_message_var.set("พร้อมใช้งาน"))
        # Re-enable dynamic download buttons
        self.master.after(100, lambda: [widget.config(state=tk.NORMAL) for widget in self.dynamic_buttons_scrollframe.winfo_children()])
        self._update_status("คิวการดาวน์โหลดเสร็จสิ้น", logging.INFO)

    def _download_file(self, url, path, md5_checksum):
        """Downloads a single file with progress, speed, and MD5 verification."""
        self._update_status(f"⬇️ กำลังดาวน์โหลดไฟล์: {os.path.basename(path)}", logging.INFO)

        try:
            with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT) as r:
                r.raise_for_status()
                total_length = int(r.headers.get('content-length', 0))
                downloaded = 0
                start_time = time.time()
                last_update_time = time.time()
                last_downloaded = 0
                hasher = hashlib.md5()

                with open(path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if self.stop_download_flag:
                            self._update_status("⏸️ ดาวน์โหลดถูกยกเลิกโดยผู้ใช้", logging.INFO)
                            if os.path.exists(path):
                                os.remove(path)
                                self._update_status(f"ลบไฟล์ที่ดาวน์โหลดบางส่วน: {os.path.basename(path)}", logging.INFO)
                            return

                        if chunk:
                            f.write(chunk)
                            hasher.update(chunk)
                            downloaded += len(chunk)

                            current_time = time.time()
                            if current_time - last_update_time >= 0.5: # Update every 0.5 seconds
                                speed = (downloaded - last_downloaded) / (current_time - last_update_time) # bytes/sec
                                speed_kbps = speed / 1024
                                self.download_speed_var.set(f"ความเร็ว: {speed_kbps:.2f} KB/s")

                                if total_length > 0 and speed > 0:
                                    remaining_bytes = total_length - downloaded
                                    time_left_seconds = remaining_bytes / speed
                                    # Use timedelta for better formatting
                                    td = timedelta(seconds=int(time_left_seconds))
                                    self.time_remaining_var.set(f"เวลาที่เหลือ: {str(td)}")
                                else:
                                    self.time_remaining_var.set("เวลาที่เหลือ: คำนวณ...")

                                last_update_time = current_time
                                last_downloaded = downloaded

                            if total_length > 0:
                                percent = int(downloaded * 100 / total_length)
                                self.progress_var.set(percent)
                            else:
                                self.progress_var.set(0)
                            self.master.update_idletasks()

            self._update_status(f"✅ ดาวน์โหลดเสร็จสิ้น: {os.path.basename(path)}", logging.INFO)

            # MD5 Verification
            if md5_checksum and md5_checksum != "N/A": # Check if MD5 is provided
                calculated_md5 = hasher.hexdigest()
                self._update_status(f"🔍 กำลังตรวจสอบ MD5...", logging.INFO)
                if calculated_md5.lower() == md5_checksum.lower(): # Case-insensitive comparison
                    self._update_status(f"✅ ตรวจสอบ MD5 สำเร็จ! ไฟล์สมบูรณ์", logging.INFO)
                    messagebox.showinfo("ดาวน์โหลดเสร็จสิ้น", f"ดาวน์โหลดไฟล์เสร็จสิ้นและตรวจสอบ MD5 สำเร็จ:\n{path}")
                else:
                    self._update_status(f"❌ ตรวจสอบ MD5 ล้มเหลว! ไฟล์อาจเสียหาย", logging.WARNING)
                    messagebox.showwarning("ดาวน์โหลดเสร็จสิ้น (MD5 ไม่ตรง)", f"ดาวน์โหลดไฟล์เสร็จสิ้น แต่ MD5 ไม่ตรงกัน:\nไฟล์: {path}\nMD5 ที่คาดหวัง: {md5_checksum}\nMD5 ที่คำนวณได้: {calculated_md5}\nไฟล์อาจเสียหาย!")
            else:
                messagebox.showinfo("ดาวน์โหลดเสร็จสิ้น", f"ดาวน์โหลดไฟล์เสร็จสิ้น:\n{path}\n(ไม่มี MD5 ให้ตรวจสอบ)")
                self._update_status(f"ดาวน์โหลดเสร็จสิ้น: {os.path.basename(path)} (ไม่มี MD5 ให้ตรวจสอบ)", logging.INFO)

        except requests.exceptions.RequestException as e:
            self._update_status(f"❌ ดาวน์โหลดไฟล์ล้มเหลว: ข้อผิดพลาดในการเชื่อมต่อหรือ HTTP: {e}", logging.ERROR)
            messagebox.showerror("Error", f"ดาวน์โหลดไฟล์ล้มเหลว: {e}")
        except IOError as e:
            self._update_status(f"❌ ดาวน์โหลดไฟล์ล้มเหลว: ข้อผิดพลาดในการเขียนไฟล์: {e}", logging.ERROR)
            messagebox.showerror("Error", f"ดาวน์โหลดไฟล์ล้มเหลว: {e}")
        except Exception as e:
            self._update_status(f"❌ ดาวน์โหลดไฟล์ล้มเหลว: ข้อผิดพลาดที่ไม่คาดคิด: {e}", logging.ERROR)
            messagebox.showerror("Error", f"ดาวน์โหลดไฟล์ล้มเหลว: {e}")
        finally:
            self.progress_var.set(0)
            self.download_speed_var.set("ความเร็ว: N/A")
            self.time_remaining_var.set("เวลาที่เหลือ: N/A")

    def _copy_text(self):
        """Copies the content of the output text widget to the clipboard."""
        text = self.output_text.get(1.0, tk.END)
        self.master.clipboard_clear()
        self.master.clipboard_append(text)
        messagebox.showinfo("คัดลอกข้อความ", "คัดลอกข้อความไปยังคลิปบอร์ดเรียบร้อยแล้ว")
        self._update_status("คัดลอกข้อความไปยังคลิปบอร์ด", logging.INFO)

    def _stop_download(self):
        """Sets the flag to stop the current download."""
        if messagebox.askyesno("ยืนยัน", "ต้องการหยุดดาวน์โหลดหรือไม่? ไฟล์ที่ดาวน์โหลดไปแล้วจะถูกลบ"):
            self.stop_download_flag = True
            self.btn_stop.config(state=tk.DISABLED)
            self._update_status("คำขอหยุดดาวน์โหลดถูกส่งแล้ว...", logging.INFO)

if __name__ == "__main__":
    root = tk.Tk()
    app = HoyoAPIViewerApp(root)
    root.mainloop()
