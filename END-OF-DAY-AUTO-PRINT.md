# Automatic receipt printing

Print receipt opens a dedicated same-origin /admin-reconciliation-print.html page, covered by the existing admin Access path. The print page requests the already-built report through postMessage; parent and child verify exact origin and window identity. No financial details enter the URL or browser storage. No extra database reads or writes.

The print page waits for navigation, fonts and layout, invokes window.print automatically and closes itself after afterprint (which also fires on cancel). Admin closes the review modal when the child reports the print dialogue finished. Browsers do not expose printer success; no financial state is changed by printing. A retry print button is retained if browser settings prevent automatic printing. Parent Ctrl+P isolation remains available.

13 tests pass. Production remains unchanged. Actual native Epson dialogue and physical acceptance pending owner test.
