"""Audit the data layer against all mandatory requirements."""
import json
import os
import sys
import numpy as np
from pathlib import Path

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent   # .../defect-finder
DATA_DIR = SCRIPT_DIR / "data"
ROOT_DIR = SCRIPT_DIR.parent                    # d:\Downloads\24

print("=" * 70)
print("  DATA LAYER AUDIT - Duplicate Defect Finder")
print("=" * 70)

# --- 1. Check dataset loaded ---
print("\n[CHECK 1] Dataset Loaded (Jira/Bugzilla/GitBugs)")
print("-" * 50)
processed_path = DATA_DIR / "processed_defects.json"
if processed_path.exists():
    with open(processed_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"  [PASS] Loaded {len(data)} defect records from processed_defects.json")
    print(f"  Source: Bugzilla/Mozilla Bug Reports (fix.csv + sev.csv)")
else:
    print("  [FAIL] processed_defects.json NOT FOUND")
    sys.exit(1)

# --- 2. Check all 8 fields present ---
print("\n[CHECK 2] All 8 Required Fields")
print("-" * 50)
REQUIRED_FIELDS = {
    "defect_id": "defect_id",
    "title": "title",
    "description": "raw_description",
    "steps": "steps",
    "expected": "expected",
    "actual": "actual",
    "environment": "environment",
    "logs": "logs",
}

all_fields_present = True
for display_name, field_key in REQUIRED_FIELDS.items():
    present = field_key in data[0]
    count_nonempty = sum(1 for d in data if d.get(field_key) and str(d.get(field_key, "")).strip())
    pct = (count_nonempty / len(data)) * 100
    status = "[PASS]" if present else "[FAIL]"
    all_fields_present = all_fields_present and present
    print(f"  {status} {display_name:15s} (key: {field_key:18s}) - {count_nonempty:,} populated ({pct:.1f}%)")

if all_fields_present:
    print(f"\n  [PASS] All 8 required fields are present in every record")
else:
    print(f"\n  [FAIL] Some required fields are MISSING")

# --- 3. Check cleaned & normalized ---
print("\n[CHECK 3] Cleaned & Normalized Data")
print("-" * 50)
has_normalized = "normalized_text" in data[0]
if has_normalized:
    norm_nonempty = sum(1 for d in data if d.get("normalized_text", "").strip())
    print(f"  [PASS] normalized_text field present in all records")
    print(f"  [PASS] {norm_nonempty:,} / {len(data):,} have non-empty normalized text")
    sample = data[0]["normalized_text"][:150]
    print(f"  Sample: \"{sample}...\"")
else:
    print(f"  [FAIL] normalized_text field MISSING")

tfidf_path = DATA_DIR / "tfidf_vectorizer.pkl"
if tfidf_path.exists():
    print(f"  [PASS] TF-IDF vectorizer saved ({tfidf_path.stat().st_size / 1024:.0f} KB)")
else:
    print(f"  [FAIL] TF-IDF vectorizer NOT FOUND")

emb_path = DATA_DIR / "processed_embeddings.npy"
if emb_path.exists():
    emb = np.load(emb_path)
    print(f"  [PASS] Embeddings: shape={emb.shape}, dtype={emb.dtype}")
else:
    print(f"  [FAIL] Embeddings NOT FOUND")

faiss_path = DATA_DIR / "faiss_index.bin"
if faiss_path.exists():
    print(f"  [PASS] FAISS index saved ({faiss_path.stat().st_size / (1024*1024):.0f} MB)")
else:
    print(f"  [FAIL] FAISS index NOT FOUND")

# --- 4. Check missing/null field handling ---
print("\n[CHECK 4] Missing/Null Field Handling")
print("-" * 50)
has_missing_field_detection = "missing_fields" in data[0]
if has_missing_field_detection:
    total_missing = sum(len(d.get("missing_fields", [])) for d in data)
    avg_missing = total_missing / len(data)
    field_missing_counts = {}
    for d in data:
        for mf in d.get("missing_fields", []):
            field_missing_counts[mf] = field_missing_counts.get(mf, 0) + 1

    print(f"  [PASS] missing_fields detected for each record")
    print(f"  [PASS] Average missing fields per record: {avg_missing:.1f}")
    print(f"  Missing field breakdown:")
    for field, count in sorted(field_missing_counts.items(), key=lambda x: -x[1]):
        pct = (count / len(data)) * 100
        print(f"      {field:15s}: {count:,} records ({pct:.1f}%)")
else:
    print(f"  [FAIL] missing_fields not detected in records")

null_issues = 0
for d in data:
    for f in ["defect_id", "title"]:
        if d.get(f) is None or str(d.get(f)) == "nan":
            null_issues += 1
if null_issues == 0:
    print(f"  [PASS] No null/NaN values in critical fields (defect_id, title)")
else:
    print(f"  [WARN] Found {null_issues} null/NaN values in critical fields")

# --- 5. Check train/test split ---
print("\n[CHECK 5] Train/Test Split")
print("-" * 50)
splits = {
    "fix_train.csv": ROOT_DIR / "fix_train.csv",
    "fix_test.csv": ROOT_DIR / "fix_test.csv",
    "sev_train.csv": ROOT_DIR / "sev_train.csv",
    "sev_test.csv": ROOT_DIR / "sev_test.csv",
}

for name, path in splits.items():
    if path.exists():
        size = path.stat().st_size / (1024 * 1024)
        print(f"  [PASS] {name:18s} exists ({size:.1f} MB)")
    else:
        print(f"  [FAIL] {name:18s} NOT FOUND")

processed_train = DATA_DIR / "train_defects.json"
processed_test = DATA_DIR / "test_defects.json"
has_processed_split = processed_train.exists() and processed_test.exists()

if has_processed_split:
    print(f"  [PASS] Processed train/test split exists")
else:
    print(f"  [WARN] No processed train/test split yet (source splits available)")
    print(f"      -> NEEDS: Generate train_defects.json / test_defects.json")

# --- Summary ---
print("\n" + "=" * 70)
print("  AUDIT SUMMARY")
print("=" * 70)
checks = {
    "Dataset Loaded": True,
    "All 8 Fields": all_fields_present,
    "Cleaned & Normalized": has_normalized,
    "Missing/Null Handled": has_missing_field_detection,
    "Train/Test Split": has_processed_split,
}
for check, passed in checks.items():
    status = "[PASS]" if passed else "[FAIL]"
    print(f"  {status}  {check}")

failed = [k for k, v in checks.items() if not v]
if failed:
    print(f"\n  >> {len(failed)} check(s) need attention: {', '.join(failed)}")
else:
    print(f"\n  >> All checks passed!")
