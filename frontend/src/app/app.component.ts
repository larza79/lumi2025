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
      return {
        ...concert,
        id: `concert-${index}`,
      } as Concert;
    });

    this.uniqueDays = this.getUniqueValues('day').sort(
      (a, b) => this.dayOrder.indexOf(a) - this.dayOrder.indexOf(b)
    );
    this.uniqueStages = this.getUniqueValues('stage');

    // Set total concerts count in service
    this.itineraryService.setTotalConcerts(this.concertData.length);
  }

  private subscribeToConcertData() {
    // Subscribe to user selections from the itinerary service
    this.itineraryService.userSelections$.subscribe((selections) => {
      this.userSelections = selections;
      this.showClearPlanBtn = selections.length > 0;
      this.applyFiltersAndRender();
    });

    // Subscribe to winner IDs
    this.itineraryService.winnerIds$.subscribe((ids) => {
      this.winnerIds = ids;
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
  getDuration(start: string, end: string): number {
    return this.timeToMinutes(end) - this.timeToMinutes(start);
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

  // Concert operations - delegated to service
  onAddConcert(concert: Concert): void {
    this.itineraryService.addConcert(concert);
  }

  onPriorityClick(concert: Concert, priority: number): void {
    if (this.itineraryService.isConcertSelected(concert.id)) {
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

  // Helper methods delegated to service
  isConcertSelected(concertId: string): boolean {
    return this.itineraryService.isConcertSelected(concertId);
  }

  isConcertWinner(concertId: string): boolean {
    return this.itineraryService.isConcertWinner(concertId);
  }

  getConcertPriority(concertId: string): number | null {
    return this.itineraryService.getConcertPriority(concertId);
  }

  isDaySelected(day: string): boolean {
    return (
      this.concertsByDay[day]?.some(
        (concert) =>
          this.itineraryService.isConcertSelected(concert.id) &&
          this.itineraryService.isConcertWinner(concert.id)
      ) || false
    );
  }

  isDayConflicted(day: string): boolean {
    return (
      this.concertsByDay[day]?.some(
        (concert) =>
          this.itineraryService.isConcertSelected(concert.id) &&
          !this.itineraryService.isConcertWinner(concert.id)
      ) || false
    );
  }

  // Badge count methods
  getSelectedConcertsCount(): number {
    return this.userSelections.length;
  }

  getWinnerConcertsCount(): number {
    return this.winnerIds.size;
  }

  getConflictConcertsCount(): number {
    return this.userSelections.length - this.winnerIds.size;
  }
}
