"""
Logging Configuration

This module provides centralized logging configuration for the VOFC processing system.
"""

import logging
import logging.handlers
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime


def setup_logging(config: Dict[str, Any]) -> None:
    """
    Setup logging configuration
    
    Args:
        config: Logging configuration dictionary
    """
    # Get configuration values
    level = config.get('level', 'INFO').upper()
    format_str = config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_path = config.get('file_path')
    max_file_size = config.get('max_file_size', 10 * 1024 * 1024)  # 10MB
    backup_count = config.get('backup_count', 5)
    
    # Convert string level to logging constant
    numeric_level = getattr(logging, level, logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(format_str)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if specified)
    if file_path:
        try:
            # Ensure directory exists
            log_path = Path(file_path)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Create rotating file handler
            file_handler = logging.handlers.RotatingFileHandler(
                file_path,
                maxBytes=max_file_size,
                backupCount=backup_count,
                encoding='utf-8'
            )
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
            
        except Exception as e:
            print(f"Warning: Could not setup file logging: {e}")
    
    # Set specific logger levels
    _configure_module_loggers()
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info("Logging system initialized")
    logger.info(f"Log level: {level}")
    if file_path:
        logger.info(f"Log file: {file_path}")


def _configure_module_loggers():
    """Configure specific module loggers"""
    # Reduce noise from external libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('supabase').setLevel(logging.INFO)
    
    # Set our module loggers to DEBUG for detailed logging
    module_loggers = [
        'src.parsers',
        'src.pipelines',
        'src.db',
        'src.utils'
    ]
    
    for module in module_loggers:
        logging.getLogger(module).setLevel(logging.DEBUG)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class ProcessingLogger:
    """Specialized logger for processing operations"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.start_time = None
    
    def start_processing(self, operation: str, details: Optional[Dict[str, Any]] = None):
        """Log the start of a processing operation"""
        self.start_time = datetime.now()
        self.logger.info(f"Starting {operation}")
        if details:
            self.logger.debug(f"Operation details: {details}")
    
    def log_progress(self, current: int, total: int, operation: str = "processing"):
        """Log processing progress"""
        percentage = (current / total) * 100 if total > 0 else 0
        self.logger.info(f"{operation.capitalize()} progress: {current}/{total} ({percentage:.1f}%)")
    
    def log_step(self, step: str, details: Optional[Dict[str, Any]] = None):
        """Log a processing step"""
        self.logger.info(f"Step: {step}")
        if details:
            self.logger.debug(f"Step details: {details}")
    
    def log_error(self, error: Exception, context: Optional[str] = None):
        """Log an error with context"""
        if context:
            self.logger.error(f"Error in {context}: {error}")
        else:
            self.logger.error(f"Error: {error}")
    
    def log_warning(self, message: str, details: Optional[Dict[str, Any]] = None):
        """Log a warning"""
        self.logger.warning(message)
        if details:
            self.logger.debug(f"Warning details: {details}")
    
    def finish_processing(self, operation: str, success: bool = True, results: Optional[Dict[str, Any]] = None):
        """Log the completion of a processing operation"""
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()
            status = "completed successfully" if success else "failed"
            self.logger.info(f"{operation.capitalize()} {status} in {duration:.2f} seconds")
            
            if results:
                self.logger.info(f"Results: {results}")
        else:
            status = "completed" if success else "failed"
            self.logger.info(f"{operation.capitalize()} {status}")
    
    def log_validation_result(self, is_valid: bool, errors: list, warnings: list):
        """Log validation results"""
        if is_valid:
            self.logger.info("Validation passed")
        else:
            self.logger.error("Validation failed")
        
        for error in errors:
            self.logger.error(f"Validation error: {error}")
        
        for warning in warnings:
            self.logger.warning(f"Validation warning: {warning}")
    
    def log_database_operation(self, operation: str, table: str, record_count: int, success: bool = True):
        """Log database operations"""
        status = "successful" if success else "failed"
        self.logger.info(f"Database {operation} on {table}: {record_count} records - {status}")
    
    def log_export_result(self, format: str, file_path: str, record_count: int, success: bool = True):
        """Log export results"""
        status = "successful" if success else "failed"
        self.logger.info(f"Export to {format} ({file_path}): {record_count} records - {status}")


def create_processing_logger(name: str) -> ProcessingLogger:
    """
    Create a specialized processing logger
    
    Args:
        name: Logger name
        
    Returns:
        ProcessingLogger instance
    """
    return ProcessingLogger(name)


# Convenience functions for common logging patterns
def log_function_entry(logger: logging.Logger, func_name: str, args: Optional[Dict] = None):
    """Log function entry with arguments"""
    logger.debug(f"Entering {func_name}")
    if args:
        logger.debug(f"Arguments: {args}")


def log_function_exit(logger: logging.Logger, func_name: str, result: Optional[Any] = None):
    """Log function exit with result"""
    logger.debug(f"Exiting {func_name}")
    if result is not None:
        logger.debug(f"Result: {result}")


def log_performance(logger: logging.Logger, operation: str, duration: float, details: Optional[Dict] = None):
    """Log performance metrics"""
    logger.info(f"{operation} completed in {duration:.2f} seconds")
    if details:
        logger.debug(f"Performance details: {details}")


def log_data_quality(logger: logging.Logger, metrics: Dict[str, Any]):
    """Log data quality metrics"""
    logger.info("Data quality metrics:")
    for metric, value in metrics.items():
        logger.info(f"  {metric}: {value}")
