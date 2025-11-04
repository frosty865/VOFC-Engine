#!/usr/bin/env python3
"""
Text Cleaner Utilities
Provides text normalization and cleaning functions for VOFC data
"""

import re
import unicodedata
from typing import Dict, List, Any, Optional

def normalize_unicode(text: str) -> str:
    """Normalize Unicode characters"""
    return unicodedata.normalize('NFKD', text)

def remove_extra_whitespace(text: str) -> str:
    """Remove extra whitespace and normalize spacing"""
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    # Remove leading/trailing whitespace
    text = text.strip()
    return text

def clean_bullet_points(text: str) -> str:
    """Clean and normalize bullet points"""
    # Replace various bullet characters with standard bullet
    bullet_chars = ['•', '◦', '▪', '▫', '‣', '⁃', '-', '*']
    for char in bullet_chars:
        text = text.replace(char, '•')
    
    # Ensure proper spacing after bullets
    text = re.sub(r'•\s*', '• ', text)
    
    return text

def normalize_quotes(text: str) -> str:
    """Normalize quote characters"""
    # Replace smart quotes with standard quotes
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(''', "'").replace(''', "'")
    return text

def clean_special_characters(text: str) -> str:
    """Remove or replace special characters"""
    # Remove non-printable characters except newlines and tabs
    text = ''.join(char for char in text if char.isprintable() or char in '\n\t')
    
    # Replace common PDF artifacts
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\"\'\/\n\t]', '', text)
    
    return text

def extract_sentences(text: str) -> List[str]:
    """Extract sentences from text"""
    # Simple sentence splitting (can be improved with NLTK/spaCy)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences

def extract_paragraphs(text: str) -> List[str]:
    """Extract paragraphs from text"""
    paragraphs = text.split('\n\n')
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    return paragraphs

def clean_vulnerability_text(text: str) -> str:
    """Clean vulnerability text specifically"""
    # Remove common prefixes
    prefixes_to_remove = [
        'Vulnerability:', 'Risk:', 'Threat:', 'Issue:', 'Problem:'
    ]
    
    for prefix in prefixes_to_remove:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    
    # Clean the text
    text = normalize_unicode(text)
    text = remove_extra_whitespace(text)
    text = normalize_quotes(text)
    text = clean_special_characters(text)
    
    return text

def clean_ofc_text(text: str) -> str:
    """Clean Options for Consideration text specifically"""
    # Remove common prefixes
    prefixes_to_remove = [
        'Option for Consideration:', 'Recommendation:', 'Mitigation:', 
        'Countermeasure:', 'Solution:', 'Action:'
    ]
    
    for prefix in prefixes_to_remove:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    
    # Clean bullet points
    text = clean_bullet_points(text)
    
    # Clean the text
    text = normalize_unicode(text)
    text = remove_extra_whitespace(text)
    text = normalize_quotes(text)
    text = clean_special_characters(text)
    
    return text

def clean_citation_text(text: str) -> str:
    """Clean citation text specifically"""
    # Remove citation markers
    text = re.sub(r'^\[(\d+)\]', r'\1', text)  # [1] -> 1
    text = re.sub(r'^\(([^)]+)\)', r'\1', text)  # (Author) -> Author
    
    # Clean the text
    text = normalize_unicode(text)
    text = remove_extra_whitespace(text)
    text = normalize_quotes(text)
    text = clean_special_characters(text)
    
    return text

def validate_text_quality(text: str, min_length: int = 10) -> Dict[str, Any]:
    """Validate text quality and return metrics"""
    metrics = {
        'length': len(text),
        'word_count': len(text.split()),
        'sentence_count': len(extract_sentences(text)),
        'paragraph_count': len(extract_paragraphs(text)),
        'has_content': len(text.strip()) >= min_length,
        'quality_score': 0.0
    }
    
    # Calculate quality score
    if metrics['has_content']:
        # Basic quality scoring
        score = 0.0
        
        # Length score (0-0.3)
        if metrics['length'] >= 50:
            score += 0.3
        elif metrics['length'] >= 20:
            score += 0.2
        else:
            score += 0.1
        
        # Word count score (0-0.3)
        if metrics['word_count'] >= 10:
            score += 0.3
        elif metrics['word_count'] >= 5:
            score += 0.2
        else:
            score += 0.1
        
        # Sentence structure score (0-0.4)
        if metrics['sentence_count'] >= 2:
            score += 0.4
        elif metrics['sentence_count'] >= 1:
            score += 0.2
        
        metrics['quality_score'] = min(score, 1.0)
    
    return metrics

def clean_and_validate_text(text: str, text_type: str = 'general') -> Dict[str, Any]:
    """Clean text and return validation results"""
    # Choose appropriate cleaning function
    if text_type == 'vulnerability':
        cleaned_text = clean_vulnerability_text(text)
    elif text_type == 'ofc':
        cleaned_text = clean_ofc_text(text)
    elif text_type == 'citation':
        cleaned_text = clean_citation_text(text)
    else:
        cleaned_text = text
        cleaned_text = normalize_unicode(cleaned_text)
        cleaned_text = remove_extra_whitespace(cleaned_text)
        cleaned_text = normalize_quotes(cleaned_text)
        cleaned_text = clean_special_characters(cleaned_text)
    
    # Validate quality
    validation = validate_text_quality(cleaned_text)
    
    return {
        'original_text': text,
        'cleaned_text': cleaned_text,
        'validation': validation,
        'text_type': text_type
    }
