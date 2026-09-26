// Consumer UI adapter: selection/preview are local; only explicit Save sends bytes.
// getToken must use the site's existing Firebase session. Never store tokens here.
export function collectionArtworkInput({ getToken, fetcher = globalThis.fetch, urls = globalThis.URL }) {
  let file = null;
  let previewUrl = null;
  let saving = false;
  const clear = () => {
    if (previewUrl) urls.revokeObjectURL(previewUrl);
    file = null; previewUrl = null;
  };
  return {
    select(candidate) {
      if (saving) throw new Error('Wait for the current save to finish.');
      if (!candidate || !['image/png', 'image/jpeg', 'image/webp'].includes(candidate.type)
        || candidate.size < 1 || candidate.size > 5 * 1024 * 1024) {
        throw new Error('Choose a PNG, JPEG or WebP image up to 5 MB.');
      }
      clear(); file = candidate; previewUrl = urls.createObjectURL(candidate);
      return previewUrl;
    },
    cancel() {
      if (saving) throw new Error('Wait for the current save to finish.');
      clear();
    },
    async save(body) {
      if (saving) throw new Error('A save is already in progress.');
      if (file && (!body?.collection?.imageAlt?.trim() || body.collection.imageAlt.length > 500)) {
        throw new Error('Add an image description before publishing.');
      }
      saving = true;
      try {
        const upload = file ? new FormData() : null;
        if (upload) { upload.append('file', file); upload.append('collection', JSON.stringify(body)); }
        const token = await getToken();
        if (!token) throw new Error('Sign in to save the collection.');
        const response = await fetcher('/api/content/collections', {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, ...(upload ? {} : { 'Content-Type': 'application/json' }) },
          body: upload || JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error(result.error || 'Could not confirm the save. Reload collections before retrying.'), { statusCode: response.status });
        clear();
        return result;
      } finally { saving = false; }
    },
    get saving() { return saving; },
    get previewUrl() { return previewUrl; },
  };
}
