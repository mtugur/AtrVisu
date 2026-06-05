import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MachineTaxonomy } from "../types/taxonomy";
import {
  CUSTOM_TAXONOMY_STORAGE_KEY,
  createTaxonomyId,
  loadMachineTaxonomy,
  saveCustomTaxonomy
} from "../utils/taxonomy";

type TaxonomyManagerProps = {
  onClose: () => void;
  onChanged: () => void;
};

const updateById = <T extends { id: string }>(items: T[], id: string, updater: (item: T) => T) => {
  return items.map((item) => (item.id === id ? updater(item) : item));
};

export function TaxonomyManager({ onClose, onChanged }: TaxonomyManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [taxonomy, setTaxonomy] = useState<MachineTaxonomy | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadMachineTaxonomy().then((loaded) => {
      if (!cancelled) {
        setTaxonomy(loaded);
        setSelectedCategoryId(loaded.categories[0]?.id ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCategory = taxonomy?.categories.find((category) => category.id === selectedCategoryId);
  const visibleMachineTypes = useMemo(
    () => taxonomy?.machineTypes.filter((type) => type.categoryId === selectedCategoryId) ?? [],
    [selectedCategoryId, taxonomy?.machineTypes]
  );

  const persist = (nextTaxonomy: MachineTaxonomy, statusText: string) => {
    saveCustomTaxonomy(nextTaxonomy);
    setTaxonomy(nextTaxonomy);
    setMessage(statusText);
    onChanged();
  };

  const addCategory = () => {
    if (!taxonomy) return;
    const name = window.prompt("Category name");
    if (!name?.trim()) return;
    const category = { id: createTaxonomyId(name), name: name.trim(), readonly: false };
    persist({ ...taxonomy, categories: [...taxonomy.categories, category] }, "Category added.");
    setSelectedCategoryId(category.id);
  };

  const renameCategory = (id: string) => {
    if (!taxonomy) return;
    const category = taxonomy.categories.find((item) => item.id === id);
    if (!category || category.readonly) return;
    const name = window.prompt("New category name", category.name);
    if (!name?.trim()) return;
    persist(
      { ...taxonomy, categories: updateById(taxonomy.categories, id, (item) => ({ ...item, name: name.trim() })) },
      "Category renamed."
    );
  };

  const deleteCategory = (id: string) => {
    if (!taxonomy) return;
    const category = taxonomy.categories.find((item) => item.id === id);
    if (!category || category.readonly) return;
    if (!window.confirm(`Delete custom category "${category.name}" and its machine types?`)) return;
    const categories = taxonomy.categories.filter((item) => item.id !== id);
    persist(
      {
        ...taxonomy,
        categories,
        machineTypes: taxonomy.machineTypes.filter((item) => item.categoryId !== id)
      },
      "Category deleted."
    );
    setSelectedCategoryId(categories[0]?.id ?? "");
  };

  const addMachineType = () => {
    if (!taxonomy || !selectedCategoryId) return;
    const name = window.prompt("Machine type name");
    if (!name?.trim()) return;
    persist(
      {
        ...taxonomy,
        machineTypes: [
          ...taxonomy.machineTypes,
          { id: createTaxonomyId(name), name: name.trim(), categoryId: selectedCategoryId, readonly: false }
        ]
      },
      "Machine type added."
    );
  };

  const renameMachineType = (id: string) => {
    if (!taxonomy) return;
    const machineType = taxonomy.machineTypes.find((item) => item.id === id);
    if (!machineType || machineType.readonly) return;
    const name = window.prompt("New machine type name", machineType.name);
    if (!name?.trim()) return;
    persist(
      { ...taxonomy, machineTypes: updateById(taxonomy.machineTypes, id, (item) => ({ ...item, name: name.trim() })) },
      "Machine type renamed."
    );
  };

  const deleteMachineType = (id: string) => {
    if (!taxonomy) return;
    const machineType = taxonomy.machineTypes.find((item) => item.id === id);
    if (!machineType || machineType.readonly) return;
    if (!window.confirm(`Delete custom machine type "${machineType.name}"?`)) return;
    persist(
      { ...taxonomy, machineTypes: taxonomy.machineTypes.filter((item) => item.id !== id) },
      "Machine type deleted."
    );
  };

  const addPlaceholder = () => {
    if (!taxonomy) return;
    const name = window.prompt("Placeholder visual type name");
    if (!name?.trim()) return;
    persist(
      {
        ...taxonomy,
        placeholderVisualTypes: [
          ...taxonomy.placeholderVisualTypes,
          { id: createTaxonomyId(name), name: name.trim(), readonly: false }
        ]
      },
      "Placeholder visual type added."
    );
  };

  const renamePlaceholder = (id: string) => {
    if (!taxonomy) return;
    const placeholder = taxonomy.placeholderVisualTypes.find((item) => item.id === id);
    if (!placeholder || placeholder.readonly) return;
    const name = window.prompt("New placeholder visual type name", placeholder.name);
    if (!name?.trim()) return;
    persist(
      {
        ...taxonomy,
        placeholderVisualTypes: updateById(taxonomy.placeholderVisualTypes, id, (item) => ({
          ...item,
          name: name.trim()
        }))
      },
      "Placeholder visual type renamed."
    );
  };

  const addProductCode = () => {
    if (!taxonomy) return;
    const code = window.prompt("Product family code");
    if (!code?.trim()) return;
    const description = window.prompt("Description", "") ?? "";
    persist(
      {
        ...taxonomy,
        productFamilyCodes: [
          ...taxonomy.productFamilyCodes,
          { code: code.trim().toUpperCase(), name: code.trim().toUpperCase(), description, readonly: false }
        ]
      },
      "Product family code added."
    );
  };

  const editProductCode = (code: string) => {
    if (!taxonomy) return;
    const family = taxonomy.productFamilyCodes.find((item) => item.code === code);
    if (!family || family.readonly) return;
    const description = window.prompt("Description", family.description);
    if (description === null) return;
    persist(
      {
        ...taxonomy,
        productFamilyCodes: taxonomy.productFamilyCodes.map((item) =>
          item.code === code ? { ...item, description } : item
        )
      },
      "Product family code updated."
    );
  };

  const exportTaxonomy = () => {
    if (!taxonomy) return;
    const blob = new Blob([JSON.stringify(taxonomy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "atrvisu-custom-taxonomy.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importTaxonomy = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as MachineTaxonomy;
      saveCustomTaxonomy(parsed);
      const loaded = await loadMachineTaxonomy();
      setTaxonomy(loaded);
      setSelectedCategoryId(loaded.categories[0]?.id ?? "");
      setMessage("Custom taxonomy imported.");
      onChanged();
    } catch {
      setMessage("Could not import taxonomy JSON.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetTaxonomy = async () => {
    if (!window.confirm("Reset custom taxonomy changes in this browser?")) return;
    window.localStorage.removeItem(CUSTOM_TAXONOMY_STORAGE_KEY);
    const loaded = await loadMachineTaxonomy();
    setTaxonomy(loaded);
    setSelectedCategoryId(loaded.categories[0]?.id ?? "");
    setMessage("Custom taxonomy reset.");
    onChanged();
  };

  return createPortal(
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog taxonomy-dialog" role="dialog" aria-modal="true" aria-label="Taxonomy Manager">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Taxonomy Manager</h2>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>

        {message ? <p className="manager-status">{message}</p> : null}

        {taxonomy ? (
          <div className="taxonomy-layout">
            <section className="taxonomy-column">
              <div className="manager-column-header">
                <span>Categories</span>
                <button type="button" onClick={addCategory}>Add</button>
              </div>
              {taxonomy.categories.map((category) => (
                <div
                  className={category.id === selectedCategoryId ? "taxonomy-row is-selected" : "taxonomy-row"}
                  key={category.id}
                >
                  <button type="button" onClick={() => setSelectedCategoryId(category.id)}>
                    <strong>{category.name}</strong>
                    <span>{category.readonly ? "Built-in" : "Custom"}</span>
                  </button>
                  {!category.readonly ? (
                    <small>
                      <button type="button" onClick={() => renameCategory(category.id)}>Rename</button>
                      <button type="button" onClick={() => deleteCategory(category.id)}>Delete</button>
                    </small>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="taxonomy-column">
              <div className="manager-column-header">
                <span>Machine Types</span>
                <button type="button" onClick={addMachineType}>Add</button>
              </div>
              <p className="manager-readonly-note">{selectedCategory?.name ?? "No category selected"}</p>
              {visibleMachineTypes.map((machineType) => (
                <div className="taxonomy-row" key={machineType.id}>
                  <strong>{machineType.name}</strong>
                  <span>{machineType.readonly ? "Built-in" : "Custom"}</span>
                  {!machineType.readonly ? (
                    <small>
                      <button type="button" onClick={() => renameMachineType(machineType.id)}>Rename</button>
                      <button type="button" onClick={() => deleteMachineType(machineType.id)}>Delete</button>
                    </small>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="taxonomy-column">
              <div className="manager-column-header">
                <span>Visual Types</span>
                <button type="button" onClick={addPlaceholder}>Add</button>
              </div>
              {taxonomy.placeholderVisualTypes.map((placeholder) => (
                <div className="taxonomy-row" key={placeholder.id}>
                  <strong>{placeholder.name}</strong>
                  <span>{placeholder.id}</span>
                  {!placeholder.readonly ? (
                    <small><button type="button" onClick={() => renamePlaceholder(placeholder.id)}>Rename</button></small>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="taxonomy-column">
              <div className="manager-column-header">
                <span>Product Codes</span>
                <button type="button" onClick={addProductCode}>Add</button>
              </div>
              {taxonomy.productFamilyCodes.map((family) => (
                <div className="taxonomy-row" key={family.code}>
                  <strong>{family.code} - {family.name}</strong>
                  <span>{family.description}</span>
                  {!family.readonly ? (
                    <small><button type="button" onClick={() => editProductCode(family.code)}>Edit</button></small>
                  ) : null}
                </div>
              ))}
            </section>
          </div>
        ) : (
          <p className="empty-selection">Loading taxonomy...</p>
        )}

        <footer className="manager-footer">
          <div className="manager-footer-left">
            <button type="button" onClick={exportTaxonomy}>Export Custom Taxonomy</button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>Import Custom Taxonomy</button>
            <input
              className="file-input"
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importTaxonomy(file);
              }}
            />
          </div>
          <div className="manager-footer-right">
            <button className="danger-action" type="button" onClick={resetTaxonomy}>Reset Custom Taxonomy</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}
