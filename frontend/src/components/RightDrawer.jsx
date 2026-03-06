import React, { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { motion } from 'framer-motion';
import { Copy, Check, X } from 'lucide-react';

const BadgeColor = {
    duplicate: '#ff4500',
    possible_duplicate: '#ffcc00',
    new_defect: '#00ffaa'
};

const BadgeText = {
    duplicate: 'DUPLICATE',
    possible_duplicate: 'POSSIBLE MATCH',
    new_defect: 'NEW DEFECT'
};

export default function RightDrawer({ result, isOpen, onClose }) {
    const [copied, setCopied] = useState(false);

    // Spring animation for slider drawer
    const slideIn = useSpring({
        transform: isOpen ? 'translateX(0%)' : 'translateX(100%)',
        opacity: isOpen ? 1 : 0,
        config: { tension: 170, friction: 26 }
    });

    // Spring for arc gauge
    const { strokeDashoffset } = useSpring({
        strokeDashoffset: isOpen && result ? 283 - (283 * result.confidence) / 100 : 283,
        delay: 300,
        config: { tension: 120, friction: 14 }
    });

    // Animated counter for confidence
    const { number } = useSpring({
        from: { number: 0 },
        number: isOpen && result ? result.confidence : 0,
        delay: 300,
        config: { duration: 1000 }
    });

    if (!result) return null;

    const color = BadgeColor[result.decision];
    const text = BadgeText[result.decision];

    const handleCopy = () => {
        navigator.clipboard.writeText(
            `${result.improved_report.title}\n\n${result.improved_report.summary}`
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <animated.div
            style={slideIn}
            className="fixed right-0 top-16 w-[400px] h-[calc(100vh-64px)] bg-[#07060f]/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto p-6 flex flex-col gap-8 shadow-[-20px_0_50px_rgba(0,0,0,0.8)]"
        >
            {/* CLOSE BTN (Hidden technically, using auto slide in/out based on state, but good for manual tests) */}
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-opacity">
                <X size={20} />
            </button>

            {/* TOP BADGE */}
            <div className="flex flex-col items-center mt-4">
                <div
                    className="font-display text-[72px] leading-none text-transparent bg-clip-text text-center"
                    style={{
                        backgroundImage: `linear-gradient(180deg, ${color}, #ffffff)`,
                        textShadow: `0 0 30px ${color}80`
                    }}
                >
                    {text}
                </div>
            </div>

            {/* CONFIDENCE ARC */}
            <div className="relative flex justify-center items-center w-full h-32">
                <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <animated.circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={color}
                        strokeWidth="6"
                        strokeDasharray="283"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <animated.span className="font-mono font-bold text-2xl text-white">
                        {number.to(n => `${n.toFixed(1)}%`)}
                    </animated.span>
                    <span className="font-mono text-[10px] text-white/40 tracking-widest">CONFIDENCE</span>
                </div>
            </div>

            {/* TOP 5 MATCHES */}
            <div className="flex flex-col gap-3">
                <h3 className="font-mono text-xs text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Similarity Matrix</h3>
                {result.top_matches.map((match, idx) => (
                    <div key={idx} className="relative group p-3 bg-white/[0.02] border border-white/5 rounded-sm hover:border-white/20 transition-all cursor-none overflow-hidden">
                        {/* Background Rank */}
                        <div className="absolute -right-2 -top-4 font-display text-6xl text-white/[0.02] group-hover:text-white/[0.05] transition-all pointer-events-none">
                            0{idx + 1}
                        </div>
                        <div className="flex justify-between items-start z-10 relative">
                            <div className="flex-1 pr-4">
                                <span className="font-mono text-xs text-accentDup/80 block mb-1">ID: {match.id}</span>
                                <span className="font-body text-sm text-white/90 line-clamp-1 group-hover:line-clamp-none transition-all">{match.title}</span>
                            </div>
                            <div className="font-mono text-xs text-white/60 bg-black/40 px-2 py-1 rounded-sm border border-white/10">
                                {match.similarity.toFixed(1)}%
                            </div>
                        </div>
                        {/* Sim Bar */}
                        <div className="w-full h-0.5 bg-black/50 mt-3 relative overflow-hidden rounded-full">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${match.similarity}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + (idx * 0.1) }}
                                className="absolute left-0 top-0 h-full"
                                style={{ backgroundColor: color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* MISSING FIELDS */}
            {(result.missing_fields?.length > 0 || result.present_fields?.length > 0) && (
                <div className="flex flex-col gap-2">
                    <h3 className="font-mono text-xs text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Schema Analysis</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {result.present_fields?.map((f, i) => (
                            <motion.div key={`p-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (i * 0.1) }} className="flex items-center gap-2 font-mono text-xs text-green-400/80 bg-green-400/10 px-2 py-1.5 rounded-sm border border-green-400/20">
                                <Check size={12} /> {f}
                            </motion.div>
                        ))}
                        {result.missing_fields?.map((f, i) => (
                            <motion.div key={`m-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + (i * 0.1) }} className="flex items-center gap-2 font-mono text-xs text-red-400/80 bg-red-400/10 px-2 py-1.5 rounded-sm border border-red-400/20">
                                <X size={12} /> {f}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* IMPROVED REPORT */}
            {result.improved_report && (
                <div className="flex flex-col gap-2 pb-8">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h3 className="font-mono text-xs text-white/40 uppercase tracking-widest">Enhanced Report</h3>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded-sm border transition-all ${copied ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-white/10'}`}
                        >
                            {copied ? <><Check size={10} /> COPIED</> : <><Copy size={10} /> COPY</>}
                        </button>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-sm p-4 inset-shadow">
                        <h4 className="font-display text-xl text-white mb-2">{result.improved_report.title}</h4>
                        <pre className="font-mono text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{result.improved_report.summary}</pre>
                    </div>
                </div>
            )}
        </animated.div>
    );
}
