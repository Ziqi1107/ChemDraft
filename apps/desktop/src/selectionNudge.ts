import type { ChemDraftDocument } from "@chemdraft/chem-core";
import type { CommandSpec } from "./commands";
import { moveDocumentObjects } from "./documentWorkflow";

const directions = [
  { name: "left", key: "ArrowLeft", x: -1, y: 0 },
  { name: "right", key: "ArrowRight", x: 1, y: 0 },
  { name: "up", key: "ArrowUp", x: 0, y: -1 },
  { name: "down", key: "ArrowDown", x: 0, y: 1 }
] as const;

/** Page-space pixels: independent of zoom, like the existing pointer-move primitive. */
export const selectionNudges = directions.flatMap((direction) => [1, 10].map((step) => ({
  id: `layout.nudge.${direction.name}.${step}`,
  title: `Move selection ${direction.name}${step === 10 ? " (large step)" : ""}`,
  shortcut: `${step === 10 ? "Shift+" : ""}${direction.key}`,
  dx: direction.x * step,
  dy: direction.y * step
})));

export function createSelectionNudgeActions(hasSelection: boolean): CommandSpec[] {
  return selectionNudges.map(({ id, title, shortcut }) => ({
    id, title, shortcut, icon: "select", source: "core", category: "layout",
    enabled: hasSelection,
    disabledReason: hasSelection ? undefined : "Select a structure or object to move"
  }));
}

/** A part selection moves its containing molecule rigidly, never distorting chemical geometry. */
export function nudgeDocumentSelection(
  document: ChemDraftDocument,
  commandId: string,
  selectedMoleculeIds: readonly string[] = []
): ChemDraftDocument {
  const nudge = selectionNudges.find((candidate) => candidate.id === commandId);
  if (!nudge) return document;
  return moveDocumentObjects(document, [...new Set([
    ...document.selection.objectIds, ...selectedMoleculeIds
  ])], nudge.dx, nudge.dy, document.selection.pageId);
}

/** Widgets and menus keep their keys; plain drawing-tool buttons may retain canvas focus. */
export function selectionNudgeOwnsTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return true;
  if (target.closest(
    "input, textarea, select, [contenteditable], [role='menu'], [role='menubar'], " +
    "[role='menuitem'], [role='slider'], [role='spinbutton'], [role='tablist'], [role='listbox']"
  )) return false;
  const button = target.closest("button");
  // Clicking a palette command leaves its button focused. Canvas presses prevent the
  // browser's default focus change, so that focus can survive selecting a structure.
  // Flyouts still claim their own keys before the global shortcut handler runs.
  return !button || button.matches(".tool-palette button[data-command-id]");
}
