"""
Duplicate Defect Finder - Data Preprocessing Pipeline
=====================================================
This script preprocesses the Bugzilla/Mozilla bug report dataset to:
1. Clean and normalize text data
2. Extract structured fields from raw descriptions
3. Generate TF-IDF embeddings for similarity search
4. Build a FAISS vector index for fast nearest-neighbor lookup
5. Run DBSCAN clustering to group similar defects
6. Export processed data as structured JSON for the web app
"""

import os
import re
import json
import hashlib
import logging
import numpy as np
import pandas as pd
from pathlib import Path

# NLP & ML
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
import faiss

# Download required NLTK data
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent.parent  # points to d:\Downloads\24
OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TFIDF_MAX_FEATURES = 5000
N_CLUSTERS = 12  # KMeans: 12 balanced clusters across all defect types
MAX_RECORDS = 20000  # Process a subset for performance; set None for all

# ─── 1. Text Normalization ────────────────────────────────────────────────────

class TextNormalizer:
    """Normalize bug report text: clean, tokenize, remove stops, lemmatize."""

    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        try:
            self.stop_words = set(stopwords.words('english'))
        except LookupError:
            nltk.download('stopwords', quiet=True)
            self.stop_words = set(stopwords.words('english'))
        # Patterns for cleaning
        self.url_pattern = re.compile(r'https?://\S+|www\.\S+')
        self.email_pattern = re.compile(r'\S+@\S+\.\S+')
        self.html_pattern = re.compile(r'<[^>]+>')
        self.hash_pattern = re.compile(r'\b[0-9a-f]{7,40}\b')
        self.hex_pattern = re.compile(r'0x[0-9a-fA-F]+')
        self.filepath_pattern = re.compile(r'[/\\][\w./\\-]+\.\w+')
        self.number_pattern = re.compile(r'\b\d+\.?\d*\b')
        self.special_chars = re.compile(r'[^a-zA-Z\s]')

    def normalize(self, text):
        """Full normalization pipeline for a single text."""
        if not isinstance(text, str) or not text.strip():
            return ""

        text = text.lower()
        # Remove URLs, emails, HTML, hashes, hex, file paths
        # Use lowercase placeholder tokens to maintain full lowercase output
        text = self.url_pattern.sub(' urltoken ', text)
        text = self.email_pattern.sub(' emailtoken ', text)
        text = self.html_pattern.sub(' ', text)
        text = self.hash_pattern.sub(' hashtoken ', text)
        text = self.hex_pattern.sub(' hextoken ', text)
        text = self.filepath_pattern.sub(' filepathtoken ', text)
        text = self.number_pattern.sub(' numtoken ', text)
        # Remove special characters
        text = self.special_chars.sub(' ', text)
        # Tokenize and lemmatize
        tokens = text.split()
        tokens = [
            self.lemmatizer.lemmatize(t)
            for t in tokens
            if t not in self.stop_words and len(t) > 2
        ]
        return ' '.join(tokens).strip()

    @staticmethod
    def combine_fields(title, description, steps, actual):
        """Combine title + description + steps + actual into a single text field."""
        parts = []
        for field in [title, description, steps, actual]:
            if isinstance(field, str) and field.strip():
                parts.append(field.strip())
        return ' . '.join(parts)


# ─── 2. Field Extraction ─────────────────────────────────────────────────────

