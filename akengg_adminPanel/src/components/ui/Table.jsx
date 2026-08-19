// Table primitives so all twelve list pages share one look: uppercase hairline
// headers, row dividers and a hover state, instead of the heavy boxed borders
// each page drew for itself.

export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ minWidth = "820px", children }) {
  return (
    <table className="w-full text-sm" style={{ minWidth }}>
      {children}
    </table>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ className = "", children }) {
  return <th className={`px-4 pb-2.5 font-medium ${className}`}>{children}</th>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Tr({ className = "", children, ...rest }) {
  return (
    <tr className={`transition hover:bg-gray-50 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ className = "", children, ...rest }) {
  return (
    <td className={`px-4 py-3 text-gray-700 ${className}`} {...rest}>
      {children}
    </td>
  );
}
