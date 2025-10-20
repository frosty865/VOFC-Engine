import os
from dotenv import load_dotenv
from supabase import create_client, Client
from collections import defaultdict
import re

# Load environment variables
load_dotenv()

# Supabase client setup
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables not loaded.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_question_hierarchy():
    """Create a hierarchical structure for questions."""
    print("Creating question hierarchy...\n")
    
    # Fetch all questions
    response = supabase.table('questions').select('*').execute()
    questions = response.data
    
    print(f"Processing {len(questions)} questions...")
    
    # Group questions by their base text (first 5 words)
    question_groups = defaultdict(list)
    
    for question in questions:
        text = question['record_text_raw'].strip()
        words = text.split()[:5]  # First 5 words as key
        key = ' '.join(words).lower()
        question_groups[key].append(question)
    
    # Identify parent-child relationships
    hierarchy = {}
    duplicates_to_remove = []
    
    for key, group in question_groups.items():
        if len(group) > 1:
            # Sort by text length (shorter = parent, longer = children)
            sorted_group = sorted(group, key=lambda x: len(x['record_text_raw']))
            
            # The shortest text is the parent
            parent = sorted_group[0]
            children = sorted_group[1:]
            
            # Create hierarchy entry
            hierarchy[parent['id']] = {
                'parent': parent,
                'children': children,
                'total_count': len(group)
            }
            
            # Mark children for removal (they'll be stored as child questions)
            for child in children:
                duplicates_to_remove.append(child['id'])
    
    print(f"Found {len(hierarchy)} parent questions with children")
    print(f"Will remove {len(duplicates_to_remove)} duplicate questions")
    
    return hierarchy, duplicates_to_remove

def update_question_structure():
    """Update the database with hierarchical question structure."""
    print("Updating question structure...\n")
    
    # Create hierarchy
    hierarchy, duplicates_to_remove = create_question_hierarchy()
    
    # Add parent_id and question_type columns if they don't exist
    try:
        # Add parent_id column
        supabase.rpc('add_column_if_not_exists', {
            'table_name': 'questions',
            'column_name': 'parent_id',
            'column_type': 'integer'
        }).execute()
        
        # Add question_type column
        supabase.rpc('add_column_if_not_exists', {
            'table_name': 'questions',
            'column_name': 'question_type',
            'column_type': 'text'
        }).execute()
        
        # Add is_expanded column
        supabase.rpc('add_column_if_not_exists', {
            'table_name': 'questions',
            'column_name': 'is_expanded',
            'column_type': 'boolean'
        }).execute()
        
    except Exception as e:
        print(f"Note: Columns may already exist: {e}")
    
    # Update parent questions
    for parent_id, data in hierarchy.items():
        # Mark as parent
        supabase.table('questions').update({
            'question_type': 'parent',
            'is_expanded': False
        }).eq('id', parent_id).execute()
        
        # Update children with parent_id
        for child in data['children']:
            supabase.table('questions').update({
                'parent_id': parent_id,
                'question_type': 'child',
                'is_expanded': False
            }).eq('id', child['id']).execute()
    
    # Mark standalone questions
    response = supabase.table('questions').select('id').execute()
    all_question_ids = [q['id'] for q in response.data]
    
    parent_ids = list(hierarchy.keys())
    child_ids = []
    for data in hierarchy.values():
        child_ids.extend([c['id'] for c in data['children']])
    
    standalone_ids = [qid for qid in all_question_ids if qid not in parent_ids and qid not in child_ids]
    
    for qid in standalone_ids:
        supabase.table('questions').update({
            'question_type': 'standalone',
            'is_expanded': False
        }).eq('id', qid).execute()
    
    print(f"Updated {len(parent_ids)} parent questions")
    print(f"Updated {len(child_ids)} child questions")
    print(f"Updated {len(standalone_ids)} standalone questions")
    
    return hierarchy

def create_hierarchy_view():
    """Create a view that shows the hierarchical structure."""
    print("Creating hierarchy view...\n")
    
    # Create a view that shows parent-child relationships
    view_sql = """
    CREATE OR REPLACE VIEW question_hierarchy AS
    SELECT 
        p.id as parent_id,
        p.record_text_raw as parent_text,
        p.domain as parent_domain,
        p.source_doc as parent_source,
        p.ref_number as parent_ref,
        p.question_type,
        p.is_expanded,
        COUNT(c.id) as child_count,
        ARRAY_AGG(
            JSON_BUILD_OBJECT(
                'id', c.id,
                'text', c.record_text_raw,
                'domain', c.domain,
                'source_doc', c.source_doc,
                'ref_number', c.ref_number
            ) ORDER BY c.id
        ) as children
    FROM questions p
    LEFT JOIN questions c ON p.id = c.parent_id
    WHERE p.question_type = 'parent' OR p.question_type = 'standalone'
    GROUP BY p.id, p.record_text_raw, p.domain, p.source_doc, p.ref_number, p.question_type, p.is_expanded
    ORDER BY p.id;
    """
    
    try:
        supabase.rpc('execute_sql', {'sql': view_sql}).execute()
        print("Hierarchy view created successfully")
    except Exception as e:
        print(f"Note: View creation may have failed: {e}")

def analyze_hierarchy():
    """Analyze the created hierarchy."""
    print("Analyzing hierarchy...\n")
    
    # Get hierarchy data
    response = supabase.table('questions').select('id, record_text_raw, question_type, parent_id').execute()
    questions = response.data
    
    parents = [q for q in questions if q['question_type'] == 'parent']
    children = [q for q in questions if q['question_type'] == 'child']
    standalone = [q for q in questions if q['question_type'] == 'standalone']
    
    print(f"Parent questions: {len(parents)}")
    print(f"Child questions: {len(children)}")
    print(f"Standalone questions: {len(standalone)}")
    
    # Show some examples
    print("\nExample parent questions:")
    for i, parent in enumerate(parents[:5], 1):
        child_count = len([c for c in children if c['parent_id'] == parent['id']])
        print(f"{i}. {parent['record_text_raw'][:80]}{'...' if len(parent['record_text_raw']) > 80 else ''}")
        print(f"   Children: {child_count}")
        print("---")
    
    return {
        'parents': len(parents),
        'children': len(children),
        'standalone': len(standalone)
    }

if __name__ == "__main__":
    print("Starting question hierarchy creation...\n")
    
    # Create hierarchy
    hierarchy = update_question_structure()
    
    # Create view
    create_hierarchy_view()
    
    # Analyze results
    stats = analyze_hierarchy()
    
    print(f"\nSummary:")
    print(f"- Parent questions: {stats['parents']}")
    print(f"- Child questions: {stats['children']}")
    print(f"- Standalone questions: {stats['standalone']}")
    print(f"- Total questions: {stats['parents'] + stats['children'] + stats['standalone']}")

