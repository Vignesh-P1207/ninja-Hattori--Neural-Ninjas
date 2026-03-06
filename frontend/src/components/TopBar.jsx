import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const AnimatedCounter = ({ value }) => {
    const ref = useRef(null);
    const prevValue = useRef(0);

    useEffect(() => {
        if (value !== prevValue.current) {
            // Slot machine fly in from below
            const el = ref.current;

            // Animate out old value
            gsap.to(el, {
                y: -20, opacity: 0, duration: 0.2, ease: "power2.in", onComplete: () => {
                    el.innerText = value;
                    gsap.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
                }
            });
            prevValue.current = value;
        }
    }, [value]);

    return (
        <span ref={ref} className="inline-block min-w-[20px] text-center">
            {prevValue.current}
        </span>
    );
};

export default function TopBar({ stats, threshold, setThreshold }) {
    const titleRef = useRef(null);

    useEffect(() => {
        // Title slam in animation
        const chars = titleRef.current.innerText.split('');
        titleRef.current.innerHTML = '';
        chars.forEach((c) => {
            const span = document.createElement('span');
            span.innerText = c === ' ' ? '\u00A0' : c;
            span.style.opacity = '0';
            span.style.transform = 'translateY(-20px) scale(1.5)';
            span.style.filter = 'blur(10px)';
            span.style.display = 'inline-block';
            span.style.backgroundImage = 'linear-gradient(to right, #ff4500, #7b2fff)';
            span.style.webkitBackgroundClip = 'text';
            span.style.backgroundClip = 'text';
            span.style.webkitTextFillColor = 'transparent';
            span.style.color = 'transparent';
            titleRef.current.appendChild(span);
        });

        gsap.to(titleRef.current.children, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.6,
            stagger: 0.05,
            ease: 'power3.out',
            delay: 0.2
        });
    }, []);

    return (
        <div className="fixed top-0 w-full h-16 backdrop-blur-md bg-background/80 flex items-center justify-between px-6 z-50 border-b border-white/5">
            {/* LEFT: TITLE */}
            <div className="flex items-center">
                <h1
                    ref={titleRef}
                    className="font-display text-[28px] tracking-wider bg-gradient-to-r from-[#ff4500] to-[#7b2fff] text-transparent bg-clip-text whitespace-nowrap"
                >
                    DEFECT GRAVITY
                </h1>
            </div>

            {/* CENTER: STATS CHIPS */}
            <div className="flex gap-4">
                {[
                    { label: 'TOTAL DEFECTS', value: stats.total },
                    { label: 'CLUSTERS', value: stats.clusters },
                    { label: 'DUPLICATES CAUGHT', value: stats.duplicates }
                ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-2 bg-[#0a0a0f] px-4 py-1.5 rounded-sm border border-[#ff4500]/30 shadow-[0_0_10px_rgba(255,69,0,0.1)]">
                        <span className="font-mono text-xs text-gray-400">{stat.label}:</span>
                        <span className="font-mono text-accentDup font-bold">
                            <AnimatedCounter value={stat.value} />
                        </span>
                    </div>
                ))}
            </div>

            {/* RIGHT: THRESHOLD SLIDER */}
            <div className="flex items-center gap-3 bg-[#0a0a0f] px-4 py-1.5 rounded-full border border-white/10">
                <span className="font-mono text-xs text-gray-400">SIMILARITY THRESHOLD</span>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-none accent-accentDup"
                />
                <span className="font-mono text-sm text-accentDup" style={{ textShadow: "0 0 8px rgba(255,69,0,0.6)" }}>
                    {threshold.toFixed(2)}
                </span>
            </div>
        </div>
    );
}
