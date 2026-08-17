// Renders a Schema.org JSON-LD block. JSON-LD may live anywhere in the document,
// so this just emits a <script type="application/ld+json">. Pass a plain object
// (or array) as `data`.
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
