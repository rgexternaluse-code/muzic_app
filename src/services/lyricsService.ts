/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseLrcOrTextToKaraoke, SongKaraokeTiming, TUM_HI_HO_KARAOKE_DATA, LUTT_LE_GAYA_KARAOKE_DATA } from '../data/karaokeTimings';
import { TUM_HI_HO_LYRICS, LUTT_LE_GAYA_LYRICS } from '../data/instrumentals';

export interface LyricsFetchResult {
  lyricsText: string;
  karaokeData: SongKaraokeTiming;
  source: 'preset' | 'synced_lrc' | 'online_plain' | 'custom_prompt';
  matchedTitle?: string;
  matchedArtist?: string;
}

export interface CleanTitleResult {
  cleanTitle: string;
  detectedArtist?: string;
  alternateTitle?: string;
  alternateArtist?: string;
}

/**
 * Clean audio title by removing file extensions, random hashes, bitrate markers, audio tags, and common suffixes
 */
export function cleanAudioTitle(rawTitle: string): CleanTitleResult {
  let title = rawTitle
    .replace(/\.[a-zA-Z0-9]{2,5}$/, '') // remove extension (.mp3, .wav, etc.)
    .replace(/_[0-9a-fA-F]{8,}$/g, '')  // remove trailing hex hash (e.g. _0ceffc43, _17e2284d)
    .replace(/_\d{10,}$/g, '')          // remove trailing timestamp hash
    .replace(/[_]/g, ' ')               // replace underscores with spaces
    .replace(/\b(320|128|192|256)\s*kbps\b/gi, '')
    .replace(/\b(PagalNew|Pagalworld|DjPunjab|DjMaza|AlgoRhythm Studio|AlgoRhythm)\b/gi, '')
    .replace(/\b(Official\s+(Audio|Video|Music\s+Video)|Full\s+Song|Karaoke\s+with\s+Lyrics|Lyrical\s+Video|Original\s+Mix)\b/gi, '')
    .replace(/\b(kbps|flac|wav|mp3|aac|m4a|remix|version|hq|clean)\b/gi, '')
    .replace(/[[({][^\])}]*[\])}]/g, '') // remove bracketed content
    .replace(/\s+/g, ' ')
    .trim();

  // Check if title has separator pattern ("Title - Artist" or "Artist - Title" or "Title | Movie")
  const separator = title.includes(' - ') ? ' - ' : title.includes(' | ') ? ' | ' : null;
  if (separator) {
    const parts = title.split(separator).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        cleanTitle: parts[0],
        detectedArtist: parts[1],
        alternateTitle: parts[1],
        alternateArtist: parts[0]
      };
    }
  }

  return { cleanTitle: title };
}

/**
 * Check if a title or string matches known built-in presets
 */
function matchPresetSong(normalized: string): 'tum_hi_ho' | 'lutt_le_gaya' | null {
  if (normalized.includes('tum hi ho') || (normalized.includes('aashiqui') && normalized.includes('tum'))) {
    return 'tum_hi_ho';
  }
  if (normalized.includes('lutt') && (normalized.includes('gaya') || normalized.includes('dhurandhar'))) {
    return 'lutt_le_gaya';
  }
  return null;
}

/**
 * Automatically fetch, parse, or generate synchronized lyrics for an uploaded audio file
 */
