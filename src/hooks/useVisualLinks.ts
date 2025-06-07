// src/hooks/useVisualLinks.ts
import { useState, useEffect } from 'react';
// Changed import type for NodeType
import { type Node, type Link as VisualLink, NodeType } from '../../types';
import { NODE_WIDTH, NODE_HEIGHT } from '../../constants'; // Assuming these are in constants

const getLineToRectangleIntersectionPoint = (
  lineP1: { x: number; y: number },
  lineP2: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): { x: number; y: number } => {
  const { x: rectX, y: rectY, width: rectW, height: rectH } = rect;
  const sides = [
    { p3: { x: rectX, y: rectY }, p4: { x: rectX + rectW, y: rectY } }, // Top
    { p3: { x: rectX + rectW, y: rectY }, p4: { x: rectX + rectW, y: rectY + rectH } }, // Right
    { p3: { x: rectX, y: rectY + rectH }, p4: { x: rectX + rectW, y: rectY + rectH } }, // Bottom
    { p3: { x: rectX, y: rectY }, p4: { x: rectX, y: rectY + rectH } }, // Left
  ];
  let closestIntersection = lineP2; // Default to lineP2 if no intersection (e.g. P1 inside rect)
  let minT = Infinity;

  for (const side of sides) {
    const { p3, p4 } = side;
    const den = (lineP1.x - lineP2.x) * (p3.y - p4.y) - (lineP1.y - lineP2.y) * (p3.x - p4.x);
    if (den === 0) continue; // Parallel lines

    const tNum = (lineP1.x - p3.x) * (p3.y - p4.y) - (lineP1.y - p3.y) * (p3.x - p4.x);
    const uNum = -((lineP1.x - lineP2.x) * (lineP1.y - p3.y) - (lineP1.y - lineP2.y) * (lineP1.x - p3.x));

    const t = tNum / den;
    const u = uNum / den;

    // Check if intersection point is on both line segments
    if (u >= 0 && u <= 1 && t >= 0 && t <= 1) {
        if (t < minT) { // We want the intersection closest to P1 along the line segment P1-P2
            minT = t;
            closestIntersection = {
                x: lineP1.x + t * (lineP2.x - lineP1.x),
                y: lineP1.y + t * (lineP2.y - lineP1.y),
            };
        }
    }
  }
  return closestIntersection;
};


export const useVisualLinks = (nodes: Node[]) => {
  const [visualLinks, setVisualLinks] = useState<VisualLink[]>([]);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setVisualLinks([]);
      return;
    }

    const newVisualLinks: VisualLink[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    nodes.forEach(sourceNode => {
      const processLink = (targetNodeId: string | null | undefined, condition?: string) => {
        if (targetNodeId) {
          const targetNode = nodeMap.get(targetNodeId);
          if (targetNode) {
            newVisualLinks.push({
              id: `${sourceNode.id}-${targetNodeId}-${condition || 'direct'}`,
              sourceId: sourceNode.id,
              targetId: targetNodeId,
              condition,
            });
          }
        }
      };

      if (sourceNode.type === NodeType.START || 
          sourceNode.type === NodeType.PROMPT || 
          sourceNode.type === NodeType.VARIABLE ||
          sourceNode.type === NodeType.QUESTION // Added QUESTION node type here
        ) {
        processLink(sourceNode.nextNodeId);
      } else if (sourceNode.type === NodeType.CONDITIONAL && sourceNode.branches) {
        sourceNode.branches.forEach(branch => {
          processLink(branch.nextNodeId, branch.condition);
        });
      }
    });
    setVisualLinks(newVisualLinks);
  }, [nodes]);

  // Expose the calculation helper if needed externally, or keep it internal.
  // For now, it's internal to this hook.
  return { visualLinks, getLineToRectangleIntersectionPoint };
};