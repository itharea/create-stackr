/**
 * Convert a kebab-case service name to PascalCase for use in
 * `has<Cap>Account` identifiers.
 *
 *   "wallet"     → "Wallet"
 *   "my-service" → "MyService"
 */
export function capitalizeServiceName(name: string): string {
  return name
    .split('-')
    .filter((seg) => seg.length > 0)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('');
}

/**
 * `wallet` → `wallet`, `my-service` → `my_service`. Matches the snake_case
 * column name the drizzle schema template emits for `has_<x>_account`.
 */
export function snakeServiceName(name: string): string {
  return name.replace(/-/g, '_');
}
