# ADR-011: Global Navigation Architecture

## Status

Accepted

## Date

2026-01-26

## Context

The application currently has duplicated header implementations across different layout files (dashboard, settings, admin). Each layout implements its own header with similar but slightly different navigation elements. This duplication leads to:

- Inconsistent navigation experience across pages
- Code duplication and maintenance burden
- Difficulty ensuring consistent styling and behavior
- No global navigation structure for users to orient themselves

Additionally, the header navigation items on the right side need explicit right-justification to ensure proper alignment across different screen sizes.

## Decision

We will implement a global navigation architecture with:

1. **Global Left Sidebar**: A fixed left sidebar that appears on all authenticated pages with:
   - Top section: Home button linking to `/dashboard`
   - Visual separator
   - Bottom section: Settings button (admin-only, conditionally rendered)

2. **Shared Header Component**: A unified header component that:
   - Contains logo/branding on the left
   - Right-justifies navigation items (theme toggle, user info, sign out) using `ml-auto` for explicit alignment
   - Replaces all duplicated header implementations

3. **App Shell Component**: A layout wrapper that combines:
   - The global sidebar
   - The shared header
   - Main content area with proper spacing (padding-left to account for fixed sidebar)

This architecture will be applied to all authenticated routes via the dashboard layout wrapper.

## Consequences

### Positive

- Consistent navigation experience across all pages
- Single source of truth for header and sidebar reduces code duplication
- Easier to maintain and update navigation globally
- Better user orientation with persistent navigation
- Clear visual hierarchy with left sidebar for primary navigation
- Right-justified header items ensure proper alignment
- Admin-only sections clearly separated in bottom of sidebar

### Negative

- Fixed sidebar takes up horizontal space (64px/16rem) on all pages
- Requires layout adjustments to account for sidebar width
- All authenticated pages must use the AppShell wrapper
- Slight learning curve for developers to understand the new structure

### Neutral

- Sidebar is collapsible (icon-only or icon+label mode, with expand/collapse toggle)
- Settings navigation within settings pages remains separate (section-specific navigation)
- Admin navigation within admin pages remains separate (section-specific navigation)

## Related Decisions

- [ADR-012: Admin-Only Settings Access](./012-admin-only-settings.md)

## Notes

The sidebar supports two modes: collapsed (icon-only, 64px/w-16) and expanded (icon+label). Users can toggle between modes with an expand/collapse button. The active state is indicated by button variant changes and background color. On mobile, the sidebar is hidden and accessible via a sheet/drawer.

The header uses `ml-auto` on the right-side container to explicitly push items to the right edge, ensuring proper right-justification regardless of content length.

## Implementation Journal

- [Navigation Refactor (2026-01-26)](../journal/2026-01-26-navigation-refactor.md)
- [Config Nav Redesign (2026-01-29)](../journal/2026-01-29-config-nav-redesign.md)
