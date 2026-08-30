"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useMotionValue } from "framer-motion";
import { ALargeSmall, List, MoreVertical, Plus, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addStickyNote,
  deleteStickyNote,
  updateStickyNoteColor,
  updateStickyNoteContent,
  updateStickyNoteFont,
  updateStickyNotePosition,
  updateStickyNoteSize,
  updateStickyNoteTextSize,
} from "@/app/admin/customers/sticky-notes-actions";
import {
  STICKY_NOTE_COLORS,
  STICKY_NOTE_FONTS,
  STICKY_NOTE_MIN_HEIGHT,
  STICKY_NOTE_MIN_WIDTH,
  STICKY_NOTE_TEXT_SIZES,
  stickyNoteColorHex,
  stickyNoteFontClasses,
  stickyNoteTextSizeClasses,
  type StickyNote,
  type StickyNoteColor,
  type StickyNoteFont,
  type StickyNoteTextSize,
} from "@/lib/customer-sticky-note";

interface StickyNotesBoardProps {
  customerId: string;
  initialNotes: StickyNote[];
}

const CASCADE_STEP = 28;
const CASCADE_WRAP = 8;

export function StickyNotesBoard({ customerId, initialNotes }: StickyNotesBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [adding, setAdding] = useState(false);
  const [frontId, setFrontId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  async function handleAddNote() {
    setAdding(true);
    const step = notes.length % CASCADE_WRAP;
    const posX = 40 + step * CASCADE_STEP;
    const posY = 40 + step * CASCADE_STEP;
    try {
      const note = await addStickyNote(customerId, posX, posY);
      setNotes((current) => [...current, note]);
    } catch (error) {
      console.error("Failed to add sticky note:", error);
    } finally {
      setAdding(false);
    }
  }

  async function handleMove(noteId: string, posX: number, posY: number) {
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, pos_x: posX, pos_y: posY } : n)));
    try {
      await updateStickyNotePosition(customerId, noteId, posX, posY);
    } catch (error) {
      console.error("Failed to save note position:", error);
    }
  }

  async function handleResizeEnd(noteId: string, width: number, height: number) {
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, width, height } : n)));
    try {
      await updateStickyNoteSize(customerId, noteId, width, height);
    } catch (error) {
      console.error("Failed to save note size:", error);
    }
  }

  async function handleContentChange(noteId: string, content: string) {
    const previous = notes;
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, content } : n)));
    try {
      await updateStickyNoteContent(customerId, noteId, content);
    } catch (error) {
      console.error("Failed to save note text:", error);
      setNotes(previous);
    }
  }

  async function handleColorChange(noteId: string, color: StickyNoteColor) {
    const previous = notes;
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, color } : n)));
    try {
      await updateStickyNoteColor(customerId, noteId, color);
    } catch (error) {
      console.error("Failed to save note color:", error);
      setNotes(previous);
    }
  }

  async function handleFontChange(noteId: string, font: StickyNoteFont) {
    const previous = notes;
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, font } : n)));
    try {
      await updateStickyNoteFont(customerId, noteId, font);
    } catch (error) {
      console.error("Failed to save note font:", error);
      setNotes(previous);
    }
  }

  async function handleTextSizeChange(noteId: string, textSize: StickyNoteTextSize) {
    const previous = notes;
    setNotes((current) => current.map((n) => (n.id === noteId ? { ...n, text_size: textSize } : n)));
    try {
      await updateStickyNoteTextSize(customerId, noteId, textSize);
    } catch (error) {
      console.error("Failed to save note text size:", error);
      setNotes(previous);
    }
  }

  async function handleDelete(noteId: string) {
    const previous = notes;
    setNotes((current) => current.filter((n) => n.id !== noteId));
    try {
      await deleteStickyNote(customerId, noteId);
    } catch (error) {
      console.error("Failed to delete note:", error);
      setNotes(previous);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Sticky notes</h2>
          <p className="mt-1 text-sm text-ink-muted">Drag notes around, jot down anything about them</p>
        </div>
        <button
          type="button"
          onClick={handleAddNote}
          disabled={adding}
          aria-label="Add note"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={canvasRef}
        className="relative mt-6 min-h-[560px] w-full overflow-hidden rounded-2xl border border-dashed border-black/15 bg-background/60"
      >
        {notes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
            No sticky notes yet.
          </p>
        )}
        {notes.map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            canvasRef={canvasRef}
            isFront={frontId === note.id}
            onBringToFront={() => setFrontId(note.id)}
            onMove={(posX, posY) => handleMove(note.id, posX, posY)}
            onResizeEnd={(width, height) => handleResizeEnd(note.id, width, height)}
            onContentChange={(content) => handleContentChange(note.id, content)}
            onColorChange={(color) => handleColorChange(note.id, color)}
            onFontChange={(font) => handleFontChange(note.id, font)}
            onTextSizeChange={(textSize) => handleTextSizeChange(note.id, textSize)}
            onDelete={() => handleDelete(note.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface StickyNoteCardProps {
  note: StickyNote;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isFront: boolean;
  onBringToFront: () => void;
  onMove: (posX: number, posY: number) => void;
  onResizeEnd: (width: number, height: number) => void;
  onContentChange: (content: string) => void;
  onColorChange: (color: StickyNoteColor) => void;
  onFontChange: (font: StickyNoteFont) => void;
  onTextSizeChange: (textSize: StickyNoteTextSize) => void;
  onDelete: () => void;
}

function toggleBulletAtCursor(textarea: HTMLTextAreaElement, value: string) {
  const cursor = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const lineEndIdx = value.indexOf("\n", cursor);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const hasBullet = line.startsWith("• ");
  const newLine = hasBullet ? line.slice(2) : `• ${line}`;
  return value.slice(0, lineStart) + newLine + value.slice(lineEnd);
}

function StickyNoteCard({
  note,
  canvasRef,
  isFront,
  onBringToFront,
  onMove,
  onResizeEnd,
  onContentChange,
  onColorChange,
  onFontChange,
  onTextSizeChange,
  onDelete,
}: StickyNoteCardProps) {
  const x = useMotionValue(note.pos_x);
  const y = useMotionValue(note.pos_y);
  const [value, setValue] = useState(note.content);
  const [size, setSize] = useState({ width: note.width, height: note.height });
  const sizeRef = useRef(size);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBringToFront();
  }

  function handleResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    const next = {
      width: Math.max(STICKY_NOTE_MIN_WIDTH, sizeRef.current.width + event.movementX),
      height: Math.max(STICKY_NOTE_MIN_HEIGHT, sizeRef.current.height + event.movementY),
    };
    sizeRef.current = next;
    setSize(next);
  }

  function handleResizePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    onResizeEnd(sizeRef.current.width, sizeRef.current.height);
  }

  function handleToggleBullet() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = toggleBulletAtCursor(textarea, value);
    setValue(next);
  }

  function handleToggleFont() {
    const nextIndex = (STICKY_NOTE_FONTS.indexOf(note.font) + 1) % STICKY_NOTE_FONTS.length;
    onFontChange(STICKY_NOTE_FONTS[nextIndex]);
  }

  function handleToggleTextSize() {
    const nextIndex = (STICKY_NOTE_TEXT_SIZES.indexOf(note.text_size) + 1) % STICKY_NOTE_TEXT_SIZES.length;
    onTextSizeChange(STICKY_NOTE_TEXT_SIZES[nextIndex]);
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={canvasRef}
      onDragStart={onBringToFront}
      onDragEnd={() => onMove(Math.round(x.get()), Math.round(y.get()))}
      style={{
        x,
        y,
        width: size.width,
        height: size.height,
        position: "absolute",
        zIndex: isFront ? 10 : 1,
        backgroundColor: stickyNoteColorHex[note.color],
      }}
      className="flex cursor-grab flex-col rounded-xl p-3 shadow-sm active:cursor-grabbing"
    >
      <div ref={menuRef} className="relative flex justify-end">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Note options"
          className="rounded-full p-0.5 text-foreground/50 transition hover:bg-black/5 hover:text-foreground"
        >
          <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute right-0 top-6 z-20 w-40 overflow-hidden rounded-xl border border-black/10 bg-card p-2 text-foreground shadow-lg"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleBullet}
                aria-label="Toggle bullet"
                className="flex h-7 w-7 items-center justify-center rounded transition hover:bg-black/5"
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleToggleFont}
                aria-label="Toggle font"
                className="flex h-7 w-7 items-center justify-center rounded transition hover:bg-black/5"
              >
                <Type className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleToggleTextSize}
                aria-label={`Toggle text size (currently ${note.text_size})`}
                title={note.text_size}
                className="flex h-7 w-7 items-center justify-center rounded transition hover:bg-black/5"
              >
                <ALargeSmall className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onColorChange(color)}
                  aria-label={`Set color ${color}`}
                  style={{ backgroundColor: stickyNoteColorHex[color] }}
                  className={cn(
                    "h-4 w-4 rounded-full border border-black/10",
                    note.color === color && "ring-2 ring-foreground/40"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="mt-2 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-medium text-danger transition hover:bg-black/5"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onContentChange(value)}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder="Write something..."
        className={cn(
          "mt-2 flex-1 resize-none border-none bg-transparent text-foreground placeholder:text-foreground/40 focus:outline-none",
          stickyNoteFontClasses[note.font],
          stickyNoteTextSizeClasses[note.text_size]
        )}
      />

      <div
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none"
      />
    </motion.div>
  );
}
