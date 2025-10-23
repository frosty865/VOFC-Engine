#!/usr/bin/env python3
"""
Shared utilities for VOFC processing pipeline
Common helper functions and utilities
"""

import json
import os
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import logging

def setup_logging(log_file: str = "logs/pipeline.log") -> logging.Logger:
    """Setup logging for the pipeline"""
    Path("logs").mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger("vofc_pipeline")

def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA-256 hash of a file"""
    hash_sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    except Exception as e:
        raise Exception(f"Failed to calculate file hash: {str(e)}")

def ensure_directory_exists(directory: str) -> None:
    """Ensure directory exists, create if it doesn't"""
    Path(directory).mkdir(parents=True, exist_ok=True)

def save_json_data(data: Dict[str, Any], file_path: str) -> None:
    """Save data to JSON file with proper error handling"""
    try:
        ensure_directory_exists(str(Path(file_path).parent))
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise Exception(f"Failed to save JSON data: {str(e)}")

def load_json_data(file_path: str) -> Dict[str, Any]:
    """Load data from JSON file with proper error handling"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise Exception(f"Failed to load JSON data: {str(e)}")

def validate_file_exists(file_path: str) -> bool:
    """Validate that a file exists and is readable"""
    return Path(file_path).exists() and Path(file_path).is_file()

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    return Path(file_path).stat().st_size

def get_file_modified_time(file_path: str) -> datetime:
    """Get file modification time"""
    return datetime.fromtimestamp(Path(file_path).stat().st_mtime)

def clean_filename(filename: str) -> str:
    """Clean filename for safe filesystem usage"""
    # Remove or replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Remove extra spaces and dots
    filename = filename.strip('. ')
    
    # Ensure it's not empty
    if not filename:
        filename = "unnamed"
    
    return filename

def generate_unique_filename(base_name: str, extension: str, directory: str = ".") -> str:
    """Generate unique filename to avoid conflicts"""
    ensure_directory_exists(directory)
    
    base_path = Path(directory) / f"{base_name}.{extension}"
    counter = 1
    
    while base_path.exists():
        base_path = Path(directory) / f"{base_name}_{counter}.{extension}"
        counter += 1
    
    return str(base_path)

def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"

def create_backup(file_path: str, backup_dir: str = "backups") -> str:
    """Create backup of a file"""
    ensure_directory_exists(backup_dir)
    
    file_path_obj = Path(file_path)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{file_path_obj.stem}_{timestamp}{file_path_obj.suffix}"
    backup_path = Path(backup_dir) / backup_filename
    
    # Copy file to backup location
    import shutil
    shutil.copy2(file_path, backup_path)
    
    return str(backup_path)

def merge_json_data(base_data: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """Merge two JSON data structures"""
    merged = base_data.copy()
    
    for key, value in new_data.items():
        if key in merged:
            if isinstance(merged[key], dict) and isinstance(value, dict):
                merged[key] = merge_json_data(merged[key], value)
            elif isinstance(merged[key], list) and isinstance(value, list):
                merged[key].extend(value)
            else:
                merged[key] = value
        else:
            merged[key] = value
    
    return merged

def validate_json_structure(data: Dict[str, Any], required_fields: List[str]) -> bool:
    """Validate that JSON data has required fields"""
    for field in required_fields:
        if field not in data:
            return False
    return True

def get_environment_variable(key: str, default: str = None) -> str:
    """Get environment variable with default value"""
    return os.getenv(key, default)

def create_timestamp() -> str:
    """Create ISO timestamp string"""
    return datetime.now().isoformat()

def parse_timestamp(timestamp_str: str) -> datetime:
    """Parse ISO timestamp string"""
    return datetime.fromisoformat(timestamp_str)

def calculate_duration(start_time: datetime, end_time: datetime) -> float:
    """Calculate duration in seconds"""
    return (end_time - start_time).total_seconds()

def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 60:
        return f"{seconds:.2f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.2f} minutes"
    else:
        hours = seconds / 3600
        return f"{hours:.2f} hours"

def create_progress_report(current_step: str, total_steps: int, step_number: int) -> Dict[str, Any]:
    """Create progress report for pipeline"""
    progress_percentage = (step_number / total_steps) * 100
    
    return {
        "current_step": current_step,
        "step_number": step_number,
        "total_steps": total_steps,
        "progress_percentage": progress_percentage,
        "timestamp": create_timestamp()
    }

def cleanup_temp_files(temp_dir: str = "data") -> None:
    """Clean up temporary files"""
    temp_path = Path(temp_dir)
    if temp_path.exists():
        for temp_file in temp_path.glob("temp_*"):
            try:
                temp_file.unlink()
            except Exception as e:
                print(f"Warning: Could not delete temp file {temp_file}: {e}")

def get_system_info() -> Dict[str, Any]:
    """Get system information for logging"""
    import platform
    import sys
    
    return {
        "platform": platform.platform(),
        "python_version": sys.version,
        "architecture": platform.architecture(),
        "processor": platform.processor(),
        "timestamp": create_timestamp()
    }
