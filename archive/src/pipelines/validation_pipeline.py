"""
VOFC Data Validation Pipeline

This module provides validation functionality for extracted VOFC data to ensure
quality and consistency before database insertion.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import re
from datetime import datetime

from ..parsers.pdf_parser import ParsedDocument

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    confidence_score: float
    quality_metrics: Dict[str, Any]


class ValidationPipeline:
    """Pipeline for validating extracted VOFC data"""
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize the validation pipeline
        
        Args:
            config: Configuration dictionary for validation rules
        """
        self.config = config or {}
        self.min_question_length = self.config.get('min_question_length', 10)
        self.min_vulnerability_length = self.config.get('min_vulnerability_length', 5)
        self.min_ofc_length = self.config.get('min_ofc_length', 10)
        self.min_confidence_threshold = self.config.get('min_confidence_threshold', 0.3)
        
        # Quality keywords for validation
        self.security_keywords = [
            'security', 'access', 'control', 'authentication', 'authorization',
            'encryption', 'monitoring', 'incident', 'response', 'training',
            'vulnerability', 'threat', 'risk', 'compliance', 'audit'
        ]
        
        logger.info("Validation pipeline initialized")
    
    def validate_document(self, parsed_doc: ParsedDocument) -> ValidationResult:
        """
        Validate a parsed document
        
        Args:
            parsed_doc: ParsedDocument to validate
            
        Returns:
            ValidationResult with validation details
        """
        errors = []
        warnings = []
        quality_metrics = {}
        
        logger.info(f"Validating document: {parsed_doc.filename}")
        
        # Validate overall document quality
        doc_quality = self._validate_document_quality(parsed_doc)
        errors.extend(doc_quality['errors'])
        warnings.extend(doc_quality['warnings'])
        quality_metrics.update(doc_quality['metrics'])
        
        # Validate questions
        questions_validation = self._validate_questions(parsed_doc.questions)
        errors.extend(questions_validation['errors'])
        warnings.extend(questions_validation['warnings'])
        quality_metrics['questions'] = questions_validation['metrics']
        
        # Validate vulnerabilities
        vulns_validation = self._validate_vulnerabilities(parsed_doc.vulnerabilities)
        errors.extend(vulns_validation['errors'])
        warnings.extend(vulns_validation['warnings'])
        quality_metrics['vulnerabilities'] = vulns_validation['metrics']
        
        # Validate OFCs
        ofcs_validation = self._validate_ofcs(parsed_doc.ofcs)
        errors.extend(ofcs_validation['errors'])
        warnings.extend(ofcs_validation['warnings'])
        quality_metrics['ofcs'] = ofcs_validation['metrics']
        
        # Calculate overall confidence
        confidence = self._calculate_overall_confidence(parsed_doc, quality_metrics)
        
        # Determine if document is valid
        is_valid = len(errors) == 0 and confidence >= self.min_confidence_threshold
        
        if not is_valid and confidence < self.min_confidence_threshold:
            errors.append(f"Overall confidence score ({confidence:.2f}) below threshold ({self.min_confidence_threshold})")
        
        logger.info(f"Validation completed for {parsed_doc.filename}: {'PASSED' if is_valid else 'FAILED'}")
        
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            confidence_score=confidence,
            quality_metrics=quality_metrics
        )
    
    def _validate_document_quality(self, parsed_doc: ParsedDocument) -> Dict[str, Any]:
        """Validate overall document quality"""
        errors = []
        warnings = []
        metrics = {}
        
        # Check if document has any content
        if not parsed_doc.text or len(parsed_doc.text.strip()) < 100:
            errors.append("Document text is too short or empty")
        
        # Check confidence score
        if parsed_doc.confidence_score < 0.2:
            errors.append("Document confidence score is very low")
        elif parsed_doc.confidence_score < 0.5:
            warnings.append("Document confidence score is moderate")
        
        # Check if any VOFC data was extracted
        total_items = len(parsed_doc.questions) + len(parsed_doc.vulnerabilities) + len(parsed_doc.ofcs)
        if total_items == 0:
            errors.append("No VOFC data extracted from document")
        elif total_items < 3:
            warnings.append("Very few VOFC items extracted from document")
        
        # Check text quality indicators
        text_quality = self._assess_text_quality(parsed_doc.text)
        metrics['text_quality'] = text_quality
        
        if text_quality['security_relevance'] < 0.3:
            warnings.append("Document appears to have low security relevance")
        
        return {
            'errors': errors,
            'warnings': warnings,
            'metrics': metrics
        }
    
    def _validate_questions(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate extracted questions"""
        errors = []
        warnings = []
        metrics = {
            'total_count': len(questions),
            'valid_count': 0,
            'avg_confidence': 0.0,
            'quality_score': 0.0
        }
        
        if not questions:
            warnings.append("No questions extracted")
            return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
        
        valid_questions = []
        confidences = []
        
        for question in questions:
            question_text = question.get('text', '')
            
            # Check minimum length
            if len(question_text) < self.min_question_length:
                errors.append(f"Question too short: '{question_text[:50]}...'")
                continue
            
            # Check if it's actually a question
            if not self._is_valid_question(question_text):
                warnings.append(f"Question may not be valid: '{question_text[:50]}...'")
            
            # Check for security relevance
            if not self._has_security_relevance(question_text):
                warnings.append(f"Question may not be security-related: '{question_text[:50]}...'")
            
            valid_questions.append(question)
            confidences.append(question.get('confidence', 0.5))
        
        metrics['valid_count'] = len(valid_questions)
        metrics['avg_confidence'] = sum(confidences) / len(confidences) if confidences else 0
        metrics['quality_score'] = len(valid_questions) / len(questions) if questions else 0
        
        return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
    
    def _validate_vulnerabilities(self, vulnerabilities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate extracted vulnerabilities"""
        errors = []
        warnings = []
        metrics = {
            'total_count': len(vulnerabilities),
            'valid_count': 0,
            'avg_confidence': 0.0,
            'quality_score': 0.0
        }
        
        if not vulnerabilities:
            warnings.append("No vulnerabilities extracted")
            return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
        
        valid_vulns = []
        confidences = []
        
        for vuln in vulnerabilities:
            vuln_name = vuln.get('name', '')
            
            # Check minimum length
            if len(vuln_name) < self.min_vulnerability_length:
                errors.append(f"Vulnerability name too short: '{vuln_name}'")
                continue
            
            # Check for security relevance
            if not self._has_security_relevance(vuln_name):
                warnings.append(f"Vulnerability may not be security-related: '{vuln_name}'")
            
            valid_vulns.append(vuln)
            confidences.append(vuln.get('confidence', 0.5))
        
        metrics['valid_count'] = len(valid_vulns)
        metrics['avg_confidence'] = sum(confidences) / len(confidences) if confidences else 0
        metrics['quality_score'] = len(valid_vulns) / len(vulnerabilities) if vulnerabilities else 0
        
        return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
    
    def _validate_ofcs(self, ofcs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate extracted Options for Consideration"""
        errors = []
        warnings = []
        metrics = {
            'total_count': len(ofcs),
            'valid_count': 0,
            'avg_confidence': 0.0,
            'quality_score': 0.0
        }
        
        if not ofcs:
            warnings.append("No OFCs extracted")
            return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
        
        valid_ofcs = []
        confidences = []
        
        for ofc in ofcs:
            ofc_text = ofc.get('text', '')
            
            # Check minimum length
            if len(ofc_text) < self.min_ofc_length:
                errors.append(f"OFC text too short: '{ofc_text[:50]}...'")
                continue
            
            # Check for security relevance
            if not self._has_security_relevance(ofc_text):
                warnings.append(f"OFC may not be security-related: '{ofc_text[:50]}...'")
            
            # Check for action-oriented language
            if not self._is_action_oriented(ofc_text):
                warnings.append(f"OFC may not be action-oriented: '{ofc_text[:50]}...'")
            
            valid_ofcs.append(ofc)
            confidences.append(ofc.get('confidence', 0.5))
        
        metrics['valid_count'] = len(valid_ofcs)
        metrics['avg_confidence'] = sum(confidences) / len(confidences) if confidences else 0
        metrics['quality_score'] = len(valid_ofcs) / len(ofcs) if ofcs else 0
        
        return {'errors': errors, 'warnings': warnings, 'metrics': metrics}
    
    def _is_valid_question(self, text: str) -> bool:
        """Check if text is a valid question"""
        # Check for question mark
        if not text.strip().endswith('?'):
            return False
        
        # Check for question words
        question_words = ['what', 'how', 'when', 'where', 'why', 'who', 'which', 'does', 'do', 'is', 'are', 'can', 'could', 'should', 'would']
        text_lower = text.lower()
        
        return any(word in text_lower for word in question_words)
    
    def _has_security_relevance(self, text: str) -> bool:
        """Check if text has security relevance"""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.security_keywords)
    
    def _is_action_oriented(self, text: str) -> bool:
        """Check if text is action-oriented (for OFCs)"""
        action_words = ['implement', 'establish', 'create', 'develop', 'deploy', 'configure', 'enable', 'disable', 'monitor', 'review', 'update', 'maintain']
        text_lower = text.lower()
        
        return any(word in text_lower for word in action_words)
    
    def _assess_text_quality(self, text: str) -> Dict[str, float]:
        """Assess the quality of extracted text"""
        if not text:
            return {'security_relevance': 0.0, 'readability': 0.0, 'completeness': 0.0}
        
        # Security relevance
        security_count = sum(1 for keyword in self.security_keywords if keyword in text.lower())
        security_relevance = min(security_count / len(self.security_keywords), 1.0)
        
        # Readability (simple heuristic based on sentence structure)
        sentences = re.split(r'[.!?]+', text)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        readability = max(0, 1 - (avg_sentence_length - 15) / 30)  # Optimal around 15 words per sentence
        
        # Completeness (based on text length and structure)
        word_count = len(text.split())
        completeness = min(word_count / 500, 1.0)  # Assume 500 words is a reasonable minimum
        
        return {
            'security_relevance': security_relevance,
            'readability': readability,
            'completeness': completeness
        }
    
    def _calculate_overall_confidence(self, parsed_doc: ParsedDocument, quality_metrics: Dict[str, Any]) -> float:
        """Calculate overall confidence score"""
        # Base confidence from parser
        base_confidence = parsed_doc.confidence_score
        
        # Adjust based on quality metrics
        text_quality = quality_metrics.get('text_quality', {})
        questions_quality = quality_metrics.get('questions', {})
        vulns_quality = quality_metrics.get('vulnerabilities', {})
        ofcs_quality = quality_metrics.get('ofcs', {})
        
        # Weight different factors
        weights = {
            'base': 0.3,
            'text_quality': 0.2,
            'questions': 0.2,
            'vulnerabilities': 0.15,
            'ofcs': 0.15
        }
        
        confidence = base_confidence * weights['base']
        
        # Add text quality contribution
        if text_quality:
            avg_text_quality = sum(text_quality.values()) / len(text_quality)
            confidence += avg_text_quality * weights['text_quality']
        
        # Add questions quality contribution
        if questions_quality:
            confidence += questions_quality.get('quality_score', 0) * weights['questions']
        
        # Add vulnerabilities quality contribution
        if vulns_quality:
            confidence += vulns_quality.get('quality_score', 0) * weights['vulnerabilities']
        
        # Add OFCs quality contribution
        if ofcs_quality:
            confidence += ofcs_quality.get('quality_score', 0) * weights['ofcs']
        
        return min(confidence, 1.0)
    
    def validate_batch(self, parsed_docs: List[ParsedDocument]) -> List[ValidationResult]:
        """Validate multiple documents in batch"""
        results = []
        
        for doc in parsed_docs:
            try:
                result = self.validate_document(doc)
                results.append(result)
            except Exception as e:
                logger.error(f"Error validating document {doc.filename}: {e}")
                results.append(ValidationResult(
                    is_valid=False,
                    errors=[str(e)],
                    warnings=[],
                    confidence_score=0.0,
                    quality_metrics={}
                ))
        
        return results
