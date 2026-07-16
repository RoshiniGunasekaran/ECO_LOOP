# src/constants/

This folder will hold fixed, unchanging lists/values shared across the
app — things that used to live inside `src/data.ts` as "starter sample
data" but are really more like fixed app configuration.

Example of what will live here soon:
- `wasteCategories.ts`  — the official list of waste categories & subcategories
- `pickupStatuses.ts`   — the official list of pickup status stages
- `roles.ts`            — the official list of user roles

This folder is currently empty on purpose — it will be filled in as we
migrate each piece of `data.ts` from "fake sample data" to "real
Supabase data" module by module.
