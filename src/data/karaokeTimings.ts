/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimedWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface TimedLine {
  id: string;
  lineIndex: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words: TimedWord[];
  section?: 'intro' | 'verse' | 'chorus' | 'interlude' | 'bridge' | 'outro';
}

export interface SongKaraokeTiming {
  trackId: string;
  title: string;
  artist: string;
  duration: number;
  lines: TimedLine[];
}

/**
 * Word-by-Word Synchronized Karaoke Data for "Tum Hi Ho" (Aashiqui 2)
 * Calibrated to the exact timing of AlgoRhythm Studio Karaoke audio track (261s)
 */
const BASELINE_TUM_HI_HO_LINES: TimedLine[] = [
    // --- Verse 1 ---
    {
      id: 'l1',
      lineIndex: 0,
      start: 14.8,
      end: 20,
      text: 'Hum tere bin ab reh nahi sakte',
      section: 'verse',
      words: [
        { word: 'Hum', start: 14.8, end: 15.5 },
        { word: 'tere', start: 15.5, end: 16.3 },
        { word: 'bin', start: 16.3, end: 17 },
        { word: 'ab', start: 17, end: 17.6 },
        { word: 'reh', start: 17.6, end: 18.3 },
        { word: 'nahi', start: 18.3, end: 19.1 },
        { word: 'sakte', start: 19.1, end: 20 }
      ]
    },
    {
      id: 'l2',
      lineIndex: 1,
      start: 20.4,
      end: 25.5,
      text: 'Tere bina kya wajood mera',
      section: 'verse',
      words: [
        { word: 'Tere', start: 20.4, end: 21.3 },
        { word: 'bina', start: 21.3, end: 22.2 },
        { word: 'kya', start: 22.2, end: 23 },
        { word: 'wajood', start: 23, end: 24.2 },
        { word: 'mera', start: 24.2, end: 25.5 }
      ]
    },
    {
      id: 'l3',
      lineIndex: 2,
      start: 25.8,
      end: 31,
      text: 'Hum tere bin ab reh nahi sakte',
      section: 'verse',
      words: [
        { word: 'Hum', start: 25.8, end: 26.5 },
        { word: 'tere', start: 26.5, end: 27.3 },
        { word: 'bin', start: 27.3, end: 28 },
        { word: 'ab', start: 28, end: 28.7 },
        { word: 'reh', start: 28.7, end: 29.4 },
        { word: 'nahi', start: 29.4, end: 30.2 },
        { word: 'sakte', start: 30.2, end: 31 }
      ]
    },
    {
      id: 'l4',
      lineIndex: 3,
      start: 31.3,
      end: 36.3,
      text: 'Tere bina kya wajood mera',
      section: 'verse',
      words: [
        { word: 'Tere', start: 31.3, end: 32.2 },
        { word: 'bina', start: 32.2, end: 33.1 },
        { word: 'kya', start: 33.1, end: 33.9 },
        { word: 'wajood', start: 33.9, end: 35 },
        { word: 'mera', start: 35, end: 36.3 }
      ]
    },
    {
      id: 'l5',
      lineIndex: 4,
      start: 36.6,
      end: 41.8,
      text: 'Tujh se juda agar ho jaayenge',
      section: 'verse',
      words: [
        { word: 'Tujh', start: 36.6, end: 37.3 },
        { word: 'se', start: 37.3, end: 38 },
        { word: 'juda', start: 38, end: 39 },
        { word: 'agar', start: 39, end: 40 },
        { word: 'ho', start: 40, end: 40.8 },
        { word: 'jaayenge', start: 40.8, end: 41.8 }
      ]
    },
    {
      id: 'l6',
      lineIndex: 5,
      start: 42,
      end: 47.4,
      text: 'To khud se hee ho jaayenge juda',
      section: 'verse',
      words: [
        { word: 'To', start: 42, end: 42.7 },
        { word: 'khud', start: 42.7, end: 43.5 },
        { word: 'se', start: 43.5, end: 44.2 },
        { word: 'hee', start: 44.2, end: 45 },
        { word: 'ho', start: 45, end: 45.8 },
        { word: 'jaayenge', start: 45.8, end: 46.6 },
        { word: 'juda', start: 46.6, end: 47.4 }
      ]
    },

    // --- Chorus 1 ---
    {
      id: 'l7',
      lineIndex: 6,
      start: 47.8,
      end: 53,
      text: 'Kyonki tum hee ho, ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Kyonki', start: 47.8, end: 48.8 },
        { word: 'tum', start: 48.8, end: 49.6 },
        { word: 'hee', start: 49.6, end: 50.4 },
        { word: 'ho,', start: 50.4, end: 51.2 },
        { word: 'ab', start: 51.2, end: 51.7 },
        { word: 'tum', start: 51.7, end: 52.3 },
        { word: 'hee', start: 52.3, end: 52.7 },
        { word: 'ho', start: 52.7, end: 53 }
      ]
    },
    {
      id: 'l8',
      lineIndex: 7,
      start: 53.4,
      end: 58.2,
      text: 'Zindagi ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Zindagi', start: 53.4, end: 54.8 },
        { word: 'ab', start: 54.8, end: 55.6 },
        { word: 'tum', start: 55.6, end: 56.5 },
        { word: 'hee', start: 56.5, end: 57.3 },
        { word: 'ho', start: 57.3, end: 58.2 }
      ]
    },
    {
      id: 'l9',
      lineIndex: 8,
      start: 58.4,
      end: 64,
      text: 'O-o-o, chain bhee, mera dard bhee',
      section: 'chorus',
      words: [
        { word: 'O-o-o,', start: 58.4, end: 60.2 },
        { word: 'chain', start: 60.2, end: 61.2 },
        { word: 'bhee,', start: 61.2, end: 61.8 },
        { word: 'mera', start: 61.8, end: 62.8 },
        { word: 'dard', start: 62.8, end: 63.4 },
        { word: 'bhee', start: 63.4, end: 64 }
      ]
    },
    {
      id: 'l10',
      lineIndex: 9,
      start: 64.2,
      end: 71,
      text: 'Meri aashiqui ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Meri', start: 64.2, end: 65.2 },
        { word: 'aashiqui', start: 65.2, end: 67 },
        { word: 'ab', start: 67, end: 68 },
        { word: 'tum', start: 68, end: 69.2 },
        { word: 'hee', start: 69.2, end: 70 },
        { word: 'ho', start: 70, end: 71 }
      ]
    },

    // --- Verse 2 ---
    {
      id: 'l11',
      lineIndex: 10,
      start: 88.5,
      end: 93.5,
      text: 'Tera-meraa rishta hai kaisaa',
      section: 'verse',
      words: [
        { word: 'Tera-meraa', start: 88.5, end: 90.2 },
        { word: 'rishta', start: 90.2, end: 91.4 },
        { word: 'hai', start: 91.4, end: 92.3 },
        { word: 'kaisaa', start: 92.3, end: 93.5 }
      ]
    },
    {
      id: 'l12',
      lineIndex: 11,
      start: 94,
      end: 99,
      text: 'Ek pal door gavaara nahin',
      section: 'verse',
      words: [
        { word: 'Ek', start: 94, end: 94.8 },
        { word: 'pal', start: 94.8, end: 95.7 },
        { word: 'door', start: 95.7, end: 96.8 },
        { word: 'gavaara', start: 96.8, end: 98 },
        { word: 'nahin', start: 98, end: 99 }
      ]
    },
    {
      id: 'l13',
      lineIndex: 12,
      start: 99.5,
      end: 104.5,
      text: 'Tere liye har roz hain jeete',
      section: 'verse',
      words: [
        { word: 'Tere', start: 99.5, end: 100.5 },
        { word: 'liye', start: 100.5, end: 101.5 },
        { word: 'har', start: 101.5, end: 102.3 },
        { word: 'roz', start: 102.3, end: 103.2 },
        { word: 'hain', start: 103.2, end: 103.8 },
        { word: 'jeete', start: 103.8, end: 104.5 }
      ]
    },
    {
      id: 'l14',
      lineIndex: 13,
      start: 105,
      end: 110,
      text: 'Tujh ko diya mera vakt sabhee',
      section: 'verse',
      words: [
        { word: 'Tujh', start: 105, end: 105.8 },
        { word: 'ko', start: 105.8, end: 106.5 },
        { word: 'diya', start: 106.5, end: 107.6 },
        { word: 'mera', start: 107.6, end: 108.6 },
        { word: 'vakt', start: 108.6, end: 109.3 },
        { word: 'sabhee', start: 109.3, end: 110 }
      ]
    },
    {
      id: 'l15',
      lineIndex: 14,
      start: 110.5,
      end: 116,
      text: 'Koyi lamaha mera naa ho tere binaa',
      section: 'verse',
      words: [
        { word: 'Koyi', start: 110.5, end: 111.3 },
        { word: 'lamaha', start: 111.3, end: 112.4 },
        { word: 'mera', start: 112.4, end: 113.3 },
        { word: 'naa', start: 113.3, end: 113.9 },
        { word: 'ho', start: 113.9, end: 114.5 },
        { word: 'tere', start: 114.5, end: 115.2 },
        { word: 'binaa', start: 115.2, end: 116 }
      ]
    },
    {
      id: 'l16',
      lineIndex: 15,
      start: 116.2,
      end: 121.5,
      text: 'Har saans pe naam tera',
      section: 'verse',
      words: [
        { word: 'Har', start: 116.2, end: 117 },
        { word: 'saans', start: 117, end: 118.2 },
        { word: 'pe', start: 118.2, end: 118.9 },
        { word: 'naam', start: 118.9, end: 120.2 },
        { word: 'tera', start: 120.2, end: 121.5 }
      ]
    },

    // --- Chorus 2 ---
    {
      id: 'l17',
      lineIndex: 16,
      start: 122,
      end: 127.5,
      text: 'Kyonki tum hee ho, ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Kyonki', start: 122, end: 123 },
        { word: 'tum', start: 123, end: 123.8 },
        { word: 'hee', start: 123.8, end: 124.6 },
        { word: 'ho,', start: 124.6, end: 125.4 },
        { word: 'ab', start: 125.4, end: 126 },
        { word: 'tum', start: 126, end: 126.6 },
        { word: 'hee', start: 126.6, end: 127 },
        { word: 'ho', start: 127, end: 127.5 }
      ]
    },
    {
      id: 'l18',
      lineIndex: 17,
      start: 128,
      end: 133,
      text: 'Zindagi ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Zindagi', start: 128, end: 129.4 },
        { word: 'ab', start: 129.4, end: 130.3 },
        { word: 'tum', start: 130.3, end: 131.2 },
        { word: 'hee', start: 131.2, end: 132 },
        { word: 'ho', start: 132, end: 133 }
      ]
    },
    {
      id: 'l19',
      lineIndex: 18,
      start: 133.2,
      end: 139,
      text: 'O-o-o, chain bhee, mera dard bhee',
      section: 'chorus',
      words: [
        { word: 'O-o-o,', start: 133.2, end: 135 },
        { word: 'chain', start: 135, end: 136 },
        { word: 'bhee,', start: 136, end: 136.6 },
        { word: 'mera', start: 136.6, end: 137.6 },
        { word: 'dard', start: 137.6, end: 138.3 },
        { word: 'bhee', start: 138.3, end: 139 }
      ]
    },
    {
      id: 'l20',
      lineIndex: 19,
      start: 139.2,
      end: 146.5,
      text: 'Meri aashiqui ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Meri', start: 139.2, end: 140.2 },
        { word: 'aashiqui', start: 140.2, end: 142 },
        { word: 'ab', start: 142, end: 143 },
        { word: 'tum', start: 143, end: 144.2 },
        { word: 'hee', start: 144.2, end: 145.2 },
        { word: 'ho', start: 145.2, end: 146.5 }
      ]
    },

    // --- Bridge ---
    {
      id: 'l21',
      lineIndex: 20,
      start: 155.5,
      end: 160.5,
      text: 'Tum hee ho...',
      section: 'bridge',
      words: [
        { word: 'Tum', start: 155.5, end: 156.8 },
        { word: 'hee', start: 156.8, end: 158 },
        { word: 'ho...', start: 158, end: 160.5 }
      ]
    },
    {
      id: 'l22',
      lineIndex: 21,
      start: 161,
      end: 166,
      text: 'Tum hee ho...',
      section: 'bridge',
      words: [
        { word: 'Tum', start: 161, end: 162.3 },
        { word: 'hee', start: 162.3, end: 163.5 },
        { word: 'ho...', start: 163.5, end: 166 }
      ]
    },
    {
      id: 'l23',
      lineIndex: 22,
      start: 166.5,
      end: 171.5,
      text: 'Tere liye hi jiya main',
      section: 'bridge',
      words: [
        { word: 'Tere', start: 166.5, end: 167.5 },
        { word: 'liye', start: 167.5, end: 168.5 },
        { word: 'hi', start: 168.5, end: 169.3 },
        { word: 'jiya', start: 169.3, end: 170.4 },
        { word: 'main', start: 170.4, end: 171.5 }
      ]
    },
    {
      id: 'l24',
      lineIndex: 23,
      start: 172,
      end: 177,
      text: 'Khud ko jo yoon de diya hai',
      section: 'bridge',
      words: [
        { word: 'Khud', start: 172, end: 172.9 },
        { word: 'ko', start: 172.9, end: 173.6 },
        { word: 'jo', start: 173.6, end: 174.3 },
        { word: 'yoon', start: 174.3, end: 175.2 },
        { word: 'de', start: 175.2, end: 175.9 },
        { word: 'diya', start: 175.9, end: 176.5 },
        { word: 'hai', start: 176.5, end: 177 }
      ]
    },
    {
      id: 'l25',
      lineIndex: 24,
      start: 177.5,
      end: 182.5,
      text: 'Teri vafaa ne mujh ko sanbhaala',
      section: 'bridge',
      words: [
        { word: 'Teri', start: 177.5, end: 178.4 },
        { word: 'vafaa', start: 178.4, end: 179.4 },
        { word: 'ne', start: 179.4, end: 180.1 },
        { word: 'mujh', start: 180.1, end: 180.8 },
        { word: 'ko', start: 180.8, end: 181.4 },
        { word: 'sanbhaala', start: 181.4, end: 182.5 }
      ]
    },
    {
      id: 'l26',
      lineIndex: 25,
      start: 183,
      end: 188,
      text: 'Saare gamon ko dil se nikaala',
      section: 'bridge',
      words: [
        { word: 'Saare', start: 183, end: 184 },
        { word: 'gamon', start: 184, end: 185.1 },
        { word: 'ko', start: 185.1, end: 185.8 },
        { word: 'dil', start: 185.8, end: 186.6 },
        { word: 'se', start: 186.6, end: 187.2 },
        { word: 'nikaala', start: 187.2, end: 188 }
      ]
    },
    {
      id: 'l27',
      lineIndex: 26,
      start: 188.5,
      end: 194,
      text: 'Tere saath mera hai naseeb juda',
      section: 'bridge',
      words: [
        { word: 'Tere', start: 188.5, end: 189.4 },
        { word: 'saath', start: 189.4, end: 190.4 },
        { word: 'mera', start: 190.4, end: 191.4 },
        { word: 'hai', start: 191.4, end: 192.1 },
        { word: 'naseeb', start: 192.1, end: 193.1 },
        { word: 'juda', start: 193.1, end: 194 }
      ]
    },
    {
      id: 'l28',
      lineIndex: 27,
      start: 194.2,
      end: 200,
      text: 'Tuje paa ke adhoora naa raha, mmm',
      section: 'bridge',
      words: [
        { word: 'Tuje', start: 194.2, end: 195.1 },
        { word: 'paa', start: 195.1, end: 196 },
        { word: 'ke', start: 196, end: 196.6 },
        { word: 'adhoora', start: 196.6, end: 197.8 },
        { word: 'naa', start: 197.8, end: 198.5 },
        { word: 'raha,', start: 198.5, end: 199.3 },
        { word: 'mmm', start: 199.3, end: 200 }
      ]
    },

    // --- Chorus 3 ---
    {
      id: 'l29',
      lineIndex: 28,
      start: 200.5,
      end: 206,
      text: 'Kyonki tum hee ho, ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Kyonki', start: 200.5, end: 201.5 },
        { word: 'tum', start: 201.5, end: 202.3 },
        { word: 'hee', start: 202.3, end: 203.1 },
        { word: 'ho,', start: 203.1, end: 203.9 },
        { word: 'ab', start: 203.9, end: 204.5 },
        { word: 'tum', start: 204.5, end: 205.1 },
        { word: 'hee', start: 205.1, end: 205.5 },
        { word: 'ho', start: 205.5, end: 206 }
      ]
    },
    {
      id: 'l30',
      lineIndex: 29,
      start: 206.2,
      end: 211.5,
      text: 'Zindagi ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Zindagi', start: 206.2, end: 207.6 },
        { word: 'ab', start: 207.6, end: 208.5 },
        { word: 'tum', start: 208.5, end: 209.4 },
        { word: 'hee', start: 209.4, end: 210.3 },
        { word: 'ho', start: 210.3, end: 211.5 }
      ]
    },
    {
      id: 'l31',
      lineIndex: 30,
      start: 212,
      end: 217.5,
      text: 'O-o-o, chain bhee, mera dard bhee',
      section: 'chorus',
      words: [
        { word: 'O-o-o,', start: 212, end: 213.8 },
        { word: 'chain', start: 213.8, end: 214.8 },
        { word: 'bhee,', start: 214.8, end: 215.4 },
        { word: 'mera', start: 215.4, end: 216.4 },
        { word: 'dard', start: 216.4, end: 217 },
        { word: 'bhee', start: 217, end: 217.5 }
      ]
    },
    {
      id: 'l32',
      lineIndex: 31,
      start: 217.8,
      end: 224.5,
      text: 'Meri aashiqui ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Meri', start: 217.8, end: 218.8 },
        { word: 'aashiqui', start: 218.8, end: 220.5 },
        { word: 'ab', start: 220.5, end: 221.4 },
        { word: 'tum', start: 221.4, end: 222.5 },
        { word: 'hee', start: 222.5, end: 223.4 },
        { word: 'ho', start: 223.4, end: 224.5 }
      ]
    },

    // --- Final Grand Chorus ---
    {
      id: 'l33',
      lineIndex: 32,
      start: 225,
      end: 230.5,
      text: 'Kyonki tum hee ho, ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Kyonki', start: 225, end: 226 },
        { word: 'tum', start: 226, end: 226.8 },
        { word: 'hee', start: 226.8, end: 227.6 },
        { word: 'ho,', start: 227.6, end: 228.4 },
        { word: 'ab', start: 228.4, end: 229 },
        { word: 'tum', start: 229, end: 229.6 },
        { word: 'hee', start: 229.6, end: 230 },
        { word: 'ho', start: 230, end: 230.5 }
      ]
    },
    {
      id: 'l34',
      lineIndex: 33,
      start: 231,
      end: 236,
      text: 'Zindagi ab tum hee ho',
      section: 'chorus',
      words: [
        { word: 'Zindagi', start: 231, end: 232.4 },
        { word: 'ab', start: 232.4, end: 233.3 },
        { word: 'tum', start: 233.3, end: 234.2 },
        { word: 'hee', start: 234.2, end: 235 },
        { word: 'ho', start: 235, end: 236 }
      ]
    },
    {
      id: 'l35',
      lineIndex: 34,
      start: 236.5,
      end: 242,
      text: 'O-o-o, chain bhee, mera dard bhee',
      section: 'chorus',
      words: [
        { word: 'O-o-o,', start: 236.5, end: 238.3 },
        { word: 'chain', start: 238.3, end: 239.3 },
        { word: 'bhee,', start: 239.3, end: 239.9 },
        { word: 'mera', start: 239.9, end: 240.9 },
        { word: 'dard', start: 240.9, end: 241.5 },
        { word: 'bhee', start: 241.5, end: 242 }
      ]
    },
    {
      id: 'l36',
      lineIndex: 35,
      start: 242.5,
      end: 250.5,
      text: 'Meri aashiqui ab tum hee ho',
      section: 'outro',
      words: [
        { word: 'Meri', start: 242.5, end: 243.6 },
        { word: 'aashiqui', start: 243.6, end: 245.5 },
        { word: 'ab', start: 245.5, end: 246.5 },
        { word: 'tum', start: 246.5, end: 247.8 },
        { word: 'hee', start: 247.8, end: 249 },
        { word: 'ho', start: 249, end: 250.5 }
      ]
    }
];

