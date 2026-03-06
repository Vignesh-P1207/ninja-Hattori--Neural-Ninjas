import json
import logging
from pathlib import Path
import numpy as np
from sklearn.cluster import DBSCAN

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent / "data"

def tune_dbscan():
    # Load Embeddings
    emb_path = OUTPUT_DIR / "processed_embeddings.npy"
    if not emb_path.exists():
        logger.error("Embeddings not found!")
        return

    embeddings = np.load(emb_path)
    logger.info(f"Loaded {embeddings.shape[0]} embeddings.")
    
    # Auto-tune: Search for an eps that yields 4 - 8 solid clusters
    best_labels = None
    best_stats = None
    best_eps = None
    best_noise = float('inf')
    
    # We normalized the embeddings, so cosine distance is roughly [0, 2].
    # Typically eps for this space is between 0.15 and 0.5.
    eps_values = np.linspace(0.15, 0.45, 30)
    
    for eps in eps_values:
        db = DBSCAN(eps=eps, min_samples=30, metric='cosine', n_jobs=-1)
        labels = db.fit_predict(embeddings)
        
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = list(labels).count(-1)
        
        logger.info(f"Tested eps={eps:.3f} -> {n_clusters} clusters, {n_noise} noise points")
        
        # We want exactly 4 to 8 clusters, and we want to minimize noise points
        if 4 <= n_clusters <= 8:
            if n_noise < best_noise:
                best_noise = n_noise
                best_labels = labels
                best_eps = eps
                
                unique, counts = np.unique(labels, return_counts=True)
                best_stats = {}
                for label, count in zip(unique, counts):
                    best_stats[f'cluster_{label}'] = int(count)

    if best_labels is None:
        logger.warning("Could not find perfectly 4-8 clusters. Falling back to default eps=0.25")
        best_eps = 0.25
        db = DBSCAN(eps=best_eps, min_samples=25, metric='cosine', n_jobs=-1)
        best_labels = db.fit_predict(embeddings)
        unique, counts = np.unique(best_labels, return_counts=True)
        best_stats = {f'cluster_{l}': int(c) for l, c in zip(unique, counts)}
        best_noise = best_stats.get('cluster_-1', 0)

    # Re-index noise to a specific cluster or leave as noise
    # The requirement says "cluster_id assigned to every report". We will assign noise to a "Misc fallback" cluster '0', 
    # and shift everything else up. Or just leave noise as -1 and handle in UI.
    # Hackathon requirement: "cluster_id assigned to every report". Let's eliminate noise by assigning them to the nearest cluster.
    
    n_clusters = len([k for k in best_stats.keys() if k != 'cluster_-1'])
    logger.info(f"Selected eps={best_eps:.3f} producing {n_clusters} clusters. Resolving noise points...")
    
    # Assign noise to nearest cluster using centroids
    cluster_centroids = {}
    for c_id in range(n_clusters):
        mask = best_labels == c_id
        if np.any(mask):
            cluster_centroids[c_id] = np.mean(embeddings[mask], axis=0)
            
    # Normalize centroids
    for c_id in cluster_centroids:
        cluster_centroids[c_id] = cluster_centroids[c_id] / np.linalg.norm(cluster_centroids[c_id])

    final_labels = best_labels.copy()
    for i in range(len(final_labels)):
        if final_labels[i] == -1: # Noise
            # Find closest centroid
            best_c = 0
            best_sim = -1
            for c_id, centroid in cluster_centroids.items():
                sim = np.dot(embeddings[i], centroid)
                if sim > best_sim:
                    best_sim = sim
                    best_c = c_id
            final_labels[i] = best_c

    # Re-calculate stats
    unique, counts = np.unique(final_labels, return_counts=True)
    final_stats = {f'cluster_{l}': int(c) for l, c in zip(unique, counts)}
    logger.info(f"Final DBSCAN Distribution (Noise resolved): {final_stats}")

    # Update JSON files
    with open(OUTPUT_DIR / "processed_defects.json", 'r', encoding='utf-8') as f:
        records = json.load(f)
    
    for i, record in enumerate(records):
        record['cluster_id'] = int(final_labels[i])

    with open(OUTPUT_DIR / "processed_defects.json", 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
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

    import pandas as pd
    df = pd.DataFrame(records)
    with open(OUTPUT_DIR / "cluster_stats.json", 'w') as f:
        json.dump({
            'total_records': len(records),
            'total_clusters': len(final_stats),
            'noise_points': 0,
            'cluster_distribution': final_stats,
            'embedding_dimension': int(embeddings.shape[1]),
            'severity_distribution': df['severity'].value_counts().to_dict(),
            'dbscan_eps': float(best_eps),
            'dbscan_min_samples': 30
        }, f, indent=2)

    logger.info("Successfully tuned DBSCAN, assigned all points to nearest cluster, and saved data.")

if __name__ == '__main__':
    tune_dbscan()
