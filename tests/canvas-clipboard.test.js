import { describe, expect, it } from 'vitest';
import {
  cloneCanvasNodes,
  insertClonedCanvasNodes,
} from '../modules/canvas-ui/ui/canvas/canvasClipboard';

function copy(nodes) {
  let number = 0;
  return cloneCanvasNodes(nodes, {
    offset: 20,
    createId: () => `copy-${++number}`,
    preserveParentConnections: true,
  });
}

describe('canvas clipboard connections', () => {
  it('does not copy text-node upstream or downstream connections', () => {
    const nodes = [
      { id: 'a', type: 'Text', x: 0, y: 0 },
      { id: 'b', type: 'Text', x: 100, y: 0, parentIds: ['a'] },
      { id: 'c', type: 'Text', x: 200, y: 0, parentIds: ['b'] },
    ];
    const copied = copy([nodes[1]]);
    const result = insertClonedCanvasNodes(nodes, copied.newNodes, copied.idMap, {
      preserveChildConnections: true,
    });

    expect(copied.newNodes[0].parentIds).toEqual([]);
    expect(result.find((node) => node.id === 'c').parentIds).toEqual(['b']);
  });

  it('does not retain text-node upstream links', () => {
    const nodes = [
      { id: 'outside', type: 'Text', x: 0, y: 0 },
      { id: 'a', type: 'Text', x: 100, y: 0, parentIds: ['outside'] },
      { id: 'b', type: 'Text', x: 200, y: 0, parentIds: ['a'], sourcePortIndices: [3] },
    ];
    const copied = copy(nodes.slice(1));

    expect(copied.newNodes[0]).toMatchObject({ id: 'copy-1', parentIds: [] });
    expect(copied.newNodes[1]).toMatchObject({ id: 'copy-2', parentIds: [] });
  });

  it('retains external upstream links for copied image and video generation nodes', () => {
    const nodes = [
      { id: 'source', type: 'Upload Image', x: 0, y: 0 },
      { id: 'image', type: 'Image', x: 100, y: 0, parentIds: ['source'] },
      { id: 'video', type: 'Video', x: 100, y: 100, parentIds: ['source'] },
    ];
    const copied = copy(nodes.slice(1));

    expect(copied.newNodes[0]).toMatchObject({ id: 'copy-1', parentIds: ['source'] });
    expect(copied.newNodes[1]).toMatchObject({ id: 'copy-2', parentIds: ['source'] });
  });

  it('clears external ComfyUI slots without changing their port positions', () => {
    const copied = copy([
      { id: 'inside', type: 'Text', x: 0, y: 0 },
      {
        id: 'workflow', type: 'ComfyUI', x: 100, y: 0,
        parentIds: ['outside', 'inside'], sourcePortIndices: [5, 2],
      },
    ]);

    expect(copied.newNodes[1]).toMatchObject({
      parentIds: ['', ''], sourcePortIndices: [0, 0],
    });
  });

  it('duplicates downstream custom-node links using the copied source ID', () => {
    const nodes = [
      { id: 'a', type: 'source', x: 0, y: 0 },
      {
        id: 'b', type: 'target', x: 100, y: 0,
        parentIds: ['a'], sourcePortIndices: [1],
        inputLinks: [{ sourceNodeId: 'a', sourcePortId: 'output', targetPortId: 'input' }],
      },
    ];
    const copied = copy([nodes[0]]);
    const result = insertClonedCanvasNodes(nodes, copied.newNodes, copied.idMap, {
      preserveChildConnections: true,
    });
    const target = result.find((node) => node.id === 'b');

    expect(target.inputLinks).toEqual([
      { sourceNodeId: 'a', sourcePortId: 'output', targetPortId: 'input' },
      { sourceNodeId: 'copy-1', sourcePortId: 'output', targetPortId: 'input' },
    ]);
    expect(target.parentIds).toEqual(['a', 'copy-1']);
    expect(target.sourcePortIndices).toEqual([1, 1]);
  });
});
