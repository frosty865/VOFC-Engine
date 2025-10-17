"""
Configuration Loader

This module provides functionality for loading and managing configuration
for the VOFC processing system.
"""

import logging
import yaml
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DatabaseConfig:
    """Database configuration"""
    url: str
    key: str
    timeout: int = 30
    max_retries: int = 3


@dataclass
class ParserConfig:
    """Parser configuration"""
    min_question_length: int = 10
    min_vulnerability_length: 5
    min_ofc_length: int = 10
    confidence_threshold: float = 0.3
    max_concurrent: int = 3


@dataclass
class ValidationConfig:
    """Validation configuration"""
    min_confidence_threshold: float = 0.3
    security_keywords: list = None
    quality_weights: Dict[str, float] = None


@dataclass
class ExportConfig:
    """Export configuration"""
    output_directory: str = "./exports"
    default_format: str = "json"
    max_file_size: int = 100 * 1024 * 1024  # 100MB


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5


class ConfigLoader:
    """Configuration loader for VOFC processing system"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize configuration loader
        
        Args:
            config_path: Path to configuration file (YAML or JSON)
        """
        self.config_path = config_path
        self.config = {}
        
        # Default configuration
        self.default_config = {
            'database': {
                'url': os.getenv('SUPABASE_URL', ''),
                'key': os.getenv('SUPABASE_KEY', ''),
                'timeout': 30,
                'max_retries': 3
            },
            'parser': {
                'min_question_length': 10,
                'min_vulnerability_length': 5,
                'min_ofc_length': 10,
                'confidence_threshold': 0.3,
                'max_concurrent': 3
            },
            'validation': {
                'min_confidence_threshold': 0.3,
                'security_keywords': [
                    'security', 'access', 'control', 'authentication', 'authorization',
                    'encryption', 'monitoring', 'incident', 'response', 'training',
                    'vulnerability', 'threat', 'risk', 'compliance', 'audit'
                ],
                'quality_weights': {
                    'base': 0.3,
                    'text_quality': 0.2,
                    'questions': 0.2,
                    'vulnerabilities': 0.15,
                    'ofcs': 0.15
                }
            },
            'export': {
                'output_directory': './exports',
                'default_format': 'json',
                'max_file_size': 100 * 1024 * 1024
            },
            'logging': {
                'level': 'INFO',
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'file_path': None,
                'max_file_size': 10 * 1024 * 1024,
                'backup_count': 5
            }
        }
    
    def load(self) -> Dict[str, Any]:
        """
        Load configuration from file or environment
        
        Returns:
            Configuration dictionary
        """
        try:
            # Start with default configuration
            self.config = self.default_config.copy()
            
            # Load from file if specified
            if self.config_path and Path(self.config_path).exists():
                self._load_from_file(self.config_path)
            
            # Override with environment variables
            self._load_from_environment()
            
            # Validate configuration
            self._validate_config()
            
            logger.info("Configuration loaded successfully")
            return self.config
            
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            logger.info("Using default configuration")
            return self.default_config
    
    def _load_from_file(self, file_path: str):
        """Load configuration from file"""
        try:
            path = Path(file_path)
            
            if path.suffix.lower() == '.yaml' or path.suffix.lower() == '.yml':
                with open(path, 'r', encoding='utf-8') as f:
                    file_config = yaml.safe_load(f)
            elif path.suffix.lower() == '.json':
                with open(path, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
            else:
                raise ValueError(f"Unsupported configuration file format: {path.suffix}")
            
            # Merge with existing config
            self._merge_config(file_config)
            logger.info(f"Configuration loaded from file: {file_path}")
            
        except Exception as e:
            logger.error(f"Error loading configuration from file {file_path}: {e}")
            raise
    
    def _load_from_environment(self):
        """Load configuration from environment variables"""
        env_mappings = {
            'SUPABASE_URL': ['database', 'url'],
            'SUPABASE_KEY': ['database', 'key'],
            'SUPABASE_TIMEOUT': ['database', 'timeout'],
            'SUPABASE_MAX_RETRIES': ['database', 'max_retries'],
            'PARSER_MIN_QUESTION_LENGTH': ['parser', 'min_question_length'],
            'PARSER_MIN_VULNERABILITY_LENGTH': ['parser', 'min_vulnerability_length'],
            'PARSER_MIN_OFC_LENGTH': ['parser', 'min_ofc_length'],
            'PARSER_CONFIDENCE_THRESHOLD': ['parser', 'confidence_threshold'],
            'PARSER_MAX_CONCURRENT': ['parser', 'max_concurrent'],
            'VALIDATION_MIN_CONFIDENCE_THRESHOLD': ['validation', 'min_confidence_threshold'],
            'EXPORT_OUTPUT_DIRECTORY': ['export', 'output_directory'],
            'EXPORT_DEFAULT_FORMAT': ['export', 'default_format'],
            'EXPORT_MAX_FILE_SIZE': ['export', 'max_file_size'],
            'LOGGING_LEVEL': ['logging', 'level'],
            'LOGGING_FILE_PATH': ['logging', 'file_path'],
            'LOGGING_MAX_FILE_SIZE': ['logging', 'max_file_size'],
            'LOGGING_BACKUP_COUNT': ['logging', 'backup_count']
        }
        
        for env_var, config_path in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                self._set_nested_value(config_path, self._convert_env_value(value))
    
    def _merge_config(self, new_config: Dict[str, Any]):
        """Merge new configuration with existing config"""
        def merge_dicts(base: Dict, update: Dict) -> Dict:
            for key, value in update.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    merge_dicts(base[key], value)
                else:
                    base[key] = value
            return base
        
        self.config = merge_dicts(self.config, new_config)
    
    def _set_nested_value(self, path: list, value: Any):
        """Set a nested value in the configuration"""
        current = self.config
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[path[-1]] = value
    
    def _convert_env_value(self, value: str) -> Union[str, int, float, bool]:
        """Convert environment variable string to appropriate type"""
        # Boolean values
        if value.lower() in ('true', 'false'):
            return value.lower() == 'true'
        
        # Numeric values
        try:
            if '.' in value:
                return float(value)
            else:
                return int(value)
        except ValueError:
            pass
        
        # String values
        return value
    
    def _validate_config(self):
        """Validate configuration values"""
        # Validate database configuration
        if not self.config.get('database', {}).get('url'):
            raise ValueError("Database URL is required")
        if not self.config.get('database', {}).get('key'):
            raise ValueError("Database key is required")
        
        # Validate numeric ranges
        confidence_threshold = self.config.get('parser', {}).get('confidence_threshold', 0.3)
        if not 0 <= confidence_threshold <= 1:
            raise ValueError("Confidence threshold must be between 0 and 1")
        
        min_confidence = self.config.get('validation', {}).get('min_confidence_threshold', 0.3)
        if not 0 <= min_confidence <= 1:
            raise ValueError("Minimum confidence threshold must be between 0 and 1")
        
        # Validate file paths
        export_dir = self.config.get('export', {}).get('output_directory', './exports')
        try:
            Path(export_dir).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise ValueError(f"Cannot create export directory {export_dir}: {e}")
        
        # Validate logging configuration
        log_level = self.config.get('logging', {}).get('level', 'INFO')
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if log_level.upper() not in valid_levels:
            raise ValueError(f"Invalid logging level: {log_level}. Must be one of {valid_levels}")
    
    def get_database_config(self) -> DatabaseConfig:
        """Get database configuration as dataclass"""
        db_config = self.config.get('database', {})
        return DatabaseConfig(
            url=db_config.get('url', ''),
            key=db_config.get('key', ''),
            timeout=db_config.get('timeout', 30),
            max_retries=db_config.get('max_retries', 3)
        )
    
    def get_parser_config(self) -> ParserConfig:
        """Get parser configuration as dataclass"""
        parser_config = self.config.get('parser', {})
        return ParserConfig(
            min_question_length=parser_config.get('min_question_length', 10),
            min_vulnerability_length=parser_config.get('min_vulnerability_length', 5),
            min_ofc_length=parser_config.get('min_ofc_length', 10),
            confidence_threshold=parser_config.get('confidence_threshold', 0.3),
            max_concurrent=parser_config.get('max_concurrent', 3)
        )
    
    def get_validation_config(self) -> ValidationConfig:
        """Get validation configuration as dataclass"""
        validation_config = self.config.get('validation', {})
        return ValidationConfig(
            min_confidence_threshold=validation_config.get('min_confidence_threshold', 0.3),
            security_keywords=validation_config.get('security_keywords', []),
            quality_weights=validation_config.get('quality_weights', {})
        )
    
    def get_export_config(self) -> ExportConfig:
        """Get export configuration as dataclass"""
        export_config = self.config.get('export', {})
        return ExportConfig(
            output_directory=export_config.get('output_directory', './exports'),
            default_format=export_config.get('default_format', 'json'),
            max_file_size=export_config.get('max_file_size', 100 * 1024 * 1024)
        )
    
    def get_logging_config(self) -> LoggingConfig:
        """Get logging configuration as dataclass"""
        logging_config = self.config.get('logging', {})
        return LoggingConfig(
            level=logging_config.get('level', 'INFO'),
            format=logging_config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
            file_path=logging_config.get('file_path'),
            max_file_size=logging_config.get('max_file_size', 10 * 1024 * 1024),
            backup_count=logging_config.get('backup_count', 5)
        )
    
    def save_config(self, output_path: str, format: str = 'yaml'):
        """Save current configuration to file"""
        try:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            if format.lower() == 'yaml':
                with open(path, 'w', encoding='utf-8') as f:
                    yaml.dump(self.config, f, default_flow_style=False, indent=2)
            elif format.lower() == 'json':
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(self.config, f, indent=2)
            else:
                raise ValueError(f"Unsupported output format: {format}")
            
            logger.info(f"Configuration saved to {output_path}")
            
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
            raise
