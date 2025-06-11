import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Concert,
  ConcertSelection,
  ConflictItem,
} from '../models/concert.model';

const STORAGE_KEY = 'festivalPlannerSelections';

@Injectable({
  providedIn: 'root',
})
export class ItineraryService {
  // Private subjects to manage state
  private userSelectionsSubject = new BehaviorSubject<ConcertSelection[]>([]);
  private winnerIdsSubject = new BehaviorSubject<Set<string>>(
    new Set<string>()
  );
  private itineraryByDaySubject = new BehaviorSubject<{
    [key: string]: ConflictItem[];
  }>({});
  private lastSwappedIdSubject = new BehaviorSubject<string | null>(null);
  private priorityCountsSubject = new BehaviorSubject<{
    [key: number]: number;
  }>({ 1: 0, 2: 0, 3: 0 });
  private notSelectedCountSubject = new BehaviorSubject<number>(0);

  // Public observables for components to subscribe to
  public userSelections$: Observable<ConcertSelection[]> =
    this.userSelectionsSubject.asObservable();
  public winnerIds$: Observable<Set<string>> =
    this.winnerIdsSubject.asObservable();
  public itineraryByDay$: Observable<{ [key: string]: ConflictItem[] }> =
    this.itineraryByDaySubject.asObservable();
  public priorityCounts$: Observable<{ [key: number]: number }> =
    this.priorityCountsSubject.asObservable();
  public notSelectedCount$: Observable<number> =
    this.notSelectedCountSubject.asObservable();

  private readonly dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor() {
    // Load saved selections when service is initialized
    this.loadSelections();
  }

  // Getters for current values
  get userSelections(): ConcertSelection[] {
    return this.userSelectionsSubject.getValue();
  }

  get winnerIds(): Set<string> {
    return this.winnerIdsSubject.getValue();
  }

  get itineraryByDay(): { [key: string]: ConflictItem[] } {
    return this.itineraryByDaySubject.getValue();
  }

  get lastSwappedId(): string | null {
    return this.lastSwappedIdSubject.getValue();
  }

  get priorityCounts(): { [key: number]: number } {
    return this.priorityCountsSubject.getValue();
  }

  get notSelectedCount(): number {
    return this.notSelectedCountSubject.getValue();
  }

  // Set notSelectedCount based on total concerts
  setTotalConcerts(totalConcerts: number): void {
    this.updateNotSelectedCount(totalConcerts);
  }

  // Add a concert to the itinerary
  addConcert(concert: Concert): void {
    const existingSelectionIndex = this.userSelections.findIndex(
      (s) => s.id === concert.id
    );

    // If concert is already selected, remove it
    if (existingSelectionIndex > -1) {
      this.removeConcert(concert.id);
      return;
    }

    // Find any existing conflicts
    const conflicts = this.userSelections.filter((selection) =>
      this.checkConflict(selection, concert)
    );

    // Determine the appropriate priority for the new concert
    let newPriority = 1;
    if (conflicts.length > 0) {
      // If there are conflicts, set the new concert to priority 2 (lower priority)
      newPriority = 2;
    }

    // Create a new selection with priority
    const newConcert = {
      ...concert,
      priority: newPriority,
    } as ConcertSelection;

    // Add the new concert to selections
    this.userSelectionsSubject.next([...this.userSelections, newConcert]);

    // Refresh all data
    this.refreshAll();
  }

  // Remove a concert from the itinerary
  removeConcert(concertId: string): void {
    const indexToRemove = this.userSelections.findIndex(
      (c) => c.id === concertId
    );

    if (indexToRemove > -1) {
      // Get the concert to be removed
      const removedConcert = this.userSelections[indexToRemove];

      // Find any concerts that were in conflict with the removed concert
      const conflictingConcerts = this.userSelections.filter(
        (selection) =>
          selection.id !== concertId &&
          this.checkConflict(selection, removedConcert)
      );

      // Create a new array without the removed concert
      const updatedSelections = [...this.userSelections];
      updatedSelections.splice(indexToRemove, 1);
      this.userSelectionsSubject.next(updatedSelections);

      // If there were conflicts, check if any remaining conflicts have higher priorities
      if (conflictingConcerts.length > 0) {
        // Sort conflicts by priority, lowest value (highest priority) first
        conflictingConcerts.sort((a, b) => a.priority - b.priority);

        // Check if any of the conflicts need their priority upgraded
        // This ensures the highest priority concert becomes P1, the next P2, etc.
        conflictingConcerts.forEach((concert, index) => {
          const newPriority = index + 1; // P1, P2, P3
          if (newPriority < concert.priority) {
            // Update to a higher priority (lower number)
            const selection = this.userSelections.find(
              (s) => s.id === concert.id
            );

            if (selection) {
              this.updateConcertPriority(concert.id, newPriority);
            }
          }
        });
      }

      // Refresh all data
      this.refreshAll();
    }
  }

