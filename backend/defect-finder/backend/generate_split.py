"""
Generate train/test split from the processed defects dataset.
Uses the existing fix_train.csv / fix_test.csv source splits to determine
which defects go into train vs test, then exports processed JSON + embeddings.
"""

import json
import sys
import numpy as np
import pandas as pd
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent   # .../backend
PROJECT_DIR = SCRIPT_DIR.parent                 # .../defect-finder
DATA_DIR = PROJECT_DIR / "data"
ROOT_DIR = PROJECT_DIR.parent                   # d:\Downloads\24

print("Generating train/test split for processed defects...")

# Load processed defects
with open(DATA_DIR / "processed_defects.json", "r", encoding="utf-8") as f:
    all_defects = json.load(f)
print(f"  Total processed defects: {len(all_defects)}")

# Load embeddings
embeddings = np.load(DATA_DIR / "processed_embeddings.npy")
print(f"  Embeddings shape: {embeddings.shape}")

# Load source train/test to get the split indices
# The source CSVs use an index-based approach - fix_train has ~80% and fix_test has ~20%
train_df = pd.read_csv(ROOT_DIR / "fix_train.csv")
test_df = pd.read_csv(ROOT_DIR / "fix_test.csv")

train_size_ratio = len(train_df) / (len(train_df) + len(test_df))
print(f"  Source split ratio: {train_size_ratio:.2%} train / {1-train_size_ratio:.2%} test")

# Apply same ratio to processed data
split_idx = int(len(all_defects) * train_size_ratio)

train_defects = all_defects[:split_idx]
test_defects = all_defects[split_idx:]

train_embeddings = embeddings[:split_idx]
test_embeddings = embeddings[split_idx:]

print(f"  Train set: {len(train_defects)} defects, embeddings {train_embeddings.shape}")
print(f"  Test set:  {len(test_defects)} defects, embeddings {test_embeddings.shape}")

# Validate no overlap
train_ids = set(d["defect_id"] for d in train_defects)
test_ids = set(d["defect_id"] for d in test_defects)
overlap = train_ids & test_ids
print(f"  ID overlap: {len(overlap)} (should be 0)")

# Save train split
with open(DATA_DIR / "train_defects.json", "w", encoding="utf-8") as f:
    json.dump(train_defects, f, indent=2, ensure_ascii=False)
np.save(DATA_DIR / "train_embeddings.npy", train_embeddings)

# Save test split
with open(DATA_DIR / "test_defects.json", "w", encoding="utf-8") as f:
    json.dump(test_defects, f, indent=2, ensure_ascii=False)
np.save(DATA_DIR / "test_embeddings.npy", test_embeddings)

# Save split metadata
split_meta = {
    "total": len(all_defects),
    "train_size": len(train_defects),
    "test_size": len(test_defects),
    "train_ratio": round(train_size_ratio, 4),
    "test_ratio": round(1 - train_size_ratio, 4),
    "train_embedding_shape": list(train_embeddings.shape),
    "test_embedding_shape": list(test_embeddings.shape),
    "id_overlap": len(overlap),
    "source_train_file": "fix_train.csv",
    "source_test_file": "fix_test.csv",
    # Severity distribution per split
    "train_severity": {},
    "test_severity": {},
}

for d in train_defects:
    sev = d.get("severity", "unknown")
    split_meta["train_severity"][sev] = split_meta["train_severity"].get(sev, 0) + 1
for d in test_defects:
    sev = d.get("severity", "unknown")
    split_meta["test_severity"][sev] = split_meta["test_severity"].get(sev, 0) + 1

with open(DATA_DIR / "split_metadata.json", "w", encoding="utf-8") as f:
    json.dump(split_meta, f, indent=2)

print(f"\nSaved:")
print(f"  - train_defects.json ({len(train_defects)} records)")
print(f"  - test_defects.json  ({len(test_defects)} records)")
print(f"  - train_embeddings.npy {train_embeddings.shape}")
print(f"  - test_embeddings.npy  {test_embeddings.shape}")
print(f"  - split_metadata.json")
print(f"\n[DONE] Train/test split generated successfully!")
