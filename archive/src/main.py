"""
VOFC Document Processing System - Main Entry Point

This is the main entry point for the VOFC document processing system.
It provides a command-line interface for processing documents, managing data,
and exporting results.
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path
from typing import List, Optional

from pipelines.ingestion_pipeline import IngestionPipeline
from pipelines.export_pipeline import ExportPipeline
from utils.config_loader import ConfigLoader
from utils.logging import setup_logging, create_processing_logger
from utils.constants import ProcessingStatus, ExportFormat


class VOFCProcessor:
    """Main VOFC processing system"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the VOFC processor
        
        Args:
            config_path: Path to configuration file
        """
        self.config = ConfigLoader(config_path).load()
        self.ingestion_pipeline = IngestionPipeline(config_path)
        self.export_pipeline = ExportPipeline(config_path)
        self.logger = create_processing_logger(__name__)
        
        # Setup logging
        setup_logging(self.config.get('logging', {}))
    
    async def process_documents(self, file_paths: List[str]) -> dict:
        """
        Process multiple documents
        
        Args:
            file_paths: List of file paths to process
            
        Returns:
            Processing results
        """
        self.logger.start_processing("document processing", {
            'file_count': len(file_paths),
            'files': file_paths
        })
        
        try:
            # Process documents
            results = await self.ingestion_pipeline.process_batch(file_paths)
            
            # Get statistics
            stats = self.ingestion_pipeline.get_processing_stats(results)
            
            self.logger.finish_processing("document processing", True, stats)
            
            return {
                'success': True,
                'results': results,
                'statistics': stats
            }
            
        except Exception as e:
            self.logger.log_error(e, "document processing")
            self.logger.finish_processing("document processing", False)
            
            return {
                'success': False,
                'error': str(e),
                'results': [],
                'statistics': {}
            }
    
    async def export_data(self, 
                         data_type: str,
                         sector_id: Optional[int] = None,
                         format: str = 'json',
                         output_file: Optional[str] = None) -> dict:
        """
        Export data from the database
        
        Args:
            data_type: Type of data to export ('questions', 'vulnerabilities', 'ofcs', 'complete')
            sector_id: Filter by sector ID (for questions)
            format: Export format ('json', 'csv', 'excel')
            output_file: Output file path
            
        Returns:
            Export results
        """
        self.logger.start_processing("data export", {
            'data_type': data_type,
            'sector_id': sector_id,
            'format': format
        })
        
        try:
            if data_type == 'questions':
                result = await self.export_pipeline.export_questions(
                    sector_id=sector_id,
                    format=format,
                    output_file=output_file
                )
            elif data_type == 'vulnerabilities':
                result = await self.export_pipeline.export_vulnerabilities(
                    format=format,
                    output_file=output_file
                )
            elif data_type == 'ofcs':
                result = await self.export_pipeline.export_ofcs(
                    format=format,
                    output_file=output_file
                )
            elif data_type == 'complete':
                result = await self.export_pipeline.export_complete_dataset(
                    sector_id=sector_id,
                    format=format,
                    output_file=output_file
                )
            else:
                raise ValueError(f"Invalid data type: {data_type}")
            
            self.logger.log_export_result(
                result.export_format,
                result.file_path,
                result.record_count,
                result.success
            )
            
            self.logger.finish_processing("data export", result.success, {
                'file_path': result.file_path,
                'record_count': result.record_count,
                'processing_time': result.processing_time
            })
            
            return {
                'success': result.success,
                'file_path': result.file_path,
                'record_count': result.record_count,
                'errors': result.errors,
                'processing_time': result.processing_time
            }
            
        except Exception as e:
            self.logger.log_error(e, "data export")
            self.logger.finish_processing("data export", False)
            
            return {
                'success': False,
                'error': str(e),
                'file_path': '',
                'record_count': 0,
                'errors': [str(e)],
                'processing_time': 0.0
            }
    
    async def health_check(self) -> dict:
        """
        Perform system health check
        
        Returns:
            Health check results
        """
        self.logger.start_processing("health check")
        
        try:
            # Check database connection
            health_result = await self.ingestion_pipeline.db_client.health_check()
            
            # Check configuration
            config_valid = self.config is not None and len(self.config) > 0
            
            # Check export directory
            export_dir = Path(self.config.get('export', {}).get('output_directory', './exports'))
            export_dir_accessible = export_dir.exists() or export_dir.mkdir(parents=True, exist_ok=True)
            
            overall_health = (
                health_result.get('connected', False) and
                config_valid and
                export_dir_accessible
            )
            
            self.logger.finish_processing("health check", overall_health, {
                'database': health_result,
                'config_valid': config_valid,
                'export_dir_accessible': export_dir_accessible
            })
            
            return {
                'success': overall_health,
                'database': health_result,
                'config_valid': config_valid,
                'export_dir_accessible': export_dir_accessible,
                'overall_status': 'healthy' if overall_health else 'unhealthy'
            }
            
        except Exception as e:
            self.logger.log_error(e, "health check")
            self.logger.finish_processing("health check", False)
            
            return {
                'success': False,
                'error': str(e),
                'overall_status': 'unhealthy'
            }


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='VOFC Document Processing System')
    parser.add_argument('--config', '-c', help='Configuration file path')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Process command
    process_parser = subparsers.add_parser('process', help='Process documents')
    process_parser.add_argument('files', nargs='+', help='Document files to process')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export data')
    export_parser.add_argument('type', choices=['questions', 'vulnerabilities', 'ofcs', 'complete'],
                              help='Type of data to export')
    export_parser.add_argument('--sector-id', type=int, help='Filter by sector ID')
    export_parser.add_argument('--format', choices=['json', 'csv', 'excel'], default='json',
                              help='Export format')
    export_parser.add_argument('--output', help='Output file path')
    
    # Health check command
    health_parser = subparsers.add_parser('health', help='Perform health check')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize processor
    processor = VOFCProcessor(args.config)
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        if args.command == 'process':
            # Process documents
            results = await processor.process_documents(args.files)
            
            if results['success']:
                print(f"✅ Successfully processed {len(args.files)} documents")
                print(f"📊 Statistics: {results['statistics']}")
            else:
                print(f"❌ Processing failed: {results.get('error', 'Unknown error')}")
                sys.exit(1)
        
        elif args.command == 'export':
            # Export data
            results = await processor.export_data(
                data_type=args.type,
                sector_id=args.sector_id,
                format=args.format,
                output_file=args.output
            )
            
            if results['success']:
                print(f"✅ Successfully exported {results['record_count']} records")
                print(f"📁 Output file: {results['file_path']}")
            else:
                print(f"❌ Export failed: {results.get('error', 'Unknown error')}")
                sys.exit(1)
        
        elif args.command == 'health':
            # Health check
            results = await processor.health_check()
            
            if results['success']:
                print("✅ System is healthy")
                print(f"📊 Database: {results['database']['status']}")
            else:
                print("❌ System health check failed")
                print(f"🔍 Details: {results}")
                sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
