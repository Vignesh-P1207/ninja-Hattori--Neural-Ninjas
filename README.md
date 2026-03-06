# 🚀 Duplicate Defect Finder & Bug Report Enhancer

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1.4-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Flask](https://img.shields.io/badge/Flask-Backend-green.svg?style=flat&logo=flask)](https://flask.palletsprojects.com/)
[![FAISS](https://img.shields.io/badge/Vector_DB-FAISS-yellow.svg?style=flat)](#)
[![HuggingFace](https://img.shields.io/badge/Sentence_Transformers-all--MiniLM--L6--v2-orange.svg?style=flat&logo=huggingface)](https://huggingface.co/)

> An AI-powered intelligent system designed to streamline the bug reporting process. It automatically identifies duplicate defects, clusters similar issues, and intelligently enhances bug reports using advanced NLP techniques and FAISS vector search — trained on **20,000+ real-world bug reports** from 9 major open-source projects.

---

## ✨ Features

- **🔍 Duplicate Defect Detection**
  Automatically checks new bug reports against a database of **20,000+ real-world defects** spanning multiple open-source ecosystems. Employs `SentenceTransformers` (`all-MiniLM-L6-v2`) and FAISS for sub-50ms semantic similarity searches.

- **🪄 Bug Report Enhancement**
  Analyzes submitted reports, auto-identifies missing fields (e.g., specific logs, steps to reproduce, or environment details), and suggests actionable improvements to ensure high-quality tracking.

- **📊 Interactive Dashboard & Analytics**
  A beautifully crafted dashboard visualizing defect distributions, severity breakdowns, and clustering using **D3.js**.

- **🗂️ Intelligent Cluster Analysis**
  Groups contextually similar defects to assist QA teams and developers in identifying systemic issues or widespread bugs efficiently.

- **📄 Export & Reporting**
  Export detailed defect analysis, summaries, and cluster statistics into printable, high-quality PDF reports.

- **⚡ Stunning UI/UX**
  A responsive, heavily animated, and visually stunning frontend built with **React**, **Tailwind CSS**, **Framer Motion**, and **GSAP**.

---

## 📦 Datasets

The system is trained on a rich, diverse collection of real-world bug repositories:

| # | Project | Source | Domain |
|---|---------|--------|--------|
| 1 | **Apache Cassandra** | Jira / GitHub | Distributed Database |
| 2 | **Mozilla Firefox** | Bugzilla | Web Browser |
| 3 | **Apache Hadoop** | Jira | Big Data Framework |
| 4 | **Apache HBase** | Jira | NoSQL Database |
| 5 | **Mozilla Core** | Bugzilla | Browser Engine |
| 6 | **VS Code** | GitHub Issues | Code Editor |
| 7 | **SeaMonkey** | Bugzilla | Internet Suite |
| 8 | **Apache Spark** | Jira | Data Processing |
| 9 | **Thunderbird** | Bugzilla | Email Client |

Additionally, a proprietary Bugzilla/Mozilla dataset (`fix.csv` + `sev.csv`) provides severity labels and fix-time metadata for supervised analysis.

---

## 🏗️ Architecture & Tech Stack

### Frontend Architecture
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, clsx, tailwind-merge
- **Animations**: Framer Motion, GSAP, React Spring
- **Data Visualization**: D3.js
- **Icons**: Lucide React

### Backend & Machine Learning
- **API Server**: Flask, Flask-CORS
- **NLP & Embeddings**: `all-MiniLM-L6-v2` (Sentence Transformers)
- **Vector Database**: FAISS (IndexFlatIP for cosine similarity)
- **Data Processing**: Pandas, NumPy

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- pip (Python package manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/defect-finder.git
   cd defect-finder
   ```

2. **Backend Setup:**
   ```bash
   # Navigate to the backend directory
   cd backend/defect-finder

   # Create a virtual environment (optional but recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt
   
   # Start the API server
   python backend/app.py
   ```
   *The Flask API will run on `http://localhost:5000`.*

3. **Frontend Setup:**
   ```bash
   # Navigate back to the project root and into the frontend directory
   cd ../../frontend

   # Install NPM packages
   npm install

   # Start the Vite development server
   npm run dev
   ```
   *The web application will be accessible at `http://localhost:5173`.*

---

## 🧪 Testing the AI Engine

You can directly interact with the similarity search engine via Python scripts:

```bash
# Verify the FAISS vector database
python backend/defect-finder/verify_vector_db.py

# Test the API similarity endpoint
python backend/defect-finder/test_api_similarity.py
```

## 📈 System Performance
- **Indexed Vectors:** 20,000+ records (384-dimensional space)
- **Search Time Complexity:** O(n) exact search
- **Query Latency:** < 50ms
- **Similarity Scoring:** Calculates L2 normalized Cosine Similarity out of 1.0000

---

## 🤝 Contributing
Contributions are always welcome! Feel free to open a PR or submit an issue to discuss any proposed changes.

## 📄 License
This project is licensed under the MIT License.
