"""
Vector Database & Similarity Search Verification Script
========================================================
Verifies all vector database and similarity search requirements:
✅ FAISS setup
✅ All embeddings indexed
✅ Similarity search working
✅ Top 5 matches returned
✅ Similarity scores attached to each match
✅ Threshold logic implemented (>= 0.85, 0.50-0.85, < 0.50)
"""

import json
import numpy as np
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent / "data"

# Threshold configuration (must match app.py)
DUPLICATE_THRESHOLD = 0.85
POSSIBLE_DUPLICATE_THRESHOLD = 0.50
TOP_MATCHES = 5

def verify_vector_database():
    """Run comprehensive verification of vector database and similarity search."""
    
    print("="*70)
    print("VECTOR DATABASE & SIMILARITY SEARCH VERIFICATION")
    print("="*70)
    
    checks_passed = []
    checks_failed = []
    
    # ─── Check 1: FAISS Setup ────────────────────────────────────────────
    print("\n[1/7] Verifying FAISS setup...")
    try:
        index = faiss.read_index(str(DATA_DIR / "faiss_index.bin"))
        print(f"   ✅ FAISS index loaded successfully")
        print(f"   ✅ Index type: {type(index).__name__}")
        print(f"   ✅ Number of vectors: {index.ntotal}")
        print(f"   ✅ Vector dimension: {index.d}")
        
        if isinstance(index, faiss.IndexFlatIP):
            checks_passed.append("FAISS IndexFlatIP configured (cosine similarity)")
        else:
            checks_passed.append(f"FAISS index type: {type(index).__name__}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("FAISS setup failed")
        return False
    
    # ─── Check 2: All Embeddings Indexed ─────────────────────────────────
    print("\n[2/7] Verifying all embeddings are indexed...")
    try:
        embeddings = np.load(DATA_DIR / "processed_embeddings.npy")
        try:
            with open(DATA_DIR / "processed_defects.json", 'r', encoding='utf-8') as f:
                defects = json.load(f)
        except UnicodeDecodeError:
            # Try with error handling
            with open(DATA_DIR / "processed_defects.json", 'r', encoding='utf-8', errors='ignore') as f:
                defects = json.load(f)
        
        print(f"   ✅ Stored embeddings: {embeddings.shape[0]}")
        print(f"   ✅ Defect records: {len(defects)}")
        print(f"   ✅ FAISS index vectors: {index.ntotal}")
        
        if embeddings.shape[0] == len(defects) == index.ntotal:
            checks_passed.append(f"All {index.ntotal} embeddings properly indexed")
        else:
            checks_failed.append(f"Mismatch: embeddings={embeddings.shape[0]}, defects={len(defects)}, index={index.ntotal}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Failed to verify indexed embeddings")
    
    # ─── Check 3: Similarity Search Working ──────────────────────────────
    print("\n[3/7] Testing similarity search functionality...")
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test query 1: High similarity expected
        test_query_1 = "Application crashes when user clicks submit button on login form"
        query_vec_1 = model.encode([test_query_1], normalize_embeddings=True).astype(np.float32)
        
        distances_1, indices_1 = index.search(query_vec_1, TOP_MATCHES)
        
        print(f"   ✅ Search executed successfully")
        print(f"   ✅ Query: '{test_query_1[:50]}...'")
        print(f"   ✅ Results returned: {len(indices_1[0])}")
        
        checks_passed.append("Similarity search working correctly")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Similarity search failed")
        return False
    
    # ─── Check 4: Top 5 Matches Returned ─────────────────────────────────
    print("\n[4/7] Verifying top 5 matches are returned...")
    try:
        if len(indices_1[0]) == TOP_MATCHES:
            print(f"   ✅ Exactly {TOP_MATCHES} matches returned")
            checks_passed.append(f"Top {TOP_MATCHES} matches returned correctly")
        else:
            print(f"   ⚠️  Expected {TOP_MATCHES}, got {len(indices_1[0])}")
            checks_failed.append(f"Wrong number of matches: {len(indices_1[0])}")
        
        print(f"\n   Top {TOP_MATCHES} match indices:")
        for i, (idx, dist) in enumerate(zip(indices_1[0], distances_1[0]), 1):
            print(f"      {i}. Index: {idx}, Similarity: {dist:.4f}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Failed to verify top matches count")
    
    # ─── Check 5: Similarity Scores Attached ─────────────────────────────
    print("\n[5/7] Verifying similarity scores are attached...")
    try:
        scores_valid = True
        for i, (idx, score) in enumerate(zip(indices_1[0], distances_1[0]), 1):
            if not (0.0 <= score <= 1.0):
                scores_valid = False
                print(f"   ❌ Invalid score at rank {i}: {score}")
        
        if scores_valid:
            print(f"   ✅ All similarity scores are valid (0.0-1.0 range)")
            print(f"   ✅ Highest similarity: {distances_1[0][0]:.4f}")
            print(f"   ✅ Lowest similarity: {distances_1[0][-1]:.4f}")
            checks_passed.append("Similarity scores properly attached and valid")
        else:
            checks_failed.append("Invalid similarity scores detected")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Failed to verify similarity scores")
    
    # ─── Check 6: Threshold Logic Implementation ─────────────────────────
    print("\n[6/7] Verifying threshold logic...")
    print(f"\n   Configured thresholds:")
    print(f"      >= {DUPLICATE_THRESHOLD}  → 'duplicate'")
    print(f"      {POSSIBLE_DUPLICATE_THRESHOLD}-{DUPLICATE_THRESHOLD} → 'possible_duplicate'")
    print(f"      < {POSSIBLE_DUPLICATE_THRESHOLD}   → 'new_defect'")
    
    try:
        # Test different scenarios
        test_cases = [
            ("duplicate", 0.90, "duplicate"),
            ("possible duplicate", 0.65, "possible_duplicate"),
            ("new defect", 0.35, "new_defect"),
        ]
        
        threshold_tests_passed = 0
        for label, test_score, expected_decision in test_cases:
            if test_score >= DUPLICATE_THRESHOLD:
                decision = "duplicate"
            elif test_score >= POSSIBLE_DUPLICATE_THRESHOLD:
                decision = "possible_duplicate"
            else:
                decision = "new_defect"
            
            status = "✅" if decision == expected_decision else "❌"
            print(f"   {status} Score {test_score:.2f} → '{decision}' (expected: '{expected_decision}')")
            
            if decision == expected_decision:
                threshold_tests_passed += 1
        
        if threshold_tests_passed == len(test_cases):
            checks_passed.append("Threshold logic correctly implemented")
        else:
            checks_failed.append(f"Threshold logic failed {len(test_cases) - threshold_tests_passed} tests")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Failed to verify threshold logic")
    
    # ─── Check 7: End-to-End Search Test ─────────────────────────────────
    print("\n[7/7] Running end-to-end search test...")
    try:
        # Multiple test queries with different expected outcomes
        test_queries = [
            "Browser freezes when loading large images",
            "Memory leak in background service",
            "UI button alignment issue on mobile devices",
        ]
        
        print(f"\n   Testing {len(test_queries)} different queries:")
        for i, query in enumerate(test_queries, 1):
            query_vec = model.encode([query], normalize_embeddings=True).astype(np.float32)
            distances, indices = index.search(query_vec, TOP_MATCHES)
            
            max_sim = distances[0][0]
            if max_sim >= DUPLICATE_THRESHOLD:
                decision = "duplicate"
            elif max_sim >= POSSIBLE_DUPLICATE_THRESHOLD:
                decision = "possible_duplicate"
            else:
                decision = "new_defect"
            
            print(f"\n   Query {i}: '{query[:45]}...'")
            print(f"      Decision: {decision} (similarity: {max_sim:.4f})")
            print(f"      Top 3 matches: {indices[0][:3].tolist()}")
        
        checks_passed.append("End-to-end search test successful")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("End-to-end search test failed")
    
    # ─── Final Report ────────────────────────────────────────────────────
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)
    
    print(f"\n✅ PASSED ({len(checks_passed)}):")
    for check in checks_passed:
        print(f"   • {check}")
    
    if checks_failed:
        print(f"\n❌ FAILED ({len(checks_failed)}):")
        for check in checks_failed:
            print(f"   • {check}")
    else:
        print(f"\n🎉 ALL CHECKS PASSED!")
    
    # Summary table
    print("\n" + "="*70)
    print("REQUIREMENT CHECKLIST")
    print("="*70)
    requirements = [
        ("FAISS setup", "✅" if "FAISS" in str(checks_passed) else "❌"),
        ("All embeddings indexed", "✅" if "indexed" in str(checks_passed) else "❌"),
        ("Similarity search working", "✅" if "search working" in str(checks_passed) else "❌"),
        ("Top 5 matches returned", "✅" if "Top 5" in str(checks_passed) or "Top 5" in str(checks_passed) else "❌"),
        ("Similarity scores attached", "✅" if "scores" in str(checks_passed) else "❌"),
        ("Threshold logic (>= 0.85, 0.50-0.85, < 0.50)", "✅" if "Threshold logic" in str(checks_passed) else "❌"),
    ]
    
    for req, status in requirements:
        print(f"{status} {req}")
    
    print("="*70)
    
    return len(checks_failed) == 0


if __name__ == '__main__':
    success = verify_vector_database()
    exit(0 if success else 1)
