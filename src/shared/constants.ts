export const PRESIGNED_URL_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

// Allowed "results per page" sizes, shared by the browser route's search schema
// and the page-size picker so the two can never drift out of sync.
export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;