export async function fetchLyricsForUploadedAudio(
  fileNameOrTitle: string,
  artist: string = '',
  durationSec: number = 180
): Promise<LyricsFetchResult> {
  const { cleanTitle, detectedArtist, alternateTitle, alternateArtist } = cleanAudioTitle(fileNameOrTitle);

  // Check presets on raw and cleaned inputs
  const fullSearchString = `${fileNameOrTitle} ${cleanTitle} ${artist} ${detectedArtist || ''}`.toLowerCase();
  const presetMatch = matchPresetSong(fullSearchString);

  if (presetMatch === 'tum_hi_ho') {
    return {
      lyricsText: TUM_HI_HO_LYRICS,
      karaokeData: TUM_HI_HO_KARAOKE_DATA,
      source: 'preset',
      matchedTitle: 'Tum Hi Ho',
      matchedArtist: 'Arijit Singh / Mithoon'
    };
  }

  if (presetMatch === 'lutt_le_gaya') {
    return {
      lyricsText: LUTT_LE_GAYA_LYRICS,
      karaokeData: LUTT_LE_GAYA_KARAOKE_DATA,
      source: 'preset',
      matchedTitle: 'Lutt Le Gaya',
      matchedArtist: 'Simran Choudhary • Shashwat Sachdev'
    };
  }

  const effectiveArtist = artist && artist !== 'Device Audio' && artist !== 'Local Backing Track'
    ? artist
    : (detectedArtist || '');

  // Query lrclib.net (Public Synced & Plain Lyrics API)
  try {
    // 1. Try exact match with primary title & artist
    if (cleanTitle && effectiveArtist) {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(effectiveArtist)}`;
      const res = await fetch(getUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.syncedLyrics || data.plainLyrics)) {
          const raw = data.syncedLyrics || data.plainLyrics;
          const karaoke = parseLrcOrTextToKaraoke(
            durationSec,
            data.trackName || cleanTitle,
            data.artistName || effectiveArtist,
            raw
          );
          return {
            lyricsText: data.plainLyrics || data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim(),
            karaokeData: karaoke,
            source: data.syncedLyrics ? 'synced_lrc' : 'online_plain',
            matchedTitle: data.trackName,
            matchedArtist: data.artistName
          };
        }
      }
    }

    // 2. Try alternate title & artist if separator was present
    if (alternateTitle && alternateArtist && alternateArtist !== effectiveArtist) {
      const getUrlAlt = `https://lrclib.net/api/get?track_name=${encodeURIComponent(alternateTitle)}&artist_name=${encodeURIComponent(alternateArtist)}`;
      const resAlt = await fetch(getUrlAlt);
      if (resAlt.ok) {
        const data = await resAlt.json();
        if (data && (data.syncedLyrics || data.plainLyrics)) {
          const raw = data.syncedLyrics || data.plainLyrics;
          const karaoke = parseLrcOrTextToKaraoke(
            durationSec,
            data.trackName || alternateTitle,
            data.artistName || alternateArtist,
            raw
          );
          return {
            lyricsText: data.plainLyrics || data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim(),
            karaokeData: karaoke,
            source: data.syncedLyrics ? 'synced_lrc' : 'online_plain',
            matchedTitle: data.trackName,
            matchedArtist: data.artistName
          };
        }
      }
    }

    // 3. Search endpoint by clean track name
    const queriesToTry = [
      cleanTitle,
      effectiveArtist ? `${cleanTitle} ${effectiveArtist}` : '',
      alternateTitle || ''
    ].filter(q => q && q.length >= 2);

    for (const q of queriesToTry) {
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          // Prioritize synced lyrics that match the song title
          const cleanLower = cleanTitle.toLowerCase();
          const syncedMatches = results.filter((r: any) => r.syncedLyrics);
          const bestMatch = 
            syncedMatches.find((r: any) => r.trackName?.toLowerCase().includes(cleanLower)) ||
            syncedMatches[0] ||
            results.find((r: any) => r.plainLyrics?.toLowerCase().includes(cleanLower)) ||
            results.find((r: any) => r.plainLyrics) ||
            results[0];

          if (bestMatch && (bestMatch.syncedLyrics || bestMatch.plainLyrics)) {
            const raw = bestMatch.syncedLyrics || bestMatch.plainLyrics;
            const karaoke = parseLrcOrTextToKaraoke(
              durationSec,
              bestMatch.trackName || cleanTitle,
              bestMatch.artistName || effectiveArtist || 'Artist',
              raw
            );
            return {
              lyricsText: bestMatch.plainLyrics || bestMatch.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim(),
              karaokeData: karaoke,
              source: bestMatch.syncedLyrics ? 'synced_lrc' : 'online_plain',
              matchedTitle: bestMatch.trackName,
              matchedArtist: bestMatch.artistName
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('LRCLIB lyrics fetch error:', err);
  }

  // 4. Fallback if song lyrics cannot be found online:
  // Provide clear, honest instrumental teleprompter guidance without fake lyric words
  const songName = cleanTitle || 'Your Song';
  const fallbackPromptText = `[00:03.00] 🎵 "${songName}" Backing Audio Loaded
[00:08.00] 🎤 Vocals isolated & ready for singing
[00:15.00] (Lyrics not found online for this file)
[00:22.00] Sing your original melody or freestyle along!
[00:30.00] 💡 Tip: You can paste lyrics in "Edit / Paste Lyrics" below`;

  const fallbackKaraoke = parseLrcOrTextToKaraoke(
    durationSec,
    songName,
    effectiveArtist || 'Studio Vocalist',
    fallbackPromptText
  );

  return {
    lyricsText: `Lyrics for "${songName}" could not be automatically located online.\nUse the "Edit / Paste Lyrics" button below to paste lyrics or an .lrc file for this song!`,
    karaokeData: fallbackKaraoke,
    source: 'custom_prompt',
    matchedTitle: songName,
    matchedArtist: effectiveArtist || 'Studio Vocalist'
  };
}