  // Update the priority of a specific concert
  updateConcertPriority(concertId: string, priority: number): void {
    const updatedSelections = [...this.userSelections];
    const selectionIndex = updatedSelections.findIndex(
      (s) => s.id === concertId
    );

    if (selectionIndex > -1) {
      updatedSelections[selectionIndex] = {
        ...updatedSelections[selectionIndex],
        priority,
      };

      this.userSelectionsSubject.next(updatedSelections);
      this.refreshAll();
    }
  }

  // Handle swapping of concerts in the itinerary
  swapConcerts(mainId: string, conflictId: string): void {
    const mainConcertIndex = this.userSelections.findIndex(
      (c) => c.id === mainId
    );
    const conflictConcertIndex = this.userSelections.findIndex(
      (c) => c.id === conflictId
    );

    if (mainConcertIndex > -1 && conflictConcertIndex > -1) {
      // Get both concerts
      const mainConcert = this.userSelections[mainConcertIndex];
      const conflictConcert = this.userSelections[conflictConcertIndex];

      // Make a copy of the current selections
      const updatedSelections = [...this.userSelections];

      // Force the conflict concert to have priority 1 (highest)
      updatedSelections[conflictConcertIndex] = {
        ...conflictConcert,
        priority: 1,
      };

      // Find all concerts that conflict with the newly prioritized concert
      const conflicts = this.userSelections.filter(
        (selection) =>
          selection.id !== conflictId &&
          selection.id !== mainId &&
          this.checkConflict(selection, conflictConcert)
      );

      // Find the next available priority for the main concert
      let availablePriorities = [1, 2, 3];

      // Priority 1 is taken by the conflict concert
      availablePriorities = availablePriorities.filter((p) => p !== 1);

      // Remove any priorities already used by other conflicts
      conflicts.forEach((c) => {
        availablePriorities = availablePriorities.filter(
          (p) => p !== c.priority
        );
      });

      // Assign the next available priority, or 3 if all are taken
      const nextPriority =
        availablePriorities.length > 0 ? Math.min(...availablePriorities) : 2;
      updatedSelections[mainConcertIndex] = {
        ...mainConcert,
        priority: nextPriority,
      };

      // Update the selections
      this.userSelectionsSubject.next(updatedSelections);

      // Mark this as the last swapped concert to prioritize it in winner selection
      this.lastSwappedIdSubject.next(conflictId);

      // Refresh all data
      this.refreshAll();
    }
  }

  // Clear the entire itinerary
  clearPlan(): void {
    this.userSelectionsSubject.next([]);
    this.refreshAll();
  }

  // Recalculate priorities for all selections
  recalculatePriorities(
    forcedPriorities: { [key: string]: number } = {}
  ): void {
    const concertsToProcess = this.userSelections.map((c) => ({
      ...c,
      priority:
        forcedPriorities[c.id] !== undefined
          ? forcedPriorities[c.id]
          : c.priority,
    }));

    concertsToProcess.sort((a, b) => a.priority - b.priority);

    let conflictGraph: { [key: string]: string[] } = {};
    concertsToProcess.forEach((concert) => {
      conflictGraph[concert.id] = concertsToProcess
        .filter((c) => c.id !== concert.id && this.checkConflict(c, concert))
        .map((c) => c.id);
    });

    concertsToProcess.forEach((concert) => {
      const conflicts = conflictGraph[concert.id];

      if (forcedPriorities[concert.id] !== undefined) {
        const forcedPriority = forcedPriorities[concert.id];

        conflicts.forEach((conflictId) => {
          const conflictConcert = concertsToProcess.find(
            (c) => c.id === conflictId
          );
          if (conflictConcert && conflictConcert.priority <= forcedPriority) {
            if (forcedPriorities[conflictId] === undefined) {
              conflictConcert.priority = Math.min(3, forcedPriority + 1);
            }
          }
        });
      } else {
        const conflictPriorities = conflicts.map(
          (id) => concertsToProcess.find((c) => c.id === id)?.priority
        );

        if (conflictPriorities.length === 0) {
          concert.priority = 1;
        } else {
          if (!conflictPriorities.includes(1)) {
            concert.priority = 1;
          } else if (!conflictPriorities.includes(2)) {
            concert.priority = 2;
          } else {
            concert.priority = 3;
          }
        }
      }
    });

    // Update original user selections with new priorities
    const updatedSelections = [...this.userSelections];
    concertsToProcess.forEach((processed) => {
      const selectionIndex = updatedSelections.findIndex(
        (s) => s.id === processed.id
      );
      if (selectionIndex !== -1) {
        updatedSelections[selectionIndex] = {
          ...updatedSelections[selectionIndex],
          priority: processed.priority,
        };
      }
    });

    this.userSelectionsSubject.next(updatedSelections);
  }

