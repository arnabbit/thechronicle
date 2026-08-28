// Which *backend surfaces* exist yet — a separate seam from `src/capabilities.ts`,
// which answers what the platform can do (push, offline cache, native share).
// That question and this one drift apart: an Android build can cache offline
// today and still have nothing to search, because the search endpoint is a
// different ticket. Mixing them into one module would tie a deploy fact to a
// device fact.
//
// Both surfaces are built complete against their specced contracts and are
// reachable by URL. What these flags gate is only the *entry affordance* — the
// masthead search control, the archive's period switcher — because a control
// that goes nowhere is worse than no control.
//
// Build-time constants, defaulting off. Turning one on when its endpoint ships
// is this one line and no screen work.

/** `GET /api/v2/search` — ticket 08's endpoint. Deployed and answering. */
export const hasSearch = true;

/** `GET /api/v2/periods/:id` — ticket 13's endpoint. Not deployed, and it
 *  additionally waits on the backend gaining an LLM key. */
export const hasPeriod = false;
