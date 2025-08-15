import os
import subprocess
import json
import customtkinter as ctk
from tkinter import filedialog, messagebox

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")
# Initialize global variables
game_folder = None

# Create the customtkinter window
app = ctk.CTk()
app.title("HSR HDiff Tool")
app.geometry("335x470")
app.resizable(False, False)
current_dir = os.path.dirname(os.path.abspath(__file__))
app.iconbitmap(os.path.join(current_dir, 'image.ico'))
app.grid_columnconfigure((0), weight=1)

# Set appearance mode and theme


# Main frame for better organization
main_frame = ctk.CTkFrame(app)
main_frame.pack(fill=ctk.BOTH, expand=True)

# Folder selection button with modern style
folder_button = ctk.CTkButton(main_frame, text="Select Game Folder", command=lambda: select_folder(), width=300, anchor='center')
folder_button.grid(row=0, column=0, padx=20, pady=20, sticky="ew", columnspan=10)

# Folder label to display selected folder
folder_label = ctk.CTkLabel(main_frame, text="No folder selected", width=200, anchor="center", text_color="gray")
folder_label.grid(row=1, column=0, padx=20, pady=20, sticky="ew", columnspan=2)

# Apply Patch button with modern style
apply_button = ctk.CTkButton(main_frame, text="Apply Patch", command=lambda: apply_patch_action(), state=ctk.DISABLED, width=300, anchor='center')
apply_button.grid(row=2, column=0, padx=10, pady=10)

# Output text area with scroll functionality
output_frame = ctk.CTkFrame(main_frame, width=300)
output_frame.grid(row=3, column=0, padx=10, pady=5)

output_text = ctk.CTkTextbox(output_frame, height=8, width=300)
output_text.grid(row=0, column=0, sticky="nsew")

# Scrollbar for the text area
scrollbar = ctk.CTkScrollbar(output_frame, command=output_text.yview)
scrollbar.grid(row=0, column=1, sticky="ns")

output_text.configure(yscrollcommand=scrollbar.set, state=ctk.DISABLED)

# Progress bar
progress_label = ctk.CTkLabel(main_frame, text="Progress", width=300, anchor='center')
progress_label.grid(row=4, column=0, padx=10)

progress_bar = ctk.CTkProgressBar(main_frame, orientation="horizontal")
progress_bar.grid(row=5, column=0, pady=10)
progress_bar.set(0)

def select_folder():
    """Select a folder to set as the game folder."""
    global game_folder
    folder_path = filedialog.askdirectory()
    if folder_path:
        game_folder = folder_path
        folder_label.configure(text=f"Selected Folder: {folder_path}")
        apply_button.configure(state=ctk.NORMAL)
    else:
        messagebox.showwarning("Warning", "No folder selected.")
        apply_button.configure(state=ctk.DISABLED)

def apply_patch_action():
    """Apply patch to the selected game folder."""
    if not game_folder:
        messagebox.showwarning("Warning", "Please select a game folder!")
        return
    apply_patch(game_folder)

def apply_patch(game_folder):
    """Main function to apply patch based on selected folder."""
    folder_button.configure(state=ctk.DISABLED)
    delete_files_path = os.path.join(game_folder, 'deletefiles.txt')
    if not os.path.exists(delete_files_path):
        folder_button.configure(state=ctk.NORMAL)
        log_output('deletefiles.txt does not exist in the game directory!')
        return

    hdiff_map_path = os.path.join(game_folder, 'hdiffmap.json')
    if not os.path.exists(hdiff_map_path):
        folder_button.configure(state=ctk.NORMAL)
        log_output('hdiffmap.json does not exist in the game directory!')
        return

    # Read deletefiles.txt and delete the specified files
    with open(delete_files_path, 'r') as delete_files:
        for file in delete_files.read().split('\n'):
            if len(file) < 1:
                continue
            file_path = os.path.join(game_folder, file)
            if os.path.exists(file_path):
                log_output(f'Deleting {file_path}')
                os.remove(file_path)

    # Check if hpatchz is available in the system path
    hzpatchz = os.path.join(current_dir, 'hpatchz.exe')
    if not os.path.exists(hzpatchz):
        folder_button.configure(state=ctk.NORMAL)
        log_output(f"HDiffPatch not found in the current directory ({current_dir})!\nPlease make sure hpatchz.exe is in the same folder as the script.")
        return

    # Read hdiffmap.json
    with open(hdiff_map_path, 'r') as hdiff_json:
        data = json.load(hdiff_json)

    total_patches = len(data['diff_map'])
    progress_bar.set(0)

    # Apply patches
    for i, entry in enumerate(data['diff_map']):
        source_file_name = os.path.join(game_folder, entry['source_file_name'])
        patch_file_name = os.path.join(game_folder, entry['patch_file_name'])
        target_file_name = os.path.join(game_folder, entry['target_file_name'])

        # Check if files exist
        if not os.path.exists(source_file_name):
            log_output(f"Source file missing: {source_file_name}")
            continue
        if not os.path.exists(patch_file_name):
            log_output(f"Patch file missing: {patch_file_name}")
            continue

        log_output(f"Applying patch: {patch_file_name} -> {target_file_name} using {source_file_name}")
        subprocess.run([hzpatchz, source_file_name, patch_file_name, target_file_name])

        # Update progress bar
        progress_percentage = float((i + 1) / total_patches)
        progress_bar.set(progress_percentage)
        app.update_idletasks()

    log_output("Patch application complete.")

    folder_button.configure(state=ctk.NORMAL)

def log_output(message):
    """Log the output in the Text widget."""
    output_text.configure(state=ctk.NORMAL)
    output_text.insert(ctk.END, message + "\n\n")
    output_text.yview(ctk.END)
    output_text.configure(state=ctk.DISABLED)

app.mainloop()
