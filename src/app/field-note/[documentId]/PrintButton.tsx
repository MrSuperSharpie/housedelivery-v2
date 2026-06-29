'use client'

// Small client affordance for the otherwise-static Field Note Record page.
// Hidden when printing so it never appears on the saved PDF / paper copy.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center justify-center gap-2 rounded-xl border border-[#FF5F15] bg-[#FF5F15] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e0530f]"
    >
      Print or Save as PDF
    </button>
  )
}