/**
 * Word-by-Word Synchronized Karaoke Data for "Tum Hi Ho" (Aashiqui 2)
 * Calibrated with a 4.0s total advance (shifted 3.0s earlier from previous 1.0s calibration)
 * to align lyrics perfectly with the vocal rhythm and music track.
 */
const CALIBRATION_ADVANCE_SEC = 3.0; // Cumulative 4.0s lead from original timestamps

export const TUM_HI_HO_KARAOKE_DATA: SongKaraokeTiming = {
  trackId: 'inst_tum_hi_ho',
  title: 'Tum Hi Ho',
  artist: 'Arijit Singh / Mithoon (Aashiqui 2)',
  duration: 262,
  lines: BASELINE_TUM_HI_HO_LINES.map(line => {
    const shiftedStart = Math.max(0, +(line.start - CALIBRATION_ADVANCE_SEC).toFixed(2));
    const shiftedEnd = Math.max(shiftedStart + 0.4, +(line.end - CALIBRATION_ADVANCE_SEC).toFixed(2));
    return {
      ...line,
      start: shiftedStart,
      end: shiftedEnd,
      words: line.words.map(w => {
        const wStart = Math.max(0, +(w.start - CALIBRATION_ADVANCE_SEC).toFixed(2));
        const wEnd = Math.max(wStart + 0.1, +(w.end - CALIBRATION_ADVANCE_SEC).toFixed(2));
        return {
          ...w,
          start: wStart,
          end: wEnd
        };
      })
    };
  })
};

