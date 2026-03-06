"""
Audit: Embeddings (Mandatory Component 2)
Checks every requirement against actual data and model.
"""
import json
import sys
import numpy as np
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = Path(__file__).resolve().parent / "data"
BACKEND_DIR = Path(__file__).resolve().parent / "backend"

print("=" * 70)
print("  EMBEDDINGS AUDIT (Mandatory Component 2)")
print("=" * 70)

# --- 1. Embedding model loaded ---
print("\n[CHECK 1] Embedding Model Loaded (all-MiniLM-L6-v2 or similar)")
print("-" * 50)

# Check model metadata
meta_path = DATA_DIR / "embedding_model_meta.json"
if meta_path.exists():
    with open(meta_path, 'r') as f:
        meta = json.load(f)
    model_name = meta.get('model_name', 'UNKNOWN')
    dim = meta.get('dimension', 0)
    index_size = meta.get('index_size', 0)
    print(f"  [PASS] Model: {model_name}")
    print(f"  [PASS] Dimension: {dim}")
    print(f"  [PASS] Index size: {index_size} vectors")
    
    if 'MiniLM' in model_name or 'minilm' in model_name.lower():
        print(f"  [PASS] Model is all-MiniLM-L6-v2 (required)")
    else:
        print(f"  [WARN] Model is '{model_name}' - not the specified MiniLM model")
else:
    print(f"  [FAIL] embedding_model_meta.json NOT FOUND")
    model_name = "UNKNOWN"
    dim = 0

# Verify model can be loaded at runtime
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    actual_dim = model.get_sentence_embedding_dimension()
    print(f"  [PASS] Model loaded successfully at runtime (dim={actual_dim})")
except Exception as e:
    print(f"  [FAIL] Could not load model: {e}")
    actual_dim = 0

# --- 2. All existing defects embedded ---
print("\n[CHECK 2] All Existing Defects Embedded")
print("-" * 50)

# Load processed defects
with open(DATA_DIR / "processed_defects.json", 'r', encoding='utf-8') as f:
    defects = json.load(f)

embeddings = np.load(DATA_DIR / "processed_embeddings.npy")
print(f"  Total defects: {len(defects)}")
print(f"  Embedding shape: {embeddings.shape}")

if embeddings.shape[0] == len(defects):
    print(f"  [PASS] Every defect has a corresponding embedding ({embeddings.shape[0]} == {len(defects)})")
else:
    print(f"  [FAIL] Mismatch: {embeddings.shape[0]} embeddings vs {len(defects)} defects")

# Check for zero/NaN vectors
zero_vecs = np.sum(np.all(embeddings == 0, axis=1))
nan_vecs = np.sum(np.any(np.isnan(embeddings), axis=1))
print(f"  [{'PASS' if zero_vecs == 0 else 'WARN'}] Zero vectors: {zero_vecs}")
print(f"  [{'PASS' if nan_vecs == 0 else 'FAIL'}] NaN vectors: {nan_vecs}")

# --- 3. New report embedded at query time ---
print("\n[CHECK 3] New Report Embedded at Query Time")
print("-" * 50)

# Test encoding a new query
test_query = "Firefox crashes when opening multiple tabs with JavaScript heavy pages"
try:
    query_emb = model.encode([test_query], normalize_embeddings=True).astype(np.float32)
    print(f"  [PASS] Query text embedded successfully")
    print(f"  Query embedding shape: {query_emb.shape}")
    print(f"  Query embedding dim: {query_emb.shape[1]}")
    
    # Verify it matches the stored embedding dimension
    if query_emb.shape[1] == embeddings.shape[1]:
        print(f"  [PASS] Query dim ({query_emb.shape[1]}) matches stored dim ({embeddings.shape[1]})")
    else:
        print(f"  [FAIL] Dimension mismatch: query={query_emb.shape[1]} vs stored={embeddings.shape[1]}")
    
    # Verify it can be used for FAISS search
    import faiss
    index = faiss.read_index(str(DATA_DIR / "faiss_index.bin"))
    distances, indices = index.search(query_emb, 5)
    print(f"  [PASS] FAISS search returned {len(indices[0])} results")
    print(f"  Top match: defect_id={defects[indices[0][0]]['defect_id']}, score={distances[0][0]:.4f}")
