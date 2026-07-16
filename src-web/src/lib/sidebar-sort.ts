import type { SidebarChildEntry, SidebarItem } from "../types";

export const TOP_LEVEL_SIDEBAR_CONTAINER = "sidebar-container:top-level";

export type SidebarEntryType = SidebarItem["type"];

export type SidebarDragEntryData = {
  kind: "sidebar-entry";
  itemType: SidebarEntryType;
  itemId: string;
  containerId: string;
};

export type SidebarDropContainerData = {
  kind: "sidebar-container";
  containerId: string;
  dropArea: "top-level" | "folder";
};

export type SidebarDropData = SidebarDragEntryData | SidebarDropContainerData;

export function sidebarEntryId(type: SidebarEntryType, id: string) {
  return `sidebar-entry:${type}:${id}`;
}

export function sidebarFolderContainerId(folderId: string) {
  return `sidebar-container:folder:${folderId}`;
}

export function sidebarFolderTargetId(folderId: string) {
  return `sidebar-folder-target:${folderId}`;
}

export function isSidebarDragEntryData(value: unknown): value is SidebarDragEntryData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SidebarDragEntryData>;
  return candidate.kind === "sidebar-entry"
    && (candidate.itemType === "playlist" || candidate.itemType === "channel" || candidate.itemType === "folder")
    && typeof candidate.itemId === "string"
    && typeof candidate.containerId === "string";
}

export function isSidebarDropData(value: unknown): value is SidebarDropData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SidebarDropData>;
  if (candidate.kind === "sidebar-entry") return isSidebarDragEntryData(value);
  return candidate.kind === "sidebar-container"
    && typeof candidate.containerId === "string"
    && (candidate.dropArea === "top-level"
      || candidate.dropArea === "folder");
}

function sameEntry(
  entry: { type: SidebarEntryType; id: string },
  type: SidebarEntryType,
  id: string,
) {
  return entry.type === type && entry.id === id;
}

function moveRelative<T extends { type: SidebarEntryType; id: string }>(
  items: T[],
  activeType: SidebarEntryType,
  activeId: string,
  target: { type: SidebarEntryType; id: string } | null,
  insertAfter: boolean,
) {
  const from = items.findIndex((entry) => sameEntry(entry, activeType, activeId));
  if (from === -1 || (target && sameEntry(target, activeType, activeId))) return items;

  const next = [...items];
  const [item] = next.splice(from, 1);
  let targetIndex = next.length;
  if (target) {
    const overIndex = next.findIndex((entry) => sameEntry(entry, target.type, target.id));
    if (overIndex === -1) return items;
    targetIndex = overIndex + (insertAfter ? 1 : 0);
  }
  next.splice(targetIndex, 0, item);

  if (next.every((entry, index) => sameEntry(entry, items[index].type, items[index].id))) {
    return items;
  }
  return next;
}

function folderForContainer(order: SidebarItem[], containerId: string) {
  return order.find(
    (entry): entry is Extract<SidebarItem, { type: "folder" }> =>
      entry.type === "folder" && sidebarFolderContainerId(entry.id) === containerId,
  );
}

function findEntryContainer(
  order: SidebarItem[],
  itemType: SidebarEntryType,
  itemId: string,
) {
  if (order.some((entry) => sameEntry(entry, itemType, itemId))) {
    return TOP_LEVEL_SIDEBAR_CONTAINER;
  }

  if (itemType === "folder") return null;

  for (const entry of order) {
    if (entry.type === "folder" && entry.children.some((child) => sameEntry(child, itemType, itemId))) {
      return sidebarFolderContainerId(entry.id);
    }
  }

  return null;
}

function cloneOrder(order: SidebarItem[]): SidebarItem[] {
  return order.map((entry) => (
    entry.type === "folder"
      ? { ...entry, children: [...entry.children] }
      : { ...entry }
  ));
}

/**
 * Returns a new nested sidebar order for a completed drag. Folders always stay at
 * the top level; playlists and channels can move between the top level and folders.
 */
export function reorderSidebarItems(
  order: SidebarItem[],
  active: SidebarDragEntryData,
  over: SidebarDropData,
  insertAfter = false,
): SidebarItem[] {
  const sourceContainer = findEntryContainer(order, active.itemType, active.itemId);
  if (!sourceContainer) return order;

  // Folders are sortable at the top level but cannot be nested.
  if (active.itemType === "folder") {
    let target: { type: SidebarEntryType; id: string } | null = null;
    if (over.kind === "sidebar-entry" && over.containerId === TOP_LEVEL_SIDEBAR_CONTAINER) {
      target = { type: over.itemType, id: over.itemId };
    } else if (over.containerId !== TOP_LEVEL_SIDEBAR_CONTAINER) {
      const targetFolder = folderForContainer(order, over.containerId);
      if (!targetFolder) return order;
      target = { type: "folder", id: targetFolder.id };
    }
    return moveRelative(order, active.itemType, active.itemId, target, insertAfter);
  }

  const destinationContainer = over.containerId;

  // Sorting within one container can use the original indexes directly.
  if (sourceContainer === destinationContainer) {
    if (sourceContainer === TOP_LEVEL_SIDEBAR_CONTAINER) {
      const target = over.kind === "sidebar-entry"
        ? { type: over.itemType, id: over.itemId }
        : null;
      return moveRelative(order, active.itemType, active.itemId, target, insertAfter);
    }

    const next = cloneOrder(order);
    const folder = folderForContainer(next, sourceContainer);
    if (!folder) return order;
    const target = over.kind === "sidebar-entry"
      ? { type: over.itemType, id: over.itemId }
      : null;
    const nextChildren = moveRelative(folder.children, active.itemType, active.itemId, target, insertAfter);
    if (nextChildren === folder.children) return order;
    folder.children = nextChildren;
    return next;
  }

  const next = cloneOrder(order);
  const movingEntry: SidebarChildEntry = { type: active.itemType, id: active.itemId };

  if (sourceContainer === TOP_LEVEL_SIDEBAR_CONTAINER) {
    const oldIndex = next.findIndex((entry) => sameEntry(entry, active.itemType, active.itemId));
    if (oldIndex === -1) return order;
    next.splice(oldIndex, 1);
  } else {
    const sourceFolder = folderForContainer(next, sourceContainer);
    if (!sourceFolder) return order;
    const oldIndex = sourceFolder.children.findIndex((entry) => sameEntry(entry, active.itemType, active.itemId));
    if (oldIndex === -1) return order;
    sourceFolder.children.splice(oldIndex, 1);
  }

  if (destinationContainer === TOP_LEVEL_SIDEBAR_CONTAINER) {
    let targetIndex = next.length;
    if (over.kind === "sidebar-entry") {
      const overIndex = next.findIndex((entry) => sameEntry(entry, over.itemType, over.itemId));
      if (overIndex !== -1) targetIndex = overIndex + (insertAfter ? 1 : 0);
    }
    next.splice(targetIndex, 0, movingEntry);
    return next;
  }

  const destinationFolder = folderForContainer(next, destinationContainer);
  if (!destinationFolder) return order;

  let targetIndex = destinationFolder.children.length;
  if (over.kind === "sidebar-entry") {
    const overIndex = destinationFolder.children.findIndex((entry) => sameEntry(entry, over.itemType, over.itemId));
    if (overIndex !== -1) targetIndex = overIndex + (insertAfter ? 1 : 0);
  }
  destinationFolder.children.splice(targetIndex, 0, movingEntry);
  return next;
}
