# Receipt truncation follow-up

Owner reported incomplete physical output from first preview. Found invalid CSS `size:80mm auto`; replaced it with a measured explicit roll length. Print waits for fonts and two layout frames, measures the complete receipt and sets 80mm width plus content height and margin allowance. Added END OF RECEIPT marker and versioned script references.

Ten tests pass, including a print-flow integration test with 1400px of receipt content requiring 381mm paper. Physical Epson acceptance is still required; printer-driver paper settings may override browser CSS. Use the receipt's Print receipt button, not printing the scrollable Admin page. Production unchanged.
