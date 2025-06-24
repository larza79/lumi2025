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
import { ItineraryService } from './services/itinerary.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class AppComponent implements OnInit {
  title = 'lumi-app';

  // UI State
  activeTab: 'concerts' | 'itinerary' = 'concerts';
  isMobile = false;
  showFilter = true;
  isDarkMode = false;

  // Concert Data
  concertData: Concert[] = [];
  filteredConcerts: Concert[] = [];

  // Imported from service
  userSelections: ConcertSelection[] = [];
  winnerIds = new Set<string>();
  itineraryByDay: { [key: string]: ConflictItem[] } = {};
  priorityCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
  notSelectedCount = 0;
  showClearPlanBtn = false;

  // Organized Collections
  concertsByDay: { [key: string]: Concert[] } = {};
  uniqueDays: string[] = [];
  uniqueStages: string[] = [];

  // Filter State
  artistSearch = '';
  selectedDays: string[] = [];
  selectedStages: string[] = [];
  selectedPriorities: number[] = [];
  isNotSelectedChecked = false;

  // Computed properties - for template access
  selectedConcerts: { [key: string]: boolean } = {};
  winnerConcerts: { [key: string]: boolean } = {};
  conflictConcerts: { [key: string]: boolean } = {}; // Added map for conflicts
  concertPriorities: { [key: string]: number | null } = {};
  selectedConcertsCount = 0;
  winnerConcertsCount = 0;
  conflictConcertsCount = 0;

  // Constants
  readonly dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday'];
  readonly priorities = [1, 2, 3];
  readonly notSelectedValue = 'not-selected';

  constructor(private itineraryService: ItineraryService) {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }
  ngOnInit(): void {
    this.initData();
    this.subscribeToConcertData();
    this.checkScreenSize();
    this.initTheme();

    // Force update of conflict properties on initialization
    setTimeout(() => {
      this.updateConflictProperties();
      this.updateCountProperties();
      this.applyFiltersAndRender();
      console.log('Initial conflict count check:', this.conflictConcertsCount);
    }, 0);

    this.applyFiltersAndRender();
  }

  // UI Helpers
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

  // Setup data and subscriptions
  private initData(): void {
    // Use the imported concert data from data/concert-data.ts
    this.concertData = festivalData.map((concert, index) => {
      // Calculate duration directly when mapping the data
      const startTime = concert['startTime'] as string;
      const endTime = concert['endTime'] as string;
      const durationMins = this.calculateDuration(startTime, endTime);

      return {
        ...concert,
        id: `concert-${index}`,
        durationMins: durationMins,
      } as Concert;
    });

    this.uniqueDays = this.getUniqueValues('day').sort(
      (a, b) => this.dayOrder.indexOf(a) - this.dayOrder.indexOf(b)
    );
    this.uniqueStages = this.getUniqueValues('stage');

    // Set total concerts count in service
    this.itineraryService.setTotalConcerts(this.concertData.length);

    // Pass the full concert data to the service
    this.itineraryService.setConcertData(this.concertData);
  }

  private subscribeToConcertData() {
    // Subscribe to user selections from the itinerary service
    this.itineraryService.userSelections$.subscribe((selections) => {
      this.userSelections = selections;
      this.showClearPlanBtn = selections.length > 0;

      // Update the computed properties
      this.updateComputedProperties();

      this.applyFiltersAndRender();
    }); // Subscribe to winner IDs
    this.itineraryService.winnerIds$.subscribe((ids) => {
      console.log(
        'Winners subscription received new data, winner count:',
        ids.size
      );

      // Store the winners
      this.winnerIds = ids;

      // Update winner-related computed properties
      this.updateWinnerProperties();

      // Update conflict properties after winners are updated
      this.updateConflictProperties();

      // Make sure counts are updated when winners change
      this.updateCountProperties();

      // Re-render the UI
      this.applyFiltersAndRender();
    });

    // Subscribe to itinerary by day
    this.itineraryService.itineraryByDay$.subscribe((data) => {
      this.itineraryByDay = data;
    });

    // Subscribe to priority counts
    this.itineraryService.priorityCounts$.subscribe((counts) => {
      this.priorityCounts = counts;
    });

    // Subscribe to not selected count
    this.itineraryService.notSelectedCount$.subscribe((count) => {
      this.notSelectedCount = count;
    });
  }
  // Update all computed properties used in the template
  private updateComputedProperties(): void {
    this.updateSelectedProperties();
    this.updateWinnerProperties();
    this.updateConflictProperties(); // Update conflicts before counts
    this.updateCountProperties();
  }

  // Update selection-related properties
  private updateSelectedProperties(): void {
    // Reset
    this.selectedConcerts = {};
    this.concertPriorities = {};

    // Update with current data
    this.userSelections.forEach((selection) => {
      this.selectedConcerts[selection.id] = true;
      this.concertPriorities[selection.id] = selection.priority;
    });
  }

  // Update winner-related properties
  private updateWinnerProperties(): void {
    this.winnerConcerts = {};
    this.winnerIds.forEach((id) => {
      this.winnerConcerts[id] = true;
    });
  }

  // Update computed properties for conflicts
  private updateConflictProperties(): void {
    // Reset conflicts map
    this.conflictConcerts = {};

    // Only process if we have winners and selections
    if (this.winnerIds.size === 0 || this.userSelections.length === 0) {
      return;
    }

    // Check each selected concert to see if it conflicts with winners
    this.userSelections.forEach((selection) => {
      // Skip if it's a winner
      if (this.winnerConcerts[selection.id]) {
        return;
      }

      // Check if it conflicts with any winner
      const isConflicting = this.userSelections.some(
        (winner) =>
          this.winnerIds.has(winner.id) &&
          this.itineraryService.checkConflict(selection, winner)
      );

      if (isConflicting) {
        this.conflictConcerts[selection.id] = true;
      }
    });
  }

  // Update count properties
  private updateCountProperties(): void {
    this.selectedConcertsCount = this.userSelections.length;
    this.winnerConcertsCount = this.winnerIds.size;
    this.conflictConcertsCount = Object.keys(this.conflictConcerts).length; // Debug log to verify counts
    console.log('Count properties updated:');
    console.log('- Selected concerts:', this.selectedConcertsCount);
    console.log('- Winner concerts:', this.winnerConcertsCount);
    console.log('- Conflict concerts:', this.conflictConcertsCount);
  }

  private getUniqueValues(key: string): string[] {
    return [
      ...new Set(this.concertData.map((item) => String(item[key]))),
    ].sort();
  }

  // Helper to convert time string to minutes for duration calculations
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper method to calculate duration between times
  private calculateDuration(start: string, end: string): number {
    return this.timeToMinutes(end) - this.timeToMinutes(start);
  }

  // For backward compatibility - will be removed from template
  getDuration(start: string, end: string): number {
    return this.calculateDuration(start, end);
  }

  // Filter and rendering
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

      const isSelected = this.selectedConcerts[concert.id] || false;

      let priorityMatch =
        this.selectedPriorities.length === 0 && !this.isNotSelectedChecked;

      if (this.isNotSelectedChecked && !isSelected) {
        priorityMatch = true;
      } else if (this.selectedPriorities.length > 0 && isSelected) {
        const priority = this.concertPriorities[concert.id];
        priorityMatch = priority
          ? this.selectedPriorities.includes(priority)
          : false;
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

  // Concert operations - delegated to service
  onAddConcert(concert: Concert): void {
    this.itineraryService.addConcert(concert);
  }

  onPriorityClick(concert: Concert, priority: number): void {
    if (this.selectedConcerts[concert.id]) {
      this.itineraryService.updateConcertPriority(concert.id, priority);
    }
  }

  onRemoveConcert(concertId: string): void {
    this.itineraryService.removeConcert(concertId);
  }

  onSwapItems(mainId: string, conflictId: string): void {
    this.itineraryService.swapConcerts(mainId, conflictId);
  }

  clearPlan(): void {
    this.itineraryService.clearPlan();
  }

  // Filter operations
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

  // Helper methods - will be removed from template
  isConcertSelected(concertId: string): boolean {
    return this.selectedConcerts[concertId] || false;
  }

  isConcertWinner(concertId: string): boolean {
    return this.winnerConcerts[concertId] || false;
  }

  getConcertPriority(concertId: string): number | null {
    return this.concertPriorities[concertId] || null;
  }

  isDaySelected(day: string): boolean {
    return (
      this.concertsByDay[day]?.some(
        (concert) =>
          this.selectedConcerts[concert.id] && this.winnerConcerts[concert.id]
      ) || false
    );
  }

  isDayConflicted(day: string): boolean {
    return (
      this.concertsByDay[day]?.some(
        (concert) =>
          this.selectedConcerts[concert.id] && !this.winnerConcerts[concert.id]
      ) || false
    );
  }
  // These methods were previously used in templates, now using direct property access
  // Helper method to check if a concert is conflicting with any winner
  private isConflictingConcert(concertId: string): boolean {
    if (!this.selectedConcerts[concertId] || this.winnerConcerts[concertId]) {
      return false;
    }

    // Find the concert object
    const selectedConcert = this.concertData.find((c) => c.id === concertId);
    if (!selectedConcert) {
      return false;
    }

    // Check if this non-winner conflicts with any winner
    return this.userSelections.some(
      (winner) =>
        this.winnerIds.has(winner.id) &&
        this.itineraryService.checkConflict(selectedConcert, winner)
    );
  }

  // Debug method to log counts
  logCurrentCounts(): void {
    console.log('Selected Concerts Count:', this.selectedConcertsCount);
    console.log('Winner Concerts Count:', this.winnerConcertsCount);
    console.log('Winner IDs Set Size:', this.winnerIds.size);
    console.log('Conflict Concerts Count:', this.conflictConcertsCount);
    console.log('Winner IDs:', Array.from(this.winnerIds));
  }
}
