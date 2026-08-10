export interface Address {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  deliveryNotes: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressDto {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  deliveryNotes?: string;
  isDefault?: boolean;
}

export type UpdateAddressDto = Partial<CreateAddressDto>;
