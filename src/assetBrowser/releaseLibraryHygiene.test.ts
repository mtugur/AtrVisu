// Node is available to Vitest; the browser application intentionally has no @types/node dependency.
// @ts-expect-error Test-only built-in import is outside the browser TypeScript surface.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { LibraryGroup, LibraryIndexEntry, LoadedMachineLibrary } from "../types/machine";
import { removeDuplicateLibraryItems, validateLibraryDocument } from "../utils/libraryValidation";

type ReleaseIndex = Readonly<{
  libraries: readonly LibraryIndexEntry[];
}>;

const readJson = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../public/library/${relativePath}`, import.meta.url),
  "utf8"
));

const collectItemIds = (group: LibraryGroup): readonly string[] => [
  ...group.items.map((item) => item.id),
  ...group.children.flatMap(collectItemIds)
];

const collectGroupIdentities = (group: LibraryGroup): readonly string[] => [
  group.id,
  group.name,
  ...group.children.flatMap(collectGroupIdentities)
];

describe("release asset-browser library hygiene", () => {
  it("ships unique enabled libraries and canonical assets without diagnostic identities", () => {
    const index = readJson("libraries.index.json") as ReleaseIndex;
    const enabledEntries = index.libraries.filter((entry) => entry.enabled);
    const forbiddenReleaseIdentity = /(?:^|[-_\s])(debug|test|fixture|demo)(?:$|[-_\s])/i;

    expect(new Set(enabledEntries.map((entry) => entry.libraryId)).size).toBe(enabledEntries.length);
    enabledEntries.forEach((entry) => {
      expect(`${entry.libraryId} ${entry.libraryName} ${entry.path}`).not.toMatch(forbiddenReleaseIdentity);
    });

    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const loaded = enabledEntries.map((entry) => validateLibraryDocument(
      entry,
      readJson(entry.path.replace("/library/", "")),
      []
    ));
    const rawCanonicalCount = loaded.reduce(
      (total, library) => total + collectItemIds(library.root).length,
      0
    );
    const duplicateWarnings: Parameters<typeof removeDuplicateLibraryItems>[1] = [];
    const deduplicated: readonly LoadedMachineLibrary[] = removeDuplicateLibraryItems(
      [...loaded],
      duplicateWarnings
    );
    const survivingIds = deduplicated.flatMap((library) => collectItemIds(library.root));

    expect(duplicateWarnings).toEqual([]);
    expect(survivingIds).toHaveLength(rawCanonicalCount);
    expect(new Set(survivingIds).size).toBe(survivingIds.length);
    deduplicated.forEach((library) => {
      collectGroupIdentities(library.root).forEach((identity) => {
        expect(identity).not.toMatch(forbiddenReleaseIdentity);
      });
    });
    warningSpy.mockRestore();
  });
});
