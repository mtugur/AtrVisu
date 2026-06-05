import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type {
  LibraryGroup,
  LibraryMachineItem,
  LoadedMachineLibrary,
  MachineCategory,
  MachineLibraryDocument
} from "../types/machine";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import {
  CUSTOM_LIBRARY_STORAGE_KEY,
  MACHINE_CATEGORIES,
  PROJECT_CUSTOM_LIBRARY_ID,
  validateProjectCustomLibraryDocument
} from "../utils/libraryValidation";
import { mmToMeters } from "../utils/units";

type LibraryManagerProps = {
  libraries: LoadedMachineLibrary[];
  onClose: () => void;
  onLibrariesChanged: () => void;
};

type SelectedNode =
  | { type: "group"; groupId: string }
  | { type: "item"; groupId: string; itemId: string };

type ItemEditorState = {
  mode: "add" | "edit";
  parentGroupId: string;
  originalId?: string;
  id: string;
  name: string;
  type: MachineCategory;
  widthMm: string;
  depthMm: string;
  heightMm: string;
  defaultColor: string;
  canConvey: boolean;
  canPalletize: boolean;
  canWrap: boolean;
  hasFlowDirection: boolean;
  visualModelPath: string;
  visualModelUnit: "m" | "mm";
  visualModelScaleMode: "metadata-box" | "model-units";
  rotationOffsetX: string;
  rotationOffsetY: string;
  rotationOffsetZ: string;
  positionOffsetXMm: string;
  positionOffsetYMm: string;
  positionOffsetZMm: string;
};

const cloneLibrary = (library: LoadedMachineLibrary): MachineLibraryDocument => ({
  libraryId: library.libraryId,
  libraryName: library.libraryName,
  readonly: library.readonly,
  root: JSON.parse(JSON.stringify(library.root)) as LibraryGroup
});

const createEmptyGroup = (id: string, name: string): LibraryGroup => ({
  id,
  name,
  children: [],
  items: []
});

const makeSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `group-${Date.now()}`;
};

const collectGroupIds = (group: LibraryGroup, ids = new Set<string>()) => {
  ids.add(group.id);
  group.children.forEach((child) => collectGroupIds(child, ids));
  return ids;
};

const collectItemIds = (group: LibraryGroup, ids = new Set<string>()) => {
  group.items.forEach((item) => ids.add(item.id));
  group.children.forEach((child) => collectItemIds(child, ids));
  return ids;
};

const collectDuplicateItemIds = (group: LibraryGroup, seen = new Set<string>(), duplicates = new Set<string>()) => {
  group.items.forEach((item) => {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  });
  group.children.forEach((child) => collectDuplicateItemIds(child, seen, duplicates));
  return duplicates;
};

