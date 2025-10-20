#!/usr/bin/env python3
"""
Clean up and organize the VOFC project structure.
"""

import os
import shutil
from pathlib import Path

def create_directories():
    """Create necessary directories."""
    directories = [
        'data/imported',
        'data/out', 
        'data/source',
        'logs',
        'src/parsers',
        'src/pipelines', 
        'src/db',
        'src/utils'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✅ Created directory: {directory}")

def move_files():
    """Move files to appropriate directories."""
    moves = [
        # Python files to scripts
        ('*.py', 'scripts/'),
        ('*.txt', 'scripts/'),
        ('*.md', 'scripts/'),
        ('*.bat', 'scripts/'),
        
        # Data files
        ('VOFC_Library.xlsx', 'data/source/'),
        
        # Keep Next.js files in root
    ]
    
    for pattern, destination in moves:
        if pattern == '*.py':
            # Move Python files
            for file in Path('.').glob('*.py'):
                if file.name != 'cleanup_project.py':
                    shutil.move(str(file), f'scripts/{file.name}')
                    print(f"✅ Moved {file.name} to scripts/")
        elif pattern == '*.txt':
            # Move text files
            for file in Path('.').glob('*.txt'):
                shutil.move(str(file), f'scripts/{file.name}')
                print(f"✅ Moved {file.name} to scripts/")
        elif pattern == '*.md':
            # Move markdown files
            for file in Path('.').glob('*.md'):
                shutil.move(str(file), f'scripts/{file.name}')
                print(f"✅ Moved {file.name} to scripts/")
        elif pattern == '*.bat':
            # Move batch files
            for file in Path('.').glob('*.bat'):
                shutil.move(str(file), f'scripts/{file.name}')
                print(f"✅ Moved {file.name} to scripts/")
        elif pattern == 'VOFC_Library.xlsx':
            # Move Excel file
            if Path('VOFC_Library.xlsx').exists():
                shutil.move('VOFC_Library.xlsx', 'data/source/')
                print("✅ Moved VOFC_Library.xlsx to data/source/")

def create_gitignore():
    """Create .gitignore file."""
    gitignore_content = """# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Next.js
.next/
out/
build/

# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log

# Data files
data/imported/
data/out/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Python
*.egg-info/
dist/
build/
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    print("✅ Created .gitignore")

def create_readme():
    """Create main README.md."""
    readme_content = """# VOFC Engine

Vulnerability and Options for Consideration Engine - A comprehensive system for processing and managing VOFC data.

## Project Structure

```
vofc-viewer/
├── pages/                    # Next.js Pages Router
├── components/              # React Components  
├── lib/                     # JavaScript Libraries
├── styles/                  # CSS Files
├── scripts/                 # Python Import Scripts
├── src/                     # Python Source Code
├── sql/                     # Database Scripts
├── data/                    # Data Files
├── logs/                    # Log Files
└── public/                  # Static Assets
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
pip install -r scripts/requirements_import.txt
```

### 2. Set Up Environment
Copy your Supabase credentials to `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Import Data
```bash
python scripts/import_vofc_simple.py
```

## Documentation

- [Import Documentation](scripts/README_IMPORT.md)
- [Project Organization](scripts/ORGANIZE_PROJECT.md)

## Features

- ✅ Complete VOFC data import system
- ✅ Text normalization and sentence expansion
- ✅ REF relationship extraction
- ✅ Supabase integration
- ✅ Admin interface
- ✅ User management
- ✅ Document processing
"""
    
    with open('README.md', 'w') as f:
        f.write(readme_content)
    print("✅ Created README.md")

def main():
    """Main cleanup function."""
    print("🧹 Cleaning up VOFC project structure...")
    print("=" * 50)
    
    create_directories()
    move_files()
    create_gitignore()
    create_readme()
    
    print("\n✅ Project cleanup complete!")
    print("\nNext steps:")
    print("1. Check the organized structure")
    print("2. Update any import paths if needed")
    print("3. Test the import scripts")

if __name__ == "__main__":
    main()


