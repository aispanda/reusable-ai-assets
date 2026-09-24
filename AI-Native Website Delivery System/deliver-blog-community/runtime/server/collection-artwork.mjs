import { randomUUID } from 'node:crypto';
import { validateStudioImageUpload } from './studio-content-assets.mjs';
import { manageCollection } from './collection-management.mjs';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const imageId = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

// Upload only on Save; the registry and image reference become public atomically.
export async function saveCollectionArtwork({ db, bucket, uid, body, bytes, mimeType }) {
  const access = (await db.collection('studioAccess').doc(uid).get()).data();
  if (!access?.active || access.role !== 'administrator') fail('Administrator access is required to upload collection artwork.', 403);
  if (!['create', 'update'].includes(body?.action)) fail('Choose a collection to save.');
  if (!bucket?.file) fail('Image storage is temporarily unavailable. Your collection has not changed.', 503);
  const alt = body.collection?.imageAlt;
  if (typeof alt !== 'string' || !alt.trim() || alt.length > 500) fail('Add an image description before publishing.');
  const image = await validateStudioImageUpload({ bytes, mimeType });
  const id = randomUUID();
  const objectPath = `collection-artwork/${id}.${image.extension}`;
  const file = bucket.file(objectPath);
  let generation;
  let savingCollection = false;
  try {
    await file.save(image.bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: image.mimeType, cacheControl: 'no-store' } });
    const [metadata] = await file.getMetadata();
    generation = String(metadata.generation ?? '');
    if (!/^\d+$/.test(generation)) fail('Image storage could not confirm the upload.', 502);
    const uploadedImage = { id, objectPath, generation, contentType: image.mimeType, size: image.size,
      width: image.width, height: image.height, createdBy: uid, createdAt: new Date().toISOString() };
    savingCollection = true;
    return await manageCollection({ db, uid, body: { ...body, collection: { ...body.collection,
      image: `/content-assets/collections/${id}` } }, uploadedImage });
  } catch (error) {
    // A lost transaction response may follow a successful commit. Delete only a
    // confirmed, unreferenced generation; an uncertain read must preserve it.
    if (generation) {
      const reference = await db.collection('collectionImages').doc(id).get().catch(() => null);
      if (reference && !reference.exists) await file.delete({ ignoreNotFound: true, ifGenerationMatch: generation }).catch(() => {});
    }
    if (error?.statusCode) throw error;
    if (savingCollection) fail('Could not confirm whether the collection was saved. Reload collections before trying again.', 502);
    fail('The image could not be saved. Your collection has not changed. Please try again.', 502);
  }
}

export async function resolveCollectionArtwork({ db, bucket, id }) {
  if (!imageId.test(id)) fail('Image not found.', 404);
  const [image, registry] = await Promise.all([
    db.collection('collectionImages').doc(id).get(), db.collection('contentCollections').doc('registry').get(),
  ]);
  const asset = image.data();
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[asset?.contentType];
  if (!asset || asset.id !== id || !extension || asset.objectPath !== `collection-artwork/${id}.${extension}`
    || !/^\d+$/.test(asset.generation) || !Number.isInteger(asset.size) || asset.size < 1 || asset.size > 5 * 1024 * 1024
    || !registry.data()?.collections?.some(row => row.art?.src === `/content-assets/collections/${id}`)) fail('Image not found.', 404);
  if (!bucket?.file) fail('Image storage is temporarily unavailable.', 503);
  return { asset, file: bucket.file(asset.objectPath, { generation: asset.generation }) };
}
