/**
 * Shimmer rows shown while a list loads. Before this every list page started
 * with an empty array, so it flashed "No records found." on every visit before
 * the data landed — which reads as "there is nothing here", not "loading".
 */
function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <div
                className="h-3 animate-pulse rounded bg-gray-100"
                // Staggered widths so it reads as content, not a block.
                style={{ width: `${[70, 55, 85, 45, 60, 75][colIndex % 6]}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default TableSkeleton;
