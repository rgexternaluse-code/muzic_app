import React, { useState, useEffect } from 'react';
import { Music, Disc3 } from 'lucide-react';

interface TrackThumbnailProps {
  cover?: string | null;
  title?: string;
  artist?: string;
  className?: string;
  alt?: string;
  isVinyl?: boolean;
  iconSize?: number;
}

// Generate consistent, aesthetic gradients based on track metadata
const GRADIENTS = [
  'from-[#6355FE] to-[#8E7CFF]',
  'from-[#EC4899] to-[#8B5CF6]',
  'from-[#3B82F6] to-[#2DD4BF]',
  'from-[#F59E0B] to-[#EF4444]',
  'from-[#10B981] to-[#3B82F6]',
  'from-[#8B5CF6] to-[#EC4899]',
  'from-[#6366F1] to-[#D946EF]',
  'from-[#06B6D4] to-[#6366F1]',
];

function getGradientIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % GRADIENTS.length;
}

export const TrackThumbnail: React.FC<TrackThumbnailProps> = ({
  cover,
  title = '',
  artist = '',
  className = 'w-full h-full object-cover',
  alt = '',
  isVinyl = false,
  iconSize
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(cover));

  useEffect(() => {
    // Reset state whenever cover prop changes
    setHasError(false);
    setIsLoading(Boolean(cover));
  }, [cover]);

  const gradient = GRADIENTS[getGradientIndex((title || '') + (artist || ''))];
  const showFallback = !cover || hasError;

  if (showFallback) {
    if (isVinyl) {
      return (
        <div className={`w-full h-full relative flex items-center justify-center bg-gradient-to-br ${gradient} p-8 select-none overflow-hidden`}>
          {/* Subtle vinyl groove textures */}
          <div className="absolute inset-4 rounded-full border border-white/10" />
          <div className="absolute inset-10 rounded-full border border-white/5" />
          <div className="absolute inset-16 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-white/5" />
          
          {/* Center spindle label */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#0E0B20] border-2 border-white/20 flex flex-col items-center justify-center shadow-inner z-10">
            <Disc3 size={iconSize || 36} className="text-[#8E7CFF] animate-spin" style={{ animationDuration: '8s' }} />
            <div className="w-3.5 h-3.5 rounded-full bg-[#1C153E] border border-white/30 mt-1" />
          </div>
        </div>
      );
    }

    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${gradient} select-none relative overflow-hidden group`}>
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-white/5" />
        <Music 
          size={iconSize || 18} 
          className="text-white/90 drop-shadow-sm transition-transform duration-300 group-hover:scale-110" 
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      {isLoading && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center animate-pulse`}>
          <Music size={iconSize || 16} className="text-white/40" />
        </div>
      )}
      <img
        src={cover}
        alt={alt || title}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};
