#!/usr/bin/env python3
"""
Schema validation for VOFC data structures using Pydantic
"""

from pydantic import BaseModel, ValidationError, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class OFC(BaseModel):
    """Schema for Options for Consideration"""
    text: str = Field(..., min_length=10, description="OFC text must be at least 10 characters")
    citations: List[int] = Field(default=[], description="List of citation reference numbers")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="Confidence score between 0 and 1")

class VOFCRow(BaseModel):
    """Schema for a complete VOFC row"""
    category: str = Field(..., min_length=1, description="Vulnerability category")
    vulnerability: str = Field(..., min_length=10, description="Vulnerability description")
    ofcs: List[OFC] = Field(..., min_items=1, description="List of Options for Consideration")
    sector: Optional[str] = Field(None, description="Industry sector")
    subsector: Optional[str] = Field(None, description="Industry subsector")

class Vulnerability(BaseModel):
    """Schema for vulnerability data"""
    id: Optional[str] = Field(None, description="Unique identifier")
    category: str = Field(..., min_length=1, description="Vulnerability category")
    vulnerability: str = Field(..., min_length=10, description="Vulnerability description")
    sector: Optional[str] = Field(None, description="Industry sector")
    subsector: Optional[str] = Field(None, description="Industry subsector")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

class OptionForConsideration(BaseModel):
    """Schema for Options for Consideration"""
    id: Optional[str] = Field(None, description="Unique identifier")
    option_text: str = Field(..., min_length=10, description="OFC text")
    vulnerability_id: Optional[str] = Field(None, description="Associated vulnerability ID")
    discipline: Optional[str] = Field(None, description="Discipline category")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

class Source(BaseModel):
    """Schema for source/citation data"""
    id: Optional[str] = Field(None, description="Unique identifier")
    reference_number: str = Field(..., min_length=1, description="Reference number")
    source_text: str = Field(..., min_length=5, description="Source text")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

class ParsedData(BaseModel):
    """Schema for parsed document data"""
    source_file: str = Field(..., description="Source file path")
    extraction_timestamp: str = Field(..., description="Extraction timestamp")
    vulnerabilities: List[Vulnerability] = Field(..., min_items=1, description="List of vulnerabilities")
    options_for_consideration: List[OptionForConsideration] = Field(..., min_items=1, description="List of OFCs")
    sources: List[Source] = Field(default=[], description="List of sources")
    metadata: Dict[str, Any] = Field(default={}, description="Additional metadata")

def validate_vofc_data(data: Dict[str, Any]) -> ParsedData:
    """Validate VOFC data against schema"""
    try:
        return ParsedData.model_validate(data)
    except ValidationError as e:
        raise ValueError(f"Data validation failed: {e}")

def validate_vofc_rows(rows: List[Dict[str, Any]]) -> List[VOFCRow]:
    """Validate a list of VOFC rows"""
    validated_rows = []
    for i, row in enumerate(rows):
        try:
            validated_rows.append(VOFCRow.model_validate(row))
        except ValidationError as e:
            raise ValueError(f"Row {i} validation failed: {e}")
    return validated_rows

def validate_and_export(data: Dict[str, Any], output_file: str = None) -> Dict[str, Any]:
    """Validate data and export validated results"""
    try:
        validated_data = validate_vofc_data(data)
        result = {
            "success": True,
            "validated_data": validated_data.model_dump(),
            "validation_timestamp": datetime.now().isoformat(),
            "total_vulnerabilities": len(validated_data.vulnerabilities),
            "total_ofcs": len(validated_data.options_for_consideration),
            "total_sources": len(validated_data.sources)
        }
        
        if output_file:
            import json
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
        
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "validation_timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Example usage
    sample_data = {
        "source_file": "test.pdf",
        "extraction_timestamp": "2024-01-01T00:00:00Z",
        "vulnerabilities": [
            {
                "category": "Physical Security",
                "vulnerability": "Insufficient access control measures",
                "sector": "Critical Infrastructure"
            }
        ],
        "options_for_consideration": [
            {
                "option_text": "Implement multi-factor authentication",
                "discipline": "Cybersecurity"
            }
        ],
        "sources": []
    }
    
    result = validate_and_export(sample_data)
    print(json.dumps(result, indent=2))