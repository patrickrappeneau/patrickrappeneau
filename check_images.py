import os

images_folder = 'images'
files = sorted([f for f in os.listdir(images_folder) if f.lower().endswith('.jpg')])

print(f"Total JPG files found: {len(files)}\n")

# Show all files containing 'titre'
titre_files = [f for f in files if 'titre' in f.lower()]
print(f"Files with 'titre': {len(titre_files)}")
for f in titre_files:
    print(f"  - {f}")

# Show first and last 5
print(f"\nFirst 5 files:")
for f in files[:5]:
    print(f"  - {f}")

print(f"\nLast 5 files:") 
for f in files[-5:]:
    print(f"  - {f}")
