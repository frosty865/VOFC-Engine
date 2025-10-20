"""
VOFC Document Ingestion Pipeline

This module orchestrates the complete process of parsing, validating, and inserting
VOFC data from documents into the database.
"""

import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
from dataclasses import dataclass
from datetime import datetime

from ..parsers.pdf_parser import PDFParser, ParsedDocument
from ..pipelines.validation_pipeline import ValidationPipeline
from ..db.supabase_client import SupabaseClient
from ..utils.config_loader import ConfigLoader
from ..utils.logging import setup_logging

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    """Result of document ingestion process"""
    document_name: str
    success: bool
    questions_count: int
    vulnerabilities_count: int
    ofcs_count: int
    confidence_score: float
    errors: List[str]
    processing_time: float


class IngestionPipeline:
    """Main pipeline for ingesting VOFC documents"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the ingestion pipeline
        
        Args:
            config_path: Path to configuration file
        """
        self.config = ConfigLoader(config_path).load()
        self.parser = PDFParser(self.config.get('parser', {}))
        self.validator = ValidationPipeline(self.config.get('validation', {}))
        self.db_client = SupabaseClient(self.config.get('database', {}))
        
        # Setup logging
        setup_logging(self.config.get('logging', {}))
        
        logger.info("Ingestion pipeline initialized")
    
    async def process_document(self, file_path: str) -> IngestionResult:
        """
        Process a single document through the complete pipeline
        
        Args:
            file_path: Path to the document to process
            
        Returns:
            IngestionResult with processing details
        """
        start_time = datetime.now()
        errors = []
        
        try:
            logger.info(f"Starting processing of document: {file_path}")
            
            # Step 1: Parse document
            logger.info("Step 1: Parsing document")
            parsed_doc = self.parser.parse_document(file_path)
            
            if parsed_doc.confidence_score < 0.3:
                errors.append(f"Low confidence score ({parsed_doc.confidence_score:.2f}) - document may not contain VOFC data")
            
            # Step 2: Validate extracted data
            logger.info("Step 2: Validating extracted data")
            validation_result = self.validator.validate_document(parsed_doc)
            
            if not validation_result.is_valid:
                errors.extend(validation_result.errors)
                logger.warning(f"Validation failed for {file_path}: {validation_result.errors}")
            
            # Step 3: Prepare data for database insertion
            logger.info("Step 3: Preparing data for database")
            db_data = self._prepare_database_data(parsed_doc, validation_result)
            
            # Step 4: Insert into database
            logger.info("Step 4: Inserting data into database")
            insertion_result = await self._insert_data(db_data)
            
            if not insertion_result['success']:
                errors.extend(insertion_result['errors'])
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return IngestionResult(
                document_name=Path(file_path).name,
                success=len(errors) == 0,
                questions_count=len(parsed_doc.questions),
                vulnerabilities_count=len(parsed_doc.vulnerabilities),
                ofcs_count=len(parsed_doc.ofcs),
                confidence_score=parsed_doc.confidence_score,
                errors=errors,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return IngestionResult(
                document_name=Path(file_path).name,
                success=False,
                questions_count=0,
                vulnerabilities_count=0,
                ofcs_count=0,
                confidence_score=0.0,
                errors=[str(e)],
                processing_time=processing_time
            )
    
    async def process_batch(self, file_paths: List[str]) -> List[IngestionResult]:
        """
        Process multiple documents in batch
        
        Args:
            file_paths: List of file paths to process
            
        Returns:
            List of IngestionResult objects
        """
        logger.info(f"Starting batch processing of {len(file_paths)} documents")
        
        # Process documents concurrently (with limit to avoid overwhelming the system)
        semaphore = asyncio.Semaphore(self.config.get('max_concurrent', 3))
        
        async def process_with_semaphore(file_path):
            async with semaphore:
                return await self.process_document(file_path)
        
        tasks = [process_with_semaphore(path) for path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions that occurred
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception processing {file_paths[i]}: {result}")
                processed_results.append(IngestionResult(
                    document_name=Path(file_paths[i]).name,
                    success=False,
                    questions_count=0,
                    vulnerabilities_count=0,
                    ofcs_count=0,
                    confidence_score=0.0,
                    errors=[str(result)],
                    processing_time=0.0
                ))
            else:
                processed_results.append(result)
        
        # Log summary
        successful = sum(1 for r in processed_results if r.success)
        total_questions = sum(r.questions_count for r in processed_results)
        total_vulnerabilities = sum(r.vulnerabilities_count for r in processed_results)
        total_ofcs = sum(r.ofcs_count for r in processed_results)
        
        logger.info(f"Batch processing completed: {successful}/{len(file_paths)} successful")
        logger.info(f"Total extracted: {total_questions} questions, {total_vulnerabilities} vulnerabilities, {total_ofcs} OFCs")
        
        return processed_results
    
    def _prepare_database_data(self, parsed_doc: ParsedDocument, validation_result) -> Dict[str, Any]:
        """Prepare parsed data for database insertion"""
        # Add sector information (default to General if not specified)
        sector_id = parsed_doc.metadata.get('sector_id', 1)
        
        # Prepare questions data
        questions_data = []
        for i, question in enumerate(parsed_doc.questions):
            questions_data.append({
                'question_text': question['text'],
                'sector_id': sector_id,
                'display_order': i + 1,
                'parent_id': None,  # Could be enhanced to detect parent-child relationships
                'conditional_trigger': None,
                'technology_class': self._extract_technology_class(question['text']),
                'confidence_score': question.get('confidence', 0.5),
                'source_document': parsed_doc.filename
            })
        
        # Prepare vulnerabilities data
        vulnerabilities_data = []
        for vuln in parsed_doc.vulnerabilities:
            vulnerabilities_data.append({
                'vulnerability_name': vuln['name'],
                'description': vuln['name'],  # Use name as description for now
                'confidence_score': vuln.get('confidence', 0.5),
                'source_document': parsed_doc.filename
            })
        
        # Prepare OFCs data
        ofcs_data = []
        for ofc in parsed_doc.ofcs:
            ofcs_data.append({
                'ofc_text': ofc['text'],
                'technology_class': self._extract_technology_class(ofc['text']),
                'source_doc': parsed_doc.filename,
                'effort_level': self._estimate_effort_level(ofc['text']),
                'effectiveness': self._estimate_effectiveness(ofc['text']),
                'confidence_score': ofc.get('confidence', 0.5)
            })
        
        return {
            'questions': questions_data,
            'vulnerabilities': vulnerabilities_data,
            'ofcs': ofcs_data,
            'metadata': {
                'source_document': parsed_doc.filename,
                'confidence_score': parsed_doc.confidence_score,
                'processing_timestamp': datetime.now().isoformat(),
                'validation_passed': validation_result.is_valid
            }
        }
    
    def _extract_technology_class(self, text: str) -> str:
        """Extract technology class from text"""
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ['network', 'firewall', 'router', 'switch']):
            return 'Network Security'
        elif any(keyword in text_lower for keyword in ['database', 'sql', 'data', 'storage']):
            return 'Data Security'
        elif any(keyword in text_lower for keyword in ['application', 'web', 'api', 'software']):
            return 'Application Security'
        elif any(keyword in text_lower for keyword in ['cloud', 'aws', 'azure', 'gcp']):
            return 'Cloud Security'
        elif any(keyword in text_lower for keyword in ['mobile', 'device', 'endpoint']):
            return 'Endpoint Security'
        else:
            return 'General Security'
    
    def _estimate_effort_level(self, text: str) -> str:
        """Estimate effort level for an OFC"""
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ['simple', 'basic', 'quick', 'easy']):
            return 'Low'
        elif any(keyword in text_lower for keyword in ['complex', 'comprehensive', 'extensive', 'major']):
            return 'High'
        else:
            return 'Medium'
    
    def _estimate_effectiveness(self, text: str) -> str:
        """Estimate effectiveness for an OFC"""
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ['critical', 'essential', 'vital', 'key']):
            return 'High'
        elif any(keyword in text_lower for keyword in ['optional', 'supplementary', 'additional']):
            return 'Low'
        else:
            return 'Medium'
    
    async def _insert_data(self, db_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert data into the database"""
        try:
            # Insert questions
            if db_data['questions']:
                questions_result = await self.db_client.insert_questions(db_data['questions'])
                if not questions_result['success']:
                    return {'success': False, 'errors': questions_result['errors']}
            
            # Insert vulnerabilities
            if db_data['vulnerabilities']:
                vulns_result = await self.db_client.insert_vulnerabilities(db_data['vulnerabilities'])
                if not vulns_result['success']:
                    return {'success': False, 'errors': vulns_result['errors']}
            
            # Insert OFCs
            if db_data['ofcs']:
                ofcs_result = await self.db_client.insert_ofcs(db_data['ofcs'])
                if not ofcs_result['success']:
                    return {'success': False, 'errors': ofcs_result['errors']}
            
            return {'success': True, 'errors': []}
            
        except Exception as e:
            logger.error(f"Error inserting data: {e}")
            return {'success': False, 'errors': [str(e)]}
    
    def get_processing_stats(self, results: List[IngestionResult]) -> Dict[str, Any]:
        """Get processing statistics from results"""
        total_documents = len(results)
        successful = sum(1 for r in results if r.success)
        failed = total_documents - successful
        
        total_questions = sum(r.questions_count for r in results)
        total_vulnerabilities = sum(r.vulnerabilities_count for r in results)
        total_ofcs = sum(r.ofcs_count for r in results)
        
        avg_confidence = sum(r.confidence_score for r in results) / total_documents if total_documents > 0 else 0
        avg_processing_time = sum(r.processing_time for r in results) / total_documents if total_documents > 0 else 0
        
        return {
            'total_documents': total_documents,
            'successful': successful,
            'failed': failed,
            'success_rate': successful / total_documents if total_documents > 0 else 0,
            'total_questions': total_questions,
            'total_vulnerabilities': total_vulnerabilities,
            'total_ofcs': total_ofcs,
            'average_confidence': avg_confidence,
            'average_processing_time': avg_processing_time
        }
