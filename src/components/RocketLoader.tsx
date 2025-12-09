import { motion } from 'framer-motion';

interface RocketLoaderProps {
    size?: number; // Size of the loader container
    iconSize?: number; // Size of the rocket icon
    color?: string; // Optional color overlay or ring color (not used for image but maybe for a track)
}

const RocketLoader = ({ size = 100, iconSize = 32 }: RocketLoaderProps) => {

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* Track Ring removed per user branding preference */}
            {/* <div 
                className="absolute inset-0 rounded-full border-2 border-white/10"
                style={{ width: size, height: size }}
            /> */}

            {/* Rotating Container */}
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
                    <img
                        src="/assets/logo/icon_64x64.png"
                        alt="Loading..."
                        style={{ width: iconSize, height: iconSize }}
                    />
                </div>
            </motion.div>

            {/* Optional: Loading Text or Pulse in center */}
            {/* <div className="w-2 h-2 bg-primary rounded-full animate-pulse" /> */}
        </div>
    );
};

export default RocketLoader;
