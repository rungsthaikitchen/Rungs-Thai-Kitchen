# Receipt-only print isolation

Owner photo showed the Admin modal controls, repeated across pages, and parts of the fixed-height iframe. Prior standalone-window sizing did not address browser printing of the parent page.

Print now renders a complete receipt in a dedicated direct child of body, closes the top-layer modal during printing, enables print-only CSS that hides all other body children, and removes fixed heights/overflow. beforeprint also handles Ctrl+P while a built receipt is open. afterprint restores the modal and disables the isolated styling. No popup or custom paper length. Printer-selected paper size is retained via @page size:auto.

12 tests pass: nine calculations plus receipt-only output, browser Ctrl+P/cancel, and print-error restoration. Physical Epson acceptance remains pending. No production changes.
