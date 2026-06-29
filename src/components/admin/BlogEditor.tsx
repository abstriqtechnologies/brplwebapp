"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { Table as TableExtension } from "@tiptap/extension-table";
import TableRowExtension from "@tiptap/extension-table-row";
import TableCellExtension from "@tiptap/extension-table-cell";
import TableHeaderExtension from "@tiptap/extension-table-header";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamilyExtension from "@tiptap/extension-font-family";
import TextAlignExtension from "@tiptap/extension-text-align";
import ColorExtension from "@tiptap/extension-color";
import HighlightExtension from "@tiptap/extension-highlight";
import SubscriptExtension from "@tiptap/extension-subscript";
import SuperscriptExtension from "@tiptap/extension-superscript";
import TaskListExtension from "@tiptap/extension-task-list";
import TaskItemExtension from "@tiptap/extension-task-item";
import { Extension } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Minus,
  Table2,
  Rows,
  Columns,
  Combine,
  Split,
  Trash2,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Image,
  Link,
  Unlink,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface BlogEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/* -------------------------------------------------------------------------- */
/*  Custom Font Size extension                                                 */
/* -------------------------------------------------------------------------- */

const FontSizeExtension = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize,
            renderHTML: (attrs) =>
              attrs.fontSize
                ? { style: `font-size: ${attrs.fontSize}` }
                : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Serif", value: "serif" },
  { label: "Sans Serif", value: "sans-serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Rye", value: "'Rye', cursive" },
];

const FONT_SIZES = [
  { label: "Default", value: "" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
  { label: "48", value: "48px" },
];

const TEXT_COLORS = [
  "#000000",
  "#ffffff",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#78716c",
];

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fde68a",
  "#fecaca",
  "#fca5a5",
  "#bbf7d0",
  "#a7f3d0",
  "#bfdbfe",
  "#93c5fd",
  "#e9d5ff",
  "#c4b5fd",
  "#fecdd3",
  "#fda4af",
];

/* -------------------------------------------------------------------------- */
/*  Color Picker Popover                                                       */
/* -------------------------------------------------------------------------- */

interface ColorPickerProps {
  colors: string[];
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  activeColor?: string | null;
  onSelect: (color: string) => void;
  onRemove?: () => void;
}

