import { useEffect, useMemo, useRef, useState } from "react";
import type {
  LibraryGroup,
  LibraryMachineItem,
  LoadedMachineLibrary,
  MachineCategory,
  MachineLibraryDocument
} from "../types/machine";
import {
  CUSTOM_LIBRARY_STORAGE_KEY,
  MACHINE_CATEGORIES,
  PROJECT_CUSTOM_LIBRARY_ID,
  validateProjectCustomLibraryDocument
} from "../utils/libraryValidation";

type LibraryManagerProps = {
  libraries: LoadedMachineLibrary[];
  onClose: () => void;
  onLibrariesChanged: () => void;
};

type ItemEditorState = {
  mode: "add" | "edit";
  parentGroupId: string;
  originalId?: string;
  id: string;
  name: string;
  type: MachineCategory;
  width: string;
  depth: string;
  height: string;
  defaultColor: string;
  canConvey: boolean;
  canPalletize: boolean;
  canWrap: boolean;
  hasFlowDirection: boolean;
};

const createEmptyGroup = (id: string, name: string): LibraryGroup => ({
  id,
  name,
  children: [],
  items: []
});

const cloneLibrary = (library: LoadedMachineLibrary): MachineLibraryDocument => ({
  libraryId: library.libraryId,
  libraryName: library.libraryName,
  readonly: library.readonly,
  root: JSON.parse(JSON.stringify(library.root)) as LibraryGroup
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

const deleteItemById = (group: LibraryGroup, itemId: string): LibraryGroup => ({
  ...group,
  items: group.items.filter((item) => item.id !== itemId),
  children: group.children.map((child) => deleteItemById(child, itemId))
});

const toEditorState = (
  parentGroupId: string,
  item?: LibraryMachineItem
): ItemEditorState => ({
  mode: item ? "edit" : "add",
  parentGroupId,
  originalId: item?.id,
  id: item?.id ?? "",
  name: item?.name ?? "",
  type: item?.type ?? "Packaging Machine",
  width: item ? String(item.width) : "1",
  depth: item ? String(item.depth) : "1",
  height: item ? String(item.height) : "1",
  defaultColor: item?.defaultColor ?? "#7fc8ff",
  canConvey: item?.capabilities?.canConvey ?? false,
  canPalletize: item?.capabilities?.canPalletize ?? false,
  canWrap: item?.capabilities?.canWrap ?? false,
  hasFlowDirection: item?.capabilities?.hasFlowDirection ?? false
});

function EditableGroupNode({
  group,
  depth,
  onAddChildGroup,
  onRenameGroup,
  onDeleteGroup,
  onAddItem,
  onEditItem,
  onDeleteItem
}: {
  group: LibraryGroup;
  depth: number;
  onAddChildGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddItem: (groupId: string) => void;
  onEditItem: (groupId: string, item: LibraryMachineItem) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isRoot = depth === 0;

  return (
    <div className="manager-tree-node">
      <div className="manager-tree-row" style={{ paddingLeft: 8 + depth * 16 }}>
        <button type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "-" : "+"}
        </button>
        <strong>{group.name}</strong>
        <span>{group.items.length} items</span>
        <button type="button" onClick={() => onAddChildGroup(group.id)}>
          Add Group
        </button>
        <button type="button" onClick={() => onAddItem(group.id)}>
          Add Item
        </button>
        {!isRoot ? (
          <>
            <button type="button" onClick={() => onRenameGroup(group.id)}>
              Rename
            </button>
            <button type="button" onClick={() => onDeleteGroup(group.id)}>
              Delete
            </button>
          </>
        ) : null}
      </div>

      {isOpen ? (
        <div className="manager-tree-children">
          {group.children.map((child) => (
            <EditableGroupNode
              depth={depth + 1}
              group={child}
              key={child.id}
              onAddChildGroup={onAddChildGroup}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
              onAddItem={onAddItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
          {group.items.map((item) => (
            <div className="manager-item-row" key={item.id} style={{ marginLeft: 28 + depth * 16 }}>
              <span className="manager-item-color" style={{ backgroundColor: item.defaultColor }} aria-hidden="true" />
              <strong>{item.name}</strong>
              <span>{item.type}</span>
              <small>
                {item.width} x {item.depth} x {item.height} m
              </small>
              <button type="button" onClick={() => onEditItem(group.id, item)}>
                Edit
              </button>
              <button type="button" onClick={() => onDeleteItem(item.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LibraryManager({ libraries, onClose, onLibrariesChanged }: LibraryManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState(PROJECT_CUSTOM_LIBRARY_ID);
  const [draftLibrary, setDraftLibrary] = useState<MachineLibraryDocument | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.libraryId === selectedLibraryId) ?? libraries[0],
    [libraries, selectedLibraryId]
  );

  useEffect(() => {
    const customLibrary = libraries.find((library) => library.libraryId === PROJECT_CUSTOM_LIBRARY_ID);
    if (customLibrary) {
      setDraftLibrary(cloneLibrary(customLibrary));
    }
  }, [libraries]);

  const persistLibrary = (library: MachineLibraryDocument, statusText: string) => {
    window.localStorage.setItem(CUSTOM_LIBRARY_STORAGE_KEY, JSON.stringify(library, null, 2));
    setDraftLibrary(library);
    setMessage(statusText);
    setValidationError("");
    onLibrariesChanged();
  };

  const editable = selectedLibrary?.libraryId === PROJECT_CUSTOM_LIBRARY_ID && !selectedLibrary.readonly;

  const addGroup = (parentGroupId: string) => {
    if (!draftLibrary) {
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
  };

  const renameGroup = (groupId: string) => {
    if (!draftLibrary) {
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
  };

  const deleteGroup = (groupId: string) => {
    if (!draftLibrary) {
      return;
    }

    const group = findGroup(draftLibrary.root, groupId);
    if (!group) {
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
  };

  const deleteItem = (itemId: string) => {
    if (!draftLibrary) {
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
  };

  const saveItem = () => {
    if (!draftLibrary || !itemEditor) {
      return;
    }

    const width = Number(itemEditor.width);
    const depth = Number(itemEditor.depth);
    const height = Number(itemEditor.height);
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
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0 || !Number.isFinite(height) || height <= 0) {
      setValidationError("Width, depth, and height must be positive numbers.");
      return;
    }
    if (ids.has(itemEditor.id.trim())) {
      setValidationError("Machine item id must be unique inside Project Custom Library.");
      return;
    }

    const item: LibraryMachineItem = {
      id: itemEditor.id.trim(),
      name: itemEditor.name.trim(),
      type: itemEditor.type,
      width,
      depth,
      height,
      defaultColor: itemEditor.defaultColor || "#7fc8ff",
      modelPath: null,
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
    setItemEditor(null);
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

      persistLibrary(
        {
          libraryId: PROJECT_CUSTOM_LIBRARY_ID,
          libraryName: "Project Custom Library",
          readonly: false,
          root: library.root
        },
        "Custom library imported."
      );
      setItemEditor(null);
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

  return (
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog" role="dialog" aria-modal="true" aria-label="Library Manager">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Library Manager</h2>
          </div>
          <button type="button" onClick={onClose}>
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

          <div className="manager-main">
            {message ? <p className="manager-status">{message}</p> : null}
            {validationError ? <p className="manager-validation">{validationError}</p> : null}

            {!selectedLibrary ? (
              <p className="empty-selection">No libraries are loaded.</p>
            ) : selectedLibrary.readonly || !editable ? (
              <section className="manager-readonly">
                <h3>{selectedLibrary.libraryName}</h3>
                <p>This library is read-only and cannot be edited from the Library Manager.</p>
              </section>
            ) : draftLibrary ? (
              <>
                <section className="manager-actions">
                  <button type="button" onClick={() => addGroup(draftLibrary.root.id)}>
                    Add Root Group
                  </button>
                  <button type="button" onClick={exportCustomLibrary}>
                    Export Custom Library
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}>
                    Import Custom Library
                  </button>
                  <button type="button" onClick={resetCustomLibrary}>
                    Reset Custom Library
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
                </section>

                <section className="manager-tree" aria-label="Editable custom library tree">
                  <EditableGroupNode
                    depth={0}
                    group={draftLibrary.root}
                    onAddChildGroup={addGroup}
                    onRenameGroup={renameGroup}
                    onDeleteGroup={deleteGroup}
                    onAddItem={(groupId) => {
                      setItemEditor(toEditorState(groupId));
                      setValidationError("");
                    }}
                    onEditItem={(groupId, item) => {
                      setItemEditor(toEditorState(groupId, item));
                      setValidationError("");
                    }}
                    onDeleteItem={deleteItem}
                  />
                </section>

                {itemEditor ? (
                  <section className="manager-editor" aria-label="Machine item editor">
                    <header className="section-header">
                      <span>{itemEditor.mode === "add" ? "Add Item" : "Edit Item"}</span>
                      <strong>{itemEditor.name || "Machine item"}</strong>
                    </header>
                    <div className="manager-editor-grid">
                      <label>
                        <span>ID</span>
                        <input
                          value={itemEditor.id}
                          onChange={(event) => setItemEditor({ ...itemEditor, id: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Name</span>
                        <input
                          value={itemEditor.name}
                          onChange={(event) => setItemEditor({ ...itemEditor, name: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Type</span>
                        <select
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
                        <span>Width (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={itemEditor.width}
                          onChange={(event) => setItemEditor({ ...itemEditor, width: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Depth (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={itemEditor.depth}
                          onChange={(event) => setItemEditor({ ...itemEditor, depth: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Height (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={itemEditor.height}
                          onChange={(event) => setItemEditor({ ...itemEditor, height: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Color</span>
                        <input
                          type="color"
                          value={itemEditor.defaultColor}
                          onChange={(event) => setItemEditor({ ...itemEditor, defaultColor: event.target.value })}
                        />
                      </label>
                    </div>
                    <div className="manager-capabilities">
                      {(["canConvey", "canPalletize", "canWrap", "hasFlowDirection"] as const).map((key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={itemEditor[key]}
                            onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.checked })}
                          />
                          <span>{key}</span>
                        </label>
                      ))}
                    </div>
                    <div className="manager-editor-actions">
                      <button type="button" onClick={saveItem}>
                        Save Item
                      </button>
                      <button type="button" onClick={() => setItemEditor(null)}>
                        Cancel
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <p className="empty-selection">Project Custom Library is not available.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
