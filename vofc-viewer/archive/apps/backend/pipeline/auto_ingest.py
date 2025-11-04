#!/usr/bin/env python3
"""
Auto Ingestion Pipeline
======================

Automatically processes documents from the docs/ folder and stages them for review.
This script can be run as a cron job (hourly/daily) to process new documents.

Usage:
    python auto_ingest.py [--path docs] [--dry-run]

Features:
    - Monitors docs/ folder for new PDF files
    - Extracts metadata and parses content
    - Normalizes records using AI
    - Stages submissions for admin review
    - Validates data before staging
    - Logs all processing steps
"""

import os
import sys
import json
import uuid
import datetime
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.universal_parser import parse_document
from parsers.citation_extractor import extract_metadata
from ai.normalize_universal import normalize_records
from supabase import create_client
from jsonschema import validate, ValidationError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/auto_ingest.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# VOFC Schema for validation
VOFC_SCHEMA = {
    "type": "object",
    "required": ["id", "status", "created_at", "source", "entries"],
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "status": {"type": "string", "enum": ["pending_review", "approved", "rejected"]},
        "created_at": {"type": "string", "format": "date-time"},
        "source": {
            "type": "object",
            "required": ["title", "source_type"],
            "properties": {
                "title": {"type": "string", "minLength": 1},
                "authors": {"type": "array", "items": {"type": "string"}},
                "year": {"type": "string"},
                "source_type": {"type": "string", "enum": ["Government", "Academic", "Corporate", "Field", "Media", "Unknown"]},
                "source_url": {"type": "string"},
                "source_confidence": {"type": "number", "minimum": 0, "maximum": 1}
            }
        },
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["vulnerability", "ofc", "category", "sector", "subsector"],
                "properties": {
                    "vulnerability": {"type": "string", "minLength": 1},
                    "ofc": {"type": "string", "minLength": 1},
                    "category": {"type": "string", "minLength": 1},
                    "sector": {"type": "string", "minLength": 1},
                    "subsector": {"type": "string", "minLength": 1},
                    "citations": {"type": "array", "items": {"type": "string"}}
                }
            }
        }
    }
}

