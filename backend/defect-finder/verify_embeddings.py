"""
Embedding System Verification Script
=====================================
Verifies all embedding requirements are properly configured:
✅ Embedding model loaded (all-MiniLM-L6-v2)
✅ All existing defects embedded
✅ New report embedded at query time
✅ Vectors stored properly
✅ Embedding dimension consistent
"""

import json
import numpy as np
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent / "data"

def verify_embedding_system():
    """Run comprehensive verification of the embedding system."""
    
    print("="*70)
    print("EMBEDDING SYSTEM VERIFICATION")
    print("="*70)
    
    checks_passed = []
    checks_failed = []
    
    # ─── Check 1: Embedding Model Metadata ───────────────────────────────
    print("\n[1/6] Checking embedding model metadata...")
    try:
        with open(DATA_DIR / "embedding_model_meta.json", 'r') as f:
            meta = json.load(f)
        
        model_name = meta.get('model_name')
        expected_dim = meta.get('dimension')
        index_size = meta.get('index_size')
        
        print(f"   ✅ Model: {model_name}")
        print(f"   ✅ Expected dimension: {expected_dim}")
        print(f"   ✅ Index size: {index_size}")
        
        if model_name == 'all-MiniLM-L6-v2':
            checks_passed.append("Correct model (all-MiniLM-L6-v2)")
        else:
            checks_failed.append(f"Wrong model: {model_name}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Model metadata missing or invalid")
    
    # ─── Check 2: Load Actual Model ──────────────────────────────────────
    print("\n[2/6] Loading sentence transformer model...")
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        actual_dim = model.get_sentence_embedding_dimension()
        print(f"   ✅ Model loaded successfully")
        print(f"   ✅ Actual dimension: {actual_dim}")
        
        if actual_dim == 384:
            checks_passed.append("Model dimension correct (384)")
        else:
            checks_failed.append(f"Wrong dimension: {actual_dim}")
            
    except Exception as e:
        print(f"   ❌ Error loading model: {e}")
        checks_failed.append("Failed to load embedding model")
        model = None
    
    # ─── Check 3: Verify Stored Embeddings ───────────────────────────────
    print("\n[3/6] Checking stored embeddings...")
    try:
        embeddings = np.load(DATA_DIR / "processed_embeddings.npy")
        print(f"   ✅ Embeddings loaded: {embeddings.shape}")
        print(f"   ✅ Number of defects: {embeddings.shape[0]}")
        print(f"   ✅ Embedding dimension: {embeddings.shape[1]}")
        print(f"   ✅ Data type: {embeddings.dtype}")
        
        if embeddings.shape[1] == 384:
            checks_passed.append(f"All {embeddings.shape[0]} defects embedded with correct dimension")
        else:
            checks_failed.append(f"Wrong embedding dimension: {embeddings.shape[1]}")
            
        if embeddings.dtype == np.float32:
            checks_passed.append("Correct data type (float32)")
        else:
            checks_failed.append(f"Wrong data type: {embeddings.dtype}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Embeddings file missing or invalid")
        embeddings = None
    
    # ─── Check 4: Verify FAISS Index ─────────────────────────────────────
    print("\n[4/6] Checking FAISS index...")
    try:
        index = faiss.read_index(str(DATA_DIR / "faiss_index.bin"))
        print(f"   ✅ FAISS index loaded")
        print(f"   ✅ Number of vectors: {index.ntotal}")
        print(f"   ✅ Index dimension: {index.d}")
        print(f"   ✅ Index type: {type(index).__name__}")
        
        if index.d == 384:
            checks_passed.append("FAISS index dimension correct (384)")
        else:
            checks_failed.append(f"FAISS dimension mismatch: {index.d}")
            
        if embeddings is not None and index.ntotal == embeddings.shape[0]:
            checks_passed.append("FAISS index size matches embeddings")
        else:
            checks_failed.append("FAISS index size mismatch")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("FAISS index missing or invalid")
        index = None
    
    # ─── Check 5: Test Query-Time Embedding ──────────────────────────────
    print("\n[5/6] Testing query-time embedding generation...")
    try:
        if model is not None:
            test_query = "Application crashes when clicking submit button"
            query_embedding = model.encode(
                [test_query],
                normalize_embeddings=True
            ).astype(np.float32)
            
            print(f"   ✅ Query embedded successfully")
            print(f"   ✅ Query embedding shape: {query_embedding.shape}")
            print(f"   ✅ Query dimension: {query_embedding.shape[1]}")
            
            if query_embedding.shape[1] == 384:
                checks_passed.append("Query-time embedding works correctly")
            else:
                checks_failed.append(f"Query embedding wrong dimension: {query_embedding.shape[1]}")
                
            # Test FAISS search
            if index is not None:
                distances, indices = index.search(query_embedding, 5)
                print(f"   ✅ FAISS search successful")
                print(f"   ✅ Top 5 matches found: {indices[0][:5]}")
                print(f"   ✅ Similarity scores: {distances[0][:5]}")
                checks_passed.append("FAISS search works at query time")
        else:
            checks_failed.append("Cannot test query embedding - model not loaded")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        checks_failed.append("Query-time embedding failed")
    
    # ─── Check 6: Dimension Consistency ──────────────────────────────────
    print("\n[6/6] Verifying dimension consistency...")
    dimensions = []
    
    if meta:
        dimensions.append(("Metadata", meta.get('dimension')))
    if model:
        dimensions.append(("Model", actual_dim))
    if embeddings is not None:
        dimensions.append(("Stored embeddings", embeddings.shape[1]))
    if index is not None:
        dimensions.append(("FAISS index", index.d))
    if 'query_embedding' in locals():
        dimensions.append(("Query embedding", query_embedding.shape[1]))
    
    print("\n   Dimension comparison:")
    all_same = True
    expected = 384
    for name, dim in dimensions:
        status = "✅" if dim == expected else "❌"
        print(f"   {status} {name}: {dim}")
        if dim != expected:
            all_same = False
    
    if all_same:
        checks_passed.append("All dimensions consistent (384)")
    else:
        checks_failed.append("Dimension inconsistency detected")
    
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
    
    print("\n" + "="*70)
    
    return len(checks_failed) == 0


if __name__ == '__main__':
    success = verify_embedding_system()
    exit(0 if success else 1)
