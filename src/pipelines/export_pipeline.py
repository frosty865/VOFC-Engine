"""
VOFC Data Export Pipeline

This module provides functionality for exporting VOFC data in various formats
for analysis, reporting, and integration with other systems.
"""

import logging
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import json
import csv
import pandas as pd
from datetime import datetime
from dataclasses import dataclass, asdict

from ..db.supabase_client import SupabaseClient
from ..utils.config_loader import ConfigLoader

logger = logging.getLogger(__name__)


@dataclass
class ExportResult:
    """Result of data export operation"""
    success: bool
    file_path: str
    record_count: int
    export_format: str
    errors: List[str]
    processing_time: float


class ExportPipeline:
    """Pipeline for exporting VOFC data in various formats"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the export pipeline
        
        Args:
            config_path: Path to configuration file
        """
        self.config = ConfigLoader(config_path).load()
        self.db_client = SupabaseClient(self.config.get('database', {}))
        self.export_dir = Path(self.config.get('export', {}).get('output_directory', './exports'))
        self.export_dir.mkdir(exist_ok=True)
        
        logger.info("Export pipeline initialized")
    
    async def export_questions(self, 
                             sector_id: Optional[int] = None,
                             format: str = 'json',
                             output_file: Optional[str] = None) -> ExportResult:
        """
        Export questions data
        
        Args:
            sector_id: Filter by sector ID (None for all sectors)
            format: Export format ('json', 'csv', 'excel')
            output_file: Custom output file path
            
        Returns:
            ExportResult with export details
        """
        start_time = datetime.now()
        errors = []
        
        try:
            logger.info(f"Exporting questions (sector_id={sector_id}, format={format})")
            
            # Fetch questions from database
            questions = await self.db_client.get_questions(sector_id=sector_id)
            
            if not questions:
                errors.append("No questions found for the specified criteria")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            # Generate output file path
            if not output_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                sector_suffix = f"_sector_{sector_id}" if sector_id else "_all_sectors"
                output_file = self.export_dir / f"questions_{timestamp}{sector_suffix}.{format}"
            
            # Export based on format
            if format == 'json':
                await self._export_json(questions, output_file)
            elif format == 'csv':
                await self._export_csv(questions, output_file)
            elif format == 'excel':
                await self._export_excel(questions, output_file, 'Questions')
            else:
                errors.append(f"Unsupported export format: {format}")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=True,
                file_path=str(output_file),
                record_count=len(questions),
                export_format=format,
                errors=[],
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error exporting questions: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=False,
                file_path="",
                record_count=0,
                export_format=format,
                errors=[str(e)],
                processing_time=processing_time
            )
    
    async def export_vulnerabilities(self,
                                   format: str = 'json',
                                   output_file: Optional[str] = None) -> ExportResult:
        """Export vulnerabilities data"""
        start_time = datetime.now()
        errors = []
        
        try:
            logger.info(f"Exporting vulnerabilities (format={format})")
            
            vulnerabilities = await self.db_client.get_vulnerabilities()
            
            if not vulnerabilities:
                errors.append("No vulnerabilities found")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            if not output_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = self.export_dir / f"vulnerabilities_{timestamp}.{format}"
            
            if format == 'json':
                await self._export_json(vulnerabilities, output_file)
            elif format == 'csv':
                await self._export_csv(vulnerabilities, output_file)
            elif format == 'excel':
                await self._export_excel(vulnerabilities, output_file, 'Vulnerabilities')
            else:
                errors.append(f"Unsupported export format: {format}")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=True,
                file_path=str(output_file),
                record_count=len(vulnerabilities),
                export_format=format,
                errors=[],
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error exporting vulnerabilities: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=False,
                file_path="",
                record_count=0,
                export_format=format,
                errors=[str(e)],
                processing_time=processing_time
            )
    
    async def export_ofcs(self,
                        format: str = 'json',
                        output_file: Optional[str] = None) -> ExportResult:
        """Export OFCs data"""
        start_time = datetime.now()
        errors = []
        
        try:
            logger.info(f"Exporting OFCs (format={format})")
            
            ofcs = await self.db_client.get_ofcs()
            
            if not ofcs:
                errors.append("No OFCs found")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            if not output_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = self.export_dir / f"ofcs_{timestamp}.{format}"
            
            if format == 'json':
                await self._export_json(ofcs, output_file)
            elif format == 'csv':
                await self._export_csv(ofcs, output_file)
            elif format == 'excel':
                await self._export_excel(ofcs, output_file, 'OFCs')
            else:
                errors.append(f"Unsupported export format: {format}")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=True,
                file_path=str(output_file),
                record_count=len(ofcs),
                export_format=format,
                errors=[],
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error exporting OFCs: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=False,
                file_path="",
                record_count=0,
                export_format=format,
                errors=[str(e)],
                processing_time=processing_time
            )
    
    async def export_complete_dataset(self,
                                    sector_id: Optional[int] = None,
                                    format: str = 'excel',
                                    output_file: Optional[str] = None) -> ExportResult:
        """Export complete VOFC dataset with all related data"""
        start_time = datetime.now()
        errors = []
        
        try:
            logger.info(f"Exporting complete dataset (sector_id={sector_id}, format={format})")
            
            # Fetch all data
            questions = await self.db_client.get_questions(sector_id=sector_id)
            vulnerabilities = await self.db_client.get_vulnerabilities()
            ofcs = await self.db_client.get_ofcs()
            sectors = await self.db_client.get_sectors()
            
            if not output_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                sector_suffix = f"_sector_{sector_id}" if sector_id else "_all_sectors"
                output_file = self.export_dir / f"vofc_complete_{timestamp}{sector_suffix}.{format}"
            
            if format == 'excel':
                await self._export_excel_complete(
                    questions, vulnerabilities, ofcs, sectors, output_file
                )
            elif format == 'json':
                await self._export_json_complete(
                    questions, vulnerabilities, ofcs, sectors, output_file
                )
            else:
                errors.append(f"Complete dataset export only supports 'excel' and 'json' formats")
                return ExportResult(
                    success=False,
                    file_path="",
                    record_count=0,
                    export_format=format,
                    errors=errors,
                    processing_time=0.0
                )
            
            total_records = len(questions) + len(vulnerabilities) + len(ofcs) + len(sectors)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=True,
                file_path=str(output_file),
                record_count=total_records,
                export_format=format,
                errors=[],
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error exporting complete dataset: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ExportResult(
                success=False,
                file_path="",
                record_count=0,
                export_format=format,
                errors=[str(e)],
                processing_time=processing_time
            )
    
    async def _export_json(self, data: List[Dict], output_file: Path):
        """Export data to JSON format"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    
    async def _export_csv(self, data: List[Dict], output_file: Path):
        """Export data to CSV format"""
        if not data:
            return
        
        df = pd.DataFrame(data)
        df.to_csv(output_file, index=False, encoding='utf-8')
    
    async def _export_excel(self, data: List[Dict], output_file: Path, sheet_name: str):
        """Export data to Excel format"""
        if not data:
            return
        
        df = pd.DataFrame(data)
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    async def _export_excel_complete(self, questions: List[Dict], vulnerabilities: List[Dict], 
                                   ofcs: List[Dict], sectors: List[Dict], output_file: Path):
        """Export complete dataset to Excel with multiple sheets"""
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            if questions:
                pd.DataFrame(questions).to_excel(writer, sheet_name='Questions', index=False)
            if vulnerabilities:
                pd.DataFrame(vulnerabilities).to_excel(writer, sheet_name='Vulnerabilities', index=False)
            if ofcs:
                pd.DataFrame(ofcs).to_excel(writer, sheet_name='OFCs', index=False)
            if sectors:
                pd.DataFrame(sectors).to_excel(writer, sheet_name='Sectors', index=False)
    
    async def _export_json_complete(self, questions: List[Dict], vulnerabilities: List[Dict],
                                  ofcs: List[Dict], sectors: List[Dict], output_file: Path):
        """Export complete dataset to JSON format"""
        complete_data = {
            'metadata': {
                'export_timestamp': datetime.now().isoformat(),
                'total_questions': len(questions),
                'total_vulnerabilities': len(vulnerabilities),
                'total_ofcs': len(ofcs),
                'total_sectors': len(sectors)
            },
            'questions': questions,
            'vulnerabilities': vulnerabilities,
            'ofcs': ofcs,
            'sectors': sectors
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(complete_data, f, indent=2, ensure_ascii=False, default=str)
    
    def get_export_statistics(self, results: List[ExportResult]) -> Dict[str, Any]:
        """Get export statistics from results"""
        total_exports = len(results)
        successful = sum(1 for r in results if r.success)
        failed = total_exports - successful
        
        total_records = sum(r.record_count for r in results)
        avg_processing_time = sum(r.processing_time for r in results) / total_exports if total_exports > 0 else 0
        
        # Group by format
        format_counts = {}
        for result in results:
            fmt = result.export_format
            format_counts[fmt] = format_counts.get(fmt, 0) + 1
        
        return {
            'total_exports': total_exports,
            'successful': successful,
            'failed': failed,
            'success_rate': successful / total_exports if total_exports > 0 else 0,
            'total_records_exported': total_records,
            'average_processing_time': avg_processing_time,
            'format_distribution': format_counts
        }