class FieldExtractor:
    """Extract structured fields from raw Bugzilla descriptions."""

    # Common section headers in bug reports
    SECTION_PATTERNS = {
        'steps_to_reproduce': [
            r'steps\s*to\s*reproduce',
            r'stm|str',
            r'reproduction\s*steps',
            r'how\s*to\s*reproduce',
        ],
        'expected_result': [
            r'expected\s*(result|behavior|outcome|output)',
            r'should\s*(be|show|display|work)',
        ],
        'actual_result': [
            r'actual\s*(result|behavior|outcome|output)',
            r'what\s*happened',
            r'instead',
        ],
        'environment': [
            r'environment',
            r'platform',
            r'os\s*version',
            r'browser\s*version',
            r'system\s*info',
            r'build\s*id',
            r'user\s*agent',
        ],
        'logs': [
            r'log\s*(output|file|message)',
            r'stack\s*trace',
            r'error\s*(message|log|output)',
            r'traceback',
            r'console\s*output',
        ],
    }

    def __init__(self):
        self.compiled_patterns = {}
        for field, patterns in self.SECTION_PATTERNS.items():
            self.compiled_patterns[field] = [
                re.compile(p, re.IGNORECASE) for p in patterns
            ]

    def extract_title(self, description):
        """Extract title from first meaningful line of description."""
        if not isinstance(description, str):
            return "Untitled Bug Report"
        lines = [l.strip() for l in description.split('\n') if l.strip()]
        if lines:
            title = lines[0][:120]
            # Remove common prefixes
            title = re.sub(r'^(bug|issue|defect|report)\s*[:#-]?\s*', '', title, flags=re.IGNORECASE)
            return title if title else "Untitled Bug Report"
        return "Untitled Bug Report"

    def extract_sections(self, description):
        """Try to extract structured sections from description text."""
        result = {
            'steps': '',
            'expected': '',
            'actual': '',
            'environment': '',
            'logs': '',
        }
        if not isinstance(description, str):
            return result

        text = description
        for field, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                match = pattern.search(text)
                if match:
                    start = match.end()
                    # Find next section or end
                    remaining = text[start:]
                    # Look for next header-like line
                    next_section = re.search(
                        r'\n\s*(?:steps|expected|actual|environment|log|stack|error|platform|os|browser)',
                        remaining,
                        re.IGNORECASE
                    )
                    end = next_section.start() if next_section else len(remaining)
                    content = remaining[:end].strip()
                    key = field.replace('steps_to_reproduce', 'steps') \
                               .replace('expected_result', 'expected') \
                               .replace('actual_result', 'actual')
                    if key in result:
                        result[key] = content[:500]  # Limit length
                    break
        return result

    def detect_missing_fields(self, record):
        """Detect which important fields are missing from a bug report."""
        required_fields = {
            'title': 'Bug title/summary',
            'description': 'Detailed description',
            'steps': 'Steps to reproduce',
            'expected': 'Expected result',
            'actual': 'Actual result',
            'environment': 'Environment details',
            'severity': 'Severity level',
        }
        missing = []
        for field, label in required_fields.items():
            value = record.get(field, '')
            if not value or (isinstance(value, str) and len(value.strip()) < 5):
                missing.append({
                    'field': field,
                    'label': label,
                    'suggestion': self._get_suggestion(field)
                })
        return missing

    def _get_suggestion(self, field):
        suggestions = {
            'title': 'Add a concise, descriptive title summarizing the bug',
            'description': 'Provide a detailed description of the issue',
            'steps': 'List numbered steps to reproduce the bug (e.g., 1. Open app 2. Click X)',
            'expected': 'Describe what you expected to happen',
            'actual': 'Describe what actually happened',
            'environment': 'Include OS, browser/app version, device info',
            'severity': 'Rate severity: blocker, critical, major, normal, minor, trivial',
            'logs': 'Attach relevant error logs or stack traces',
        }
        return suggestions.get(field, f'Please provide {field}')


# ─── 3. Embedding & Vector Index ─────────────────────────────────────────────

EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'  # 384-dim sentence embeddings

class EmbeddingEngine:
    """Generate sentence embeddings using all-MiniLM-L6-v2 and build FAISS index."""

    def __init__(self, model_name=EMBEDDING_MODEL_NAME):
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.index = None
        self.dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model loaded: {model_name} (dim={self.dimension})")

    def fit_transform(self, texts):
        """Encode all texts to dense vector embeddings."""
        logger.info(f"Encoding {len(texts)} documents with {self.model_name}...")
        embeddings = self.model.encode(
            texts,
            batch_size=128,
            show_progress_bar=True,
            normalize_embeddings=True,  # L2 normalize for cosine similarity via dot product
        )
        embeddings = embeddings.astype(np.float32)
        logger.info(f"Embeddings shape: {embeddings.shape}, dim={self.dimension}")
        return embeddings

    def encode_query(self, text):
        """Encode a single query text at inference time."""
        embedding = self.model.encode(
            [text],
            normalize_embeddings=True,
        ).astype(np.float32)
        return embedding

    def build_faiss_index(self, embeddings):
        """Build FAISS index for fast similarity search."""
        logger.info(f"Building FAISS index with {embeddings.shape[0]} vectors (dim={embeddings.shape[1]})...")
        self.dimension = embeddings.shape[1]
        # Use IndexFlatIP (inner product) since vectors are L2-normalized
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(embeddings)
        logger.info(f"FAISS index built with {self.index.ntotal} vectors")
        return self.index

    def search(self, query_embedding, k=5):
        """Search for top-k similar vectors."""
        if self.index is None:
            raise ValueError("Index not built. Call build_faiss_index first.")
        query = query_embedding.reshape(1, -1).astype(np.float32)
        distances, indices = self.index.search(query, k)
        return distances[0], indices[0]

    def save(self, output_dir):
        """Save FAISS index and model info."""
        import json as _json
        faiss.write_index(self.index, str(output_dir / "faiss_index.bin"))
        # Save model metadata so we know which model to load at inference
        meta = {
            'model_name': self.model_name,
            'dimension': int(self.dimension),
            'index_size': int(self.index.ntotal),
        }
        with open(output_dir / "embedding_model_meta.json", 'w') as f:
            _json.dump(meta, f, indent=2)
        logger.info(f"Saved FAISS index and model metadata ({self.model_name})")


