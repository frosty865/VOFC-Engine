"""
Constants and Configuration Values

This module contains constants and configuration values used throughout
the VOFC processing system.
"""

from typing import List, Dict, Any
from enum import Enum


class ProcessingStatus(Enum):
    """Processing status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ValidationStatus(Enum):
    """Validation status enumeration"""
    VALID = "valid"
    INVALID = "invalid"
    NEEDS_REVIEW = "needs_review"
    PENDING = "pending"


class ExportFormat(Enum):
    """Export format enumeration"""
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    XML = "xml"


class TechnologyClass(Enum):
    """Technology class enumeration"""
    NETWORK_SECURITY = "Network Security"
    DATA_SECURITY = "Data Security"
    APPLICATION_SECURITY = "Application Security"
    CLOUD_SECURITY = "Cloud Security"
    ENDPOINT_SECURITY = "Endpoint Security"
    GENERAL_SECURITY = "General Security"


class EffortLevel(Enum):
    """Effort level enumeration"""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class Effectiveness(Enum):
    """Effectiveness enumeration"""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


# Security keywords for content analysis
SECURITY_KEYWORDS: List[str] = [
    'security', 'access', 'control', 'authentication', 'authorization',
    'encryption', 'monitoring', 'incident', 'response', 'training',
    'vulnerability', 'threat', 'risk', 'compliance', 'audit',
    'firewall', 'intrusion', 'malware', 'phishing', 'breach',
    'privacy', 'confidentiality', 'integrity', 'availability',
    'governance', 'policy', 'procedure', 'standard', 'framework'
]

# Question patterns for extraction
QUESTION_PATTERNS: List[str] = [
    r'^\d+\.\s+(.+?)(?:\?|$)',  # Numbered questions
    r'^[A-Z][^.]*\.\s+(.+?)(?:\?|$)',  # Questions starting with capital letter
    r'Does\s+.+?\?',  # Questions starting with "Does"
    r'Are\s+.+?\?',   # Questions starting with "Are"
    r'Is\s+.+?\?',    # Questions starting with "Is"
    r'Have\s+.+?\?',  # Questions starting with "Have"
    r'Do\s+.+?\?',    # Questions starting with "Do"
    r'Can\s+.+?\?',   # Questions starting with "Can"
    r'Should\s+.+?\?', # Questions starting with "Should"
    r'Would\s+.+?\?', # Questions starting with "Would"
    r'Could\s+.+?\?', # Questions starting with "Could"
    r'What\s+.+?\?',  # Questions starting with "What"
    r'How\s+.+?\?',   # Questions starting with "How"
    r'When\s+.+?\?',  # Questions starting with "When"
    r'Where\s+.+?\?', # Questions starting with "Where"
    r'Why\s+.+?\?',   # Questions starting with "Why"
    r'Who\s+.+?\?',   # Questions starting with "Who"
    r'Which\s+.+?\?', # Questions starting with "Which"
]

# Vulnerability patterns for extraction
VULNERABILITY_PATTERNS: List[str] = [
    r'vulnerability[:\s]+(.+?)(?:\n|$)',  # Lines starting with "vulnerability:"
    r'risk[:\s]+(.+?)(?:\n|$)',          # Lines starting with "risk:"
    r'threat[:\s]+(.+?)(?:\n|$)',        # Lines starting with "threat:"
    r'weakness[:\s]+(.+?)(?:\n|$)',      # Lines starting with "weakness:"
    r'exposure[:\s]+(.+?)(?:\n|$)',      # Lines starting with "exposure:"
    r'gap[:\s]+(.+?)(?:\n|$)',           # Lines starting with "gap:"
    r'deficiency[:\s]+(.+?)(?:\n|$)',    # Lines starting with "deficiency:"
]

# OFC patterns for extraction
OFC_PATTERNS: List[str] = [
    r'option[:\s]+(.+?)(?:\n|$)',        # Lines starting with "option:"
    r'recommendation[:\s]+(.+?)(?:\n|$)', # Lines starting with "recommendation:"
    r'consideration[:\s]+(.+?)(?:\n|$)', # Lines starting with "consideration:"
    r'mitigation[:\s]+(.+?)(?:\n|$)',    # Lines starting with "mitigation:"
    r'control[:\s]+(.+?)(?:\n|$)',       # Lines starting with "control:"
    r'measure[:\s]+(.+?)(?:\n|$)',       # Lines starting with "measure:"
    r'action[:\s]+(.+?)(?:\n|$)',        # Lines starting with "action:"
    r'solution[:\s]+(.+?)(?:\n|$)',       # Lines starting with "solution:"
    r'approach[:\s]+(.+?)(?:\n|$)',      # Lines starting with "approach:"
    r'strategy[:\s]+(.+?)(?:\n|$)',      # Lines starting with "strategy:"
]

# Action-oriented keywords for OFC validation
ACTION_KEYWORDS: List[str] = [
    'implement', 'establish', 'create', 'develop', 'deploy', 'configure',
    'enable', 'disable', 'monitor', 'review', 'update', 'maintain',
    'install', 'configure', 'setup', 'activate', 'deactivate',
    'train', 'educate', 'inform', 'notify', 'alert', 'warn',
    'prevent', 'detect', 'respond', 'recover', 'restore', 'backup',
    'test', 'validate', 'verify', 'check', 'audit', 'assess'
]

# Technology class keywords
TECHNOLOGY_KEYWORDS: Dict[str, List[str]] = {
    'Network Security': [
        'network', 'firewall', 'router', 'switch', 'vpn', 'wifi', 'ethernet',
        'tcp', 'udp', 'ip', 'dns', 'dhcp', 'nat', 'subnet', 'lan', 'wan'
    ],
    'Data Security': [
        'database', 'sql', 'data', 'storage', 'backup', 'encryption', 'hash',
        'pii', 'sensitive', 'confidential', 'retention', 'archive'
    ],
    'Application Security': [
        'application', 'web', 'api', 'software', 'code', 'development',
        'sdlc', 'testing', 'deployment', 'container', 'microservice'
    ],
    'Cloud Security': [
        'cloud', 'aws', 'azure', 'gcp', 'saas', 'paas', 'iaas', 'serverless',
        'container', 'kubernetes', 'docker', 'virtual', 'vm'
    ],
    'Endpoint Security': [
        'mobile', 'device', 'endpoint', 'laptop', 'desktop', 'phone', 'tablet',
        'antivirus', 'edr', 'xdr', 'mdm', 'device management'
    ]
}

# Confidence score thresholds
CONFIDENCE_THRESHOLDS: Dict[str, float] = {
    'very_low': 0.0,
    'low': 0.3,
    'medium': 0.5,
    'high': 0.7,
    'very_high': 0.9
}

# Quality weights for validation
QUALITY_WEIGHTS: Dict[str, float] = {
    'base_confidence': 0.3,
    'text_quality': 0.2,
    'questions_quality': 0.2,
    'vulnerabilities_quality': 0.15,
    'ofcs_quality': 0.15
}

# File size limits
FILE_SIZE_LIMITS: Dict[str, int] = {
    'max_upload_size': 50 * 1024 * 1024,  # 50MB
    'max_export_size': 100 * 1024 * 1024,  # 100MB
    'max_log_size': 10 * 1024 * 1024,  # 10MB
}

# Processing limits
PROCESSING_LIMITS: Dict[str, int] = {
    'max_concurrent_documents': 3,
    'max_batch_size': 100,
    'max_retry_attempts': 3,
    'timeout_seconds': 300,  # 5 minutes
}

# Database table names
TABLE_NAMES: Dict[str, str] = {
    'questions': 'questions',
    'vulnerabilities': 'vulnerabilities',
    'ofcs': 'ofcs',
    'sectors': 'sectors',
    'question_ofc_map': 'question_ofc_map'
}

# Default configuration values
DEFAULT_CONFIG: Dict[str, Any] = {
    'parser': {
        'min_question_length': 10,
        'min_vulnerability_length': 5,
        'min_ofc_length': 10,
        'confidence_threshold': 0.3,
        'max_concurrent': 3
    },
    'validation': {
        'min_confidence_threshold': 0.3,
        'security_relevance_weight': 0.4,
        'action_orientation_weight': 0.3,
        'completeness_weight': 0.3
    },
    'export': {
        'default_format': 'json',
        'output_directory': './exports',
        'include_metadata': True,
        'compress_large_files': True
    },
    'logging': {
        'level': 'INFO',
        'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        'max_file_size': 10 * 1024 * 1024,
        'backup_count': 5
    }
}

# Error messages
ERROR_MESSAGES: Dict[str, str] = {
    'file_not_found': 'File not found: {file_path}',
    'invalid_format': 'Invalid file format: {format}',
    'processing_failed': 'Processing failed: {error}',
    'validation_failed': 'Validation failed: {errors}',
    'database_error': 'Database error: {error}',
    'export_failed': 'Export failed: {error}',
    'configuration_error': 'Configuration error: {error}',
    'insufficient_permissions': 'Insufficient permissions: {operation}',
    'timeout_error': 'Operation timed out: {operation}',
    'connection_error': 'Connection error: {service}'
}

# Success messages
SUCCESS_MESSAGES: Dict[str, str] = {
    'processing_completed': 'Processing completed successfully',
    'validation_passed': 'Validation passed',
    'export_completed': 'Export completed successfully',
    'database_updated': 'Database updated successfully',
    'configuration_loaded': 'Configuration loaded successfully'
}

# Status messages
STATUS_MESSAGES: Dict[str, str] = {
    'processing_started': 'Processing started',
    'validation_in_progress': 'Validation in progress',
    'export_in_progress': 'Export in progress',
    'database_connection_established': 'Database connection established',
    'configuration_initialized': 'Configuration initialized'
}
