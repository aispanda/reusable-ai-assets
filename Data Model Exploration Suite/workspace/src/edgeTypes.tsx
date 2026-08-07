import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react';

type Point = { x: number; y: number };
type Multiplicity = '1' | '0..1' | '1..*' | '0..*';
type RoutedEdgeData = { points?: Point[]; sourceMultiplicity?: Multiplicity; targetMultiplicity?: Multiplicity };

function MultiplicityMarker({ point, direction, multiplicity, stroke }: { point: Point; direction: Point; multiplicity: Multiplicity; stroke: string }) {
  const angle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
  const bar = (x: number) => <line key={`bar-${x}`} x1={x} y1={-6} x2={x} y2={6} />;
  const many = <path d="M 4 0 L 13 -7 M 4 0 L 13 0 M 4 0 L 13 7" />;
  return (
    <g className="multiplicity-marker" data-multiplicity={multiplicity} transform={`translate(${point.x} ${point.y}) rotate(${angle})`} stroke={stroke}>
      {multiplicity === '1' && <>{bar(4)}{bar(9)}</>}
      {multiplicity === '0..1' && <>{bar(4)}<circle cx={12} cy={0} r={4} /></>}
      {multiplicity === '1..*' && <>{many}{bar(17)}</>}
      {multiplicity === '0..*' && <>{many}<circle cx={19} cy={0} r={4} /></>}
    </g>
  );
}

function midpoint(points: Point[]): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (travelled + lengths[index] >= half) {
      const ratio = lengths[index] === 0 ? 0 : (half - travelled) / lengths[index];
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
      };
    }
    travelled += lengths[index];
  }
  return points[points.length - 1];
}

function RoutedEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd, label, interactionWidth }: EdgeProps<Edge<RoutedEdgeData>>) {
  const points = data?.points && data.points.length >= 2 ? data.points : [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const labelPoint = midpoint(points);
  const stroke = String(style?.stroke ?? 'var(--relationship)');
  const startDirection = { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
  const last = points.length - 1;
  const endDirection = { x: points[last - 1].x - points[last].x, y: points[last - 1].y - points[last].y };
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={interactionWidth} />
      <MultiplicityMarker point={points[0]} direction={startDirection} multiplicity={data?.sourceMultiplicity ?? '1'} stroke={stroke} />
      <MultiplicityMarker point={points[last]} direction={endDirection} multiplicity={data?.targetMultiplicity ?? '0..*'} stroke={stroke} />
      {label && (
        <EdgeLabelRenderer>
          <div className="routed-edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)` }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { routed: RoutedEdge };
