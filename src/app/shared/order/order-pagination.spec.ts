import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderPagination } from './order-pagination';

describe('OrderPagination', () => {
  let fixture: ComponentFixture<OrderPagination>;
  let component: OrderPagination;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OrderPagination] }).compileComponents();
    fixture = TestBed.createComponent(OrderPagination);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 5);
    fixture.detectChanges();
  });

  function setPage(page: number): void {
    fixture.componentRef.setInput('page', page);
    fixture.detectChanges();
  }

  function setTotalPages(totalPages: number): void {
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
  }

  function pageNumbers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.page-btn.number')).map((b) =>
      (b as HTMLElement).textContent?.trim() ?? ''
    );
  }

  function pageButton(number: string): HTMLButtonElement {
    const btn = Array.from(fixture.nativeElement.querySelectorAll('.page-btn.number')).find(
      (b) => (b as HTMLElement).textContent?.trim() === number
    ) as HTMLButtonElement | undefined;
    if (!btn) throw new Error(`Botón de página ${number} no encontrado`);
    return btn;
  }

  function navButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.page-btn')) as HTMLButtonElement[];
  }

  it('does not render when there is a single page', () => {
    setTotalPages(1);
    expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
  });

  it('renders the page window with the given aria label', () => {
    fixture.componentRef.setInput('label', 'Paginación de prueba');
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav.pagination');
    expect(nav?.getAttribute('aria-label')).toBe('Paginación de prueba');
    expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('clamps the window at the start', () => {
    setTotalPages(10);
    setPage(1);
    expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('clamps the window at the end', () => {
    setTotalPages(10);
    setPage(9);
    expect(pageNumbers()).toEqual(['6', '7', '8', '9', '10']);
  });

  it('centers the window around the current page', () => {
    setTotalPages(20);
    setPage(5);
    expect(pageNumbers()).toEqual(['3', '4', '5', '6', '7']);
  });

  it('disables prev on the first page and next on the last', () => {
    setTotalPages(3);
    setPage(1);
    const [prev, , , , next] = navButtons();
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    setPage(3);
    const buttons = navButtons();
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[buttons.length - 1].disabled).toBe(true);
  });

  it('marks the current page as active', () => {
    setTotalPages(5);
    setPage(3);
    expect(pageButton('3').classList.contains('active')).toBe(true);
    expect(pageButton('1').classList.contains('active')).toBe(false);
  });

  it('emits the page change when clicking a page number', () => {
    setTotalPages(5);
    setPage(2);
    let emitted: number | null = null;
    component.pageChange.subscribe((p) => (emitted = p));

    pageButton('4').click();
    expect(emitted).toBe(4);
  });

  it('navigates with the prev and next buttons', () => {
    setTotalPages(5);
    setPage(2);
    let emitted: number | null = null;
    component.pageChange.subscribe((p) => (emitted = p));

    const [prev, , , , , , next] = navButtons();
    prev.click();
    expect(emitted).toBe(1);
    next.click();
    expect(emitted).toBe(3);
  });

  it('ignores clicks on the current page', () => {
    setTotalPages(5);
    setPage(2);
    let emitted: number | null = null;
    component.pageChange.subscribe((p) => (emitted = p));

    pageButton('2').click();
    expect(emitted).toBeNull();
  });
});