  // Update the winners based on priorities and conflicts
  private updateWinners(): void {
    // If there's a recently swapped conflict, make sure it becomes a winner
    if (this.lastSwappedId) {
      // Find all conflicting concerts with the swapped concert
      const swappedConcert = this.userSelections.find(
        (c) => c.id === this.lastSwappedId
      );

      if (swappedConcert) {
        // Get all concerts that conflict with the swapped concert
        const conflictingIds = this.userSelections
          .filter(
            (c) =>
              c.id !== this.lastSwappedId &&
              this.checkConflict(c, swappedConcert)
          )
          .map((c) => c.id);

        // Temporarily increase the priority of the swapped concert
        const originalPriority = swappedConcert.priority;
        const tempSwappedConcert = { ...swappedConcert, priority: 0 }; // Lowest possible priority (highest importance)

        // Temporarily decrease the priority of conflicting concerts
        const originalPriorities = new Map<string, number>();
        const tempSelections = [...this.userSelections];

        // Replace the swapped concert with temporary version
        const swappedIndex = tempSelections.findIndex(
          (c) => c.id === swappedConcert.id
        );
        if (swappedIndex !== -1) {
          tempSelections[swappedIndex] = tempSwappedConcert;
        }

        // Adjust priorities of conflicting concerts
        tempSelections.forEach((concert, index) => {
          if (conflictingIds.includes(concert.id)) {
            originalPriorities.set(concert.id, concert.priority);
            tempSelections[index] = { ...concert, priority: 4 }; // Higher than the max priority
          }
        });

        // Regular winner selection logic on temporary concerts
        const sortedSelections = [...tempSelections].sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (
            this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
          );
        });

        const winners: ConcertSelection[] = [];
        sortedSelections.forEach((concert) => {
          if (!winners.some((winner) => this.checkConflict(concert, winner))) {
            winners.push(concert);
          }
        });

        this.winnerIdsSubject.next(new Set<string>(winners.map((w) => w.id)));

        // No need to restore original priorities since we worked on a copy

        // Clear the lastSwappedId after using it
        this.lastSwappedIdSubject.next(null);
      } else {
        // If the swapped concert no longer exists, clear the lastSwappedId
        this.lastSwappedIdSubject.next(null);
        this.updateWinnersNormal();
      }
    } else {
      this.updateWinnersNormal();
    }
  }

  // Standard winner selection algorithm without any special cases
  private updateWinnersNormal(): void {
    const sortedSelections = [...this.userSelections].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
    });

    const winners: ConcertSelection[] = [];
    sortedSelections.forEach((concert) => {
      if (!winners.some((winner) => this.checkConflict(concert, winner))) {
        winners.push(concert);
      }
    });

    this.winnerIdsSubject.next(new Set<string>(winners.map((w) => w.id)));
  }

  // Update the itinerary by day
  private updateItinerary(): void {
    if (this.userSelections.length === 0) {
      this.itineraryByDaySubject.next({});
      return;
    }

    const winners = [...this.userSelections].filter((s) =>
      this.winnerIds.has(s.id)
    );
    const itineraryByDay: Record<string, ConflictItem[]> = {};

    // First sort by day according to dayOrder, then by start time
    winners
      .sort((a, b) => {
        const dayOrderDiff =
          this.dayOrder.indexOf(a.day) - this.dayOrder.indexOf(b.day);
        if (dayOrderDiff !== 0) return dayOrderDiff;
        return (
          this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
        );
      })
      .forEach((winner) => {
        const day = winner.day;
        if (!itineraryByDay[day]) itineraryByDay[day] = [];

        itineraryByDay[day].push({
          concert: winner,
          conflicts: this.userSelections
            .filter((c) => c.id !== winner.id && this.checkConflict(c, winner))
            .sort((a, b) => {
              const timeCompare =
                this.timeToMinutes(a.startTime) -
                this.timeToMinutes(b.startTime);
              return timeCompare !== 0 ? timeCompare : a.priority - b.priority;
            }),
        });
      });

    this.itineraryByDaySubject.next(itineraryByDay);
  }
  // Update the counts of concerts with each priority
  private updatePriorityCounts(): void {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

    this.userSelections.forEach((selection) => {
      if (selection.priority in counts) {
        counts[selection.priority]++;
      }
    });

    this.priorityCountsSubject.next(counts);
    this.updateNotSelectedCount();
  }

  // Update the count of concerts not selected
  private updateNotSelectedCount(totalConcerts?: number): void {
    if (totalConcerts !== undefined) {
      this.notSelectedCountSubject.next(
        totalConcerts - this.userSelections.length
      );
    } else {
      // If total concerts not provided, use current value
      this.notSelectedCountSubject.next(
        this.notSelectedCount -
          (this.notSelectedCount - this.userSelections.length)
      );
    }
  }

  // Save the current selections to localStorage
  private saveSelections(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userSelections));
  }

  // Load saved selections from localStorage
  private loadSelections(): void {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const selections = JSON.parse(savedData);
        this.userSelectionsSubject.next(selections);
        this.refreshAll();
      } catch (e) {
        console.error('Error parsing saved selections', e);
      }
    }
  }
  // Check if two concerts conflict with each other
  checkConflict(
    concertA: Concert | ConcertSelection,
    concertB: Concert | ConcertSelection
  ): boolean {
    if (concertA.day !== concertB.day) return false;

    const startA = this.timeToMinutes(concertA.startTime);
    const endA = this.timeToMinutes(concertA.endTime);
    const startB = this.timeToMinutes(concertB.startTime);
    const endB = this.timeToMinutes(concertB.endTime);

    const overlap = Math.max(
      0,
      Math.min(endA, endB) - Math.max(startA, startB)
    );

    return overlap > 15; // Consider it a conflict if overlap is more than 15 minutes
  }

  // Helper function to convert time string to minutes
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  // Refresh all data after a change
  refreshAll(): void {
    this.updateWinners();
    this.updateItinerary();
    this.updatePriorityCounts();
    this.saveSelections();
  }

  // Get count of concerts that are actually in conflict with winners
  getConflictingConcertsCount(): number {
    const actualConflicts = new Set<string>();

    // Check each winner against all other selected concerts
    this.userSelections.forEach((selection) => {
      if (!this.winnerIds.has(selection.id)) {
        // Check if this non-winner conflicts with any winner
        const conflictsWithWinner = this.userSelections.some(
          (winner) =>
            this.winnerIds.has(winner.id) &&
            this.checkConflict(selection, winner)
        );

        if (conflictsWithWinner) {
          actualConflicts.add(selection.id);
        }
      }
    });

    return actualConflicts.size;
  }

  // Utility methods
  isConcertSelected(concertId: string): boolean {
    return this.userSelections.some((s) => s.id === concertId);
  }

  isConcertWinner(concertId: string): boolean {
    return this.winnerIds.has(concertId);
  }

  getConcertPriority(concertId: string): number | null {
    const selection = this.userSelections.find((s) => s.id === concertId);
    return selection ? selection.priority : null;
  }

  isDaySelected(day: string): boolean {
    return (
      this.userSelections.some(
        (concert) => concert.day === day && this.winnerIds.has(concert.id)
      ) || false
    );
  }
  isDayConflicted(day: string): boolean {
    // Only concerts that are in actual conflict with winners should be considered
    const concertsOnDay = this.userSelections.filter(
      (concert) => concert.day === day
    );

    // Find non-winner concerts that conflict with winners
    return concertsOnDay.some((concert) => {
      if (!this.winnerIds.has(concert.id)) {
        return concertsOnDay.some(
          (winner) =>
            this.winnerIds.has(winner.id) && this.checkConflict(concert, winner)
        );
      }
      return false;
    });
  }

  // Debug method to log winners
  logWinners(): void {
    console.log('Winner IDs count:', this.winnerIds.size);
    console.log('Winner IDs:', Array.from(this.winnerIds));
    console.log('Selected concerts count:', this.userSelections.length);
  }
}
