#!/usr/bin/env python3
"""
Auto-Ingestion Setup Script
===========================

Sets up the auto-ingestion pipeline with proper directory structure,
permissions, and configuration.
"""

import os
import sys
import stat
import shutil
from pathlib import Path

def setup_directories():
    """Create necessary directories for auto-ingestion"""
    directories = [
        "docs",           # Source documents
        "staging",        # Temporary processing files
        "logs",           # Log files
        "completed",      # Successfully processed documents
        "failed",         # Failed processing attempts
        "archive"         # Archived submissions
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")

def setup_permissions():
    """Set up proper file permissions for scripts"""
    scripts = [
        "cron_auto_ingest.sh",
        "cron_auto_ingest.bat"
    ]
    
    for script in scripts:
        script_path = Path(script)
        if script_path.exists():
            # Make executable on Unix systems
            if os.name != 'nt':
                script_path.chmod(script_path.stat().st_mode | stat.S_IEXEC)
            print(f"✅ Set permissions for: {script}")

def create_sample_config():
    """Create sample configuration files"""
    
    # Sample .env file
    env_content = """# VOFC Engine Environment Configuration
# ======================================

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# Processing Configuration
MAX_FILE_SIZE_MB=50
SUPPORTED_FORMATS=pdf,docx,txt,html
CLEANUP_DAYS=7

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(levelname)s - %(message)s

# Email Notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
NOTIFICATION_EMAIL=admin@vofc.gov
"""
    
    env_file = Path(".env.sample")
    env_file.write_text(env_content)
    print("✅ Created sample .env file")
    
    # Sample crontab entry
    crontab_content = """# VOFC Auto-Ingestion Cron Jobs
# =============================
# 
# Add these lines to your crontab with: crontab -e
# 
# Run every hour
0 * * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh
# 
# Run every 6 hours (alternative)
# 0 */6 * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh
# 
# Run daily at 2 AM (alternative)
# 0 2 * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh
"""
    
    crontab_file = Path("crontab.sample")
    crontab_file.write_text(crontab_content)
    print("✅ Created sample crontab file")

def create_docs_readme():
    """Create README for docs directory"""
    readme_content = """# Documents Directory
# ==================

This directory contains documents to be automatically processed by the VOFC Engine.

## Supported Formats
- PDF files (.pdf)
- Word documents (.docx)
- Text files (.txt)
- HTML files (.html)

## Processing
Documents in this directory are automatically processed by the auto-ingestion pipeline:
1. Metadata extraction
2. Content parsing
3. AI normalization
4. Staging for review

## File Management
- Processed files are moved to `completed/` directory
- Failed files are moved to `failed/` directory
- Original files are preserved until manual cleanup

## Adding Documents
Simply copy or move your documents into this directory. The pipeline will detect and process them automatically.
"""
    
    docs_readme = Path("docs/README.md")
    docs_readme.write_text(readme_content)
    print("✅ Created docs/README.md")

def create_test_document():
    """Create a sample test document"""
    test_content = """# Sample Security Guidance Document

## Perimeter Security Vulnerabilities

### Vulnerability: Uncontrolled Vehicle Access
The facility lacks proper vehicle access control points, allowing unauthorized vehicles to approach critical infrastructure.

**Option for Consideration:**
Establish layered vehicle access control zones with:
- Primary checkpoint at facility entrance
- Secondary checkpoint for high-security areas
- Vehicle inspection protocols
- Visitor registration system

**Citations:**
- CISA Security Guidelines 2023
- NIST Cybersecurity Framework
- Facility Security Assessment Report

### Vulnerability: Inadequate Lighting
Poor lighting conditions create security blind spots around the perimeter.

**Option for Consideration:**
Implement comprehensive lighting strategy:
- LED perimeter lighting with motion sensors
- Backup power systems for critical areas
- Regular maintenance schedule
- Light pollution controls

**Citations:**
- Illuminating Engineering Society Standards
- Security Lighting Best Practices
- Energy Efficiency Guidelines
"""
    
    test_doc = Path("docs/sample_security_guidance.txt")
    test_doc.write_text(test_content)
    print("✅ Created sample test document")

def main():
    """Main setup function"""
    print("🚀 Setting up VOFC Auto-Ingestion Pipeline")
    print("=" * 50)
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Setup steps
    setup_directories()
    setup_permissions()
    create_sample_config()
    create_docs_readme()
    create_test_document()
    
    print("\n✅ Auto-ingestion pipeline setup complete!")
    print("\nNext steps:")
    print("1. Copy .env.sample to .env and configure your environment variables")
    print("2. Install dependencies: pip install -r requirements.txt")
    print("3. Test the pipeline: python auto_ingest.py --dry-run")
    print("4. Set up cron job using crontab.sample as reference")
    print("5. Add documents to the docs/ directory")

if __name__ == "__main__":
    main()