/**
 * Utility: Find the active line for a given timestamp
 */
export function getActiveKaraokeLine(data: SongKaraokeTiming, currentTimeSec: number): {
  line: TimedLine | null;
  lineIndex: number;
  nextLine: TimedLine | null;
  leadInSeconds: number | null; // If before first line or between lines
} {
  const { lines } = data;
  if (!lines || lines.length === 0) {
    return { line: null, lineIndex: -1, nextLine: null, leadInSeconds: null };
  }

  // Before song starts
  if (currentTimeSec < lines[0].start) {
    return {
      line: null,
      lineIndex: -1,
      nextLine: lines[0],
      leadInSeconds: Math.max(0, lines[0].start - currentTimeSec)
    };
  }

  // Find line currently playing
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const next = lines[i + 1] || null;

    if (currentTimeSec >= cur.start && currentTimeSec <= cur.end) {
      return { line: cur, lineIndex: i, nextLine: next, leadInSeconds: null };
    }

    // Between current and next line (pause/interlude)
    if (next && currentTimeSec > cur.end && currentTimeSec < next.start) {
      return {
        line: cur,
        lineIndex: i,
        nextLine: next,
        leadInSeconds: next.start - currentTimeSec
      };
    }
  }

  // After last line
  const lastIdx = lines.length - 1;
  return { line: lines[lastIdx], lineIndex: lastIdx, nextLine: null, leadInSeconds: null };
}

