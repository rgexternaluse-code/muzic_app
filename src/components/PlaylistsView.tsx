import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ListMusic, Play, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Track } from '../types';

interface PlaylistsViewProps {
  tracks: Track[];
  playlists: any[];
  activePlaylistId: string | null;
  playlistNameInput: string;
  favoriteTrackIds: string[];
  currentTrackId: string | undefined;
  isPlaying: boolean;
  onTrackSelect: (track: Track) => void;
  onToggleFavorite: (id: string) => void;
  onOpenMenu: (track: Track) => void;
  setPlaylistNameInput: (val: string) => void;
  setActivePlaylistId: (id: string | null) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  removeTrackFromPlaylist: (plId: string, trackId: string) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  tracks,
  playlists,
  activePlaylistId,
  playlistNameInput,
  favoriteTrackIds,
  currentTrackId,
  isPlaying,
  onTrackSelect,
  onToggleFavorite,
  onOpenMenu,
  setPlaylistNameInput,
  setActivePlaylistId,
  createPlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 shrink-0 space-y-4">
        <div className="flex items-center gap-3">
          {activePlaylistId && (
            <button 
              type="button" 
              onClick={() => setActivePlaylistId(null)}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-95 transition-all text-[#8E7CFF] cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-white">
              {activePlaylistId ? "Playlist View" : "My Playlists"}
            </h1>
            <p className="text-[11px] font-extrabold text-[#8E7CFF] uppercase tracking-widest mt-1">
              {activePlaylistId ? "Collection detail" : "Your custom folders"}
            </p>
          </div>
        </div>

        {!activePlaylistId && (
          <form 
            onSubmit={(e) => { e.preventDefault(); createPlaylist(playlistNameInput); }}
            className="flex gap-2 w-full pt-1"
          >
            <div className="relative flex-1">
              <Plus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-[#8E7CFF]" />
              <input 
                type="text" 
                placeholder="Name new playlist..." 
                value={playlistNameInput}
                onChange={(e) => setPlaylistNameInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#14122B]/60 rounded-2xl text-xs font-bold border-none focus:outline-none placeholder:opacity-40 text-white text-left focus:ring-1 focus:ring-[#6355FE]/30"
              />
            </div>
            <button 
              type="submit"
              className="px-5 py-3 bg-[#6355FE] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-[#6355FE]/20"
            >
              Create
            </button>
          </form>
        )}
      </header>

      {/* Scrollable list */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        {activePlaylistId ? (
          // Details of active playlist
          (() => {
            const pl = playlists.find(p => p.id === activePlaylistId);
            if (!pl) return <div className="text-center py-10 opacity-40">Playlist not found</div>;
            const plTracks = tracks.filter(t => pl.trackIds.includes(t.id));
            return (
              <div className="space-y-4 text-left">
                {/* Visual Header Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1C153E] to-[#12102A] border border-white/5 flex items-center justify-between shadow-xl">
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-tight text-[#ECE6FF]">{pl.name}</h2>
                    <p className="text-[10px] font-extrabold text-[#8E7CFF] uppercase tracking-wider mt-1">
                      {plTracks.length === 1 ? "1 song" : `${plTracks.length} songs`}
                    </p>
                  </div>
                  {plTracks.length > 0 && (
                    <button 
                      onClick={() => onTrackSelect(plTracks[0])}
                      className="w-11 h-11 rounded-full bg-[#6355FE] text-white hover:bg-[#6355FE]/90 transition-transform active:scale-95 flex items-center justify-center shadow-lg"
                    >
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    </button>
                  )}
                </div>

                {/* Tracks Rows */}
                <div className="space-y-2 pt-2">
                  {plTracks.length > 0 ? (
                    plTracks.map(track => {
                      const isActive = currentTrackId === track.id;
                      const isFav = favoriteTrackIds.includes(track.id);
                      return (
                        <div key={track.id} className="relative group">
                          {/* We render a beautiful direct track row representation */}
                          <div 
                            onClick={() => onTrackSelect(track)}
                            className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 border ${
                              isActive 
                                ? 'bg-[#6355FE]/15 border-[#6355FE]/30 shadow-lg' 
                                : 'bg-[#14122B]/30 hover:bg-[#1B183A]/70 border-white/5'
                            }`}
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden mr-4 shrink-0 border border-white/5">
                              <img src={track.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 min-w-0 pr-12">
                              <h3 className={`text-[13px] font-extrabold truncate ${isActive ? 'text-[#ECE6FF]' : 'text-white'}`}>{track.title}</h3>
                              <p className={`text-[11px] truncate font-bold mt-1 ${isActive ? 'text-[#8E7CFF]' : 'text-[#8F8E9C]'}`}>{track.artist}</p>
                            </div>
                          </div>

                          {/* Float Trash Action Button on group hover or touch trigger */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(pl.id, track.id); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 active:scale-90 opacity-60 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                            title="Remove from Playlist"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 opacity-30 space-y-2 border border-dashed border-white/5 rounded-3xl">
                      <ListMusic size={32} className="mx-auto text-[#8E7CFF]" />
                      <p className="text-xs font-black uppercase tracking-wider">This Playlist is Empty</p>
                      <p className="text-[10px] font-bold">Go to Library and click any song's 3-dots to add it!</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          // Main Playlists Dashboard
          <div className="space-y-3">
            {playlists.length > 0 ? (
              playlists.map(pl => {
                const count = pl.trackIds.length;
                return (
                  <div 
                    key={pl.id}
                    onClick={() => setActivePlaylistId(pl.id)}
                    className="flex items-center justify-between p-4 bg-[#14122B]/30 hover:bg-[#1B183A]/70 rounded-2xl border border-white/5 transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C153E] to-[#2B2651] flex items-center justify-center text-[#8E7CFF] border border-white/5 shadow-inner">
                        <ListMusic size={22} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-extrabold text-[14px] leading-tight text-white group-hover:text-[#ECE6FF] transition-colors">{pl.name}</h3>
                        <p className="text-[11px] font-bold text-[#8F8E9C] uppercase tracking-wider mt-1">
                          {count === 1 ? '1 song' : `${count} songs`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/30 hover:text-white transition-all cursor-pointer opacity-40 group-hover:opacity-100"
                        title="Delete Playlist"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={16} className="text-[#8F8E9C]/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#14122B]/10 border border-white/5 rounded-3xl">
                <ListMusic size={40} className="text-[#8E7CFF] opacity-20 mb-2 animate-bounce" />
                <p className="font-black text-xs tracking-widest uppercase opacity-40">No Custom Playlists Yet</p>
                <p className="text-[10px] font-bold opacity-30 text-center max-w-xs mt-1.5 uppercase leading-normal tracking-wide">
                  Create a playlist using the box above, then click the three-dots on any song to customize!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
