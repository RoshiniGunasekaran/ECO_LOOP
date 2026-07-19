# MODULE 10 — COMMUNITY — IMPLEMENTATION GUIDE

## 1. Overview

Module 9 left the Community Explorer tab explicitly untouched, running entirely on
the mock `diyProjects` array from `data.ts` / `DatabaseContext.tsx`. Both
`module9_diy_schema.sql` and `diyService.ts` say so directly:

> "The read-only 'Community' showcase tab (browsing OTHER customers' approved
> projects, liking, commenting) is UNTOUCHED by this module and still runs
> on mock data — that's Module 10 (Community)'s job, not this one's."

Module 10 wires that tab to real Supabase data and implements all 8 tasks on
the roadmap:

| Task | Requirement | Status |
|---|---|---|
| 10.1 | Community feed | ✅ Real Approved `diy_projects`, newest first |
| 10.2 | Search | ✅ Client-side, over name/description/materials/author |
| 10.3 | Filter | ✅ Client-side, by material tag |
| 10.4 | Like | ✅ Real toggle via `diy_project_likes`, counter kept in sync by a DB trigger |
| 10.5 | Comment | ✅ Real reads/writes to `diy_project_comments` |
| 10.6 | Share | ✅ Web Share API with clipboard-copy fallback (no schema needed) |
| 10.7 | Save | ✅ New `diy_project_saves` table — private per-user bookmarks |
| 10.8 | Report | ✅ New `diy_project_reports` table — owner-write, owner/admin-read |

No other Customer Module tab, and no Admin/Partner/Industry module, is touched.

## 2. What Module 10 Adds

