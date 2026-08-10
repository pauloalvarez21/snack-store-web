import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Address, CreateAddressDto, UpdateAddressDto } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);

  /** Direcciones de envío del usuario autenticado (la principal primero). */
  findAll(): Observable<Address[]> {
    return this.http.get<Address[]>(`${environment.apiUrl}/api/addresses`);
  }

  /** Crea una dirección; la primera del usuario se vuelve la principal. */
  create(dto: CreateAddressDto): Observable<Address> {
    return this.http.post<Address>(`${environment.apiUrl}/api/addresses`, dto);
  }

  update(id: string, dto: UpdateAddressDto): Observable<Address> {
    return this.http.patch<Address>(`${environment.apiUrl}/api/addresses/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/addresses/${id}`);
  }
}
