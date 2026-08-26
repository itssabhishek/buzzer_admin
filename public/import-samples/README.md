# Bulk import samples

Upload one file at a time from **Sports Management → Bulk Import** and select the matching record type. CSV headers and JSON keys match the importer exactly.

The dependent samples use the active `Abhishek Drilldown Test` IDs:

- Sport: `33dbb751-2f3e-41b4-bb1c-5846bc4eec74`
- Governing Body: `3096f526-5e60-4d00-8a93-b58861b28f1a`
- Organisation: `9a33732d-a85b-4866-8a2c-6ee6017ecd3d`
- Team: `af5858b6-3e32-413b-a17d-8f1022ac9c0b`

Re-uploading the same file should report duplicate rows as skipped when the API responds with `409`.