# ─── 4. Clustering ───────────────────────────────────────────────────────────

class DefectClusterer:
    """Cluster defects using KMeans on their embeddings for guaranteed cluster count."""

    def __init__(self, n_clusters=N_CLUSTERS):
        self.n_clusters = n_clusters
        self.model = None

    def fit(self, embeddings):
        """Run KMeans clustering on embeddings."""
        from sklearn.cluster import KMeans
        logger.info(f"Running KMeans (n_clusters={self.n_clusters})...")
        self.model = KMeans(
            n_clusters=self.n_clusters,
            random_state=42,
            n_init=10,
            max_iter=300,
        )
        labels = self.model.fit_predict(embeddings)
        n_clusters = len(set(labels))
        logger.info(f"Found {n_clusters} clusters")
        return labels

    def get_cluster_stats(self, labels):
        """Get cluster size distribution."""
        unique, counts = np.unique(labels, return_counts=True)
        stats = {}
        for label, count in zip(unique, counts):
            stats[f'cluster_{label}'] = int(count)
        return stats


# ─── 5. Main Pipeline ────────────────────────────────────────────────────────

def load_data():
    """Load and merge the fix and severity datasets and any external datasets."""
    logger.info("Loading datasets...")

    fix_df = pd.read_csv(DATA_DIR / "fix.csv")
    sev_df = pd.read_csv(DATA_DIR / "sev.csv")

    logger.info(f"Fix dataset: {fix_df.shape}")
    logger.info(f"Severity dataset: {sev_df.shape}")

    # Clean column names
    fix_df = fix_df.drop(columns=[c for c in fix_df.columns if 'Unnamed' in c], errors='ignore')
    sev_df = sev_df.drop(columns=[c for c in sev_df.columns if 'Unnamed' in c], errors='ignore')

    # Merge on Description
    merged = fix_df.merge(sev_df[['Description', 'Severity']], on='Description', how='left')

    # Rename for consistency
    merged = merged.rename(columns={
        'Fixing_time': 'fixing_time',
        'Label': 'fix_label',
        'Severity': 'severity',
        'Description': 'raw_description',
    })
    
    # Load external datasets from gitbugs
    gitbugs_dir = DATA_DIR / "gitbugs"
    external_dfs = []
    if gitbugs_dir.exists():
        logger.info(f"Loading external gitbugs datasets from {gitbugs_dir}")
        for root, dirs, files in os.walk(gitbugs_dir):
            for file in files:
                if file.endswith("_bugs.csv"):
                    file_path = os.path.join(root, file)
                    try:
                        ext_df = pd.read_csv(file_path)
                        if 'Description' in ext_df.columns:
                            # Map columns to match schema
                            ext_df = ext_df.rename(columns={
                                'Description': 'raw_description',
                                'Priority': 'severity',  # Roughly matches severity concept
                                'Summary': 'title' # Will be used as title directly
                            })
                            # Standardize other columns
                            ext_df['fixing_time'] = 0
                            ext_df['fix_label'] = 0
                            # Keep only what we need
                            cols_to_keep = ['raw_description', 'severity', 'title', 'fixing_time', 'fix_label']
                            ext_df = ext_df[[c for c in cols_to_keep if c in ext_df.columns]]
                            external_dfs.append(ext_df)
                            logger.info(f"Loaded {len(ext_df)} records from {file}")
                    except Exception as e:
                        logger.warning(f"Error loading {file_path}: {e}")

    if external_dfs:
        combined_ext = pd.concat(external_dfs, ignore_index=True)
        merged = pd.concat([merged, combined_ext], ignore_index=True)
        logger.info(f"Added {len(combined_ext)} external records. Total is now {len(merged)}")

    # Add defect_id
    merged = merged.reset_index(drop=True)
    merged['defect_id'] = ['DEF-' + str(i+1).zfill(5) for i in range(len(merged))]

    if MAX_RECORDS:
        merged = merged.head(MAX_RECORDS)
        logger.info(f"Limited to {MAX_RECORDS} records for processing")

    return merged


