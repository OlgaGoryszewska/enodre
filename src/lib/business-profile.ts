// The marketing board's sticky notes and files reuse the existing
// customer-scoped infrastructure (StickyNotesBoard, CustomerFilesSection) by
// pointing it at one dedicated "customers" row representing Enodre itself,
// rather than building parallel tables/components for a single board.
// This name is also how the People page filters this row out of the
// customer list — it's an internal fixture, not a real contact.
export const BUSINESS_PROFILE_NAME = "Enodre (internal — marketing board, do not delete)";