function ColorPickerPopover({
  colors,
  label,
  icon: Icon,
  activeColor,
  onSelect,
  onRemove,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        title={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-8 w-8 rounded inline-flex items-center justify-center",
          "hover:bg-slate-200 dark:hover:bg-slate-700",
          "text-slate-600 dark:text-slate-400",
          "transition-colors duration-150",
          open && "bg-slate-200 dark:bg-slate-700",
        )}
      >
        <span className="relative">
          <Icon className="h-[16px] w-[16px]" />
          {activeColor && (
            <span
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-3 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
          )}
        </span>
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50",
            "bg-white dark:bg-slate-800",
            "border border-slate-200 dark:border-slate-700",
            "rounded-lg shadow-lg p-3 min-w-[180px]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            {label}
          </p>
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  onSelect(color);
                  setOpen(false);
                }}
                className={cn(
                  "h-6 w-6 rounded border border-slate-200 dark:border-slate-600",
                  "hover:ring-2 hover:ring-amber-400 transition-shadow",
                  activeColor === color && "ring-2 ring-amber-500",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-700 pt-2">
            <input
              type="color"
              value={customColor || "#000000"}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-6 w-6 rounded cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#hex"
              className={cn(
                "flex-1 h-7 px-2 text-xs rounded",
                "border border-slate-200 dark:border-slate-700",
                "bg-white dark:bg-slate-900",
                "text-slate-700 dark:text-slate-300",
                "focus:outline-none focus:ring-1 focus:ring-amber-400",
              )}
            />
            <button
              type="button"
              onClick={() => {
                if (customColor) {
                  onSelect(customColor);
                  setOpen(false);
                }
              }}
              className={cn(
                "h-7 px-2 text-xs font-medium rounded",
                "bg-amber-500 hover:bg-amber-600 text-white",
                "transition-colors",
              )}
            >
              Set
            </button>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
              className={cn(
                "mt-2 w-full text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                "transition-colors",
              )}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Font Select (dropdown)                                                     */
/* -------------------------------------------------------------------------- */

interface FontSelectProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

function FontSelect({ label, value, options, onChange }: FontSelectProps) {
  return (
    <select
      title={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded px-2 text-xs appearance-none cursor-pointer",
        "bg-white dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "text-slate-700 dark:text-slate-300",
        "hover:border-slate-300 dark:hover:border-slate-600",
        "focus:outline-none focus:ring-1 focus:ring-amber-400",
        "transition-colors",
      )}
    >
      {options.map((opt) => (
        <option key={opt.value || "__default__"} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* -------------------------------------------------------------------------- */
/*  Group labels                                                               */
/* -------------------------------------------------------------------------- */

type GroupDef = {
  id: string;
  label: string;
  index: number;
};

const GROUPS: GroupDef[] = [
  { id: "format", label: "Format", index: 0 },
  { id: "heading", label: "Heading", index: 1 },
  { id: "font", label: "Font", index: 2 },
  { id: "color", label: "Color", index: 3 },
  { id: "align", label: "Align", index: 4 },
  { id: "list", label: "List", index: 5 },
  { id: "block", label: "Block", index: 6 },
  { id: "table", label: "Table", index: 7 },
  { id: "media", label: "Media", index: 8 },
  { id: "history", label: "History", index: 9 },
];

/* -------------------------------------------------------------------------- */
/*  Toolbar component                                                          */
/* -------------------------------------------------------------------------- */

function Toolbar({ editor }: { editor: Editor }) {
  const [fontFamily, setFontFamily] = useState("");
  const [fontSize, setFontSize] = useState("");

  const currentColor = editor.getAttributes("textStyle").color || null;
  const currentHighlight = editor.getAttributes("highlight").color || null;

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    if (value) {
      editor.chain().focus().setFontFamily(value).run();
    } else {
      editor.chain().focus().unsetFontFamily().run();
    }
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    if (value) {
      editor.chain().focus().setFontSize(value).run();
    } else {
      editor.chain().focus().unsetFontSize().run();
    }
  };

  /* -- Toolbar button factory -- */

  const Btn = ({
    icon: Icon,
    title,
    onClick,
    isActive,
    disabled,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      data-active={isActive}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded inline-flex items-center justify-center shrink-0",
        "hover:bg-slate-200 dark:hover:bg-slate-700",
        "text-slate-600 dark:text-slate-400",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        "transition-colors duration-150",
        "data-[active=true]:bg-amber-100 data-[active=true]:text-amber-700",
        "data-[active=true]:dark:bg-amber-900/30 data-[active=true]:dark:text-amber-300",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );

  /* -- Groups -- */

  const FormatGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Bold}
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
      />
      <Btn
        icon={Italic}
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
      />
      <Btn
        icon={Underline}
        title="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
      />
      <Btn
        icon={Strikethrough}
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
      />
      <Btn
        icon={Subscript}
        title="Subscript"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive("subscript")}
      />
      <Btn
        icon={Superscript}
        title="Superscript"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive("superscript")}
      />
    </div>
  );

  const HeadingGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Heading1}
        title="Heading 1"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
      />
      <Btn
        icon={Heading2}
        title="Heading 2"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
      />
      <Btn
        icon={Heading3}
        title="Heading 3"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
      />
      <Btn
        icon={Heading4}
        title="Heading 4"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 4 }).run()
        }
        isActive={editor.isActive("heading", { level: 4 })}
      />
    </div>
  );

  const FontGroup = () => (
    <div className="flex items-center gap-0.5">
      <FontSelect
        label="Font Family"
        value={fontFamily}
        options={FONT_FAMILIES}
        onChange={handleFontFamilyChange}
      />
      <FontSelect
        label="Font Size"
        value={fontSize}
        options={FONT_SIZES}
        onChange={handleFontSizeChange}
      />
    </div>
  );

  const ColorGroup = () => (
    <div className="flex items-center gap-0.5">
      <ColorPickerPopover
        label="Text Color"
        icon={Palette}
        colors={TEXT_COLORS}
        activeColor={currentColor}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        onRemove={() => editor.chain().focus().unsetColor().run()}
      />
      <ColorPickerPopover
        label="Highlight Color"
        icon={Highlighter}
        colors={HIGHLIGHT_COLORS}
        activeColor={currentHighlight}
        onSelect={(color) =>
          editor.chain().focus().toggleHighlight({ color }).run()
        }
        onRemove={() => editor.chain().focus().unsetHighlight().run()}
      />
    </div>
  );

  const AlignGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={AlignLeft}
        title="Align Left"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
      />
      <Btn
        icon={AlignCenter}
        title="Align Center"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
      />
      <Btn
        icon={AlignRight}
        title="Align Right"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
      />
      <Btn
        icon={AlignJustify}
        title="Justify"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
      />
    </div>
  );

  const ListGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={List}
        title="Bullet List"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      />
      <Btn
        icon={ListOrdered}
        title="Ordered List"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
      />
      <Btn
        icon={ListChecks}
        title="Task List"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
      />
    </div>
  );

  const BlockGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Quote}
        title="Blockquote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
      />
      <Btn
        icon={Code}
        title="Code Block"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
      />
      <Btn
        icon={Minus}
        title="Horizontal Rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );

  const TableGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Table2}
        title="Insert Table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        disabled={editor.isActive("table")}
      />
      <Btn
        icon={ArrowUpFromLine}
        title="Add Row Before"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        disabled={!editor.can().addRowBefore()}
      />
      <Btn
        icon={ArrowDownFromLine}
        title="Add Row After"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
      />
      <Btn
        icon={Columns}
        title="Add Column Before"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        disabled={!editor.can().addColumnBefore()}
      />
      <Btn
        icon={Rows}
        title="Add Column After"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
      />
      <Btn
        icon={Combine}
        title="Merge Cells"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
      />
      <Btn
        icon={Split}
        title="Split Cell"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
      />
      <Btn
        icon={Trash2}
        title="Delete Row"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
      />
      <Btn
        icon={Trash2}
        title="Delete Column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
      />
      <Btn
        icon={Trash2}
        title="Delete Table"
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!editor.can().deleteTable()}
      />
    </div>
  );

  const MediaGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Image}
        title="Insert Image"
        onClick={() => {
          const url = window.prompt("Enter image URL");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
      />
      <Btn
        icon={Link}
        title="Toggle Link"
        onClick={() => {
          const previousUrl = editor.getAttributes("link").href as
            | string
            | undefined;
          const url = window.prompt("Enter URL", previousUrl ?? "");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().toggleLink({ href: url }).run();
        }}
        isActive={editor.isActive("link")}
      />
      <Btn
        icon={Unlink}
        title="Remove Link"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
      />
    </div>
  );

  const HistoryGroup = () => (
    <div className="flex items-center gap-0.5">
      <Btn
        icon={Undo2}
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <Btn
        icon={Redo2}
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  );

  /* -- Group wrapper -- */

  const GroupWrap = ({
    group,
    children,
  }: {
    group: GroupDef;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center gap-0.5 shrink-0">
      {group.index > 0 && (
        <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
      )}
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          "text-slate-400 dark:text-slate-500 select-none shrink-0",
        )}
      >
        {group.label}
      </span>
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 px-3 py-1.5",
        "border-b border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-900",
      )}
    >
      <GroupWrap group={GROUPS[0]}>
        <FormatGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[1]}>
        <HeadingGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[2]}>
        <FontGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[3]}>
        <ColorGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[4]}>
        <AlignGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[5]}>
        <ListGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[6]}>
        <BlockGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[7]}>
        <TableGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[8]}>
        <MediaGroup />
      </GroupWrap>
      <GroupWrap group={GROUPS[9]}>
        <HistoryGroup />
      </GroupWrap>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Editor-specific CSS injection via style tag                                 */
