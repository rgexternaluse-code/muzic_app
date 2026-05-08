import Dexie, { Table } from 'dexie';
import { Track } from './types';

export class MusicDatabase extends Dexie {
  tracks!: Table<Track>;

  constructor() {
    super('MusicDatabase');
    this.version(1).stores({
      tracks: 'id, title, artist, album, folderPath, fileName'
    });
  }
}

export const db = new MusicDatabase();
