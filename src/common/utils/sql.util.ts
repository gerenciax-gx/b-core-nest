/**
 * Escapes special LIKE/ILIKE wildcards (%, _, \) so user input is treated as literal text.
 */
export function escapeLikePattern(search: string): string {
  return search.replace(/[%_\\]/g, '\\$&');
}
