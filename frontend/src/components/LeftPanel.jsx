import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText } from 'lucide-react';

const placeholderSchema = `{
  "title": "Enter defect title",
  "description": "Steps to reproduce and details",
  "severity": "high",
  "component": "auth_service"
}`;

export default function LeftPanel({ onUpload, onAnalyze, isUploading, isAnalyzing }) {
    const [defectContent, setDefectContent] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            onUpload(file);
        }
    }, [onUpload]);

    const handleAnalyzeClick = (e) => {
        // Button particle burst effect logic...
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Create particles dynamically
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'fixed w-1.5 h-1.5 rounded-full bg-accentDup z-50 pointer-events-none';
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            document.body.appendChild(p);

            const angle = Math.random() * Math.PI * 2;
            const velocity = 20 + Math.random() * 60;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            p.animate([
                { transform: `translate(0px, 0px) scale(1)`, opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 400 + Math.random() * 200,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }).onfinish = () => p.remove();
        }

        // Call actual analyze
        try {
            const parsed = JSON.parse(defectContent);
            onAnalyze(parsed);
        } catch {
            // Use fallback mapping if simple text
            onAnalyze({ title: defectContent.substring(0, 50), description: defectContent });
        }
    };

    return (
        <div className="fixed left-0 top-16 w-[320px] h-[calc(100vh-64px)] bg-darkPanel border-r border-white/5 flex flex-col p-6 z-40">

            {/* UPLOAD ZONE */}
            <h2 className="font-mono text-xs text-white/40 mb-2 uppercase tracking-widest">Dataset Initiation</h2>
            <motion.div
                className={`pulse-hover relative h-32 rounded-sm border-2 border-dashed flex flex-col items-center justify-center transition-sci-fi ${isDragOver ? 'border-accentDup bg-accentDup/10' : 'border-accentDup/30 bg-black/20'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                whileHover={{ scale: 1.02 }}
            >
                <UploadCloud className="w-8 h-8 text-accentDup/80 mb-2" />
                <p className="font-mono text-xs text-white/70 text-center">
                    DRAG & DROP CSV/JSON<br /><span className="text-white/30">TO INITIALIZE CLUSTER</span>
                </p>

                {/* Hidden File Input for click fallback */}
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-none"
                    onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
                    accept=".csv,.json"
                />

                {isUploading && (
                    <div className="absolute inset-0 bg-darkPanel/80 flex items-center justify-center backdrop-blur-sm">
                        <div className="font-mono text-xs text-accentDup animate-pulse">Processing FAISS Index...</div>
                    </div>
                )}
            </motion.div>

            <div className="my-6 border-t border-white/5 w-full"></div>

            {/* NEW DEFECT ZONE */}
            <h2 className="font-mono text-xs text-white/40 mb-2 uppercase tracking-widest">New Defect Report</h2>
            <div className="flex-1 relative mb-4">
                <textarea
                    className="w-full h-full bg-[#0a0a0f] border border-white/10 rounded-sm p-4 font-mono text-sm text-white/80 resize-none focus:outline-none focus:border-accentDup/50 transition-sci-fi"
                    placeholder={placeholderSchema}
                    value={defectContent}
                    onChange={(e) => setDefectContent(e.target.value)}
                />
            </div>

            {/* ANALYZE BUTTON */}
            <motion.button
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing || !defectContent.trim()}
                className="relative w-full py-4 text-white font-display text-xl tracking-widest uppercase overflow-hidden disabled:opacity-50 disabled:cursor-none"
                style={{
                    background: 'linear-gradient(90deg, #ff4500, #ff1a1a)',
                    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
                }}
                whileTap={{ scale: 0.95 }}
            >
                <span className="relative z-10">{isAnalyzing ? 'ANALYZING...' : 'INITIATE ANALYSIS'}</span>
                {/* Button hover glow effect overlay */}
                <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-sci-fi"></div>
            </motion.button>
        </div>
    );
}
