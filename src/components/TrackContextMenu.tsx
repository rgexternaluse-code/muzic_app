import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ListMusic, Music, Trash2 } from 'lucide-react';
import { Track } from '../types';

interface TrackContextMenuProps {
  track: Track | null;
  favoriteTrackIds: string[];
  playlists: any[];
  onClose: () => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTrackToPlaylist: (plId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (plId: string, trackId: string) => void;
  onCreatePlaylistRedirect: () => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  favoriteTrackIds,
  playlists,
  onClose,
  onToggleFavorite,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onCreatePlaylistRedirect,
}) => {
  if (!track) return null;
  const isFavorite = favoriteTrackIds.includes(track.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-xs select-none">
        {/* Backdrop Trigger */}
        <div className="absolute inset-0" onClick={onClose} />
        
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-[#14122B] border-t border-white/10 rounded-t-[32px] p-6 pb-12 space-y-5 z-10 shadow-2xl relative"
        >
          {/* Drag Pill */}
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto cursor-pointer" onClick={onClose} />
          
          <div className="flex items-center gap-4 pt-2">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/5 shadow-md shrink-0">
              <img src={track.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-[15px] truncate text-white leading-tight">{track.title}</h3>
              <p className="text-xs font-bold text-[#8E7CFF] uppercase tracking-wider mt-1">{track.artist}</p>
            </div>
          </div>

          <div className="h-[1px] bg-white/5" />

          {/* Action List */}
          <div className="space-y-1.5 text-left">
            {/* Toggle Favorite */}
            <button
              type="button"
              onClick={() => {
                onToggleFavorite(track.id);
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-white/5 transition-colors text-xs font-black uppercase tracking-wider text-[#ECE6FF] cursor-pointer"
            >
              <Heart size={16} fill={isFavorite ? "#8E7CFF" : "none"} className={isFavorite ? "text-[#8E7CFF]" : "text-[#8F8E9C]"} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>

            {/* Playlists selector */}
            <div className="p-2 rounded-2xl bg-black/15">
              <span className="px-3 pt-2 pb-1 text-[9px] font-black uppercase text-[#8F8E9C]/60 tracking-widest block">Add to Playlist:</span>
              {playlists.length > 0 ? (
                <div className="max-h-36 overflow-y-auto no-scrollbar py-1 px-1 space-y-1">
                  {playlists.map(pl => {
                    const isTrackInPl = pl.trackIds.includes(track.id);
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          if (isTrackInPl) {
                            onRemoveTrackFromPlaylist(pl.id, track.id);
                          } else {
                            onAddTrackToPlaylist(pl.id, track.id);
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-xs font-bold text-white cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ListMusic size={14} className="text-[#8E7CFF]" />
                          <span>{pl.name}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          isTrackInPl ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-[#8F8E9C]'
                        }`}>
                          {isTrackInPl ? '✓ Added' : '+ Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-bold text-[#8F8E9C] uppercase tracking-wide">No Playlists Configured</p>
                  <button 
                    type="button"
                    onClick={onCreatePlaylistRedirect}
                    className="mt-2 px-3 py-1.5 bg-[#6355FE] text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Create a Playlist
                  </button>
                </div>
              )}
            </div>

            {/* Metadata Detail */}
            <div className="bg-[#080714]/40 p-4 rounded-xl border border-white/5 text-[9px] font-bold text-[#8F8E9C] leading-loose">
              <p className="text-[#ECE6FF] text-[8px] tracking-wider uppercase mb-1 font-black">Track Information:</p>
              <div>FORMAT: <span className="text-white">{track.format || 'MP3 / STREAM'}</span></div>
              {track.size && (
                <div>FILE SIZE: <span className="text-white">{(track.size / (1024 * 1024)).toFixed(2)} MB</span></div>
              )}
              {track.fileName && (
                <div className="truncate">NAME: <span className="text-white">{track.fileName}</span></div>
              )}
              {track.folderPath && (
                <div className="truncate">FOLDER: <span className="text-white">{track.folderPath}</span></div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
