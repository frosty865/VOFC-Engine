"""
Supabase Database Client

This module provides a client for interacting with the Supabase database
for VOFC data operations.
"""

import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import asyncio
from supabase import create_client, Client
from supabase._async.client import AsyncClient

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Client for Supabase database operations"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the Supabase client
        
        Args:
            config: Configuration dictionary with Supabase credentials
        """
        self.url = config.get('url')
        self.key = config.get('key')
        
        if not self.url or not self.key:
            raise ValueError("Supabase URL and key must be provided in config")
        
        self.client: Client = create_client(self.url, self.key)
        self.async_client: AsyncClient = None  # Will be initialized when needed
        
        logger.info("Supabase client initialized")
    
    async def _get_async_client(self) -> AsyncClient:
        """Get or create async client"""
        if self.async_client is None:
            from supabase._async.client import AsyncClient
            self.async_client = AsyncClient(self.url, self.key)
        return self.async_client
    
    # Questions operations
    async def get_questions(self, sector_id: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get questions from database"""
        try:
            query = self.client.table('questions').select('*')
            
            if sector_id:
                query = query.eq('sector_id', sector_id)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching questions: {e}")
            return []
    
    async def insert_questions(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Insert questions into database"""
        try:
            response = self.client.table('questions').insert(questions).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error inserting questions: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    async def update_question(self, question_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a question"""
        try:
            response = self.client.table('questions').update(updates).eq('question_id', question_id).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error updating question {question_id}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    async def delete_question(self, question_id: int) -> Dict[str, Any]:
        """Delete a question"""
        try:
            response = self.client.table('questions').delete().eq('question_id', question_id).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error deleting question {question_id}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    # Vulnerabilities operations
    async def get_vulnerabilities(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get vulnerabilities from database"""
        try:
            query = self.client.table('vulnerabilities').select('*')
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching vulnerabilities: {e}")
            return []
    
    async def insert_vulnerabilities(self, vulnerabilities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Insert vulnerabilities into database"""
        try:
            response = self.client.table('vulnerabilities').insert(vulnerabilities).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error inserting vulnerabilities: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    async def update_vulnerability(self, vulnerability_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a vulnerability"""
        try:
            response = self.client.table('vulnerabilities').update(updates).eq('vulnerability_id', vulnerability_id).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error updating vulnerability {vulnerability_id}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    # OFCs operations
    async def get_ofcs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get OFCs from database"""
        try:
            query = self.client.table('ofcs').select('*')
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching OFCs: {e}")
            return []
    
    async def insert_ofcs(self, ofcs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Insert OFCs into database"""
        try:
            response = self.client.table('ofcs').insert(ofcs).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error inserting OFCs: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    async def update_ofc(self, ofc_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update an OFC"""
        try:
            response = self.client.table('ofcs').update(updates).eq('ofc_id', ofc_id).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error updating OFC {ofc_id}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    # Sectors operations
    async def get_sectors(self) -> List[Dict[str, Any]]:
        """Get sectors from database"""
        try:
            response = self.client.table('sectors').select('*').execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching sectors: {e}")
            return []
    
    # Question-OFC relationships
    async def get_question_ofc_relationships(self, question_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get question-OFC relationships"""
        try:
            query = self.client.table('question_ofc_map').select('*')
            
            if question_id:
                query = query.eq('question_id', question_id)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching question-OFC relationships: {e}")
            return []
    
    async def insert_question_ofc_relationships(self, relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Insert question-OFC relationships"""
        try:
            response = self.client.table('question_ofc_map').insert(relationships).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error inserting question-OFC relationships: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    # Batch operations
    async def batch_insert(self, table: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch insert data into any table"""
        try:
            response = self.client.table(table).insert(data).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error batch inserting into {table}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    async def batch_update(self, table: str, updates: Dict[str, Any], filter_column: str, filter_values: List[Any]) -> Dict[str, Any]:
        """Batch update data in any table"""
        try:
            response = self.client.table(table).update(updates).in_(filter_column, filter_values).execute()
            return {'success': True, 'data': response.data, 'errors': []}
        except Exception as e:
            logger.error(f"Error batch updating {table}: {e}")
            return {'success': False, 'data': [], 'errors': [str(e)]}
    
    # Search operations
    async def search_questions(self, search_term: str, sector_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Search questions by text"""
        try:
            query = self.client.table('questions').select('*').ilike('question_text', f'%{search_term}%')
            
            if sector_id:
                query = query.eq('sector_id', sector_id)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error searching questions: {e}")
            return []
    
    async def search_vulnerabilities(self, search_term: str) -> List[Dict[str, Any]]:
        """Search vulnerabilities by name"""
        try:
            response = self.client.table('vulnerabilities').select('*').ilike('vulnerability_name', f'%{search_term}%').execute()
            return response.data
        except Exception as e:
            logger.error(f"Error searching vulnerabilities: {e}")
            return []
    
    async def search_ofcs(self, search_term: str) -> List[Dict[str, Any]]:
        """Search OFCs by text"""
        try:
            response = self.client.table('ofcs').select('*').ilike('ofc_text', f'%{search_term}%').execute()
            return response.data
        except Exception as e:
            logger.error(f"Error searching OFCs: {e}")
            return []
    
    # Statistics operations
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            # Get counts for each table
            questions_count = self.client.table('questions').select('*', count='exact').execute().count
            vulnerabilities_count = self.client.table('vulnerabilities').select('*', count='exact').execute().count
            ofcs_count = self.client.table('ofcs').select('*', count='exact').execute().count
            sectors_count = self.client.table('sectors').select('*', count='exact').execute().count
            
            return {
                'questions_count': questions_count,
                'vulnerabilities_count': vulnerabilities_count,
                'ofcs_count': ofcs_count,
                'sectors_count': sectors_count,
                'total_records': questions_count + vulnerabilities_count + ofcs_count + sectors_count
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    # Health check
    async def health_check(self) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            # Simple query to test connection
            response = self.client.table('sectors').select('sector_id').limit(1).execute()
            return {
                'status': 'healthy',
                'connected': True,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
