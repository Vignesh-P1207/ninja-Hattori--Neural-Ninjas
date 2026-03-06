import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5,
            opacity: Math.random(),
            speedX: (Math.random() - 0.5) * 0.1,
            speedY: (Math.random() - 0.5) * 0.1,
            twinkleSpeed: 0.01 + Math.random() * 0.03,
        }));

        let mouseX = width / 2;
        let mouseY = height / 2;

        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        window.addEventListener('mousemove', onMouseMove);

        let animationFrameId;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            const targetParallaxX = (mouseX - width / 2) * 0.05;
            const targetParallaxY = (mouseY - height / 2) * 0.05;

            stars.forEach(star => {
                // Twinkle
                star.opacity += star.twinkleSpeed;
                if (star.opacity > 1 || star.opacity < 0.1) {
                    star.twinkleSpeed *= -1;
                }

                // Move
                star.x += star.speedX;
                star.y += star.speedY;

                // Wrap around
                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                // Apply Parallax
                const px = star.x - targetParallaxX * star.size;
                const py = star.y - targetParallaxY * star.size;

                ctx.beginPath();
                ctx.arc(px, py, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.opacity)})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const onResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ background: '#03020a' }} />;
}
