const drawerSizes = {
  sm: 420,
  md: 520,
  lg: 640,
  xl: 800,
} as const;

const drawerCollapsibleDefaults = {
  minWidth: 360,
  maxWidth: 1200,
} as const;

/**
 * Shared UI behaviour constants for the admin portal.
 *
 * Centralises magic numbers that would otherwise be scattered across
 * feature files (e.g. DevExtreme notify durations, animation timings).
 */
export const uiConfig = {
  toast: {
    /** Default display duration for success / info toasts (ms). */
    durationMs: 3_000,
    /** Display duration for error toasts — slightly longer so users can read them (ms). */
    errorDurationMs: 5_000,
  },
  grid: {
    /** Debounce delay before a search panel keystroke fires a network request (ms). */
    searchDebounceMs: 350,
    /** Page size options shown in the Pager selector. */
    allowedPageSizes: [5, 10, 25, 50, 100] as number[],
    /** Default page size for grids. */
    defaultPageSize: 10,
    /** Page size options for sidebar card lists (smaller sets than full-page grids). */
    sidebarPageSizes: [5, 10, 25] as number[],
    /** Fixed width (px) of the actions column in EntityDataGrid / GridSkeleton. */
    actionsColumnWidth: 130,
    /** Width (px) of the search TextBox in the grid toolbar. */
    searchInputWidth: 220,
    /** Page size for the sidebar club flyout list. */
    flyoutPageSize: 20,
  },
  calendar: {
    /** Page size for server-paginated calendar event queries. */
    pageSize: 50,
  },
  popup: {
    /** Standard popup width (px) — use for most dialogs. */
    defaultWidth: 520,
    /** Wide popup width (px) — use for complex multi-field dialogs. */
    largeWidth: 640,
  },
  drawer: {
    /** Standard drawer widths (px) to keep cross-feature sizing consistent. */
    sizes: drawerSizes,
    /** Global defaults for opt-in collapsible drawers. */
    collapsibleDefaults: drawerCollapsibleDefaults,
    collapsiblePresets: {
      bulkUpload: {
        minWidth: drawerSizes.md,
        maxWidth: drawerCollapsibleDefaults.maxWidth,
      },
    },
    /**
     * Width (px) of the master list column when a master–detail edit pane is open beside it.
     * Keeps the list readable without crowding the detail editor.
     */
    masterDetailListWidth: 340,
    /**
     * Delay (ms) before mounting master–detail edit pane content after the drawer finishes
     * widening. The DevExtreme editor toolbar only measures itself on mount — mounting
     * mid-animation collapses every toolbar button into the overflow menu.
     */
    editPaneRevealMs: 320,
  },
  selectSearch: {
    /** Debounce delay before a SelectBox / TagBox keystroke fires a search (ms). */
    searchTimeout: 300,
    /** Minimum characters before triggering search (0 = load items immediately on open). */
    minSearchLength: 0,
    /** First page size for server-backed SelectBox / TagBox option loads. */
    pageSize: 50,
  },
  accordion: {
    /** Expand/collapse animation duration (ms). */
    animationDurationMs: 200,
    /** Default number of placeholder rows shown while an accordion grid loads. */
    skeletonRowCount: 10,
  },
  api: {
    /** Page size used when fetching large sets for client-side sync operations (e.g. assignments, options). */
    syncPageSize: 250,
  },
  ai: {
    /** How often to poll for a background AI job result (ms). */
    pollIntervalMs: 2_000,
    /** Maximum time to wait for a background AI job before timing out (ms). */
    pollTimeoutMs: 120_000,
    /** Debounce delay before fetching a credit cost estimate after params change (ms). */
    creditCostDebounceMs: 300,
    /** Page size for the generate-review question list. */
    reviewPageSize: 5,
    /** How long a persisted in-flight job ID is trusted before being discarded as stale (ms). */
    jobTtlMs: 2 * 60 * 60 * 1_000,
  },
  upload: {
    /** Maximum file size for cover images (bytes). Files exceeding this limit are rejected client-side. */
    coverImageMaxSizeBytes: 20 * 1024 * 1024,
  },
  session: {
    /** SignalR reconnect backoff ladder (ms). Stays at 30 s once exhausted — never gives up. */
    reconnectDelaysMs: [0, 2_000, 5_000, 10_000, 30_000] as number[],
  },
  reports: {
    /** Settle delay before a PDF screenshot so DevExtreme chart entry animations finish (ms). */
    pdfChartSettleMs: 650,
    /** Max wait for a section's reports queries to settle before capturing it for PDF (ms). */
    pdfQueriesIdleTimeoutMs: 12_000,
    /** Hard ceiling for the whole client-side PDF capture so a stuck capture can't hang the
     * Export control forever — it fails with the standard error toast instead (ms). */
    pdfExportTimeoutMs: 90_000,
    /** Fallback before a queued full-dashboard Excel export is considered failed if no
     * SignalR push arrives, so the Export control can't stay disabled forever (ms). */
    fullExportTimeoutMs: 120_000,
  },
} as const;