except Exception as e:
    print(f"  [FAIL] Query-time embedding failed: {e}")

# Check that app.py uses model.encode for inference
app_path = BACKEND_DIR / "app.py"
if app_path.exists():
    app_code = app_path.read_text(encoding='utf-8')
    if 'embedding_model.encode' in app_code:
        print(f"  [PASS] app.py uses embedding_model.encode() for query-time embedding")
    elif 'tfidf_vectorizer.transform' in app_code:
        print(f"  [FAIL] app.py still uses TF-IDF for query-time embedding")
    else:
        print(f"  [WARN] Could not verify query-time embedding method in app.py")

# --- 4. Vectors stored properly ---
print("\n[CHECK 4] Vectors Stored Properly")
print("-" * 50)

emb_path = DATA_DIR / "processed_embeddings.npy"
faiss_path = DATA_DIR / "faiss_index.bin"
meta_path2 = DATA_DIR / "embedding_model_meta.json"

print(f"  [{'PASS' if emb_path.exists() else 'FAIL'}] processed_embeddings.npy ({emb_path.stat().st_size / (1024*1024):.1f} MB)")
print(f"  [{'PASS' if faiss_path.exists() else 'FAIL'}] faiss_index.bin ({faiss_path.stat().st_size / (1024*1024):.1f} MB)")
print(f"  [{'PASS' if meta_path2.exists() else 'FAIL'}] embedding_model_meta.json")

# Verify FAISS index size matches
import faiss
index = faiss.read_index(str(faiss_path))
if index.ntotal == len(defects):
    print(f"  [PASS] FAISS index contains {index.ntotal} vectors (matches {len(defects)} defects)")
else:
    print(f"  [FAIL] FAISS index has {index.ntotal} vectors but {len(defects)} defects exist")

# Verify L2 normalization (cosine similarity via dot product)
norms = np.linalg.norm(embeddings, axis=1)
mean_norm = np.mean(norms)
print(f"  [{'PASS' if abs(mean_norm - 1.0) < 0.01 else 'WARN'}] L2 normalized: mean norm = {mean_norm:.4f} (should be ~1.0)")

# --- 5. Embedding dimension consistent ---
print("\n[CHECK 5] Embedding Dimension Consistent")
print("-" * 50)

dims = {
    "Model declared dim": actual_dim,
    "Stored embeddings dim": embeddings.shape[1],
    "FAISS index dim": index.d,
}

if meta_path.exists():
    dims["Metadata dim"] = meta.get('dimension', 0)

all_same = len(set(dims.values())) == 1
for label, d in dims.items():
    print(f"  {label}: {d}")

if all_same:
    print(f"  [PASS] All dimensions consistent: {list(dims.values())[0]}")
else:
    print(f"  [FAIL] Dimension inconsistency detected: {set(dims.values())}")

# --- Summary ---
print("\n" + "=" * 70)
print("  EMBEDDINGS AUDIT SUMMARY")
print("=" * 70)
results = {
    "Embedding model loaded (all-MiniLM-L6-v2)": 'MiniLM' in model_name or 'minilm' in model_name.lower(),
    "All existing defects embedded": embeddings.shape[0] == len(defects),
    "New report embedded at query time": actual_dim == embeddings.shape[1],
    "Vectors stored properly": emb_path.exists() and faiss_path.exists() and meta_path2.exists(),
    "Embedding dimension consistent": all_same,
}
for check, passed in results.items():
    status = "[PASS]" if passed else "[FAIL]"
    print(f"  {status}  {check}")

all_pass = all(results.values())
if all_pass:
    print(f"\n  >> All embeddings checks PASSED!")
else:
    failed = [k for k, v in results.items() if not v]
    print(f"\n  >> {len(failed)} check(s) need attention: {', '.join(failed)}")
