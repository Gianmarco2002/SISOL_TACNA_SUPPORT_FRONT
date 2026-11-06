import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, first, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { AdminService } from '../../services/admin-service';
import { AdminSseService } from '../../services/admin-sse-service';
import { StateTicketService } from '../../../../core/services/state-ticket-service';
import { AdminTicket } from '../../models/admin-ticket.model';
import { StateTicket } from '../../../../core/models/stateTicket.model';
import { TicketCard } from '../../components/ticket-card/ticket-card';

interface Column {
  state: StateTicket;
  tickets: AdminTicket[];
}

@Component({
  selector: 'app-admin-board',
  imports: [
    DragDropModule,
    CdkScrollable,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    TicketCard,
  ],
  templateUrl: './admin-board.html',
  styleUrl: './admin-board.css',
})
export default class AdminBoard implements OnInit {
  private adminService = inject(AdminService);
  private stateService = inject(StateTicketService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private adminSseService = inject(AdminSseService);

  @ViewChild('searchInputRef') private searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly statesReady$ = toObservable(this.stateService.loading).pipe(
    filter((loading) => !loading),
    first(),
  );

  loading = signal(true);
  error = signal(false);
  cleaning = signal<string | null>(null);
  searchOpen = signal(false);
  searchQuery = signal('');
  searchInput = signal('');
  columns: Column[] = [];

  get filteredColumns(): Column[] {
    const q = this.searchQuery().trim();
    if (!q) return this.columns;
    const id = Number(q);
    if (isNaN(id)) return this.columns;
    return this.columns.map((col) => ({
      ...col,
      tickets: col.tickets.filter((t) => t.id === id),
    }));
  }

  get columnIds(): string[] {
    return this.columns.map((c) => `col-${c.state.id}`);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!this.searchOpen()) this.openSearch();
    }
    if (event.key === 'Escape' && this.searchOpen()) {
      this.closeSearch();
    }
  }

  openSearch(): void {
    this.searchInput.set(this.searchQuery());
    this.searchOpen.set(true);
    setTimeout(() => this.searchInputRef?.nativeElement.focus(), 0);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  applySearch(): void {
    this.searchQuery.set(this.searchInput().trim());
    this.searchOpen.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput.set('');
  }

  ngOnInit() {
    this.loadBoard();
    this.adminSseService.connect();
    this.adminSseService.newTicket$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ticket) => {
      const col = this.columns.find((c) => c.state.id === ticket.state_id);
      if (!col || col.tickets.some((t) => t.id === ticket.id)) return;
      col.tickets.unshift(ticket);
      this.cdr.detectChanges();
    });
    this.adminSseService.deletedTicketId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ticketId) => {
      for (const col of this.columns) {
        const idx = col.tickets.findIndex((t) => t.id === ticketId);
        if (idx !== -1) { col.tickets.splice(idx, 1); this.cdr.detectChanges(); break; }
      }
    });
  }

  loadBoard() {
    this.loading.set(true);
    this.error.set(false);

    this.statesReady$
      .pipe(
        switchMap(() => this.adminService.getAllTickets()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tickets) => {
          const states = this.stateService
            .getAll()
            .filter((s) => s.is_active)
            .sort((a, b) => {
              if (a.flow_order === null && b.flow_order === null) return 0;
              if (a.flow_order === null) return 1;
              if (b.flow_order === null) return -1;
              return a.flow_order - b.flow_order;
            });

          this.columns = states.map((state) => ({
            state,
            tickets: tickets.filter((t) => t.state_id === state.id),
          }));

          this.loading.set(false);
          this.cdr.detectChanges();
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  onDrop(event: CdkDragDrop<AdminTicket[]>, targetCol: Column) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const ticket = event.previousContainer.data[event.previousIndex];
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      ticket.state_id = targetCol.state.id;
      ticket.state = targetCol.state;
      this.adminService.updateTicketState(ticket.id, targetCol.state.id).subscribe({
        error: () => this.loadBoard(),
      });
    }
  }

  openDetail(ticket: AdminTicket) {
    this.router.navigate(['admin/ticket', ticket.id]);
  }

  cleanByState(code: string, label: string) {
    const confirmed = window.confirm(
      `¿Eliminar todos los tickets con estado "${label}"?\nEsta acción es permanente y no se puede deshacer.`,
    );
    if (!confirmed) return;

    this.cleaning.set(code);
    this.adminService.cleanTicketsByState(code).subscribe({
      next: ({ deleted }) => {
        this.cleaning.set(null);
        if (deleted > 0) this.loadBoard();
      },
      error: () => this.cleaning.set(null),
    });
  }

  goToUsers() {
    this.router.navigate(['/admin/usuarios']);
  }

  logout() {
    localStorage.removeItem('admin_key');
    this.adminSseService.disconnect();
    this.router.navigate(['/admin/verify']);
  }
}
