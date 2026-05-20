# Mobile App-Like Overhaul — Design Spec
**Date:** 2026-05-20  
**Project:** Space Link CRM  
**Approach:** B — Component mobile overhaul (desktop unchanged)

---

## Goal

Transform the mobile experience from a responsive website into something that feels like a native iOS/Android CRM app. Desktop layout untouched.

---

## 1. Navigation: Bottom Tab Bar

### Component: `src/components/MobileNavBar.jsx` + `MobileNavBar.css`

- Visible only at `≤768px`. Sidebar hidden on mobile entirely.
- Fixed to bottom. `padding-bottom: env(safe-area-inset-bottom)` for iPhone home indicator.
- Center tab: oversized gold FAB button. Tapping opens Add Lead bottom sheet — does not navigate.
- Active tab: icon animates up + gold dot indicator below.

**Tab sets by role:**
- Admin: Dashboard | Leads | [+] | Team
- Sales / Receptionist: Leads | [+] | Walk-In

### Mobile Header: `src/components/MobileHeader.jsx` + `MobileHeader.css`

- Thin fixed top bar (replaces sidebar brand on mobile).
- Left: "SPACE LINK" wordmark. Right: profile avatar → taps to popover (user name, role, logout).
- Search icon expands inline search bar when tapped.

### Layout changes

- `index.html`: add `viewport-fit=cover` to viewport meta.
- `src/App.jsx`: render `MobileHeader` + `MobileNavBar` on mobile; hide `Sidebar` on mobile.
- `src/App.css`: mobile main content fills width between top bar and bottom nav. No left margin on mobile.

---

## 2. Lead List: Full-Screen Card Stack

### Component: `src/components/MobileLeadStack.jsx` + `MobileLeadStack.css`

Renders only at `≤768px` inside `LeadList`. Desktop table view unchanged.

**Card behaviour:**
- `scroll-snap-type: y mandatory`. Each card snaps to fill the viewport.
- Card height: `calc(100dvh - mobile-header-height - bottom-nav-height)`.
- Pull-to-refresh: drag down past top card → API reload with spinner.
- Position counter: "3 of 47" top-right so user knows scroll position.

**Card anatomy (top → bottom):**
1. Status badge + source chip
2. Lead name (large, bold)
3. Phone + alternate phone (tap opens dialer)
4. Property details: type | BHK | location
5. Assigned agent + date added
6. Action strip: Call | WhatsApp | View Details →

**Search / filter:**
- Sticky search bar above card area (same search logic as current LeadList).
- Filter button opens a BottomSheet with filter controls.
- Empty/hero state: centered prompt card.

---

## 3. Add Lead: Bottom Sheet

### Component: `src/components/BottomSheet.jsx` + `BottomSheet.css`

Reusable — not tied to Add Lead specifically.

**Behaviour:**
- Slides up from bottom: `cubic-bezier(0.34, 1.56, 0.64, 1)` spring.
- Drag handle at top center. Drag down ≥120px → dismisses with snap-back.
- Tap backdrop → dismiss.
- Height variants: short (40vh), tall (85vh), full (95vh).
- Traps focus inside.

**Add Lead flow:**
- Center [+] tab tap → BottomSheet (tall) with add-lead form.
- Form scrollable inside sheet. Fields/logic reused from `LeadCreate`.
- Submit button fixed at bottom of sheet (always visible).
- On success: sheet closes, card stack refreshes, toast "Lead added".
- Desktop: `/leads/new` page unchanged.

---

## 4. App-Like Polish (applied globally on mobile)

| Detail | Implementation |
|---|---|
| Touch targets | Min 44px height on all interactive elements |
| Press feedback | `transform: scale(0.97)` on `:active`, 100ms ease-out |
| Page transitions | Forward navigations (tab tap, card "View Details") slide in from right; browser back slides out to right. CSS-only via `@keyframes`. |
| Momentum scroll | `-webkit-overflow-scrolling: touch` on scroll containers |
| Safe areas | `env(safe-area-inset-*)` on header, bottom nav, bottom sheet |
| Lead Detail | Back chevron, floating Call + WhatsApp buttons, sections as cards |

---

## 5. Files Created / Modified

### New files
- `src/components/MobileNavBar.jsx`
- `src/components/MobileNavBar.css`
- `src/components/MobileHeader.jsx`
- `src/components/MobileHeader.css`
- `src/components/BottomSheet.jsx`
- `src/components/BottomSheet.css`
- `src/components/MobileLeadStack.jsx`
- `src/components/MobileLeadStack.css`

### Modified files
- `index.html` — viewport-fit=cover
- `src/App.jsx` — MobileHeader + MobileNavBar integration, sidebar hide on mobile, bottom sheet wiring
- `src/App.css` — mobile layout (no sidebar margin, header/nav offsets)
- `src/pages/LeadList.jsx` — render MobileLeadStack on mobile
- `src/pages/LeadList.css` — mobile overrides
- `src/pages/LeadDetail.jsx` — back button, floating action buttons
- `src/pages/LeadDetail.css` — mobile card sections, floating buttons
- `src/styles/variables.css` — mobile-specific tokens (header height, nav height)

---

## 6. Constraints

- Desktop experience: zero changes.
- All role-based access rules unchanged — tab visibility follows same role logic as sidebar.
- Add Lead bottom sheet reuses existing `LeadCreate` form logic; no API changes.
- No service worker / PWA scope in this spec.
