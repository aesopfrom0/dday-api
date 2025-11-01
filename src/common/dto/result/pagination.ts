export class PaginationResult<T> {
  items: T[];
  pagination: {
    totalCount: number;
    skip: number;
    take: number;
    currentPage: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