def process_pipeline():
    """Run the full preprocessing pipeline."""
    # Load data
    df = load_data()
    logger.info(f"Processing {len(df)} defect records...")

    # Initialize components
    normalizer = TextNormalizer()
    extractor = FieldExtractor()
    embedder = EmbeddingEngine()
    clusterer = DefectClusterer()

    # ─── Step 1: Extract structured fields ────────────────────────────────
    logger.info("Step 1: Extracting structured fields...")
    titles = []
    all_sections = []
    for _, row in df.iterrows():
        desc = row.get('raw_description', '')
        # if title is already provided (from gitbugs), use it, otherwise extract
        if 'title' in row and pd.notna(row['title']) and str(row['title']).strip():
            title = str(row['title'])
        else:
            title = extractor.extract_title(desc)
        sections = extractor.extract_sections(desc)
        titles.append(title)
        all_sections.append(sections)

    df['title'] = titles
    df['steps'] = [s['steps'] for s in all_sections]
    df['expected'] = [s['expected'] for s in all_sections]
    df['actual'] = [s['actual'] for s in all_sections]
    df['environment'] = [s['environment'] for s in all_sections]
    df['logs'] = [s['logs'] for s in all_sections]

    # ─── Step 2: Build combined text field (title + description + steps + actual) ──
    logger.info("Step 2: Building combined text field...")
    df['combined_text'] = df.apply(
        lambda row: TextNormalizer.combine_fields(
            row['title'], row['raw_description'], row['steps'], row['actual']
        ), axis=1
    )
    logger.info(f"Combined text built for {len(df)} records")

    # ─── Step 3: Normalize combined text ──────────────────────────────────
    logger.info("Step 3: Normalizing combined text...")
    df['normalized_text'] = df['combined_text'].apply(normalizer.normalize)

    # Filter out empty normalized texts
    valid_mask = df['normalized_text'].str.len() > 10
    df = df[valid_mask].reset_index(drop=True)
    logger.info(f"After filtering: {len(df)} valid records")

    # ─── Step 4: Generate embeddings ──────────────────────────────────────
    logger.info("Step 4: Generating TF-IDF embeddings...")
    embeddings = embedder.fit_transform(df['normalized_text'].tolist())

    # ─── Step 5: Build FAISS index ────────────────────────────────────────
    logger.info("Step 5: Building FAISS vector index...")
    embedder.build_faiss_index(embeddings)

    # ─── Step 6: Run clustering ───────────────────────────────────────────
    logger.info("Step 6: Running DBSCAN clustering...")
    cluster_labels = clusterer.fit(embeddings)
    df['cluster_id'] = cluster_labels.tolist()
    cluster_stats = clusterer.get_cluster_stats(cluster_labels)
    logger.info(f"Cluster stats: {json.dumps(dict(list(cluster_stats.items())[:10]), indent=2)}")

    # ─── Step 7: Detect missing fields ────────────────────────────────────
    logger.info("Step 7: Detecting missing fields...")
    missing_fields_list = []
    for _, row in df.iterrows():
        record = {
            'title': row['title'],
            'description': row['raw_description'],
            'steps': row['steps'],
            'expected': row['expected'],
            'actual': row['actual'],
            'environment': row['environment'],
            'severity': row.get('severity', ''),
        }
        missing = extractor.detect_missing_fields(record)
        missing_fields_list.append([m['field'] for m in missing])
    df['missing_fields'] = missing_fields_list

    # ─── Step 8: Generate improved summaries ──────────────────────────────
    logger.info("Step 8: Generating improved summaries...")
    improved_summaries = []
    for _, row in df.iterrows():
        summary = _generate_improved_summary(row)
        improved_summaries.append(summary)
    df['improved_summary'] = improved_summaries

    # ─── Step 9: Save outputs ─────────────────────────────────────────────
    logger.info("Step 9: Saving processed data...")

    # Save embeddings
    np.save(OUTPUT_DIR / "processed_embeddings.npy", embeddings)

    # Save FAISS index and vectorizer
    embedder.save(OUTPUT_DIR)

    # Prepare JSON dataset
    records = []
    for i, row in df.iterrows():
        record = {
            'defect_id': row['defect_id'],
            'title': row['title'],
            'raw_description': row['raw_description'][:1000].strip(),  # Limit size
            'combined_text': row['combined_text'][:1500].strip(),  # title+desc+steps+actual merged
            'normalized_text': row['normalized_text'][:500].strip(),
            'severity': str(row.get('severity', 'unknown')),
            'fixing_time': int(row.get('fixing_time', 0)) if pd.notna(row.get('fixing_time')) else 0,
            'fix_label': int(row.get('fix_label', 0)) if pd.notna(row.get('fix_label')) else 0,
            'cluster_id': int(row['cluster_id']),
            'steps': row['steps'],
            'expected': row['expected'],
            'actual': row['actual'],
            'environment': row['environment'],
            'logs': row['logs'],
            'missing_fields': row['missing_fields'],
            'improved_summary': row['improved_summary'],
        }
        records.append(record)

    # Save as JSON
    with open(OUTPUT_DIR / "processed_defects.json", 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    # Save cluster stats
    n_real_clusters = len([k for k in cluster_stats if not k.startswith('noise')])
    cluster_dist_clean = {k.replace('cluster_', ''): v for k, v in cluster_stats.items() if not k.startswith('noise')}
    with open(OUTPUT_DIR / "cluster_stats.json", 'w') as f:
        json.dump({
            'total_records': len(records),
            'total_clusters': n_real_clusters,
            'noise_points': 0,
            'cluster_distribution': cluster_dist_clean,
            'embedding_dimension': int(embeddings.shape[1]),
            'severity_distribution': df['severity'].value_counts().to_dict(),
        }, f, indent=2)

    # Save defect index (lightweight) for frontend
    defect_index = []
    for r in records:
        defect_index.append({
            'defect_id': r['defect_id'],
            'title': r['title'],
            'severity': r['severity'],
            'cluster_id': r['cluster_id'],
            'missing_count': len(r['missing_fields']),
        })
    with open(OUTPUT_DIR / "defect_index.json", 'w', encoding='utf-8') as f:
        json.dump(defect_index, f, indent=2)

    logger.info(f"✅ Preprocessing complete! {len(records)} defects processed.")
    logger.info(f"   Output directory: {OUTPUT_DIR}")
    logger.info(f"   Files: processed_defects.json, processed_embeddings.npy, faiss_index.bin, tfidf_vectorizer.pkl")

    return records, embeddings, cluster_stats


def _generate_improved_summary(row):
    """Generate an improved bug report summary from available fields."""
    parts = []

    title = row.get('title', '')
    if title and title != 'Untitled Bug Report':
        parts.append(f"**{title}**")

    severity = row.get('severity', '')
    if severity and severity != 'nan':
        parts.append(f"Severity: {severity}")

    desc = row.get('raw_description', '')
    if desc and isinstance(desc, str):
        # Get first meaningful sentence
        sentences = [s.strip() for s in desc.split('.') if len(s.strip()) > 20]
        if sentences:
            parts.append(sentences[0][:200] + '.')

    steps = row.get('steps', '')
    if steps:
        parts.append(f"Steps: {steps[:150]}")

    expected = row.get('expected', '')
    if expected:
        parts.append(f"Expected: {expected[:100]}")

    actual = row.get('actual', '')
    if actual:
        parts.append(f"Actual: {actual[:100]}")

    return ' | '.join(parts) if parts else 'No summary available'


if __name__ == '__main__':
    records, embeddings, stats = process_pipeline()
    print(f"\n{'='*60}")
    print(f"PREPROCESSING COMPLETE")
    print(f"{'='*60}")
    print(f"Total defects processed: {len(records)}")
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Clusters found: {len([k for k in stats if k != 'noise'])}")
    print(f"Output saved to: {OUTPUT_DIR}")
