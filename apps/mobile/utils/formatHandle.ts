// Single source of truth for rendering a username as a handle. Always
// prefixes with `@` so post cards, profiles, comments, mentions, and search
// results all read the same way. Returns empty string for null/undefined so
// callers can safely render without conditional wrappers.
export const formatHandle = (username?: string | null): string =>
  username ? `@${username}` : '';
