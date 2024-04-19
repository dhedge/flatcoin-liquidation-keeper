class ColumnBigNumberTransformer {
  to(data?: bigint): string {
    return data?.toString();
  }

  from(data?: string): bigint {
    return data ? BigInt(data) : null;
  }
}

export const bigNumberTransformer = new ColumnBigNumberTransformer();

class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }

  from(data: string): number {
    return parseFloat(data);
  }
}

export const numericTransformer = new ColumnNumericTransformer();
