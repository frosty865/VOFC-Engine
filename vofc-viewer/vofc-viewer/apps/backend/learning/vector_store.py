"""
Knowledge Store for VOFC Engine
Generates and stores embeddings for semantic search and auto-linking
"""

import json
import numpy as np
import requests
from typing import List, Dict, Any, Tuple
from pathlib import Path
import sqlite3
from datetime import datetime

class VOFCVectorStore:
    def __init__(self, supabase_client=None, local_db_path="data/vector_store.db"):
        self.supabase = supabase_client
        self.local_db_path = local_db_path
        self.ollama_base_url = "http://localhost:11434"
        self.model = "llama3"
        
        # Initialize local SQLite for embeddings if no Supabase
        if not self.supabase:
            self._init_local_db()
    
    def _init_local_db(self):
        """Initialize local SQLite database for embeddings"""
        conn = sqlite3.connect(self.local_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                sector TEXT,
                subsector TEXT,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS similarity_cache (
                source_id TEXT,
                target_id TEXT,
                similarity REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (source_id, target_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Ollama"""
        try:
            response = requests.post(
                f"{self.ollama_base_url}/api/embeddings",
                json={
                    "model": self.model,
                    "input": text
                }
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    def store_vulnerability(self, vuln_id: str, text: str, sector: str = None, subsector: str = None):
        """Store vulnerability with embedding"""
        embedding = self.generate_embedding(text)
        if not embedding:
            return False
        
        if self.supabase:
            # Store in Supabase with pgvector
            try:
                self.supabase.table("vulnerability_embeddings").insert({
                    "id": vuln_id,
                    "text": text,
                    "sector": sector,
                    "subsector": subsector,
                    "embedding": embedding,
                    "created_at": datetime.now().isoformat()
                }).execute()
                return True
            except Exception as e:
                print(f"Error storing in Supabase: {e}")
                return False
        else:
            # Store in local SQLite
            try:
                conn = sqlite3.connect(self.local_db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO embeddings 
                    (id, text, sector, subsector, embedding, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (vuln_id, text, sector, subsector, json.dumps(embedding), datetime.now().isoformat()))
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                print(f"Error storing locally: {e}")
                return False
    
    def store_ofc(self, ofc_id: str, text: str, vulnerability_id: str = None):
        """Store OFC with embedding"""
        embedding = self.generate_embedding(text)
        if not embedding:
            return False
        
        if self.supabase:
            try:
                self.supabase.table("ofc_embeddings").insert({
                    "id": ofc_id,
                    "text": text,
                    "vulnerability_id": vulnerability_id,
                    "embedding": embedding,
                    "created_at": datetime.now().isoformat()
                }).execute()
                return True
            except Exception as e:
                print(f"Error storing OFC in Supabase: {e}")
                return False
        else:
            try:
                conn = sqlite3.connect(self.local_db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO embeddings 
                    (id, text, sector, subsector, embedding, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (ofc_id, text, "ofc", vulnerability_id, json.dumps(embedding), datetime.now().isoformat()))
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                print(f"Error storing OFC locally: {e}")
                return False
    
    def find_similar_vulnerabilities(self, text: str, limit: int = 5, threshold: float = 0.7) -> List[Dict]:
        """Find similar vulnerabilities using cosine similarity"""
        query_embedding = self.generate_embedding(text)
        if not query_embedding:
            return []
        
        if self.supabase:
            # Use pgvector for similarity search
            try:
                result = self.supabase.rpc('find_similar_vulnerabilities', {
                    'query_embedding': query_embedding,
                    'match_threshold': threshold,
                    'match_count': limit
                }).execute()
                return result.data
            except Exception as e:
                print(f"Error with Supabase similarity search: {e}")
                return []
        else:
            # Use local SQLite for similarity search
            try:
                conn = sqlite3.connect(self.local_db_path)
                cursor = conn.cursor()
                
                # Get all stored embeddings
                cursor.execute('''
                    SELECT id, text, sector, subsector, embedding 
                    FROM embeddings 
                    WHERE sector != 'ofc'
                ''')
                
                results = []
                for row in cursor.fetchall():
                    stored_id, stored_text, sector, subsector, embedding_json = row
                    stored_embedding = json.loads(embedding_json)
                    
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(query_embedding, stored_embedding)
                    
                    if similarity >= threshold:
                        results.append({
                            "id": stored_id,
                            "text": stored_text,
                            "sector": sector,
                            "subsector": subsector,
                            "similarity": similarity
                        })
                
                # Sort by similarity and return top results
                results.sort(key=lambda x: x["similarity"], reverse=True)
                return results[:limit]
                
            except Exception as e:
                print(f"Error with local similarity search: {e}")
                return []
            finally:
                conn.close()
    
    def find_similar_ofcs(self, text: str, limit: int = 5, threshold: float = 0.7) -> List[Dict]:
        """Find similar OFCs using cosine similarity"""
        query_embedding = self.generate_embedding(text)
        if not query_embedding:
            return []
        
        if self.supabase:
            try:
                result = self.supabase.rpc('find_similar_ofcs', {
                    'query_embedding': query_embedding,
                    'match_threshold': threshold,
                    'match_count': limit
                }).execute()
                return result.data
            except Exception as e:
                print(f"Error with Supabase OFC similarity search: {e}")
                return []
        else:
            try:
                conn = sqlite3.connect(self.local_db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id, text, embedding 
                    FROM embeddings 
                    WHERE sector = 'ofc'
                ''')
                
                results = []
                for row in cursor.fetchall():
                    stored_id, stored_text, embedding_json = row
                    stored_embedding = json.loads(embedding_json)
                    
                    similarity = self._cosine_similarity(query_embedding, stored_embedding)
                    
                    if similarity >= threshold:
                        results.append({
                            "id": stored_id,
                            "text": stored_text,
                            "similarity": similarity
                        })
                
                results.sort(key=lambda x: x["similarity"], reverse=True)
                return results[:limit]
                
            except Exception as e:
                print(f"Error with local OFC similarity search: {e}")
                return []
            finally:
                conn.close()
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        except Exception as e:
            print(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    def cache_similarity(self, source_id: str, target_id: str, similarity: float):
        """Cache similarity score for future use"""
        if self.supabase:
            try:
                self.supabase.table("similarity_cache").insert({
                    "source_id": source_id,
                    "target_id": target_id,
                    "similarity": similarity,
                    "created_at": datetime.now().isoformat()
                }).execute()
            except Exception as e:
                print(f"Error caching similarity in Supabase: {e}")
        else:
            try:
                conn = sqlite3.connect(self.local_db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO similarity_cache 
                    (source_id, target_id, similarity, created_at)
                    VALUES (?, ?, ?, ?)
                ''', (source_id, target_id, similarity, datetime.now().isoformat()))
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"Error caching similarity locally: {e}")
    
    def load_all_vulnerabilities(self):
        """Load all vulnerabilities and generate embeddings"""
        if self.supabase:
            try:
                result = self.supabase.table("vulnerabilities").select("*").execute()
                vulnerabilities = result.data
                
                for vuln in vulnerabilities:
                    self.store_vulnerability(
                        vuln["id"],
                        vuln["vulnerability"],
                        vuln.get("sector"),
                        vuln.get("subsector")
                    )
                
                print(f"Loaded {len(vulnerabilities)} vulnerabilities into vector store")
                return len(vulnerabilities)
            except Exception as e:
                print(f"Error loading vulnerabilities: {e}")
                return 0
        else:
            print("Supabase client not available for loading vulnerabilities")
            return 0
    
    def load_all_ofcs(self):
        """Load all OFCs and generate embeddings"""
        if self.supabase:
            try:
                result = self.supabase.table("options_for_consideration").select("*").execute()
                ofcs = result.data
                
                for ofc in ofcs:
                    self.store_ofc(
                        ofc["id"],
                        ofc["option_text"],
                        ofc.get("vulnerability_id")
                    )
                
                print(f"Loaded {len(ofcs)} OFCs into vector store")
                return len(ofcs)
            except Exception as e:
                print(f"Error loading OFCs: {e}")
                return 0
        else:
            print("Supabase client not available for loading OFCs")
            return 0

if __name__ == "__main__":
    # Test the vector store
    store = VOFCVectorStore()
    
    # Test embedding generation
    test_text = "The facility lacks access control for special events"
    embedding = store.generate_embedding(test_text)
    print(f"Generated embedding with {len(embedding) if embedding else 0} dimensions")
    
    # Test storage
    if embedding:
        success = store.store_vulnerability("test-1", test_text, "Security", "Access Control")
        print(f"Storage successful: {success}")
        
        # Test similarity search
        similar = store.find_similar_vulnerabilities(test_text, limit=3)
        print(f"Found {len(similar)} similar vulnerabilities")
        for result in similar:
            print(f"  - {result['id']}: {result['similarity']:.3f}")
