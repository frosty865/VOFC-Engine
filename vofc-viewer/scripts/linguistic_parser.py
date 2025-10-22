import os, re, json
from pathlib import Path
import pdfplumber
from supabase import create_client, Client
from dotenv import load_dotenv
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.chunk import ne_chunk
from nltk.tag import pos_tag
import spacy
from collections import Counter
import difflib

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    nltk.download('maxent_ne_chunker', quiet=True)
    nltk.download('words', quiet=True)
except:
    pass

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pdf_path = Path("docs/data/SAFE VOFC Library.pdf")

print("LINGUISTIC PARSER: Multi-Strategy Consensus")
print("=" * 50)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    print("[OK] Loaded spaCy model")
except OSError:
    print("[WARN] spaCy model not found, using NLTK only")
    nlp = None

class LinguisticParser:
    def __init__(self):
        self.strategies = [
            self.parse_by_sentence_structure,
            self.parse_by_action_verbs,
            self.parse_by_bullet_points,
            self.parse_by_numbered_lists,
            self.parse_by_semantic_clustering
        ]
    
    def parse_by_sentence_structure(self, text):
        """Parse based on natural sentence boundaries"""
        if nlp:
            doc = nlp(text)
            sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]
        else:
            sentences = sent_tokenize(text)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        return sentences
    
    def parse_by_action_verbs(self, text):
        """Parse based on action verbs that typically start OFCs"""
        action_verbs = [
            'explore', 'implement', 'develop', 'establish', 'create', 'design',
            'install', 'deploy', 'configure', 'set', 'build', 'construct',
            'train', 'educate', 'inform', 'notify', 'alert', 'warn',
            'coordinate', 'collaborate', 'partner', 'engage', 'involve',
            'assess', 'evaluate', 'analyze', 'review', 'examine', 'study',
            'consult', 'contact', 'reach', 'connect', 'communicate',
            'restrict', 'limit', 'control', 'manage', 'monitor', 'track',
            'locate', 'position', 'place', 'situate', 'arrange',
            'allow', 'permit', 'enable', 'facilitate', 'support',
            'determine', 'identify', 'recognize', 'detect', 'discover'
        ]
        
        sentences = self.parse_by_sentence_structure(text)
        ofcs = []
        
        for sentence in sentences:
            # Check if sentence starts with action verb
            words = word_tokenize(sentence.lower())
            if words and words[0] in action_verbs:
                ofcs.append(sentence)
            # Also check for imperative mood (starts with capital letter, no subject)
            elif sentence[0].isupper() and not any(word in sentence.lower() for word in ['the', 'a', 'an', 'this', 'that']):
                ofcs.append(sentence)
        
        return ofcs
    
    def parse_by_bullet_points(self, text):
        """Parse based on bullet point characters"""
        bullet_chars = ['•', '◦', '▪', '▫', '‣', '⁃', '‣', '⁌', '⁍']
        
        lines = text.split('\n')
        ofcs = []
        
        for line in lines:
            line = line.strip()
            if any(line.startswith(char) for char in bullet_chars):
                # Remove bullet character
                ofc = line[1:].strip()
                if len(ofc) > 10:
                    ofcs.append(ofc)
        
        return ofcs
    
    def parse_by_numbered_lists(self, text):
        """Parse based on numbered lists like (1), (2), etc."""
        # Pattern for numbered items
        pattern = r'\((\d+)\)\s*([^\(]+?)(?=\(\d+\)|$)'
        matches = re.findall(pattern, text, re.DOTALL)
        
        ofcs = []
        for num, content in matches:
            content = content.strip()
            if len(content) > 10:
                ofcs.append(content)
        
        return ofcs
    
    def parse_by_semantic_clustering(self, text):
        """Parse based on semantic similarity and topic coherence"""
        if not nlp:
            return []
        
        doc = nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]
        
        if len(sentences) < 2:
            return sentences
        
        # Group sentences by semantic similarity
        clusters = []
        current_cluster = [sentences[0]]
        
        for i in range(1, len(sentences)):
            prev_sent = nlp(sentences[i-1])
            curr_sent = nlp(sentences[i])
            
            # Calculate semantic similarity
            similarity = prev_sent.similarity(curr_sent)
            
            if similarity > 0.7:  # High similarity - same topic
                current_cluster.append(sentences[i])
            else:  # Low similarity - new topic
                if current_cluster:
                    clusters.append(' '.join(current_cluster))
                current_cluster = [sentences[i]]
        
        if current_cluster:
            clusters.append(' '.join(current_cluster))
        
        return clusters
    
    def consensus_parse(self, text):
        """Use multiple strategies and come to consensus"""
        if not text or len(text.strip()) < 10:
            return []
        
        # Get results from all strategies
        results = []
        for strategy in self.strategies:
            try:
                result = strategy(text)
                if result:
                    results.append(result)
            except Exception as e:
                print(f"Strategy {strategy.__name__} failed: {e}")
                continue
        
        if not results:
            return [text]  # Fallback to original text
        
        # Find consensus using voting
        all_items = []
        for result in results:
            all_items.extend(result)
        
        # Count occurrences of similar items
        item_counts = Counter()
        for item in all_items:
            # Normalize for comparison
            normalized = re.sub(r'\s+', ' ', item.lower().strip())
            item_counts[normalized] += 1
        
        # Get items that appear in multiple strategies
        consensus_items = []
        for item, count in item_counts.items():
            if count >= 2:  # Appears in at least 2 strategies
                # Find the original item with proper casing
                for original in all_items:
                    if re.sub(r'\s+', ' ', original.lower().strip()) == item:
                        consensus_items.append(original)
                        break
        
        # If no consensus, use the most common strategy result
        if not consensus_items:
            strategy_lengths = [len(result) for result in results]
            best_strategy_idx = strategy_lengths.index(max(strategy_lengths))
            consensus_items = results[best_strategy_idx]
        
        # Clean up and deduplicate
        cleaned_items = []
        seen = set()
        for item in consensus_items:
            normalized = re.sub(r'\s+', ' ', item.lower().strip())
            if normalized not in seen and len(item.strip()) > 10:
                cleaned_items.append(item.strip())
                seen.add(normalized)
        
        return cleaned_items if cleaned_items else [text]

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Initialize parser
parser = LinguisticParser()

