import json
import logging
from pathlib import Path
import numpy as np
from sklearn.cluster import KMeans

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Recluster script to force exactly 5 clusters
OUTPUT_DIR = Path(__file__).parent.parent / "data"

def recluster():
    # 1. Load Embeddings
    emb_path = OUTPUT_DIR / "processed_embeddings.npy"
    if not emb_path.exists():
        logger.error("Embeddings not found!")
        return

    embeddings = np.load(emb_path)
    
    # 2. Run KMeans with exactly 5 clusters
    logger.info("Running KMeans(n_clusters=5)...")
    # Using cosine distance = kmeans on normalized vectors is roughly equivalent
    kmeans = KMeans(n_clusters=5, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    
    unique, counts = np.unique(labels, return_counts=True)
    cluster_stats = {}
    for label, count in zip(unique, counts):
        cluster_stats[f'cluster_{label}'] = int(count)
    logger.info(f"KMeans Distribution: {cluster_stats}")

    # 3. Update JSON files
    with open(OUTPUT_DIR / "processed_defects.json", 'r', encoding='utf-8') as f:
        records = json.load(f)
    
    assert len(records) == len(labels), "Mismatch between records and embeddings!"
    
    # Update cluster IDs
    for i, record in enumerate(records):
        record['cluster_id'] = int(labels[i])

    # Save processed_defects
    with open(OUTPUT_DIR / "processed_defects.json", 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
    # Update defect_index
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

    # 4. Save cluster stats
    import pandas as pd
    df = pd.DataFrame(records)
    with open(OUTPUT_DIR / "cluster_stats.json", 'w') as f:
        json.dump({
            'total_records': len(records),
            'total_clusters': 5,
            'noise_points': 0,
            'cluster_distribution': cluster_stats,
            'embedding_dimension': int(embeddings.shape[1]),
            'severity_distribution': df['severity'].value_counts().to_dict(),
        }, f, indent=2)

    logger.info("Successfully reclustered to 5 clusters and saved data.")

if __name__ == '__main__':
    recluster()
