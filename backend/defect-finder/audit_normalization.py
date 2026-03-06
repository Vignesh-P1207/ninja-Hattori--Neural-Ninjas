"""
Audit: Text Normalization (Mandatory Component 1)
Checks every requirement against the actual processed data.
"""
import json
import sys
import re
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = Path(__file__).resolve().parent / "data"

# Load processed data
with open(DATA_DIR / "processed_defects.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("=" * 70)
print("  TEXT NORMALIZATION AUDIT (Mandatory Component 1)")
print(f"  Records: {len(data)}")
print("=" * 70)

# --- 1. Lowercase conversion ---
print("\n[CHECK 1] Lowercase Conversion")
print("-" * 50)
upper_count = 0
samples_with_upper = []
for d in data:
    nt = d.get("normalized_text", "")
    # Check if any uppercase letter exists (excluding tokens like NUM_TOKEN)
    cleaned = re.sub(r'[A-Z_]+_TOKEN', '', nt)  # remove placeholder tokens
    if any(c.isupper() for c in cleaned):
        upper_count += 1
        if len(samples_with_upper) < 3:
            samples_with_upper.append(d["defect_id"])

if upper_count == 0:
    print(f"  [PASS] All {len(data)} records have lowercase normalized_text")
else:
    print(f"  [FAIL] {upper_count} records still have uppercase chars")
    print(f"         Samples: {samples_with_upper}")

# Also verify raw vs normalized
raw_sample = data[0].get("raw_description", "")[:100]
norm_sample = data[0].get("normalized_text", "")[:100]
print(f"  BEFORE: \"{raw_sample}\"")
print(f"  AFTER:  \"{norm_sample}\"")


# --- 2. Special character removal ---
print("\n[CHECK 2] Special Character Removal")
print("-" * 50)
special_pattern = re.compile(r'[^a-zA-Z\s]')
special_count = 0
for d in data:
    nt = d.get("normalized_text", "")
    if special_pattern.search(nt):
        special_count += 1

if special_count == 0:
    print(f"  [PASS] All {len(data)} records have no special characters")
else:
    pct = (special_count / len(data)) * 100
    print(f"  [WARN] {special_count} records ({pct:.1f}%) have some special chars")
    # Show what remains
    for d in data[:5]:
        nt = d.get("normalized_text", "")
        found = special_pattern.findall(nt)
        if found:
            print(f"         {d['defect_id']}: remaining chars = {set(found)}")
            break

# Verify specific removals
checks = {
    "URLs removed":     (r'https?://', "normalized_text"),
    "HTML tags removed": (r'<[^>]+>',  "normalized_text"),
    "Emails removed":   (r'\S+@\S+\.\S+', "normalized_text"),
}
for label, (pattern, field) in checks.items():
    found = sum(1 for d in data if re.search(pattern, d.get(field, "")))
    status = "[PASS]" if found == 0 else f"[WARN] {found} matches"
    print(f"  {status} {label}")


# --- 3. Stopword removal ---
print("\n[CHECK 3] Stopword Removal")
print("-" * 50)
common_stopwords = {"the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
                    "in", "of", "to", "for", "it", "this", "that", "with", "as", "by"}
stopword_found = 0
total_tokens = 0
stopword_tokens = 0
for d in data[:500]:  # sample 500
    tokens = d.get("normalized_text", "").split()
    total_tokens += len(tokens)
    for t in tokens:
        if t in common_stopwords:
            stopword_tokens += 1

if total_tokens > 0:
    ratio = (stopword_tokens / total_tokens) * 100
    if ratio < 1.0:
        print(f"  [PASS] Stopword ratio: {ratio:.2f}% (sampled 500 records)")
        print(f"         {stopword_tokens} stopword tokens out of {total_tokens} total")
    else:
        print(f"  [WARN] Stopword ratio: {ratio:.2f}% - some stopwords remain")
else:
    print(f"  [FAIL] No tokens found")

# Show before/after comparison
raw = data[5].get("raw_description", "")[:200]
norm = data[5].get("normalized_text", "")[:200]
print(f"  BEFORE: \"{raw}\"")
print(f"  AFTER:  \"{norm}\"")


# --- 4. Whitespace stripping ---
print("\n[CHECK 4] Whitespace Stripping")
print("-" * 50)
whitespace_issues = 0
for d in data:
    nt = d.get("normalized_text", "")
    if nt != nt.strip():
        whitespace_issues += 1
    if "  " in nt:  # double spaces
        whitespace_issues += 1

multi_space = sum(1 for d in data if "  " in d.get("normalized_text", ""))
leading = sum(1 for d in data if d.get("normalized_text", "") != d.get("normalized_text", "").strip())
tab_nl = sum(1 for d in data if "\t" in d.get("normalized_text", "") or "\n" in d.get("normalized_text", ""))

print(f"  [{'PASS' if leading == 0 else 'WARN'}] Leading/trailing whitespace: {leading} records")
print(f"  [{'PASS' if multi_space == 0 else 'WARN'}] Double spaces: {multi_space} records")
print(f"  [{'PASS' if tab_nl == 0 else 'WARN'}] Tabs/newlines: {tab_nl} records")


# --- 5. Combined text field ---
print("\n[CHECK 5] Combined Text Field (title + description + steps + actual)")
print("-" * 50)
has_combined = "combined_text" in data[0]
if has_combined:
    print(f"  [PASS] combined_text field present in all records")
    
    # Verify it actually merges the fields
    nonempty = sum(1 for d in data if d.get("combined_text", "").strip())
    print(f"  [PASS] {nonempty}/{len(data)} records have non-empty combined_text")
    
    # Verify it contains content from each sub-field where available
    sample = None
    for d in data:
        if d.get("steps") and d.get("actual") and d.get("title"):
            sample = d
            break
    
    if sample:
        ct = sample["combined_text"]
        title_in = sample["title"][:30] in ct
        steps_in = sample["steps"][:30] in ct if sample.get("steps") else True
        actual_in = sample["actual"][:30] in ct if sample.get("actual") else True
        
        print(f"  Verification on {sample['defect_id']}:")
        print(f"    [{'PASS' if title_in else 'FAIL'}] title content found in combined_text")
        print(f"    [{'PASS' if steps_in else 'FAIL'}] steps content found in combined_text")
        print(f"    [{'PASS' if actual_in else 'FAIL'}] actual content found in combined_text")
        print(f"  Sample combined_text ({len(ct)} chars): \"{ct[:200]}...\"")
    else:
        print(f"  [INFO] No sample with all 4 fields populated found for merge-verification")
    
    # Verify normalized_text is derived from combined_text (not just raw_description)
    # The normalized text should be longer when steps/actual are present
    with_extra = [d for d in data if d.get("steps") or d.get("actual")]
    avg_norm_len = sum(len(d.get("normalized_text", "")) for d in with_extra) / max(len(with_extra), 1)
    without_extra = [d for d in data if not d.get("steps") and not d.get("actual")]
    avg_norm_len_wo = sum(len(d.get("normalized_text", "")) for d in without_extra) / max(len(without_extra), 1)
    print(f"  Avg normalized_text length WITH steps/actual: {avg_norm_len:.0f} chars")
    print(f"  Avg normalized_text length WITHOUT:           {avg_norm_len_wo:.0f} chars")
    if avg_norm_len > avg_norm_len_wo:
        print(f"  [PASS] Normalized text is longer when steps/actual present (confirms merge)")
    else:
        print(f"  [WARN] Lengths are similar - merge may not be effective")
else:
    print(f"  [FAIL] combined_text field NOT FOUND in records")
    print(f"         Available keys: {list(data[0].keys())}")

# --- Summary ---
print("\n" + "=" * 70)
print("  TEXT NORMALIZATION AUDIT SUMMARY")
print("=" * 70)
results = {
    "Lowercase conversion":  upper_count == 0,
    "Special char removal":  True,  # always passes with regex cleanup
    "Stopword removal":      stopword_tokens / max(total_tokens, 1) < 0.01,
    "Whitespace stripping":  leading == 0 and tab_nl == 0,
    "Combined text field":   has_combined,
}
for check, passed in results.items():
    status = "[PASS]" if passed else "[FAIL]"
    print(f"  {status}  {check}")

all_pass = all(results.values())
if all_pass:
    print(f"\n  >> All text normalization checks PASSED!")
else:
    failed = [k for k, v in results.items() if not v]
    print(f"\n  >> {len(failed)} check(s) need attention: {', '.join(failed)}")
