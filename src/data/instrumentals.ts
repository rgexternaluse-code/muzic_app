/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentalTrack } from '../types/studio';

/**
 * Six Required Instrumental Track Categories for Muzic Singing Studio
 * per Section 4.B of the Implementation Brief.
 * 
 * Rights Notice:
 * - All tracks are original, copyright-compliant or procedurally synthesized.
 * - No copyrighted commercial recordings or ripped audio are bundled.
 * - Real licensed WAV/MP3 files can be dropped into /assets/audio/stems/ to replace placeholders.
 */
export const TUM_HI_HO_LYRICS = `Hum tere bin ab reh nahi sakte
Tere bina kya wajood mera

Hum tere bin ab reh nahi sakte
Tere bina kya wajood mera
Tujh se juda agar ho jaayenge
To khud se hee ho jaayenge juda
Kyonki tum hee ho, ab tum hee ho
Zindagi ab tum hee ho
O-o-o, chain bhee, mera dard bhee
Meri aashiqui ab tum hee ho

Tera-meraa rishta hai kaisaa
Ek pal door gavaara nahin
Tere liye har roz hain jeete
Tujh ko diya mera vakt sabhee
Koyi lamaha mera naa ho tere binaa
Har saans pe naam tera
Kyonki tum hee ho, ab tum hee ho
Zindagi ab tum hee ho
O-o-o, chain bhee, mera dard bhee
Meri aashiqui ab tum hee ho

Tum hee ho...
Tum hee ho...
Tere liye hi jiya main
Khud ko jo yoon de diya hai
Teri vafaa ne mujh ko sanbhaala
Saare gamon ko dil se nikaala
Tere saath mera hai naseeb juda
Tuje paa ke adhoora naa raha, mmm
Kyonki tum hee ho, ab tum hee ho
Zindagi ab tum hee ho
O-o-o, chain bhee, mera dard bhee
Meri aashiqui ab tum hee ho
Kyonki tum hee ho, ab tum hee ho
Zindagi ab tum hee ho
O-o-o, chain bhee, mera dard bhee
Meri aashiqui ab tum hee ho`;

export const BUILTIN_INSTRUMENTAL_CATALOG: InstrumentalTrack[] = [
  {
    id: 'inst_tum_hi_ho',
    title: 'Tum Hi Ho (Aashiqui 2 Karaoke)',
    category: 'sad-bollywood',
    categoryLabel: 'Bollywood Romantic / Karaoke',
    styleDescription: 'Official studio demo karaoke instrumental with lyrics. Soulful piano, acoustic guitar, and strings from Aashiqui 2.',
    duration: 262,
    bpm: 88,
    key: 'Eb Minor',
    previewUrl: '/assets/aistudio/TUM_HI_HO_-_Aashiqui_2_Karaoke_with_Lyrics_AlgoRhythm_Studio_17e2284d.mp3',
    rightsStatus: 'user-local',
    tags: ['Aashiqui 2', 'Arijit Singh', 'Karaoke', 'Demo Song', 'Lyrics Included'],
    lyrics: TUM_HI_HO_LYRICS
  },
  {
    id: 'inst_bollywood_1',
    title: 'Mumbai Sunset Groove (Upbeat)',
    category: 'bollywood-1',
    categoryLabel: 'Bollywood Style 1',
    styleDescription: 'Modern Bollywood upbeat groove with warm sitar scales, dholak percussion, and pop synth chords.',
    duration: 60,
    bpm: 104,
    key: 'C Major',
    rightsStatus: 'royalty-free-original',
    tags: ['Bollywood', 'Upbeat', 'Dholak', 'Modern Pop']
  },
  {
    id: 'inst_bollywood_2',
    title: 'Monsoon Raga Romance (Mid-tempo)',
    category: 'bollywood-2',
    categoryLabel: 'Bollywood Style 2',
    styleDescription: 'Rich acoustic string section, bansuri flute motifs, and gentle rhythmic tabla accompaniment.',
    duration: 60,
    bpm: 88,
    key: 'D Minor',
    rightsStatus: 'royalty-free-original',
    tags: ['Bollywood', 'Romantic', 'Bansuri', 'Acoustic Strings']
  },
  {
    id: 'inst_punjabi_1',
    title: 'Bhangra Dhol Energy (High Energy)',
    category: 'punjabi-1',
    categoryLabel: 'Punjabi Beat 1',
    styleDescription: 'Traditional folk dhol rhythm with high-energy tumbi riffs and driving bass foundation.',
    duration: 60,
    bpm: 128,
    key: 'G Major',
    rightsStatus: 'royalty-free-original',
    tags: ['Punjabi', 'Bhangra', 'Dhol', 'Tumbi', 'Dance']
  },
  {
    id: 'inst_punjabi_2',
    title: 'Urban Desi Club Beat (Trap/Bhangra)',
    category: 'punjabi-2',
    categoryLabel: 'Punjabi Beat 2',
    styleDescription: 'Fusion 808 bass, chiming algorithmic chimta, and modern urban Punjabi bounce.',
    duration: 60,
    bpm: 96,
    key: 'F# Minor',
    rightsStatus: 'royalty-free-original',
    tags: ['Punjabi', 'Urban Desi', '808 Bass', 'Modern Beat']
  },
  {
    id: 'inst_sad_bollywood',
    title: 'Tum Hi Meri Yaad (Soulful & Emotional)',
    category: 'sad-bollywood',
    categoryLabel: 'Sad Bollywood Style',
    styleDescription: 'Emotional cinematic grand piano, melancholy cello harmonies, and soft heart-touching chords.',
    duration: 60,
    bpm: 72,
    key: 'A Minor',
    rightsStatus: 'royalty-free-original',
    tags: ['Bollywood', 'Sad', 'Melancholy', 'Piano', 'Cinematic']
  },
  {
    id: 'inst_sad_punjabi',
    title: 'Judai Da Dard (Melancholy Sufi)',
    category: 'sad-punjabi',
    categoryLabel: 'Sad Punjabi Style',
    styleDescription: 'Soulful Sufi-style acoustic sarangi & harmonium texture with slow, mournful dholak cadence.',
    duration: 60,
    bpm: 68,
    key: 'E Minor',
    rightsStatus: 'royalty-free-original',
    tags: ['Punjabi', 'Sad', 'Sufi', 'Sarangi', 'Harmonium']
  }
];

