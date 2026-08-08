export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
}