/**
 * Utility: Calculate word progress percentage (0 to 100)
 */
export function getWordProgress(word: TimedWord, currentTimeSec: number): number {
  if (currentTimeSec <= word.start) return 0;
  if (currentTimeSec >= word.end) return 100;
  const duration = word.end - word.start;
  if (duration <= 0) return 100;
  const ratio = (currentTimeSec - word.start) / duration;
  return Math.min(100, Math.max(0, ratio * 100));
}

/**
 * Parses either timestamped LRC format or plain text lyrics into a synchronized
 * word-by-word SongKaraokeTiming structure for any uploaded audio file.
 */
export function parseLrcOrTextToKaraoke(
  audioDuration: number,
  title: string,
  artist: string,
  rawContent: string
): SongKaraokeTiming {
  const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lrcRegex = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

  const parsedLrcLines: { time: number; text: string }[] = [];

  for (const line of lines) {
    const match = line.match(lrcRegex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        parsedLrcLines.push({
          time: mins * 60 + secs,
          text
        });
      }
    }
  }

  // If valid LRC tags were found:
  if (parsedLrcLines.length > 0) {
    parsedLrcLines.sort((a, b) => a.time - b.time);
    const timedLines: TimedLine[] = parsedLrcLines.map((item, idx) => {
      const nextItem = parsedLrcLines[idx + 1];
      const start = item.time;
      const end = nextItem ? Math.min(nextItem.time - 0.2, start + 8.0) : Math.min(audioDuration, start + 5.0);
      const wordsArray = item.text.split(/\s+/).filter(Boolean);
      const lineDuration = Math.max(0.5, end - start);
      const wordDuration = lineDuration / Math.max(1, wordsArray.length);

      const words: TimedWord[] = wordsArray.map((w, wIdx) => ({
        word: w,
        start: +(start + wIdx * wordDuration).toFixed(2),
        end: +(start + (wIdx + 1) * wordDuration).toFixed(2)
      }));

      return {
        id: `custom_lrc_${idx}`,
        lineIndex: idx,
        start: +start.toFixed(2),
        end: +end.toFixed(2),
        text: item.text,
        words
      };
    });

    return {
      trackId: `custom_upload_${Date.now()}`,
      title,
      artist,
      duration: audioDuration,
      lines: timedLines
    };
  }

  // Otherwise, fallback to smart automated line distribution for plain text lyrics:
  // Clean out headers like [Chorus], [Verse], etc.
  const cleanLyricsLines = lines.filter(l => !l.startsWith('[') && !l.startsWith('#') && l.length > 0);
  if (cleanLyricsLines.length === 0) {
    cleanLyricsLines.push(title || 'Instrumental Track');
  }

  const introOffset = 4.0;
  const usableDuration = Math.max(10, audioDuration - introOffset - 4.0);
  const timePerLine = usableDuration / cleanLyricsLines.length;

  const timedLines: TimedLine[] = cleanLyricsLines.map((text, idx) => {
    const lineStart = introOffset + idx * timePerLine;
    const lineEnd = lineStart + Math.max(1.5, timePerLine * 0.85);
    const wordsArray = text.split(/\s+/).filter(Boolean);
    const wordDuration = (lineEnd - lineStart) / Math.max(1, wordsArray.length);

    const words: TimedWord[] = wordsArray.map((w, wIdx) => ({
      word: w,
      start: +(lineStart + wIdx * wordDuration).toFixed(2),
      end: +(lineStart + (wIdx + 1) * wordDuration).toFixed(2)
    }));

    return {
      id: `custom_txt_${idx}`,
      lineIndex: idx,
      start: +lineStart.toFixed(2),
      end: +lineEnd.toFixed(2),
      text,
      words
    };
  });

  return {
    trackId: `custom_upload_${Date.now()}`,
    title,
    artist,
    duration: audioDuration,
    lines: timedLines
  };
}