const uniqueGroupId = (root: LibraryGroup, name: string) => {
  const ids = collectGroupIds(root);
  const base = makeSlug(name);
  let candidate = base;
  let index = 2;
  while (ids.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
};

const updateGroup = (
  group: LibraryGroup,
  groupId: string,
  updater: (group: LibraryGroup) => LibraryGroup
): LibraryGroup => {
  if (group.id === groupId) {
    return updater(group);
  }

  return {
    ...group,
    children: group.children.map((child) => updateGroup(child, groupId, updater))
  };
};

const deleteGroupById = (group: LibraryGroup, groupId: string): LibraryGroup => ({
  ...group,
  children: group.children
    .filter((child) => child.id !== groupId)
    .map((child) => deleteGroupById(child, groupId))
});

const deleteItemById = (group: LibraryGroup, itemId: string): LibraryGroup => ({
  ...group,
  items: group.items.filter((item) => item.id !== itemId),
  children: group.children.map((child) => deleteItemById(child, itemId))
});

const findGroup = (group: LibraryGroup, groupId: string): LibraryGroup | null => {
  if (group.id === groupId) {
    return group;
  }

  for (const child of group.children) {
    const result = findGroup(child, groupId);
    if (result) {
      return result;
    }
  }

  return null;
};

const findItem = (
  group: LibraryGroup,
  itemId: string
): { group: LibraryGroup; item: LibraryMachineItem } | null => {
  const item = group.items.find((candidate) => candidate.id === itemId);
  if (item) {
    return { group, item };
  }

  for (const child of group.children) {
    const result = findItem(child, itemId);
    if (result) {
      return result;
    }
  }

  return null;
};

const countItems = (group: LibraryGroup): number => {
  return group.items.length + group.children.reduce((total, child) => total + countItems(child), 0);
};

const toEditorState = (
  parentGroupId: string,
  item?: LibraryMachineItem
): ItemEditorState => {
  const dimensionsMm = item ? getMachineDimensionsMm({ ...item, category: item.type }) : null;
  const visualModel = item?.visualModel;

  return {
    mode: item ? "edit" : "add",
    parentGroupId,
    originalId: item?.id,
    id: item?.id ?? "",
    name: item?.name ?? "",
    type: item?.type ?? "Packaging Machine",
    widthMm: dimensionsMm ? String(dimensionsMm.widthMm) : "1000",
    depthMm: dimensionsMm ? String(dimensionsMm.depthMm) : "1000",
    heightMm: dimensionsMm ? String(dimensionsMm.heightMm) : "1000",
    defaultColor: item?.defaultColor ?? "#7fc8ff",
    canConvey: item?.capabilities?.canConvey ?? false,
    canPalletize: item?.capabilities?.canPalletize ?? false,
    canWrap: item?.capabilities?.canWrap ?? false,
    hasFlowDirection: item?.capabilities?.hasFlowDirection ?? false,
    visualModelPath: visualModel?.modelPath ?? item?.modelPath ?? "",
    visualModelUnit: visualModel?.unit ?? "m",
    visualModelScaleMode: visualModel?.scaleMode ?? "metadata-box",
    rotationOffsetX: String(visualModel?.rotationOffsetDeg.x ?? 0),
    rotationOffsetY: String(visualModel?.rotationOffsetDeg.y ?? 0),
    rotationOffsetZ: String(visualModel?.rotationOffsetDeg.z ?? 0),
    positionOffsetXMm: String(visualModel?.positionOffsetMm.xMm ?? 0),
    positionOffsetYMm: String(visualModel?.positionOffsetMm.yMm ?? 0),
    positionOffsetZMm: String(visualModel?.positionOffsetMm.zMm ?? 0)
  };
};

function ManagerTreeNode({
  group,
  depth,
  editable,
  selectedNode,
  onSelectGroup,
  onSelectItem,
  onAddChildGroup,
  onAddItem,
  onRenameGroup,
  onDeleteGroup
}: {
  group: LibraryGroup;
  depth: number;
  editable: boolean;
  selectedNode: SelectedNode | null;
  onSelectGroup: (groupId: string) => void;
  onSelectItem: (groupId: string, item: LibraryMachineItem) => void;
  onAddChildGroup: (groupId: string) => void;
  onAddItem: (groupId: string) => void;
  onRenameGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isRoot = depth === 0;
  const isSelected = selectedNode?.type === "group" && selectedNode.groupId === group.id;
  const itemCount = countItems(group);

  return (
    <div className="manager-tree-node">
      <div
        className={`manager-tree-row${isSelected ? " is-selected" : ""}`}
        style={{ "--tree-depth": depth } as CSSProperties}
      >
        <button className="manager-row-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "-" : "+"}
        </button>
        <button className="manager-tree-label" type="button" onClick={() => onSelectGroup(group.id)}>
          <strong>{group.name}</strong>
          <span>{itemCount} items</span>
        </button>
        {editable ? (
          <div className="manager-row-actions">
            <button type="button" onClick={() => onAddChildGroup(group.id)} title="Add Child Group">
              Group
            </button>
            <button type="button" onClick={() => onAddItem(group.id)} title="Add Item">
              Item
            </button>
            {!isRoot ? (
              <>
                <button type="button" onClick={() => onRenameGroup(group.id)} title="Rename Group">
                  Rename
                </button>
                <button className="danger-action" type="button" onClick={() => onDeleteGroup(group.id)} title="Delete Group">
                  Delete
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="manager-tree-children">
          {group.children.map((child) => (
            <ManagerTreeNode
              depth={depth + 1}
              editable={editable}
              group={child}
              key={child.id}
              selectedNode={selectedNode}
              onSelectGroup={onSelectGroup}
              onSelectItem={onSelectItem}
              onAddChildGroup={onAddChildGroup}
              onAddItem={onAddItem}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
            />
          ))}
          {group.items.map((item) => {
            const itemSelected = selectedNode?.type === "item" && selectedNode.itemId === item.id;
            return (
              <button
                className={`manager-item-row${itemSelected ? " is-selected" : ""}`}
                key={item.id}
                style={{ "--tree-depth": depth + 1 } as CSSProperties}
                type="button"
                onClick={() => onSelectItem(group.id, item)}
              >
                <span className="manager-item-color" style={{ backgroundColor: item.defaultColor }} aria-hidden="true" />
                <strong>{item.name}</strong>
                <span>{item.type}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LibraryManager({ libraries, onClose, onLibrariesChanged }: LibraryManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState(PROJECT_CUSTOM_LIBRARY_ID);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [draftLibrary, setDraftLibrary] = useState<MachineLibraryDocument | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.libraryId === selectedLibraryId) ?? libraries[0],
    [libraries, selectedLibraryId]
  );
  const editable = selectedLibrary?.libraryId === PROJECT_CUSTOM_LIBRARY_ID && !selectedLibrary.readonly;
  const activeRoot = editable ? draftLibrary?.root : selectedLibrary?.root;
  const selectedGroup =
    activeRoot && selectedNode?.type === "group" ? findGroup(activeRoot, selectedNode.groupId) : null;
  const selectedItem =
    activeRoot && selectedNode?.type === "item" ? findItem(activeRoot, selectedNode.itemId) : null;

  useEffect(() => {
    const customLibrary = libraries.find((library) => library.libraryId === PROJECT_CUSTOM_LIBRARY_ID);
    if (customLibrary) {
      setDraftLibrary(cloneLibrary(customLibrary));
    }
  }, [libraries]);

  useEffect(() => {
    if (activeRoot) {
      setSelectedNode({ type: "group", groupId: activeRoot.id });
      setItemEditor(null);
      setValidationError("");
    }
  }, [activeRoot?.id, selectedLibraryId]);

  const persistLibrary = (library: MachineLibraryDocument, statusText: string) => {
    window.localStorage.setItem(CUSTOM_LIBRARY_STORAGE_KEY, JSON.stringify(library, null, 2));
    setDraftLibrary(library);
    setMessage(statusText);
    setValidationError("");
    onLibrariesChanged();
  };

  const requestClose = () => {
    if (itemEditor) {
      const confirmed = window.confirm("Close Library Manager and discard the current item editor changes?");
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const selectGroup = (groupId: string) => {
    setSelectedNode({ type: "group", groupId });
    setItemEditor(null);
    setValidationError("");
  };

  const selectItem = (groupId: string, item: LibraryMachineItem) => {
    setSelectedNode({ type: "item", groupId, itemId: item.id });
    setItemEditor(toEditorState(groupId, item));
    setValidationError("");
  };

  const addGroup = (parentGroupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const name = window.prompt("Group name");
    if (!name?.trim()) {
      return;
    }

    const group = createEmptyGroup(uniqueGroupId(draftLibrary.root, name), name.trim());
    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(draftLibrary.root, parentGroupId, (target) => ({
        ...target,
        children: [...target.children, group]
      }))
    };
    persistLibrary(nextLibrary, `Group "${group.name}" added.`);
    setSelectedNode({ type: "group", groupId: group.id });
  };

  const renameGroup = (groupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const group = findGroup(draftLibrary.root, groupId);
    const name = window.prompt("New group name", group?.name ?? "");
    if (!name?.trim()) {
      return;
    }

    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(draftLibrary.root, groupId, (target) => ({
        ...target,
        name: name.trim()
      }))
    };
    persistLibrary(nextLibrary, "Group renamed.");
    setSelectedNode({ type: "group", groupId });
  };

  const deleteGroup = (groupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const group = findGroup(draftLibrary.root, groupId);
    if (!group || group.id === draftLibrary.root.id) {
      return;
    }

    const hasContent = group.children.length > 0 || group.items.length > 0;
    const confirmed = window.confirm(
      hasContent
        ? `Delete "${group.name}" and all child groups/items inside it?`
        : `Delete "${group.name}"?`
    );
    if (!confirmed) {
      return;
    }

    persistLibrary(
      {
        ...draftLibrary,
        root: deleteGroupById(draftLibrary.root, groupId)
      },
      "Group deleted."
    );
    setSelectedNode({ type: "group", groupId: draftLibrary.root.id });
  };

  const deleteItem = (itemId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const confirmed = window.confirm(`Delete machine item "${itemId}"?`);
    if (!confirmed) {
      return;
    }

    persistLibrary(
      {
        ...draftLibrary,
        root: deleteItemById(draftLibrary.root, itemId)
      },
      "Machine item deleted."
    );
    setItemEditor(null);
    setSelectedNode({ type: "group", groupId: draftLibrary.root.id });
  };

  const startAddItem = (groupId: string) => {
    if (!editable) {
      return;
    }
    setSelectedNode({ type: "group", groupId });
    setItemEditor(toEditorState(groupId));
    setValidationError("");
  };

  const saveItem = () => {
    if (!editable || !draftLibrary || !itemEditor) {
      return;
    }

    const widthMm = Number(itemEditor.widthMm);
    const depthMm = Number(itemEditor.depthMm);
    const heightMm = Number(itemEditor.heightMm);
    const rotationOffsetX = Number(itemEditor.rotationOffsetX);
    const rotationOffsetY = Number(itemEditor.rotationOffsetY);
    const rotationOffsetZ = Number(itemEditor.rotationOffsetZ);
    const positionOffsetXMm = Number(itemEditor.positionOffsetXMm);
    const positionOffsetYMm = Number(itemEditor.positionOffsetYMm);
    const positionOffsetZMm = Number(itemEditor.positionOffsetZMm);
    const ids = collectItemIds(draftLibrary.root);
    if (itemEditor.originalId) {
      ids.delete(itemEditor.originalId);
    }

    if (!itemEditor.id.trim()) {
      setValidationError("Machine item id is required.");
      return;
    }
    if (!itemEditor.name.trim()) {
      setValidationError("Machine item name is required.");
      return;
    }
    if (!MACHINE_CATEGORIES.includes(itemEditor.type)) {
      setValidationError("Machine item type is required.");
      return;
    }
    if (
      !Number.isFinite(widthMm) ||
      widthMm <= 0 ||
      !Number.isFinite(depthMm) ||
      depthMm <= 0 ||
      !Number.isFinite(heightMm) ||
      heightMm <= 0
    ) {
      setValidationError("Width, depth, and height must be positive millimeter values.");
      return;
    }
    if (ids.has(itemEditor.id.trim())) {
      setValidationError("Machine item id must be unique inside Project Custom Library.");
      return;
    }
    if (
      !Number.isFinite(rotationOffsetX) ||
      !Number.isFinite(rotationOffsetY) ||
      !Number.isFinite(rotationOffsetZ) ||
      !Number.isFinite(positionOffsetXMm) ||
      !Number.isFinite(positionOffsetYMm) ||
      !Number.isFinite(positionOffsetZMm)
    ) {
      setValidationError("Visual model offsets must be valid numbers.");
      return;
    }

    const visualModelPath = itemEditor.visualModelPath.trim();

    const item: LibraryMachineItem = {
      id: itemEditor.id.trim(),
      name: itemEditor.name.trim(),
      type: itemEditor.type,
      widthMm,
      depthMm,
      heightMm,
      width: mmToMeters(widthMm),
      depth: mmToMeters(depthMm),
      height: mmToMeters(heightMm),
      defaultColor: itemEditor.defaultColor || "#7fc8ff",
      modelPath: visualModelPath || null,
      visualModel: {
        modelPath: visualModelPath || null,
        unit: itemEditor.visualModelUnit,
        scaleMode: itemEditor.visualModelScaleMode,
        rotationOffsetDeg: {
          x: rotationOffsetX,
          y: rotationOffsetY,
          z: rotationOffsetZ
        },
        positionOffsetMm: {
          xMm: positionOffsetXMm,
          yMm: positionOffsetYMm,
          zMm: positionOffsetZMm
        }
      },
      thumbnailPath: null,
      connectionPoints: [],
      clearance: {
        front: 0,
        back: 0,
        left: 0,
        right: 0
      },
      capabilities: {
        canConvey: itemEditor.canConvey,
        canPalletize: itemEditor.canPalletize,
        canWrap: itemEditor.canWrap,
        hasFlowDirection: itemEditor.hasFlowDirection
      }
    };

    const rootWithoutOldItem = itemEditor.originalId
      ? deleteItemById(draftLibrary.root, itemEditor.originalId)
      : draftLibrary.root;
    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(rootWithoutOldItem, itemEditor.parentGroupId, (group) => ({
        ...group,
        items: [...group.items, item]
      }))
    };

    persistLibrary(nextLibrary, `Machine item "${item.name}" saved.`);
    setSelectedNode({ type: "item", groupId: itemEditor.parentGroupId, itemId: item.id });
    setItemEditor(toEditorState(itemEditor.parentGroupId, item));
  };

  const exportCustomLibrary = () => {
    if (!draftLibrary) {
      return;
    }

    const blob = new Blob([JSON.stringify(draftLibrary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-custom.library.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importCustomLibrary = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const { library, warnings } = validateProjectCustomLibraryDocument(parsed);
      if (warnings.some((warning) => warning.message.includes("was skipped"))) {
        setValidationError("Imported library contains invalid groups or items. Check console for details.");
        return;
      }
      if (collectDuplicateItemIds(library.root).size > 0) {
        setValidationError("Imported library contains duplicate machine item ids.");
        return;
      }

      const confirmed = window.confirm("Replace the current Project Custom Library with this imported library?");
      if (!confirmed) {
        return;
      }

      const importedLibrary = {
        libraryId: PROJECT_CUSTOM_LIBRARY_ID,
        libraryName: "Project Custom Library",
        readonly: false,
        root: library.root
      };
      persistLibrary(importedLibrary, "Custom library imported.");
      setItemEditor(null);
      setSelectedNode({ type: "group", groupId: importedLibrary.root.id });
    } catch {
      setValidationError("Could not import custom library JSON.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const resetCustomLibrary = () => {
    const confirmed = window.confirm("Reset Project Custom Library to the default file version?");
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(CUSTOM_LIBRARY_STORAGE_KEY);
    setItemEditor(null);
    setMessage("Custom library reset.");
    setValidationError("");
    onLibrariesChanged();
  };

  const modal = (
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog" role="dialog" aria-modal="true" aria-label="Library Manager">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Library Manager</h2>
          </div>
          <div className="manager-context">
            <strong>{selectedLibrary?.libraryName ?? "No library"}</strong>
            <span className={`manager-mode-badge${editable ? " is-editable" : ""}`}>
              {editable ? "Editable" : "Read-only"}
            </span>
          </div>
          <button type="button" onClick={requestClose}>
            Close
          </button>
        </header>

        <div className="manager-layout">
          <aside className="manager-library-list" aria-label="Available libraries">
            {libraries.map((library) => (
              <button
                className={library.libraryId === selectedLibraryId ? "is-selected" : ""}
                key={library.libraryId}
                type="button"
                onClick={() => setSelectedLibraryId(library.libraryId)}
              >
                <strong>{library.libraryName}</strong>
                <span>{library.readonly ? "Read-only" : "Editable"}</span>
              </button>
            ))}
          </aside>

          <section className="manager-tree-panel" aria-label="Library group and item tree">
            <div className="manager-column-header">
              <span>Library Tree</span>
              {activeRoot ? <strong>{countItems(activeRoot)} items</strong> : null}
            </div>
            {!editable ? <p className="manager-readonly-note">This library is read-only.</p> : null}
            {activeRoot ? (
              <div className="manager-tree">
                <ManagerTreeNode
                  depth={0}
                  editable={editable}
                  group={activeRoot}
                  selectedNode={selectedNode}
                  onSelectGroup={selectGroup}
                  onSelectItem={selectItem}
                  onAddChildGroup={addGroup}
                  onAddItem={startAddItem}
                  onRenameGroup={renameGroup}
                  onDeleteGroup={deleteGroup}
                />
              </div>
            ) : (
              <p className="empty-selection">No library tree is available.</p>
            )}
          </section>

          <section className="manager-detail-panel" aria-label="Library details and editor">
            <div className="manager-column-header">
              <span>Details</span>
              <strong>{itemEditor ? (itemEditor.mode === "add" ? "New Item" : "Machine Item") : "Selection"}</strong>
            </div>
            {message ? <p className="manager-status">{message}</p> : null}
            {validationError ? <p className="manager-validation">{validationError}</p> : null}

            {!selectedLibrary ? (
              <p className="empty-selection">No libraries are loaded.</p>
            ) : itemEditor ? (
              <div className="manager-editor" aria-label="Machine item editor">
                <div className="manager-editor-grid">
                  <label>
                    <span>ID</span>
                    <input
                      disabled={!editable}
                      value={itemEditor.id}
                      onChange={(event) => setItemEditor({ ...itemEditor, id: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Name</span>
                    <input
                      disabled={!editable}
                      value={itemEditor.name}
                      onChange={(event) => setItemEditor({ ...itemEditor, name: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Type</span>
                    <select
                      disabled={!editable}
                      value={itemEditor.type}
                      onChange={(event) =>
                        setItemEditor({ ...itemEditor, type: event.target.value as MachineCategory })
                      }
                    >
                      {MACHINE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Width (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.widthMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, widthMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Depth (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.depthMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, depthMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Height (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.heightMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, heightMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Color</span>
                    <input
                      disabled={!editable}
                      type="color"
                      value={itemEditor.defaultColor}
                      onChange={(event) => setItemEditor({ ...itemEditor, defaultColor: event.target.value })}
                    />
                  </label>
                </div>
                <details className="manager-visual-model" open>
                  <summary>Visual Model</summary>
                  <div className="manager-editor-grid">
                    <label>
                      <span>Model Path</span>
                      <input
                        disabled={!editable}
                        placeholder="/library/models/example.glb"
                        value={itemEditor.visualModelPath}
                        onChange={(event) => setItemEditor({ ...itemEditor, visualModelPath: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Model Unit</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.visualModelUnit}
                        onChange={(event) =>
                          setItemEditor({ ...itemEditor, visualModelUnit: event.target.value === "mm" ? "mm" : "m" })
                        }
                      >
                        <option value="m">Meters</option>
                        <option value="mm">Millimeters</option>
                      </select>
                    </label>
                    <label>
                      <span>Scale Mode</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.visualModelScaleMode}
                        onChange={(event) =>
                          setItemEditor({
                            ...itemEditor,
                            visualModelScaleMode:
                              event.target.value === "model-units" ? "model-units" : "metadata-box"
                          })
                        }
                      >
                        <option value="metadata-box">Metadata Box</option>
                        <option value="model-units">Model Units</option>
                      </select>
                    </label>
                    <label>
                      <span>Rotation X (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetX}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetX: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Rotation Y (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetY}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetY: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Rotation Z (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetZ}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetZ: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset X (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetXMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetXMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Y (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetYMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetYMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Z (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetZMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetZMm: event.target.value })}
                      />
                    </label>
                  </div>
                </details>
                <div className="manager-capabilities">
                  {(["canConvey", "canPalletize", "canWrap", "hasFlowDirection"] as const).map((key) => (
                    <label key={key}>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor[key]}
                        onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.checked })}
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
                <div className="manager-editor-actions">
                  <button className="primary-action" disabled={!editable} type="button" onClick={saveItem}>
                    Save Item
                  </button>
                  <button type="button" onClick={() => setItemEditor(null)}>
                    Cancel
                  </button>
                  {itemEditor.mode === "edit" && itemEditor.originalId ? (
                    <button
                      className="danger-action"
                      disabled={!editable}
                      type="button"
                      onClick={() => deleteItem(itemEditor.originalId ?? "")}
                    >
                      Delete Item
                    </button>
                  ) : null}
                </div>
              </div>
            ) : selectedGroup ? (
              <div className="manager-detail-card">
                <span>Group</span>
                <h3>{selectedGroup.name}</h3>
                <p>{countItems(selectedGroup)} machine item{countItems(selectedGroup) === 1 ? "" : "s"} in this group.</p>
                {!editable ? <p className="manager-readonly-note">This library is read-only.</p> : null}
                <div className="manager-detail-actions">
                  <button className="primary-action" disabled={!editable} type="button" onClick={() => addGroup(selectedGroup.id)}>
                    Add Child Group
                  </button>
                  <button disabled={!editable} type="button" onClick={() => startAddItem(selectedGroup.id)}>
                    Add Item
                  </button>
                  <button disabled={!editable || selectedGroup.id === activeRoot?.id} type="button" onClick={() => renameGroup(selectedGroup.id)}>
                    Rename
                  </button>
                  <button
                    className="danger-action"
                    disabled={!editable || selectedGroup.id === activeRoot?.id}
                    type="button"
                    onClick={() => deleteGroup(selectedGroup.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : selectedItem ? (
              <div className="manager-detail-card">
                <span>Machine Item</span>
                <h3>{selectedItem.item.name}</h3>
                <p>
                  {(() => {
                    const dimensionsMm = getMachineDimensionsMm({
                      ...selectedItem.item,
                      category: selectedItem.item.type
                    });
                    return `${dimensionsMm.widthMm} x ${dimensionsMm.depthMm} x ${dimensionsMm.heightMm} mm`;
                  })()}
                </p>
                <button type="button" onClick={() => selectItem(selectedItem.group.id, selectedItem.item)}>
                  Open Editor
                </button>
              </div>
            ) : (
              <p className="empty-selection">Select a group or machine item to view details.</p>
            )}
          </section>
        </div>

        <footer className="manager-footer">
          <div className="manager-footer-left">
            <button disabled={!editable || !draftLibrary} type="button" onClick={exportCustomLibrary}>
              Export Custom Library
            </button>
            <button disabled={!editable || !draftLibrary} type="button" onClick={() => fileInputRef.current?.click()}>
              Import Custom Library
            </button>
            <input
              className="file-input"
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importCustomLibrary(file);
                }
              }}
            />
          </div>
          <div className="manager-footer-right">
            <button className="danger-action" disabled={!editable || !draftLibrary} type="button" onClick={resetCustomLibrary}>
              Reset Custom Library
            </button>
            <button type="button" onClick={requestClose}>
              Close
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
