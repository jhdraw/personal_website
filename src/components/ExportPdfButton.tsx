"use client";

// Owner-only export. Uses the browser's own print pipeline (paired with the
// @media print rules in globals.css) because it renders KaTeX, code blocks,
// tables and images exactly as they appear on screen and keeps the text
// selectable — which canvas-to-image PDF libraries do not.
export default function ExportPdfButton({ title }: { title: string }) {
  function exportPdf() {
    // Browsers use document.title as the suggested PDF filename, so swap in
    // the bare post title for the duration of the print dialog.
    const original = document.title;
    const restore = () => {
      document.title = original;
      window.removeEventListener("afterprint", restore);
    };
    document.title = title;
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      className="brutal-btn no-print bg-lime px-3 py-1 text-sm"
      title="Owner only — opens the print dialog; choose “Save as PDF”"
    >
      ⬇ EXPORT PDF
    </button>
  );
}