- Real author names on the Community feed, via a new `diy_projects.customer_display_name`
  column that's auto-populated by a database trigger the moment a DIY project is
  inserted (Module 9's `diyService.ts` needed **zero** code changes for this).
- Real, working RLS policies on `diy_project_comments` and `diy_project_likes` —
  both tables existed since Module 3 with RLS **enabled but zero policies**
  (default-deny), so nothing could read or write them until now.
- A trigger that keeps `diy_projects.likes` (a static counter column since
  Module 3) accurate against real like/unlike actions, replacing the old
  mock's "+1 forever, resets on refresh" behavior.
- Two brand-new tables the original schema never anticipated: `diy_project_saves`
  (bookmarks) and `diy_project_reports` (moderation reports).
- A new `communityService.ts` + `useCommunity.ts` pair (same pattern as every
  other module) and a fully rebuilt Community Explorer tab in `CustomerModule.tsx`.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module10_community_schema.sql` | RLS policies for comments/likes, likes-sync trigger, author-name trigger, 2 new tables |
| `src/services/communityService.ts` | Every real Supabase read/write for the Community tab |
| `src/hooks/useCommunity.ts` | Loads the feed, exposes like/save/comment/report actions |
| `docs/MODULE_10_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_10_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

Only one file: `src/components/CustomerModule.tsx`. Every change below is an
exact find → replace against the Module 9 version of that file.

### 4.1 — Imports

**Find:**
```tsx
import { useCustomerDIY } from '../hooks/useCustomerDIY';
```
**Replace:**
```tsx
import { useCustomerDIY } from '../hooks/useCustomerDIY';
import { useCommunity } from '../hooks/useCommunity';
import type { ReportReason } from '../services/communityService';
```

**Find:**
```tsx
import { 
   CustomerItem, PickupRequest, DIYProject, Transaction, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PICKUP_REQUESTS, INITIAL_DIY_PROJECTS, 
  INITIAL_TRANSACTIONS, INITIAL_REWARD_PRODUCTS, INITIAL_NOTIFICATIONS, 
  WASTE_SUBCATEGORIES, INITIAL_PRICING_RATES, INITIAL_SAVED_ADDRESSES, INITIAL_SUPPORT_TICKETS, INITIAL_FEEDBACKS
} from '../data';
```
**Replace:**
```tsx
import { 
   CustomerItem, PickupRequest, Transaction, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PICKUP_REQUESTS, 
  INITIAL_TRANSACTIONS, INITIAL_REWARD_PRODUCTS, INITIAL_NOTIFICATIONS, 
  WASTE_SUBCATEGORIES, INITIAL_PRICING_RATES, INITIAL_SAVED_ADDRESSES, INITIAL_SUPPORT_TICKETS, INITIAL_FEEDBACKS
} from '../data';
```
> `DIYProject` and `INITIAL_DIY_PROJECTS` are removed because the Community
> tab no longer touches the mock shape — the real `CommunityProject` type
> from `communityService.ts` replaces it everywhere in this tab.

**Find:**
```tsx
  Trophy, Lock, Pencil
} from 'lucide-react';
```
**Replace:**
```tsx
  Trophy, Lock, Pencil, Bookmark, Flag
} from 'lucide-react';
```

### 4.2 — Remove the mock `diyProjects` from DatabaseContext destructure

**Find:**
```tsx
    customer, setCustomer,
    pickups, setPickups,
    diyProjects, setDiyProjects,
    transactions, setTransactions,
```
**Replace:**
```tsx
    customer, setCustomer,
    pickups, setPickups,
    transactions, setTransactions,
```
> `diyProjects` / `setDiyProjects` stay exported from `DatabaseContext.tsx`
> unchanged — `AdminModule.tsx`'s DIY Auditing screen (Module 23's future
> job, not this one's) still reads them. This is the only file where the
> mock array is no longer used.

### 4.3 — Add the `useCommunity()` hook, right after `useCustomerDIY()`

**Find:**
```tsx
  const {
    loading: dyLoading,
    myProjects: dyMyProjects,
    submitting: dySubmitting,
    createProject: dyCreateProject,
    updateProject: dyUpdateProject,
    deleteProject: dyDeleteProject,
  } = useCustomerDIY();
```
**Replace:**
```tsx
  const {
    loading: dyLoading,
    myProjects: dyMyProjects,
    submitting: dySubmitting,
    createProject: dyCreateProject,
    updateProject: dyUpdateProject,
    deleteProject: dyDeleteProject,
  } = useCustomerDIY();

  // Module 10 (Community) — REAL Supabase-backed data. Prefixed with "cm"
  // so it never collides with anything else. This fully replaces the mock
  // `diyProjects` array (and its handleLikeDIY/handleAddComment handlers)
  // that the Community Explorer tab used to run on — the tab now only
  // shows OTHER customers' real Approved DIY projects, with real
  // like/save/comment/report actions.
  const {
    loading: cmLoading,
    feed: cmFeed,
    refresh: cmRefresh,
    toggleLike: cmToggleLike,
    toggleSave: cmToggleSave,
    commentsByProject: cmCommentsByProject,
    commentsLoading: cmCommentsLoading,
    loadComments: cmLoadComments,
    postingComment: cmPostingComment,
    addComment: cmAddComment,
    reporting: cmReporting,
    reportProject: cmReportProject,
  } = useCommunity();
```

### 4.4 — Replace comment-draft state with full Module 10 UI state

**Find:**
```tsx
  // New Comment State for DIY Community Explorer
  const [newComment, setNewComment] = useState<Record<string, string>>({});
```
**Replace:**
```tsx
  // Module 10 (Community) UI state — search/filter/sort run client-side
  // over the real `cmFeed` (tasks 10.2/10.3); comment drafting, which
  // project's comment thread is expanded, and the Report modal.
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityMaterialFilter, setCommunityMaterialFilter] = useState<string>('All');
  const [communitySort, setCommunitySort] = useState<'newest' | 'most-liked' | 'most-discussed'>('newest');
  const [expandedCommentsId, setExpandedCommentsId] = useState<number | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<number | null>(null);
  const [reportModalProjectId, setReportModalProjectId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('Inappropriate Content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
```
> Note the key type change: `Record<string, string>` → `Record<number, string>`.
> The mock `DIYProject.id` was a string (`'diy-1'`); the real `diy_projects.id`
> is a Postgres `bigint` (JS `number`). Every `proj.id` reference in this tab
> now correctly types as `number`.

### 4.5 — Replace the mock `handleLikeDIY` / `handleAddComment` with real handlers

**Find:**
```tsx
  const handleLikeDIY = (diyId: string) => {
    setDiyProjects(diyProjects.map(proj => 
      proj.id === diyId ? { ...proj, likes: proj.likes + 1 } : proj
    ));
  };

  const handleAddComment = (diyId: string) => {
    const text = newComment[diyId];
    if (!text || !text.trim()) return;

    setDiyProjects(diyProjects.map(proj => {
      if (proj.id === diyId) {
        return {
          ...proj,
          comments: [
            ...proj.comments,
            {
              id: `com-${Math.random()}`,
              userName: customer.name,
              text: text,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return proj;
    }));

```
**Replace:**
```tsx
  // Module 10 (Community) — real handlers wired to useCommunity().
  const handleLikeDIY = (projectId: number) => {
    cmToggleLike(projectId);
  };

  const handleToggleCommentsFor = (projectId: number) => {
    const opening = expandedCommentsId !== projectId;
    setExpandedCommentsId(opening ? projectId : null);
    if (opening && !cmCommentsByProject[projectId]) {
      cmLoadComments(projectId);
    }
  };

  const handleAddComment = async (projectId: number) => {
    const text = newComment[projectId];
    if (!text || !text.trim()) return;
    const ok = await cmAddComment(projectId, text);
    if (ok) setNewComment({ ...newComment, [projectId]: '' });
  };

  const handleToggleSave = (projectId: number) => {
    cmToggleSave(projectId);
  };

  const handleShareProject = async (project: (typeof cmFeed)[number]) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?community_project=${project.id}`;
    const shareData = { title: project.projectName, text: `Check out "${project.projectName}" on EcoLoop's Community Showcase!`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled the native share sheet — fall through to clipboard copy
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareId(project.id);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch {
      // clipboard blocked (e.g. insecure context) — silently no-op, nothing to recover from here
    }
  };

  const handleOpenReport = (projectId: number) => {
    setReportModalProjectId(projectId);
    setReportReason('Inappropriate Content');
    setReportDetails('');
    setReportSuccess(false);
  };

  const handleSubmitReport = async () => {
    if (reportModalProjectId === null) return;
    const ok = await cmReportProject(reportModalProjectId, reportReason, reportDetails);
    if (ok) {
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalProjectId(null);
        setReportSuccess(false);
      }, 1500);
    }
  };

  // Tasks 10.2 (Search) + 10.3 (Filter) + sort — all run client-side over
  // the real feed already loaded by useCommunity(), same pattern as My
  // Pickup Requests' search/filter/sort in Module 6.
  const communityMaterials = Array.from(new Set(cmFeed.flatMap((p) => p.materialsUsed))).sort();

  const filteredCommunityFeed = cmFeed
    .filter((p) => {
      if (communityMaterialFilter !== 'All' && !p.materialsUsed.includes(communityMaterialFilter)) return false;
      if (!communitySearch.trim()) return true;
      const q = communitySearch.trim().toLowerCase();
      return (
        p.projectName.toLowerCase().includes(q) ||
        p.projectDescription.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.materialsUsed.some((m) => m.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (communitySort === 'most-liked') return b.likes - a.likes;
      if (communitySort === 'most-discussed') return b.commentCount - a.commentCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

```

### 4.6 — Replace the Community Explorer tab's JSX

The entire `{activeTab === 'community' && (...)}` block (previously ~85
lines rendering `diyProjects.map(...)`) is replaced with the real version:
a search box + material filter + sort dropdown, an empty state, a "no
results" state, and a grid of cards. Each card now has 4 real action
buttons (Like, Comments-toggle, Save, Share) plus a Report flag icon, and
its comment thread lazy-loads on first expand. A Report modal renders at
the bottom of the tab.

The full before/after is large (see the file itself); the key content
differences, mapped 1:1 to the roadmap's tasks, are:

- **10.1 Feed**: `diyProjects.map(...)` → `filteredCommunityFeed.map(...)`, reading `CommunityProject` fields (`authorName`, `commentCount`, `isLikedByMe`, `isSavedByMe`) instead of the mock `DIYProject` shape (`customerName`, `comments.length`).
- **10.2/10.3 Search/Filter**: new search input + material `<select>` + sort `<select>` above the grid.
- **10.4 Like**: the Like button now shows filled/brand-colored state when `proj.isLikedByMe`, and calls `handleLikeDIY` (real toggle) instead of the old always-increment mock.
- **10.5 Comment**: comments are no longer always rendered — clicking **Comments (N)** lazy-loads and expands a real thread via `cmLoadComments`; the "Add" button now calls the async `handleAddComment` and disables while `cmPostingComment`.
- **10.6 Share**: new Share button — `handleShareProject` uses the Web Share API when available, else copies a link and shows "Link copied!" for 2s.
- **10.7 Save**: new Save/Bookmark button, filled amber when `proj.isSavedByMe`.
- **10.8 Report**: new flag icon opens a modal (reason dropdown + optional details textarea) that calls `handleSubmitReport`.

Full replacement source is in `src/components/CustomerModule.tsx` — see
the `{activeTab === 'community' && (...)}` block.

## 5. New Component

No new top-level component file — the rebuilt Community tab lives inline
in `CustomerModule.tsx`, matching the pattern of every other tab in this
component (Dashboard, Pickups, Wallet, Rewards, DIY are all inline too).
A small inline "Report" modal is the only new UI surface, also inline.

## 6. New Hook

`src/hooks/useCommunity.ts` — loads the feed on mount, and exposes:
- `toggleLike(projectId)` / `toggleSave(projectId)` — **optimistic**: the UI
  updates instantly, then rolls back only if the Supabase write fails.
- `loadComments(projectId)` — lazy per-project fetch, tracked in
  `commentsLoading` / `commentsByProject` maps keyed by project id.
- `addComment(projectId, text)` — posts, then appends to local state and
  bumps that project's `commentCount` without a full refetch.
- `reportProject(projectId, reason, details)`.

## 7. New Service

`src/services/communityService.ts` — every Supabase call:
- `getCommunityFeed(userId)` — 4 parallel-ish reads: the Approved projects,
  the caller's own likes (for `isLikedByMe`), the caller's own saves (for
  `isSavedByMe`), and every comment row's `project_id` for the visible
  projects (grouped client-side into `commentCount`, since Supabase's
  JS client doesn't support `GROUP BY` without an RPC).
- `getComments(projectId)`, `addComment(...)`, `setLiked(...)`,
  `setSaved(...)`, `reportProject(...)`.

## 8. New Types

Defined in `communityService.ts` (not `types.ts`, matching how Module 9's
`RealDIYProject` also lives in its own service file rather than the shared
`types.ts`):
- `CommunityProject` — id, customerId, authorName, projectName,
  projectDescription, materialsUsed, beforeImage, afterImage, likes,
  commentCount, isLikedByMe, isSavedByMe, createdAt.
- `CommunityComment` — id, projectId, userId, userName, text, createdAt.
- `ReportReason` — the 5 allowed report reasons (matches the SQL `check` constraint).

## 9. SQL Changes

New file: `supabase/module10_community_schema.sql`. Summary (full file has
inline rationale for every statement):
1. `diy_projects.customer_display_name` — new column + `before insert`
   trigger that stamps it from `profiles.display_code`/`full_name`, so the
   feed never needs to read another customer's `profiles` row directly.
2. `diy_project_likes` — 3 new RLS policies (select own, insert own on
   Approved, delete own) + an `after insert or delete` trigger that keeps
   `diy_projects.likes` accurate.
3. `diy_project_comments` — 3 new RLS policies (select if project visible,
   insert own on Approved, delete own/admin).
4. `diy_project_saves` — brand-new table + single owner-only policy.
5. `diy_project_reports` — brand-new table + insert-own / select-own-or-admin policies.

## 10. Supabase Storage Changes

None. Community reads the same `before_image` / `after_image` URLs Module 9
already wrote into `diy-photos` — no new bucket, no new storage policy.

## 11. RLS Policy Changes

Covered in full in Section 9 / the SQL file itself. The important
before/after: `diy_project_comments` and `diy_project_likes` had RLS
**enabled with zero policies** since Module 3 (meaning: completely
inaccessible, not even to their own owner) — Module 10 is what actually
makes them usable for the first time.

## 12. Import Changes / State Changes / Functions / UI Modifications

All covered in Section 4's find → replace blocks above.

## 13. Community Feed Implementation

`getCommunityFeed()` reads `diy_projects` filtered to `status = 'Approved'`
(the same RLS-backed filter Module 3's `diy_public_view_approved` policy
already enforced), ordered newest-first. It then does 3 more reads scoped
to just the visible project ids: the caller's own likes, the caller's own
saves, and every comment's `project_id` (to compute counts client-side).
The feed intentionally never fetches other customers' `profiles` rows —
`customer_display_name` is already denormalized onto `diy_projects` by the
Section 9 trigger.

## 14. Like System Implementation

Like/unlike is a real row insert/delete into `diy_project_likes`
(`primary key (project_id, user_id)` prevents double-likes at the database
level even if the UI's optimistic-update logic somehow fired twice). The
displayed count always comes from `diy_projects.likes`, which a database
trigger keeps in sync — the frontend never does count arithmetic that could
drift from reality.

## 15. Comment System Implementation

Comments are inserted with the commenter's `user_name` denormalized onto
the row (same pattern Module 3 originally chose for `diy_project_comments`),
so reading a project's comments never needs to join back to `profiles`.
RLS restricts inserts to the authenticated user's own `user_id` and to
Approved projects only.

## 16. Project Approval Integration

The Community feed is a pure read of Module 9's `diy_projects.status`
column. Nothing in Module 10 can approve or reject a project — that
remains Module 23 (Admin → Reward Management)'s job. Once Module 23 sets a
project's status to `'Approved'` (currently only possible via Supabase's
Table Editor, exactly like Module 9 documented), it appears in the
Community feed on next load/refresh, with zero code changes required here.

## 17. Verification Section

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

Expected: `npx tsc --noEmit` → 0 errors. `npm run build` → succeeds (only
the pre-existing chunk-size warning, unrelated to this module, may appear).
Modules 1–9 unaffected — the only file touched outside of new files is
`CustomerModule.tsx`, and only its Community tab, its `diyProjects`
destructure line, and its imports changed.

---

## Final Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module10_community_schema.sql` | RLS + triggers + 2 new tables for Community |
| `src/services/communityService.ts` | Real Supabase reads/writes for the Community tab |
| `src/hooks/useCommunity.ts` | Feed loading + like/save/comment/report actions |
| `docs/MODULE_10_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_10_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/components/CustomerModule.tsx` | Community Explorer tab rewired to real data; mock `diyProjects` destructure, `handleLikeDIY`/`handleAddComment`, and the tab's JSX all replaced (see Section 4 for exact find/replace blocks) |

### SQL Files
- `supabase/module10_community_schema.sql` — run this once, after `module9_diy_schema.sql`, in Supabase's SQL Editor.

### Storage Changes
None.

### Environment Variable Changes
None.

### Commands
```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

### Completion Report

**Features completed:** all 8 Module 10 tasks (10.1–10.8) per the table in Section 1.

**Pending / explicitly out of scope for Module 10:**
- Admin moderation of reports (reviewing/dismissing rows in `diy_project_reports`) — belongs to a future Module 23-style admin screen; reports are captured safely but nothing surfaces them in the Admin Module yet.
- Deleting/editing your own comment from the UI — the RLS policy allows it (`diy_comments_delete_own_or_admin`), but no delete button was added to the UI this round, since "Delete comment" isn't one of the roadmap's 8 tasks.
- A dedicated "My Saved Crafts" view of `diy_project_saves` — the Save/bookmark action and its table are fully wired, but no separate screen lists them yet (out of scope: the roadmap's task 10.7 is "Save," not "view saved list").

**Next module:** Module 11 — Customer Profile.
