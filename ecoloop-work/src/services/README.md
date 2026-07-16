# src/services/

This folder will hold one file per feature area — the functions that
actually talk to Supabase (fetch pickups, create a pickup, update a
wallet balance, etc.).

Example of what will live here soon:
- `pickupService.ts`   — getPickups(), createPickup(), updatePickupStatus()
- `authService.ts`     — signUp(), signIn(), signOut()
- `walletService.ts`   — getTransactions(), withdrawFunds()

Why a separate folder instead of calling Supabase directly inside
components? So that if we ever need to change *how* data is fetched,
we only edit one small file instead of hunting through every screen.

This folder is currently empty on purpose — it will be filled in
module by module (Module 4 onward), starting with `authService.ts`.
