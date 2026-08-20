// Marker used throughout src/content/services/*.js for any specific,
// verifiable fact (capacity ranges, pressure ratings, certifications, etc.)
// that is not available from existing public site content. Never invent a
// plausible-sounding number in its place -- use this constant instead.
//
// ServicePage.jsx treats this marker specially: rows containing it are
// dropped entirely in a production build and shown with a "NEEDS
// VERIFICATION" badge in development, so the literal string never ships to
// production but is still visible to developers filling in real data later.
export const PLACEHOLDER = "[[TODO: verify with A K Engineering]]";

// True only for strings that contain the PLACEHOLDER marker.
export const isPlaceholder = (value) =>
  typeof value === "string" && value.includes(PLACEHOLDER);
