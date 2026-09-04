// Test-only, embedded indexed box. Never included in the release Library.
export const createNativeGlbFixture = (options: { noGeometry?: boolean; external?: boolean; unindexed?: boolean; offset?: boolean } = {}) => {
  const vertices = [-1, 0, -1.5, 1, 0, -1.5, 1, 1, -1.5, -1, 1, -1.5, -1, 0, 1.5, 1, 0, 1.5, 1, 1, 1.5, -1, 1, 1.5];
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5]);
  const positions = new Float32Array(options.unindexed ? Array.from(indices).flatMap((index) => vertices.slice(index * 3, index * 3 + 3)) : vertices);
  const binary = new Uint8Array(positions.byteLength + indices.byteLength);
  binary.set(new Uint8Array(positions.buffer)); binary.set(new Uint8Array(indices.buffer), positions.byteLength);
  const json = new TextEncoder().encode(JSON.stringify({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, ...(options.offset ? { translation: [12, 7, 18] } : {}) }],
    meshes: [{ primitives: options.noGeometry ? [] : [{ attributes: { POSITION: 0 }, ...(options.unindexed ? {} : { indices: 1 }), material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.3, 0.65, 0.7, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: binary.byteLength, ...(options.external ? { uri: "external.bin" } : {}) }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }, { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: [-1, 0, -1.5], max: [1, 1, 1.5] }, { bufferView: 1, componentType: 5123, count: indices.length, type: "SCALAR" }]
  }));
  const jsonLength = Math.ceil(json.byteLength / 4) * 4;
  const buffer = new ArrayBuffer(28 + jsonLength + binary.byteLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, jsonLength).fill(32); new Uint8Array(buffer).set(json, 20);
  view.setUint32(20 + jsonLength, binary.byteLength, true); view.setUint32(24 + jsonLength, 0x004e4942, true);
  new Uint8Array(buffer).set(binary, 28 + jsonLength);
  return buffer;
};
