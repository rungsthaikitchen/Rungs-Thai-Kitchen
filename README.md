# Isolated disabled Master Wok browser preview

Preview-only snapshot. DO NOT MERGE THIS BRANCH INTO MAIN. It intentionally contains no production website, checkout, legacy proxies or deployment workflows.

Both /admin-api/staff-command-v1 and /admin-api/staff-state-v1 always return 503 STAFF_BROWSER_STAGING_DISABLED. No environment credentials are read and no data transport is configured.

The UI is for synthetic orders only. Source, tests and review notes are maintained in rungsthaikitchen/master-wok-shadow on review/cutover-fixtures-2026-10-24.
