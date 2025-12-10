import { motion } from 'framer-motion';
import { useState } from 'react';
import { Rocket } from 'lucide-react';

interface RocketLoaderProps {
    size?: number; // Size of the loader container
    iconSize?: number; // Size of the rocket icon
    color?: string; // Optional color overlay or ring color (not used for image but maybe for a track)
}

const RocketLoader = ({ size = 100, iconSize = 32 }: RocketLoaderProps) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* ... container ... */}
            <motion.div
                className="absolute w-full h-full flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                }}
            >
                {/* Rocket Icon Positioned at the top (offset by radius) */}
                <div
                    className="absolute"
                    style={{
                        top: 0,
                        transform: `rotate(90deg)` // Rocket points up originally, rotate 90deg to face direction of clockwise rotation
                    }}
                >
                    {!imageError ? (
                        <img
                            src="/assets/logo/icon_64x64.png"
                            alt="Loading..."
                            style={{ width: iconSize, height: iconSize }}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <Rocket size={iconSize} className="text-primary fill-current" />
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default RocketLoader;
