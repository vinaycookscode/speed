import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/agentStore';
import { X } from 'lucide-react';

export default function Celebration() {
    const { showCelebration, setShowCelebration } = useAgentStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (showCelebration) {
            const timer = setTimeout(() => {
                setShowCelebration(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showCelebration, setShowCelebration]);

    useEffect(() => {
        if (!showCelebration || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particles: Particle[] = [];
        let rockets: Rocket[] = [];

        class Rocket {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            explodeY: number;

            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = -(Math.random() * 4 + 10);
                this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
                this.explodeY = Math.random() * (canvas.height / 2);
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, 3, 10);
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
            }
        }

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            alpha: number;
            color: string;

            constructor(x: number, y: number, color: string) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.alpha = 1;
                this.color = color;
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.05; // gravity
                this.alpha -= 0.01;
            }
        }

        const animate = () => {
            if (!ctx) return;
            // Trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Randomly launch rockets
            if (Math.random() < 0.05) {
                rockets.push(new Rocket());
            }

            // Update Rockets
            rockets.forEach((rocket, index) => {
                rocket.update();
                rocket.draw();

                if (rocket.y <= rocket.explodeY || rocket.vy >= 0) {
                    // Explode
                    for (let i = 0; i < 50; i++) {
                        particles.push(new Particle(rocket.x, rocket.y, rocket.color));
                    }
                    rockets.splice(index, 1);
                }
            });

            // Update Particles
            particles.forEach((particle, index) => {
                particle.update();
                particle.draw();
                if (particle.alpha <= 0) {
                    particles.splice(index, 1);
                }
            });

            if (showCelebration) {
                requestAnimationFrame(animate);
            }
        };

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);

    }, [showCelebration]);

    if (!showCelebration) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <canvas ref={canvasRef} className="absolute inset-0" />

            <div className="relative z-10 text-center animate-bounce-in">
                <h2 className="text-6xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-4 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                    Project Completed! 🚀
                </h2>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
}
