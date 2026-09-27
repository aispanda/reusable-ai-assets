# FastMCP Gateway API Reference

## Tools

### 1. `get_secret(secret_name, version_id="latest")`
Retrieve encrypted secret from Google Secret Manager.

**Response:**
- `status`: "success" or "error"
- `value`: Decrypted secret string
- `version`: Version ID retrieved

### 2. `upload_to_gcs(bucket_name, blob_path, local_file_path, metadata={})`
Upload artifact to Google Cloud Storage with versioning.

**Response:**
- `status`: "success" or "error"
- `gcs_url`: gs://bucket/path
- `file_hash`: SHA256 checksum

### 3. `sync_gcs_to_local(bucket_name, blob_prefix, local_dir)`
Sync GCS folder to local directory (incremental).

**Response:**
- `status`: "success" or "error"
- `files_synced` (int): Number of files

### 4. `validate_with_judge(artifact_type, content, rules_path)`
Submit artifact to Judge LLM for validation.

**Response:**
- `status`: "validated" or "error"
- `issues` (list): Found issues
- `passed` (bool): Validation result
