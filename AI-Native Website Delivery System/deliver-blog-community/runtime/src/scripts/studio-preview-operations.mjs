const normalizedPreviewState = (state) => ({
  editVersion: state.editVersion,
  updatedAt: state.updatedAt,
  revision: state.revision,
  contentSha256: state.contentSha256,
});

export const captureStudioPreviewState = (state) => Object.freeze(normalizedPreviewState(state));

export const isStudioPreviewStateCurrent = (captured, current) => (
  current.hasUnsavedChanges !== true
  && captured.editVersion === current.editVersion
  && captured.updatedAt === current.updatedAt
  && captured.revision === current.revision
  && captured.contentSha256 === current.contentSha256
);

const privatePreviewImageSource = async (blob) => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    // DOMParser documents are inert: decode against the active document instead.
    const decoder = new Image();
    decoder.src = objectUrl;
    await decoder.decode();
    // The opaque preview sandbox cannot read parent-origin blob URLs. Its existing
    // CSP permits data images, so embed only these already-authorized image bytes.
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('Image reading was interrupted.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const hydratePrivatePreviewImages = async (html, loadImage) => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  const images = [...parsedDocument.querySelectorAll('img[src^="/content-assets/"]')];
  // Wait for every operation to release its temporary URL, including a slow
  // successful image when another load fails. Never return a partial preview.
  const results = await Promise.allSettled(images.map(async (image, index) => {
    try {
      const source = image.getAttribute('src') ?? '';
      const assetId = decodeURIComponent(source.slice('/content-assets/'.length));
      if (!/^[a-f0-9-]{36}$/.test(assetId)) throw new Error('The preview contains an invalid image reference.');
      image.src = await privatePreviewImageSource(await loadImage(assetId));
    } catch (cause) {
      throw new Error(`Preview could not load article image ${index + 1}. Your saved image has not been changed. Try Preview again; if it still fails, reopen the article and check this image.`, { cause });
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  return `<!doctype html>${parsedDocument.documentElement.outerHTML}`;
};