class AutoIngestPipeline:
    """Automated document ingestion pipeline"""
    
    def __init__(self, docs_path: str = "docs", dry_run: bool = False):
        self.docs_path = Path(docs_path)
        self.dry_run = dry_run
        self.staging_path = Path("staging")
        self.logs_path = Path("logs")
        
        # Ensure directories exist
        self.staging_path.mkdir(exist_ok=True)
        self.logs_path.mkdir(exist_ok=True)
        
        # Initialize Supabase client
        if not dry_run:
            try:
                self.supabase = create_client(
                    os.getenv("SUPABASE_URL"),
                    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                )
                logger.info("✅ Supabase client initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase: {e}")
                sys.exit(1)
        else:
            self.supabase = None
            logger.info("🔍 Running in dry-run mode")
    
    def validate_package(self, package: Dict) -> bool:
        """Validate submission package against schema"""
        try:
            validate(instance=package, schema=VOFC_SCHEMA)
            logger.info("✅ Package validation passed")
            return True
        except ValidationError as e:
            logger.error(f"❌ Package validation failed: {e.message}")
            return False
        except Exception as e:
            logger.error(f"❌ Validation error: {e}")
            return False
    
    def process_document(self, file_path: Path) -> Optional[Dict]:
        """Process a single document through the pipeline"""
        logger.info(f"📄 Processing: {file_path.name}")
        
        try:
            # Step 1: Extract metadata
            logger.info("🔍 Extracting metadata...")
            meta = extract_metadata(file_path)
            logger.info(f"📋 Metadata: {meta.get('title', 'Unknown')}")
            
            # Step 2: Parse document content
            logger.info("📖 Parsing document content...")
            parsed = parse_document(str(file_path), meta.get("title", "Unknown Document"))
            
            if not parsed or not parsed.get("entries"):
                logger.warning(f"⚠️ No content extracted from {file_path.name}")
                return None
            
            # Step 3: Save parsed content
            parsed_file = self.staging_path / f"parsed_{file_path.stem}.json"
            parsed_file.write_text(json.dumps(parsed, indent=2))
            logger.info(f"💾 Parsed content saved to {parsed_file}")
            
            # Step 4: Normalize records using AI
            logger.info("🤖 Normalizing records with AI...")
            normalized = normalize_records(str(parsed_file))
            
            if not normalized:
                logger.warning(f"⚠️ No normalized records from {file_path.name}")
                return None
            
            # Step 5: Create submission package
            package = {
                "id": str(uuid.uuid4()),
                "status": "pending_review",
                "created_at": datetime.datetime.utcnow().isoformat(),
                "source": meta,
                "entries": normalized
            }
            
            # Step 6: Validate package
            if not self.validate_package(package):
                logger.error(f"❌ Package validation failed for {file_path.name}")
                return None
            
            # Step 7: Stage submission
            if not self.dry_run:
                logger.info("📤 Staging submission in database...")
                result = self.supabase.table("vofc_submissions").insert({
                    "data": package
                }).execute()
                
                if result.data:
                    logger.info(f"✅ Submission staged successfully: {package['id']}")
                else:
                    logger.error(f"❌ Failed to stage submission: {result}")
                    return None
            else:
                logger.info("🔍 [DRY RUN] Would stage submission:")
                logger.info(f"   ID: {package['id']}")
                logger.info(f"   Title: {package['source']['title']}")
                logger.info(f"   Entries: {len(package['entries'])}")
            
            return package
            
        except Exception as e:
            logger.error(f"❌ Error processing {file_path.name}: {e}")
            return None
    
    def process_new_docs(self) -> Dict[str, int]:
        """Process all new documents in the docs folder"""
        logger.info(f"🚀 Starting auto-ingestion from {self.docs_path}")
        
        # Find all PDF files
        pdf_files = list(self.docs_path.glob("*.pdf"))
        
        if not pdf_files:
            logger.info("📭 No PDF files found in docs folder")
            return {"processed": 0, "successful": 0, "failed": 0}
        
        logger.info(f"📚 Found {len(pdf_files)} PDF files to process")
        
        stats = {"processed": 0, "successful": 0, "failed": 0}
        
        for file_path in pdf_files:
            stats["processed"] += 1
            
            # Check if already processed (optional - could use file timestamps)
            processed_file = self.staging_path / f"processed_{file_path.name}.done"
            if processed_file.exists():
                logger.info(f"⏭️ Skipping {file_path.name} (already processed)")
                continue
            
            # Process the document
            result = self.process_document(file_path)
            
            if result:
                stats["successful"] += 1
                # Mark as processed
                processed_file.touch()
                logger.info(f"✅ Successfully processed {file_path.name}")
            else:
                stats["failed"] += 1
                logger.error(f"❌ Failed to process {file_path.name}")
        
        logger.info(f"📊 Processing complete: {stats}")
        return stats
    
    def cleanup_old_files(self, days: int = 7):
        """Clean up old staging files"""
        logger.info(f"🧹 Cleaning up files older than {days} days")
        
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        for file_path in self.staging_path.glob("*.json"):
            if file_path.stat().st_mtime < cutoff_date.timestamp():
                logger.info(f"🗑️ Removing old file: {file_path.name}")
                file_path.unlink()
    
    def generate_report(self, stats: Dict[str, int]) -> str:
        """Generate processing report"""
        report = f"""
Auto-Ingestion Report
====================
Timestamp: {datetime.datetime.now().isoformat()}
Mode: {'DRY RUN' if self.dry_run else 'LIVE'}
Documents Processed: {stats['processed']}
Successful: {stats['successful']}
Failed: {stats['failed']}
Success Rate: {(stats['successful'] / stats['processed'] * 100):.1f}% if stats['processed'] > 0 else 0
        """
        return report.strip()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Auto-ingest documents from docs folder")
    parser.add_argument("--path", default="docs", help="Path to documents folder")
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode")
    parser.add_argument("--cleanup", type=int, default=7, help="Cleanup files older than N days")
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = AutoIngestPipeline(docs_path=args.path, dry_run=args.dry_run)
    
    try:
        # Process documents
        stats = pipeline.process_new_docs()
        
        # Generate report
        report = pipeline.generate_report(stats)
        logger.info(report)
        
        # Cleanup old files
        if not args.dry_run:
            pipeline.cleanup_old_files(args.cleanup)
        
        # Exit with appropriate code
        if stats["failed"] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        logger.info("🛑 Process interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