/* -------------------------------------------------------------------------- */

function EditorStyles() {
  return (
    <style jsx global>{`
      .tiptap-editor-wrapper .ProseMirror {
        min-height: inherit;
        outline: none;
        padding: 0;
      }
      .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
        color: #94a3b8;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      .dark .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
        color: #64748b;
      }
      .tiptap-editor-wrapper table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
        overflow: hidden;
      }
      .tiptap-editor-wrapper td,
      .tiptap-editor-wrapper th {
        border: 1px solid #cbd5e1;
        padding: 4px 8px;
        min-width: 80px;
        position: relative;
        vertical-align: top;
      }
      .dark .tiptap-editor-wrapper td,
      .dark .tiptap-editor-wrapper th {
        border-color: #475569;
      }
      .tiptap-editor-wrapper th {
        background: #f1f5f9;
        font-weight: 600;
        text-align: left;
      }
      .dark .tiptap-editor-wrapper th {
        background: #1e293b;
      }
      .tiptap-editor-wrapper .selectedCell {
        background: #fef3c7;
      }
      .dark .tiptap-editor-wrapper .selectedCell {
        background: rgba(146, 114, 39, 0.15);
      }
      .tiptap-editor-wrapper img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
      }
      .tiptap-editor-wrapper a {
        color: #d97706;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .dark .tiptap-editor-wrapper a {
        color: #fbbf24;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] {
        list-style: none;
        padding-left: 0;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] li > label {
        flex-shrink: 0;
        margin-top: 4px;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] li > label input[type="checkbox"] {
        cursor: pointer;
        accent-color: #d97706;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] li[data-checked="true"] > div > p {
        text-decoration: line-through;
        color: #94a3b8;
      }
      .tiptap-editor-wrapper pre {
        background: #1e293b;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 12px 16px;
        font-family: "JetBrains Mono", monospace;
        font-size: 13px;
        overflow-x: auto;
      }
      .dark .tiptap-editor-wrapper pre {
        background: #0f172a;
      }
      .tiptap-editor-wrapper blockquote {
        border-left: 3px solid #d97706;
        padding-left: 16px;
        color: #64748b;
        font-style: italic;
      }
      .dark .tiptap-editor-wrapper blockquote {
        border-left-color: #fbbf24;
        color: #94a3b8;
      }
      .tiptap-editor-wrapper hr {
        border: none;
        border-top: 1px solid #cbd5e1;
        margin: 16px 0;
      }
      .dark .tiptap-editor-wrapper hr {
        border-top-color: #475569;
      }
      .tiptap-editor-wrapper h1 {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1.3;
      }
      .tiptap-editor-wrapper h2 {
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 1.35;
      }
      .tiptap-editor-wrapper h3 {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.4;
      }
      .tiptap-editor-wrapper h4 {
        font-size: 1.125rem;
        font-weight: 600;
        line-height: 1.45;
      }
      .tiptap-editor-wrapper code {
        background: #f1f5f9;
        border-radius: 3px;
        padding: 2px 4px;
        font-size: 0.875em;
        font-family: "JetBrains Mono", monospace;
      }
      .dark .tiptap-editor-wrapper code {
        background: #1e293b;
      }
      .tiptap-editor-wrapper p {
        margin: 0 0 8px;
      }
      .tiptap-editor-wrapper ul,
      .tiptap-editor-wrapper ol {
        padding-left: 24px;
      }
      .tiptap-editor-wrapper ul[data-type="taskList"] {
        padding-left: 0;
      }
    `}</style>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function BlogEditor({
  content,
  onChange,
  placeholder,
  minHeight = "400px",
}: BlogEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      TextStyle,
      FontFamilyExtension,
      FontSizeExtension,
      UnderlineExtension,
      SubscriptExtension,
      SuperscriptExtension,
      ColorExtension,
      HighlightExtension.configure({ multicolor: true }),
      TextAlignExtension.configure({
        types: ["heading", "paragraph"],
      }),
      TaskListExtension,
      TaskItemExtension.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-amber-600 underline underline-offset-2 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300",
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
      TableExtension.configure({
        resizable: true,
      }),
      TableRowExtension,
      TableCellExtension,
      TableHeaderExtension,
      PlaceholderExtension.configure({
        placeholder: placeholder ?? "Start writing...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-inherit prose prose-sm max-w-none dark:prose-invert",
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        "tiptap-editor-wrapper",
        "rounded-lg border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-900 overflow-hidden",
      )}
    >
      <EditorStyles />
      {/* Toolbar */}
      <Toolbar editor={editor} />
      {/* Editor content */}
      <div className="p-4" style={{ minHeight }}>
        <style jsx>{`
          div :global(.ProseMirror) {
            min-height: ${minHeight};
            outline: none;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
