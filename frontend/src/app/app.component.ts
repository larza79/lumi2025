import {
  Component,
  OnInit,
  ViewEncapsulation,
  HostListener,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Concert,
  ConcertSelection,
  ConflictItem,
} from './models/concert.model';
import { concertData as festivalData } from './data/concert-data';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class AppComponent implements OnInit {
  // UI State
  activeTab: 'concerts' | 'itinerary' = 'concerts';
  isMobile = false;
  showFilter = true;
  isDarkMode = false;
  // Concert Data
  concertData: Concert[] = [];
  userSelections: ConcertSelection[] = [];
  winnerIds = new Set<string>();
  filteredConcerts: Concert[] = [];
  lastSwappedId: string | null = null; // Track the last swapped concert ID

  // Organized Collections
  concertsByDay: { [key: string]: Concert[] } = {};
  itineraryByDay: { [key: string]: ConflictItem[] } = {};
  uniqueDays: string[] = [];
  uniqueStages: string[] = [];

  // Filter State
  artistSearch = '';
  selectedDays: string[] = [];
  selectedStages: string[] = [];
  selectedPriorities: number[] = [];
  isNotSelectedChecked = false;

  // UI Helpers
  showClearPlanBtn = false;

  // Constants
  readonly dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday'];
  readonly priorities = [1, 2, 3];
  readonly notSelectedValue = 'not-selected';

  // Priority counts
  priorityCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
  notSelectedCount = 0;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.initData();
    this.loadSelections();
    this.checkScreenSize();
    this.initTheme();
    this.refreshAll();
  }

  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }

  onThemeToggle(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 1024;
    if (this.isMobile) {
      this.showFilter = false;
    } else {
      this.showFilter = true;
    }
  }
  initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode =
      savedTheme === 'dark' ||
      (!savedTheme &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  private initData(): void {
    // Use the imported concert data from data/concert-data.ts
    this.concertData = festivalData.map((concert, index) => {
      return {
        ...concert,
        id: `concert-${index}`,
      } as Concert;
    });

    this.uniqueDays = this.getUniqueValues('day').sort(
      (a, b) => this.dayOrder.indexOf(a) - this.dayOrder.indexOf(b)
    );
    this.uniqueStages = this.getUniqueValues('stage');
    this.notSelectedCount = this.concertData.length;
  }
  private getUniqueValues(key: string): string[] {
    return [
      ...new Set(this.concertData.map((item) => String(item[key]))),
    ].sort();
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getDuration(start: string, end: string): number {
    return this.timeToMinutes(end) - this.timeToMinutes(start);
  }
  private checkConflict(
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
    return overlap > 15;
  }

  refreshAll(): void {
    this.updateWinners();
    this.applyFiltersAndRender();
    this.updateItinerary();
    this.saveSelections();
    this.updatePriorityCounts();
  }

  private saveSelections(): void {
    localStorage.setItem(
      'festivalPlannerSelections',
      JSON.stringify(this.userSelections)
    );
  }

  private loadSelections(): void {
    const savedData = localStorage.getItem('festivalPlannerSelections');
    if (savedData) this.userSelections = JSON.parse(savedData);
  }

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
        swappedConcert.priority = 0; // Lowest possible priority (highest importance)

        // Temporarily decrease the priority of conflicting concerts
        const originalPriorities = new Map<string, number>();
        conflictingIds.forEach((id) => {
          const concert = this.userSelections.find((c) => c.id === id);
          if (concert) {
            originalPriorities.set(id, concert.priority);
            concert.priority = 4; // Higher than the max priority (lowest importance)
          }
        });

        // Regular winner selection logic
        const sortedSelections = [...this.userSelections].sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (
            this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
          );
        });

        const winners: any[] = [];
        sortedSelections.forEach((concert) => {
          if (!winners.some((winner) => this.checkConflict(concert, winner))) {
            winners.push(concert);
          }
        });

        this.winnerIds = new Set<string>(winners.map((w) => w.id));

        // Restore original priorities
        swappedConcert.priority = originalPriority;
        conflictingIds.forEach((id) => {
          const concert = this.userSelections.find((c) => c.id === id);
          if (concert && originalPriorities.has(id)) {
            concert.priority = originalPriorities.get(id)!;
          }
        });

        // Clear the lastSwappedId after using it
        this.lastSwappedId = null;
      } else {
        // If the swapped concert no longer exists, clear the lastSwappedId
        this.lastSwappedId = null;
        this.updateWinnersNormal();
      }
    } else {
      this.updateWinnersNormal();
    }
  }

  private updateWinnersNormal(): void {
    const sortedSelections = [...this.userSelections].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
    });

    const winners: any[] = [];
    sortedSelections.forEach((concert) => {
      if (!winners.some((winner) => this.checkConflict(concert, winner))) {
        winners.push(concert);
      }
    });

    this.winnerIds = new Set<string>(winners.map((w) => w.id));
  }

  applyFiltersAndRender(): void {
    const artistSearch = this.artistSearch.toLowerCase();

    this.filteredConcerts = this.concertData.filter((concert) => {
      const artistMatch = concert.artist.toLowerCase().includes(artistSearch);
      const dayMatch =
        this.selectedDays.length === 0 ||
        this.selectedDays.includes(concert.day);
      const stageMatch =
        this.selectedStages.length === 0 ||
        this.selectedStages.includes(concert.stage);

      const existingSelection = this.userSelections.find(
        (s) => s.id === concert.id
      );
      const isSelected = !!existingSelection;

      let priorityMatch =
        this.selectedPriorities.length === 0 && !this.isNotSelectedChecked;

      if (this.isNotSelectedChecked && !isSelected) {
        priorityMatch = true;
      } else if (this.selectedPriorities.length > 0 && isSelected) {
        priorityMatch = this.selectedPriorities.includes(
          existingSelection.priority
        );
      }

      return artistMatch && dayMatch && stageMatch && priorityMatch;
    });
    this.concertsByDay = this.filteredConcerts.reduce<{
      [key: string]: Concert[];
    }>((acc, concert) => {
      if (!acc[concert.day]) acc[concert.day] = [];
      acc[concert.day].push(concert);
      return acc;
    }, {});
  }
  onAddConcert(concert: Concert): void {
    const existingSelectionIndex = this.userSelections.findIndex(
      (s) => s.id === concert.id
    );

    if (existingSelectionIndex > -1) {
      this.userSelections.splice(existingSelectionIndex, 1);
    } else {
      const newConcert = { ...concert, priority: 1 } as ConcertSelection;
      this.userSelections.push(newConcert);
    }

    this.refreshAll();
  }
  onPriorityClick(concert: Concert, priority: number): void {
    const selectionIndex = this.userSelections.findIndex(
      (s) => s.id === concert.id
    );

    if (selectionIndex > -1) {
      const forcedPriorities: { [key: string]: number } = {};
      forcedPriorities[concert.id] = priority;
      this.recalculatePriorities(forcedPriorities);
    }

    this.refreshAll();
  }

  onRemoveConcert(concertId: string): void {
    const indexToRemove = this.userSelections.findIndex(
      (c) => c.id === concertId
    );
    if (indexToRemove > -1) {
      this.userSelections.splice(indexToRemove, 1);
      this.refreshAll();
    }
  }
  onSwapItems(mainId: string, conflictId: string): void {
    const mainConcertIndex = this.userSelections.findIndex(
      (c) => c.id === mainId
    );
    const conflictConcertIndex = this.userSelections.findIndex(
      (c) => c.id === conflictId
    );

    if (mainConcertIndex > -1 && conflictConcertIndex > -1) {
      // Force the conflict concert to have priority 1 (highest)
      this.userSelections[conflictConcertIndex].priority = 1;

      // Move the main concert to a lower priority
      this.userSelections[mainConcertIndex].priority = 3;

      // Mark this as the last swapped concert to prioritize it in winner selection
      this.lastSwappedId = conflictId;

      this.refreshAll();
    }
  }

  clearPlan(): void {
    this.userSelections = [];
    this.refreshAll();
  }

  onFilterChange(): void {
    this.applyFiltersAndRender();
  }

  resetFilters(): void {
    this.artistSearch = '';
    this.selectedDays = [];
    this.selectedStages = [];
    this.selectedPriorities = [];
    this.isNotSelectedChecked = false;
    this.applyFiltersAndRender();
  }

  private recalculatePriorities(
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

    concertsToProcess.forEach((processed) => {
      const selection = this.userSelections.find((s) => s.id === processed.id);
      if (selection) {
        selection.priority = processed.priority;
      }
    });
  }
  private updateItinerary(): void {
    this.showClearPlanBtn = this.userSelections.length > 0;

    if (this.userSelections.length === 0) {
      this.itineraryByDay = {};
      return;
    }

    const winners = [...this.userSelections].filter((s) =>
      this.winnerIds.has(s.id)
    );
    const itineraryByDay: Record<string, ConflictItem[]> = {};

    winners
      .sort(
        (a, b) =>
          this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
      )
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

    this.itineraryByDay = itineraryByDay;
  }

  private updatePriorityCounts(): void {
    this.priorityCounts = { 1: 0, 2: 0, 3: 0 };

    this.userSelections.forEach((selection) => {
      if (this.priorityCounts[selection.priority] !== undefined) {
        this.priorityCounts[selection.priority]++;
      }
    });

    this.notSelectedCount =
      this.concertData.length - this.userSelections.length;
  }

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
      this.concertsByDay[day]?.some(
        (concert) =>
          this.userSelections.some((s) => s.id === concert.id) &&
          this.winnerIds.has(concert.id)
      ) || false
    );
  }

  isDayConflicted(day: string): boolean {
    return (
      this.concertsByDay[day]?.some(
        (concert) =>
          this.userSelections.some((s) => s.id === concert.id) &&
          !this.winnerIds.has(concert.id)
      ) || false
    );
  }

  toggleDayFilter(day: string): void {
    if (this.selectedDays.includes(day)) {
      this.selectedDays = this.selectedDays.filter((d) => d !== day);
    } else {
      this.selectedDays.push(day);
    }
    this.onFilterChange();
  }

  toggleStageFilter(stage: string): void {
    if (this.selectedStages.includes(stage)) {
      this.selectedStages = this.selectedStages.filter((s) => s !== stage);
    } else {
      this.selectedStages.push(stage);
    }
    this.onFilterChange();
  }

  togglePriorityFilter(priority: number): void {
    if (this.selectedPriorities.includes(priority)) {
      this.selectedPriorities = this.selectedPriorities.filter(
        (p) => p !== priority
      );
    } else {
      this.selectedPriorities.push(priority);
    }
    this.onFilterChange();
  }
}
