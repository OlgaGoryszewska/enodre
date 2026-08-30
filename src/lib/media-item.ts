// Shared shape for "books to read" and "things to watch" — same structure,
// different domain, backed by their own tables (books_to_read/things_to_watch)
// with columns aliased to this common shape via the select strings below.
export type MediaItem = {
  id: string;
  created_at: string;
  title: string;
  category: string | null;
  url: string | null;
  done: boolean;
  note: string | null;
};

export const BOOKS_SELECT = "id, created_at, title, category:author, url, done:is_read, note";
export const WATCH_SELECT = "id, created_at, title, category:watch_type, url, done:is_watched, note";
