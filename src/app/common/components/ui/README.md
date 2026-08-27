# Shared UI primitives

These standalone components implement the reusable Figma families. Import from
`src/app/common/components/ui` in pages and feature components rather than
adding page-specific controls.

- `app-button`: `primary`, `outline`, `ghost`, or `danger`, with Figma button sizes.
- `app-dialog`: shared one- and two-action dialog shell; project footer actions with `dialogActions`.
- `app-field`: field label, hint, and error wrapper. Use `ui-input`, `ui-select`, or `ui-textarea` on native controls. Controls use the yellow focus treatment; invalid controls receive a red border and glow only after their form has been submitted.
- `app-segmented-control`, `app-tab-list`, `app-switch`, `app-checkbox`, and `app-tag`: reusable selection and status controls.
- `app-search-field` and `app-message-field`: controlled fields for non-reactive page state.

Exact Figma SVG exports should live in `public/assets/icons/` and be given explicit dimensions when projected into controls.
