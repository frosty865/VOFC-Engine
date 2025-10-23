"""
VOFC Schema Validation
=====================

Centralized schema definitions for VOFC data validation.
Used by the auto-ingestion pipeline and other components to ensure data integrity.
"""

from typing import Dict, Any

# Main VOFC submission schema
VOFC_SCHEMA = {
    "type": "object",
    "required": ["id", "status", "created_at", "source", "entries"],
    "properties": {
        "id": {
            "type": "string",
            "format": "uuid",
            "description": "Unique identifier for the submission"
        },
        "status": {
            "type": "string",
            "enum": ["pending_review", "approved", "rejected"],
            "description": "Current status of the submission"
        },
        "created_at": {
            "type": "string",
            "format": "date-time",
            "description": "ISO timestamp when submission was created"
        },
        "source": {
            "type": "object",
            "required": ["title", "source_type"],
            "properties": {
                "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500,
                    "description": "Document title"
                },
                "authors": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of document authors"
                },
                "year": {
                    "type": "string",
                    "pattern": r"^\d{4}$",
                    "description": "Publication year"
                },
                "source_type": {
                    "type": "string",
                    "enum": ["Government", "Academic", "Corporate", "Field", "Media", "Unknown"],
                    "description": "Type of source document"
                },
                "source_url": {
                    "type": "string",
                    "format": "uri",
                    "description": "Optional URL to source document"
                },
                "source_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Confidence score for source reliability"
                }
            }
        },
        "entries": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["vulnerability", "ofc", "category", "sector", "subsector"],
                "properties": {
                    "vulnerability": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 2000,
                        "description": "Description of the vulnerability"
                    },
                    "ofc": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 2000,
                        "description": "Option for consideration text"
                    },
                    "category": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Vulnerability category"
                    },
                    "sector": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Industry sector"
                    },
                    "subsector": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Industry subsector"
                    },
                    "citations": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                        },
                        "description": "List of citations for this entry"
                    }
                }
            }
        }
    }
}

# Source metadata schema
SOURCE_SCHEMA = {
    "type": "object",
    "required": ["title", "source_type"],
    "properties": {
        "title": {"type": "string", "minLength": 1, "maxLength": 500},
        "authors": {"type": "array", "items": {"type": "string"}},
        "year": {"type": "string", "pattern": r"^\d{4}$"},
        "source_type": {
            "type": "string",
            "enum": ["Government", "Academic", "Corporate", "Field", "Media", "Unknown"]
        },
        "source_url": {"type": "string", "format": "uri"},
        "source_confidence": {"type": "number", "minimum": 0, "maximum": 1}
    }
}

# Individual entry schema
ENTRY_SCHEMA = {
    "type": "object",
    "required": ["vulnerability", "ofc", "category", "sector", "subsector"],
    "properties": {
        "vulnerability": {"type": "string", "minLength": 10, "maxLength": 2000},
        "ofc": {"type": "string", "minLength": 10, "maxLength": 2000},
        "category": {"type": "string", "minLength": 1, "maxLength": 100},
        "sector": {"type": "string", "minLength": 1, "maxLength": 100},
        "subsector": {"type": "string", "minLength": 1, "maxLength": 100},
        "citations": {
            "type": "array",
            "items": {"type": "string", "minLength": 1, "maxLength": 500}
        }
    }
}

# Validation helper functions
def validate_vofc_package(package: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate a VOFC submission package against the schema.
    
    Args:
        package: The submission package to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        from jsonschema import validate, ValidationError
        
        validate(instance=package, schema=VOFC_SCHEMA)
        return True, "Valid"
        
    except ValidationError as e:
        return False, f"Validation error: {e.message}"
    except Exception as e:
        return False, f"Validation error: {str(e)}"

def validate_source_metadata(source: Dict[str, Any]) -> tuple[bool, str]:
    """Validate source metadata against schema."""
    try:
        from jsonschema import validate, ValidationError
        
        validate(instance=source, schema=SOURCE_SCHEMA)
        return True, "Valid"
        
    except ValidationError as e:
        return False, f"Source validation error: {e.message}"
    except Exception as e:
        return False, f"Source validation error: {str(e)}"

def validate_entry(entry: Dict[str, Any]) -> tuple[bool, str]:
    """Validate individual entry against schema."""
    try:
        from jsonschema import validate, ValidationError
        
        validate(instance=entry, schema=ENTRY_SCHEMA)
        return True, "Valid"
        
    except ValidationError as e:
        return False, f"Entry validation error: {e.message}"
    except Exception as e:
        return False, f"Entry validation error: {str(e)}"

# Schema versioning
SCHEMA_VERSION = "1.0.0"
SCHEMA_DATE = "2024-01-01"

# Export main schema
vofc_schema = VOFC_SCHEMA
