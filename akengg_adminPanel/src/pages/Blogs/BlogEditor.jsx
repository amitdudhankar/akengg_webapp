// import React, { useRef, useState } from "react";
// import JoditEditor from "jodit-react";

// const BlogEditor = ({ value, onChange }) => {
//   const editor = useRef(null);
//   const [content, setContent] = useState(value || "");

//   return (
//     <div>
//       <JoditEditor
//         ref={editor}
//         value={content}
//         config={{
//           readonly: false,
//           placeholder: "Start typing your blog content...",
//           uploader: {
//             insertImageAsBase64URI: true // Enables image insertion as Base64
//           },
//           height: 400,
//         }}
//         onBlur={(newContent) => {
//           setContent(newContent);
//           onChange(newContent); // Pass value to parent if needed
//         }}
//       />
//     </div>
//   );
// };

// export default BlogEditor;
import React, { useRef, useState } from "react";
import JoditEditor from "jodit-react";

const BlogEditor = ({ value, onChange }) => {
  const editor = useRef(null);
  const [content, setContent] = useState(value || "");

  const config = {
    readonly: false,
    placeholder: "Start typing your blog content...",
    uploader: {
      insertImageAsBase64URI: true,
    },
    height: 400,
    clipboard: {
      matchVisual: false,
      cleanHTML: false,
    },
    askBeforePasteHTML: false,
    processPasteHTML: true,
  };

  return (
    <div className="max-w-full overflow-x-auto">
      <JoditEditor
        ref={editor}
        value={content}
        config={config}
        onBlur={(newContent) => {
          setContent(newContent);
          onChange(newContent);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const clipboardData = e.clipboardData || window.clipboardData;
          const pastedData =
            clipboardData.getData("text/html") ||
            clipboardData.getData("text/plain");

          if (editor.current) {
            editor.current.selection.insertHTML(pastedData);
          }
        }}
      />
    </div>
  );
};

export default BlogEditor;

