import os
import json

# Get files exactly as Python sees them
images_folder = 'images'
files = sorted([f for f in os.listdir(images_folder) if f.lower().endswith('.jpg')])

# Write debug info
with open('debug.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total files: {len(files)}\n\n")
    
    # Write all files
    for i, file in enumerate(files, 1):
        f.write(f"{i}: {file}\n")
    
    # Highlight files with 'titre'
    f.write("\n\n=== FILES WITH 'titre' ===\n")
    titre_files = [file for file in files if 'titre' in file.lower()]
    for file in titre_files:
        f.write(f"  {file}\n")

print("Debug file created")
