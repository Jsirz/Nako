import { isPlainObject } from './workflowJson.js';

export const UI_ONLY_NODE_TYPES = /^(?:Note|MarkdownNote|PrimitiveNode|Reroute)$/i;

export const UI_REROUTE_NODE_TYPES = /^Reroute$/i;

export const UI_PRIMITIVE_NODE_TYPES = /^PrimitiveNode$/i;

export const OUTPUT_NODE_TYPES = /(?:Save|Preview|Output|VideoCombine|Audio.*Save)/i;

export function linkId(link, format) {
  return format === 'comfy-ui-1.0' ? link?.id : link?.[0];
}

export function linkEndpoints(link, format) {
  if (format === 'comfy-ui-1.0') {
    return {
      originId: link?.origin_id,
      originSlot: link?.origin_slot,
      targetId: link?.target_id,
      targetSlot: link?.target_slot,
    };
  }
  return {
    originId: link?.[1],
    originSlot: link?.[2],
    targetId: link?.[3],
    targetSlot: link?.[4],
  };
}

export function connectionTarget(value) {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    Number.isInteger(value[1]) &&
    value[1] >= 0
  )
    return value[0];
  return null;
}

export function positionPair(value) {
  if (Array.isArray(value)) return [Number(value[0]) || 0, Number(value[1]) || 0];
  if (isPlainObject(value)) return [Number(value[0]) || 0, Number(value[1]) || 0];
  return [0, 0];
}

export function groupBounds(group) {
  const bounds = group?.bounding || group?.bounds;
  return Array.isArray(bounds) && bounds.length >= 4
    ? bounds.slice(0, 4).map((value) => Number(value) || 0)
    : null;
}

export function uiGroups(workflow) {
  return (Array.isArray(workflow.groups) ? workflow.groups : []).map((group, index) => ({
    id: String(group?.id ?? index),
    title: String(group?.title || `Group ${index + 1}`),
    bounds: groupBounds(group),
  }));
}

export function groupForNode(node, groups) {
  const [x, y] = positionPair(node.pos);
  const [width, height] = positionPair(node.size);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return (
    groups.find((group) => {
      if (!group.bounds) return false;
      const [left, top, groupWidth, groupHeight] = group.bounds;
      return (
        centerX >= left &&
        centerX <= left + groupWidth &&
        centerY >= top &&
        centerY <= top + groupHeight
      );
    }) || null
  );
}

export function slotAt(slots, slot) {
  if (!Array.isArray(slots)) return null;
  const explicit = slots.find((item) => String(item?.slot_index) === String(slot));
  if (explicit) return explicit;
  const index = Number(slot);
  return Number.isInteger(index) && index >= 0 ? slots[index] || null : null;
}

export function linkType(link, format) {
  return format === 'comfy-ui-1.0' ? link?.type : link?.[5];
}

export function normalizedConnectionType(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

export function concreteConnectionTypesMatch(values) {
  const typeSets = values
    .map((value) => normalizedConnectionType(value))
    .filter((value) => value && !['ANY', '*'].includes(value))
    .map(
      (value) =>
        new Set(
          value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
    );
  if (typeSets.length <= 1) return true;
  let compatible = new Set(typeSets[0]);
  for (const types of typeSets.slice(1)) {
    compatible = new Set([...compatible].filter((type) => types.has(type)));
    if (!compatible.size) return false;
  }
  return true;
}

export function primitiveWidgetValue(node) {
  if (Array.isArray(node?.widgets_values) && node.widgets_values.length === 1) {
    return { found: true, value: node.widgets_values[0] };
  }
  if (isPlainObject(node?.widgets_values)) {
    const values = Object.values(node.widgets_values);
    if (values.length === 1) return { found: true, value: values[0] };
  }
  return { found: false, value: undefined };
}
