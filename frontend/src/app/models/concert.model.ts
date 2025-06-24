export interface Concert {
  id: string;
  day: string;
  date: string;
  stage: string;
  startTime: string;
  endTime: string;
  artist: string;
  durationMins?: number; // Duration in minutes between start and end time
  [key: string]: string | number | undefined; // Index signature for dynamic property access
}

export interface ConcertSelection extends Concert {
  priority: number;
}

// Simplified selection object for storage
export interface StoredConcertSelection {
  id: string;
  priority: number;
}

export interface ConflictItem {
  concert: ConcertSelection;
  conflicts: ConcertSelection[];
}
