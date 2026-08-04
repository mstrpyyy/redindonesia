// True once a maxLength-bearing field's value has reached that length —
// `maxLength` on the input already blocks typing past it, this just says so.
export function isAtCharLimit(value: unknown, maxLength: number | undefined): boolean {
  return typeof value === "string" && maxLength !== undefined && value.length >= maxLength;
}

export function CharLimitWarning({ maxLength }: { maxLength: number }) {
  return <p className="text-destructive text-xs">Character limit reached ({maxLength}).</p>;
}
