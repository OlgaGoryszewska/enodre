export const STICKY_NOTE_COLORS = [
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
  "violet",
  "coral",
  "sage",
  "paper",
] as const;
export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number];

export const stickyNoteColorHex: Record<StickyNoteColor, string> = {
  yellow: "#FFF3B8",
  pink: "#FFD9EA",
  blue: "#C7E6FF",
  green: "#D3F0CE",
  orange: "#FFDFC0",
  violet: "#DCD3FF",
  coral: "#FFC9BC",
  sage: "#D8E3D0",
  paper: "#F8F5EC",
};

export const STICKY_NOTE_FONTS = ["sans", "handwritten"] as const;
export type StickyNoteFont = (typeof STICKY_NOTE_FONTS)[number];

export const stickyNoteFontClasses: Record<StickyNoteFont, string> = {
  sans: "font-sans",
  handwritten: "font-handwritten",
};

export const STICKY_NOTE_TEXT_SIZES = ["header", "subheader", "body"] as const;
export type StickyNoteTextSize = (typeof STICKY_NOTE_TEXT_SIZES)[number];

export const stickyNoteTextSizeClasses: Record<StickyNoteTextSize, string> = {
  header: "text-lg font-bold leading-tight",
  subheader: "text-base font-semibold leading-snug",
  body: "text-sm leading-snug",
};

export const STICKY_NOTE_MIN_WIDTH = 140;
export const STICKY_NOTE_MIN_HEIGHT = 140;

export type StickyNote = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  content: string;
  color: StickyNoteColor;
  font: StickyNoteFont;
  text_size: StickyNoteTextSize;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
};