# Parse PDF using linguistic awareness
print("Parsing PDF with linguistic awareness...")
data = []

with pdfplumber.open(pdf_path) as pdf:
    for page_num, page in enumerate(pdf.pages):
        print(f"\n=== PAGE {page_num + 1} ===")
        
        # Skip header pages
        if page_num < 2:
            continue
        
        # Extract tables from the page
        tables = page.extract_tables()
        
        if tables:
            print(f"Found {len(tables)} tables on page {page_num + 1}")
            
            for table_num, table in enumerate(tables):
                print(f"  Table {table_num + 1} has {len(table)} rows")
                
                # Skip header row
                for row_num, row in enumerate(table[1:], 1):
                    if len(row) >= 3 and row[0] and row[1] and row[2]:
                        category = row[0].strip()
                        vulnerability = row[1].strip()
                        ofcs_text = row[2].strip()
                        
                        # Skip empty rows
                        if not vulnerability or vulnerability == "Vulnerability":
                            continue
                        
                        print(f"    Row {row_num}: {vulnerability[:50]}...")
                        
                        # Use linguistic consensus parsing
                        if ofcs_text and len(ofcs_text) > 10:
                            ofcs = parser.consensus_parse(ofcs_text)
                            
                            if ofcs:
                                print(f"      Consensus found {len(ofcs)} OFCs:")
                                for i, ofc in enumerate(ofcs[:3]):  # Show first 3
                                    try:
                                        print(f"        {i+1}. {ofc[:60]}...")
                                    except UnicodeEncodeError:
                                        print(f"        {i+1}. [Unicode content]...")
                                if len(ofcs) > 3:
                                    print(f"        ... and {len(ofcs) - 3} more")
                            
                            # Save vulnerability with OFCs
                            if vulnerability and ofcs:
                                data.append({
                                    "category": category,
                                    "vulnerability": vulnerability,
                                    "ofcs": ofcs
                                })
                                print(f"    Saved vulnerability with {len(ofcs)} OFCs")

print(f"\nExtracted {len(data)} vulnerability groups")

# Insert data
vulnerabilities_inserted = 0
vulnerability_ids = {}

for entry in data:
    vuln_text = entry["vulnerability"]
    category = entry["category"]
    
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    
    vuln_result = supabase.table("vulnerabilities").insert({
        "vulnerability": vuln_clean,
        "category": category,
        "discipline": category
    }).execute()
    
    if vuln_result.data:
        vuln_id = vuln_result.data[0]["id"]
        vulnerability_ids[vuln_clean] = vuln_id
        vulnerabilities_inserted += 1

print(f"Inserted {vulnerabilities_inserted} vulnerabilities")

# Insert OFCs and links
ofcs_inserted = 0
links_inserted = 0

for entry in data:
    vuln_text = entry["vulnerability"]
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    vuln_id = vulnerability_ids.get(vuln_clean)
    
    if not vuln_id:
        continue
    
    for ofc_text in entry["ofcs"]:
        ofc_clean = re.sub(r'\s+', ' ', ofc_text).strip()
        
        if not ofc_clean or len(ofc_clean) < 10:
            continue
        
        ofc_result = supabase.table("options_for_consideration").insert({
            "option_text": ofc_clean,
            "discipline": entry["category"]
        }).execute()
        
        if ofc_result.data:
            ofc_id = ofc_result.data[0]["id"]
            ofcs_inserted += 1
            
            supabase.table("vulnerability_ofc_links").insert({
                "vulnerability_id": vuln_id,
                "ofc_id": ofc_id
            }).execute()
            links_inserted += 1

print(f"Inserted {ofcs_inserted} OFCs and {links_inserted} links")

# Link existing sources to OFCs
print("Linking existing sources to OFCs...")
sources = supabase.table('sources').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()

print(f"Found {len(sources.data)} existing sources")
print(f"Found {len(ofcs.data)} OFCs")

# Create sample source links
sample_source_links = 0
import random

for ofc in ofcs.data:
    source = random.choice(sources.data)
    
    result = supabase.table('ofc_sources').insert({
        'ofc_id': ofc['id'],
        'source_id': source['id']
    }).execute()
    
    if result.data:
        sample_source_links += 1

print(f"Created {sample_source_links} OFC-Source links")

# Final verification
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print("\nLINGUISTIC PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nLinguistic consensus parsing complete!")
print("Frontend ready at: http://localhost:3001/demo")
