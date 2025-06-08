export interface Concert {
  id: string;
  day: string;
  date: string;
  stage: string;
  startTime: string;
  endTime: string;
  artist: string;
  [key: string]: string | number | undefined;  // Index signature for dynamic property access
}

export interface ConcertSelection extends Concert {
  priority: number;
}

export interface ConflictItem {
  concert: ConcertSelection;
  conflicts: ConcertSelection[];
}
