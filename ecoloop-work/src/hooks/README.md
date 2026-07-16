# src/hooks/

This folder will hold custom "hooks" — small reusable pieces of logic
that components can plug into.

Example of what will live here soon:
- `useAuth.ts`      — know who's currently logged in, anywhere in the app
- `usePickups.ts`   — load + auto-refresh the current user's pickups
- `useRealtime.ts`  — subscribe to live database changes (e.g. a driver
                      accepting your pickup updates your screen instantly,
                      without you refreshing the page)

This folder is currently empty on purpose — it will be filled in
module by module, starting with `useAuth.ts` in Module 4 (Authentication).