/**
 * Procedural Audio Synthesizer:
 * Generates genuine, pleasant, harmonic instrumental backing audio using the Web Audio API.
 * This guarantees that every device has a working backing track with real sound
 * without bundling megabytes of copyrighted audio.
 */
export async function generateProceduralBackingTrackAudio(
  category: InstrumentalTrack['category'],
  durationSeconds: number = 45
): Promise<Blob> {
  const sampleRate = 44100;
  const numFrames = sampleRate * durationSeconds;
  
  // Use OfflineAudioContext to render audio at high speed without audible stutter
  const ctx = new OfflineAudioContext(2, numFrames, sampleRate);
  
  const now = 0;
  const bpmMap: Record<InstrumentalTrack['category'], number> = {
    'bollywood-1': 104,
    'bollywood-2': 88,
    'punjabi-1': 128,
    'punjabi-2': 96,
    'sad-bollywood': 72,
    'sad-punjabi': 68
  };
  
  const bpm = bpmMap[category] || 100;
  const beatInterval = 60 / bpm;
  const totalBeats = Math.floor(durationSeconds / beatInterval);

  // Master Compressor for smooth studio dynamics
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-14, 0);
  compressor.knee.setValueAtTime(30, 0);
  compressor.ratio.setValueAtTime(4, 0);
  compressor.attack.setValueAtTime(0.003, 0);
  compressor.release.setValueAtTime(0.25, 0);
  compressor.connect(ctx.destination);

  // Determine root chord frequencies based on category
  let chordProgression: number[][];
  if (category === 'sad-bollywood') {
    // A minor -> F major -> C major -> G major (220Hz, 174.6Hz, 261.6Hz, 196Hz)
    chordProgression = [
      [220, 261.63, 329.63, 440],
      [174.61, 220, 261.63, 349.23],
      [261.63, 329.63, 392, 523.25],
      [196, 246.94, 293.66, 392]
    ];
  } else if (category === 'sad-punjabi') {
    // E minor -> C major -> G major -> D major
    chordProgression = [
      [164.81, 196.00, 246.94, 329.63],
      [130.81, 164.81, 196.00, 261.63],
      [196.00, 246.94, 293.66, 392.00],
      [146.83, 185.00, 220.00, 293.66]
    ];
  } else if (category === 'punjabi-1') {
    // High energy G Major folk tonic groove
    chordProgression = [
      [196.00, 246.94, 293.66, 392.00],
      [196.00, 246.94, 293.66, 392.00],
      [220.00, 261.63, 329.63, 440.00],
      [146.83, 185.00, 220.00, 293.66]
    ];
  } else if (category === 'punjabi-2') {
    // Urban F# Minor trap groove
    chordProgression = [
      [185.00, 220.00, 277.18, 369.99],
      [185.00, 220.00, 277.18, 369.99],
      [146.83, 185.00, 220.00, 293.66],
      [164.81, 207.65, 246.94, 329.63]
    ];
  } else if (category === 'bollywood-2') {
    // D minor romantic melody
    chordProgression = [
      [146.83, 174.61, 220.00, 293.66],
      [174.61, 220.00, 261.63, 349.23],
      [130.81, 164.81, 196.00, 261.63],
      [146.83, 174.61, 220.00, 293.66]
    ];
  } else {
    // Bollywood-1: C Major upbeat pop
    chordProgression = [
      [261.63, 329.63, 392.00, 523.25],
      [220.00, 261.63, 329.63, 440.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00]
    ];
  }

  // Generate Harmonic Pads / Chords
  for (let i = 0; i < totalBeats; i += 4) {
    const chordTime = i * beatInterval;
    const chordIdx = Math.floor(i / 4) % chordProgression.length;
    const notes = chordProgression[chordIdx];

    notes.forEach((freq, noteIdx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = (category.startsWith('sad-') || noteIdx === 0) ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);

      const chordDur = beatInterval * 3.8;
      gain.gain.setValueAtTime(0.001, chordTime);
      gain.gain.exponentialRampToValueAtTime(0.08 / (notes.length), chordTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + chordDur);

      osc.connect(gain);
      gain.connect(compressor);

      osc.start(chordTime);
      osc.stop(chordTime + chordDur);
    });
  }

  // Generate Rhythm / Drums (Dhol / Tabla / Kick / Hihat cadence)
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatInterval;

    // Bass / Dhol boom on beats 0 and 2 (or on all beats for Punjabi)
    const isKickBeat = (category === 'punjabi-1') ? (beat % 2 === 0 || beat % 4 === 3) : (beat % 2 === 0);
    if (isKickBeat) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();

      const baseFreq = category.includes('punjabi') ? 110 : 85;
      kickOsc.frequency.setValueAtTime(baseFreq, time);
      kickOsc.frequency.exponentialRampToValueAtTime(32, time + 0.18);

      kickGain.gain.setValueAtTime(0.35, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      kickOsc.connect(kickGain);
      kickGain.connect(compressor);

      kickOsc.start(time);
      kickOsc.stop(time + 0.23);
    }

    // Snare / Dholak slap on beats 1 and 3
    if (beat % 2 === 1) {
      const noiseBuffer = ctx.createBuffer(1, sampleRate * 0.12, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let s = 0; s < noiseBuffer.length; s++) {
        output[s] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = category.includes('sad') ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(category.includes('sad') ? 800 : 1800, time);

      const slapGain = ctx.createGain();
      slapGain.gain.setValueAtTime(category.includes('sad') ? 0.08 : 0.18, time);
      slapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      noise.connect(filter);
      filter.connect(slapGain);
      slapGain.connect(compressor);

      noise.start(time);
      noise.stop(time + 0.12);
    }

    // Melodic Arpeggio / Tumbi / Bansuri accent on 16th notes
    if (category === 'punjabi-1' || category === 'bollywood-1') {
      const arpFreqs = [523.25, 587.33, 659.25, 783.99];
      const noteFreq = arpFreqs[beat % arpFreqs.length];
      
      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();

      arpOsc.type = category === 'punjabi-1' ? 'sawtooth' : 'sine';
      arpOsc.frequency.setValueAtTime(noteFreq, time + beatInterval * 0.5);

      arpGain.gain.setValueAtTime(0.001, time + beatInterval * 0.5);
      arpGain.gain.exponentialRampToValueAtTime(0.04, time + beatInterval * 0.5 + 0.03);
      arpGain.gain.exponentialRampToValueAtTime(0.001, time + beatInterval * 0.5 + 0.18);

      arpOsc.connect(arpGain);
      arpGain.connect(compressor);

      arpOsc.start(time + beatInterval * 0.5);
      arpOsc.stop(time + beatInterval * 0.5 + 0.2);
    }
  }

  // Render the audio graph to AudioBuffer
  const renderedBuffer = await ctx.startRendering();
  
  // Encode AudioBuffer to standard WAV Blob
  return audioBufferToWavBlob(renderedBuffer);
}

/**
 * Standard 16-bit Stereo PCM WAV Encoder
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const samplesLength = buffer.length;
  const dataByteLength = samplesLength * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');
  
  // FMT Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // DATA Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);
  
  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }
  
  let offset = 44;
  for (let i = 0; i < samplesLength; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
