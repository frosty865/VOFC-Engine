"""
PDF Parser for VOFC Documents

This module provides functionality to extract text and structured data from PDF documents
containing VOFC (Vulnerability and Options for Consideration Engine) information.
"""

import fitz  # PyMuPDF
import pdfplumber
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Generator
from dataclasses import dataclass
import logging
import re
import json
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ParsedDocument:
    """Container for parsed document data"""
    filename: str
    text: str
    questions: List[Dict[str, Any]]
    vulnerabilities: List[Dict[str, Any]]
    ofcs: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    confidence_score: float


class PDFParser:
    """Parser for extracting VOFC data from PDF documents"""
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize the PDF parser
        
        Args:
            config: Configuration dictionary for parsing options
        """
        self.config = config or {}
        self.question_patterns = self._load_question_patterns()
        self.vulnerability_patterns = self._load_vulnerability_patterns()
        self.ofc_patterns = self._load_ofc_patterns()
        
        # Enhanced classification patterns
        self.ofc_keywords = ['best practice', 'recommend', 'consider', 'should', 'implement', 
                            'establish', 'create', 'develop', 'deploy', 'configure']
        self.vulnerability_keywords = ['vulnerability', 'risk', 'weakness', 'gap', 'threat', 
                                     'exposure', 'deficiency']
        self.question_keywords = ['does the', 'is there', 'are there', 'do you', 'have you', 
                                'can you', 'should you']
    
    def _load_question_patterns(self) -> List[str]:
        """Load regex patterns for identifying questions"""
        return [
            r'^\d+\.\s+(.+?)(?:\?|$)',  # Numbered questions
            r'^[A-Z][^.]*\.\s+(.+?)(?:\?|$)',  # Questions starting with capital letter
            r'Does\s+.+?\?',  # Questions starting with "Does"
            r'Are\s+.+?\?',   # Questions starting with "Are"
            r'Is\s+.+?\?',    # Questions starting with "Is"
            r'Have\s+.+?\?',  # Questions starting with "Have"
            r'Do\s+.+?\?',    # Questions starting with "Do"
        ]
    
    def _load_vulnerability_patterns(self) -> List[str]:
        """Load regex patterns for identifying vulnerabilities"""
        return [
            r'vulnerability[:\s]+(.+?)(?:\n|$)',  # Lines starting with "vulnerability:"
            r'risk[:\s]+(.+?)(?:\n|$)',          # Lines starting with "risk:"
            r'threat[:\s]+(.+?)(?:\n|$)',        # Lines starting with "threat:"
            r'weakness[:\s]+(.+?)(?:\n|$)',      # Lines starting with "weakness:"
        ]
    
    def _load_ofc_patterns(self) -> List[str]:
        """Load regex patterns for identifying Options for Consideration"""
        return [
            r'option[:\s]+(.+?)(?:\n|$)',        # Lines starting with "option:"
            r'recommendation[:\s]+(.+?)(?:\n|$)', # Lines starting with "recommendation:"
            r'consideration[:\s]+(.+?)(?:\n|$)', # Lines starting with "consideration:"
            r'mitigation[:\s]+(.+?)(?:\n|$)',    # Lines starting with "mitigation:"
            r'control[:\s]+(.+?)(?:\n|$)',       # Lines starting with "control:"
        ]
    
    def parse_document(self, file_path: str) -> ParsedDocument:
        """
        Parse a PDF document and extract VOFC data
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            ParsedDocument containing extracted data
        """
        logger.info(f"Parsing document: {file_path}")
        
        # Extract text using both PyMuPDF and pdfplumber for better coverage
        text_pymupdf = self._extract_text_pymupdf(file_path)
        text_pdfplumber = self._extract_text_pdfplumber(file_path)
        
        # Combine and clean text
        combined_text = self._combine_texts(text_pymupdf, text_pdfplumber)
        
        # Extract structured data
        questions = self._extract_questions(combined_text)
        vulnerabilities = self._extract_vulnerabilities(combined_text)
        ofcs = self._extract_ofcs(combined_text)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(questions, vulnerabilities, ofcs)
        
        # Extract metadata
        metadata = self._extract_metadata(file_path)
        
        return ParsedDocument(
            filename=Path(file_path).name,
            text=combined_text,
            questions=questions,
            vulnerabilities=vulnerabilities,
            ofcs=ofcs,
            metadata=metadata,
            confidence_score=confidence
        )
    
    def _extract_text_pymupdf(self, file_path: str) -> str:
        """Extract text using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            logger.error(f"Error extracting text with PyMuPDF: {e}")
            return ""
    
    def _extract_text_pdfplumber(self, file_path: str) -> str:
        """Extract text using pdfplumber"""
        try:
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except Exception as e:
            logger.error(f"Error extracting text with pdfplumber: {e}")
            return ""
    
    def _combine_texts(self, text1: str, text2: str) -> str:
        """Combine and clean texts from different extractors"""
        # Use the longer text as base, fill gaps with shorter text
        if len(text1) > len(text2):
            base_text = text1
            fill_text = text2
        else:
            base_text = text2
            fill_text = text1
        
        # Clean and normalize
        combined = base_text
        combined = re.sub(r'\s+', ' ', combined)  # Normalize whitespace
        combined = combined.strip()
        
        return combined
    
    def _extract_questions(self, text: str) -> List[Dict[str, Any]]:
        """Extract questions from text"""
        questions = []
        
        for pattern in self.question_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                question_text = match.group(1).strip() if match.groups() else match.group(0).strip()
                if len(question_text) > 10:  # Filter out very short matches
                    questions.append({
                        'text': question_text,
                        'pattern_used': pattern,
                        'confidence': self._calculate_pattern_confidence(question_text, pattern)
                    })
        
        # Remove duplicates and sort by confidence
        unique_questions = self._deduplicate_items(questions, 'text')
        return sorted(unique_questions, key=lambda x: x['confidence'], reverse=True)
    
    def _extract_vulnerabilities(self, text: str) -> List[Dict[str, Any]]:
        """Extract vulnerabilities from text"""
        vulnerabilities = []
        
        for pattern in self.vulnerability_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                vuln_text = match.group(1).strip() if match.groups() else match.group(0).strip()
                if len(vuln_text) > 5:
                    vulnerabilities.append({
                        'name': vuln_text,
                        'pattern_used': pattern,
                        'confidence': self._calculate_pattern_confidence(vuln_text, pattern)
                    })
        
        unique_vulns = self._deduplicate_items(vulnerabilities, 'name')
        return sorted(unique_vulns, key=lambda x: x['confidence'], reverse=True)
    
    def _extract_ofcs(self, text: str) -> List[Dict[str, Any]]:
        """Extract Options for Consideration from text"""
        ofcs = []
        
        for pattern in self.ofc_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                ofc_text = match.group(1).strip() if match.groups() else match.group(0).strip()
                if len(ofc_text) > 10:
                    ofcs.append({
                        'text': ofc_text,
                        'pattern_used': pattern,
                        'confidence': self._calculate_pattern_confidence(ofc_text, pattern)
                    })
        
        unique_ofcs = self._deduplicate_items(ofcs, 'text')
        return sorted(unique_ofcs, key=lambda x: x['confidence'], reverse=True)
    
    def _calculate_pattern_confidence(self, text: str, pattern: str) -> float:
        """Calculate confidence score for a pattern match"""
        base_confidence = 0.5
        
        # Boost confidence for longer, more detailed text
        length_boost = min(len(text) / 100, 0.3)
        
        # Boost confidence for specific keywords
        keyword_boost = 0
        keywords = ['security', 'access', 'control', 'authentication', 'authorization', 
                   'encryption', 'monitoring', 'incident', 'response', 'training']
        for keyword in keywords:
            if keyword.lower() in text.lower():
                keyword_boost += 0.05
        
        return min(base_confidence + length_boost + keyword_boost, 1.0)
    
    def _deduplicate_items(self, items: List[Dict], key_field: str) -> List[Dict]:
        """Remove duplicate items based on a key field"""
        seen = set()
        unique_items = []
        
        for item in items:
            key = item[key_field].lower().strip()
            if key not in seen:
                seen.add(key)
                unique_items.append(item)
        
        return unique_items
    
    def _calculate_confidence(self, questions: List, vulnerabilities: List, ofcs: List) -> float:
        """Calculate overall confidence score for the parsed document"""
        if not questions and not vulnerabilities and not ofcs:
            return 0.0
        
        # Weight different types of content
        question_weight = 0.4
        vuln_weight = 0.3
        ofc_weight = 0.3
        
        # Calculate weighted average confidence
        total_confidence = 0
        total_weight = 0
        
        if questions:
            avg_question_conf = sum(q.get('confidence', 0.5) for q in questions) / len(questions)
            total_confidence += avg_question_conf * question_weight
            total_weight += question_weight
        
        if vulnerabilities:
            avg_vuln_conf = sum(v.get('confidence', 0.5) for v in vulnerabilities) / len(vulnerabilities)
            total_confidence += avg_vuln_conf * vuln_weight
            total_weight += vuln_weight
        
        if ofcs:
            avg_ofc_conf = sum(o.get('confidence', 0.5) for o in ofcs) / len(ofcs)
            total_confidence += avg_ofc_conf * ofc_weight
            total_weight += ofc_weight
        
        return total_confidence / total_weight if total_weight > 0 else 0.0
    
    def _extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from the document"""
        try:
            doc = fitz.open(file_path)
            metadata = doc.metadata
            doc.close()
            
            return {
                'title': metadata.get('title', ''),
                'author': metadata.get('author', ''),
                'subject': metadata.get('subject', ''),
                'creator': metadata.get('creator', ''),
                'producer': metadata.get('producer', ''),
                'creation_date': metadata.get('creationDate', ''),
                'modification_date': metadata.get('modDate', ''),
                'file_size': Path(file_path).stat().st_size,
                'page_count': len(doc) if 'doc' in locals() else 0
            }
        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")
            return {'error': str(e)}
    
    def batch_parse(self, file_paths: List[str]) -> List[ParsedDocument]:
        """
        Parse multiple documents in batch
        
        Args:
            file_paths: List of file paths to parse
            
        Returns:
            List of ParsedDocument objects
        """
        results = []
        
        for file_path in file_paths:
            try:
                result = self.parse_document(file_path)
                results.append(result)
            except Exception as e:
                logger.error(f"Error parsing {file_path}: {e}")
                # Create error result
                results.append(ParsedDocument(
                    filename=Path(file_path).name,
                    text="",
                    questions=[],
                    vulnerabilities=[],
                    ofcs=[],
                    metadata={'error': str(e)},
                    confidence_score=0.0
                ))
        
        return results
    
    def extract_text_blocks(self, pdf_path: str) -> Generator[Tuple[int, str], None, None]:
        """
        Extract text from PDF by page.
        
        Args:
            pdf_path: Path to the PDF file
            
        Yields:
            Tuple of (page_number, text_content)
        """
        try:
            doc = fitz.open(pdf_path)
            for page_number, page in enumerate(doc, start=1):
                text = page.get_text("text")
                yield page_number, text
            doc.close()
        except Exception as e:
            logger.error(f"Error extracting text blocks from {pdf_path}: {e}")
            yield 0, ""
    
    def classify_block(self, text_block: str) -> Optional[str]:
        """
        Classify text as Question, Vulnerability, or OFC based on heuristics.
        
        Args:
            text_block: Text content to classify
            
        Returns:
            Classification type or None
        """
        text_lower = text_block.lower()
        
        # Check for OFC indicators
        ofc_score = sum(1 for keyword in self.ofc_keywords if keyword in text_lower)
        if ofc_score > 0:
            return "OFC"
        
        # Check for vulnerability indicators
        vuln_score = sum(1 for keyword in self.vulnerability_keywords if keyword in text_lower)
        if vuln_score > 0:
            return "Vulnerability"
        
        # Check for question indicators
        question_score = sum(1 for keyword in self.question_keywords if keyword in text_lower)
        if question_score > 0:
            return "Question"
        
        # Additional heuristics
        if re.search(r'\b(best practice|recommend|consider|should|implement)\b', text_block, re.I):
            return "OFC"
        elif re.search(r'\b(vulnerability|risk|weakness|gap)\b', text_block, re.I):
            return "Vulnerability"
        elif re.search(r'\b(does the|is there|are there)\b', text_block, re.I):
            return "Question"
        
        return None
    
    def parse_pdf_to_vofc(self, pdf_path: str, source_doc: str) -> List[Dict[str, Any]]:
        """
        Parse a PDF file into VOFC-compatible structured records.
        
        Args:
            pdf_path: Path to the PDF file
            source_doc: Source document identifier
            
        Returns:
            List of structured VOFC records
        """
        results = []
        
        try:
            for page_num, text in self.extract_text_blocks(pdf_path):
                # Split text into blocks (separated by multiple newlines)
                blocks = [b.strip() for b in re.split(r'\n{2,}', text) if len(b.strip()) > 40]
                
                for block in blocks:
                    record_type = self.classify_block(block)
                    if record_type:
                        results.append({
                            "record_type": record_type,
                            "record_text": block,
                            "source_file": pdf_path,
                            "source_doc": source_doc,
                            "page_number": page_num,
                            "validation_status": "Pending",
                            "extracted_at": datetime.utcnow().isoformat(),
                            "confidence_score": self._calculate_block_confidence(block, record_type)
                        })
            
            logger.info(f"Parsed {len(results)} VOFC records from {pdf_path}")
            return results
            
        except Exception as e:
            logger.error(f"Error parsing PDF to VOFC format: {e}")
            return []
    
    def _calculate_block_confidence(self, text_block: str, record_type: str) -> float:
        """
        Calculate confidence score for a classified text block.
        
        Args:
            text_block: Text content
            record_type: Classified type
            
        Returns:
            Confidence score between 0 and 1
        """
        base_confidence = 0.5
        text_lower = text_block.lower()
        
        # Length bonus
        length_bonus = min(len(text_block) / 200, 0.3)
        
        # Keyword density bonus
        if record_type == "OFC":
            keyword_count = sum(1 for keyword in self.ofc_keywords if keyword in text_lower)
        elif record_type == "Vulnerability":
            keyword_count = sum(1 for keyword in self.vulnerability_keywords if keyword in text_lower)
        elif record_type == "Question":
            keyword_count = sum(1 for keyword in self.question_keywords if keyword in text_lower)
        else:
            keyword_count = 0
        
        keyword_bonus = min(keyword_count * 0.1, 0.2)
        
        return min(base_confidence + length_bonus + keyword_bonus, 1.0)
    
    def save_vofc_json(self, records: List[Dict[str, Any]], output_path: str) -> bool:
        """
        Save parsed records as JSON for manual validation or staging.
        
        Args:
            records: List of VOFC records
            output_path: Output file path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved {len(records)} VOFC records to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving VOFC JSON: {e}")
            return False
    
    def parse_pdf_enhanced(self, file_path: str) -> ParsedDocument:
        """
        Enhanced PDF parsing using the new VOFC-focused approach.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            ParsedDocument with enhanced extraction
        """
        logger.info(f"Enhanced parsing of document: {file_path}")
        
        # Use the new VOFC-focused parsing
        vofc_records = self.parse_pdf_to_vofc(file_path, Path(file_path).name)
        
        # Convert to the existing format
        questions = []
        vulnerabilities = []
        ofcs = []
        
        for record in vofc_records:
            if record["record_type"] == "Question":
                questions.append({
                    'text': record["record_text"],
                    'confidence': record["confidence_score"],
                    'source_document': record["source_file"],
                    'page_number': record["page_number"]
                })
            elif record["record_type"] == "Vulnerability":
                vulnerabilities.append({
                    'name': record["record_text"][:100] + "..." if len(record["record_text"]) > 100 else record["record_text"],
                    'confidence': record["confidence_score"],
                    'source_document': record["source_file"],
                    'page_number': record["page_number"]
                })
            elif record["record_type"] == "OFC":
                ofcs.append({
                    'text': record["record_text"],
                    'confidence': record["confidence_score"],
                    'source_document': record["source_file"],
                    'page_number': record["page_number"]
                })
        
        # Calculate overall confidence
        all_confidences = [r["confidence_score"] for r in vofc_records]
        overall_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        
        # Extract metadata
        metadata = self._extract_metadata(file_path)
        metadata.update({
            'vofc_records_count': len(vofc_records),
            'parsing_method': 'enhanced_vofc'
        })
        
        return ParsedDocument(
            filename=Path(file_path).name,
            text="",  # Not storing full text in enhanced mode
            questions=questions,
            vulnerabilities=vulnerabilities,
            ofcs=ofcs,
            metadata=metadata,
            confidence_score=overall_confidence
        )
