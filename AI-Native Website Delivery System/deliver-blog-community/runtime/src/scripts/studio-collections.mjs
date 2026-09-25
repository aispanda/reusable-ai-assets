import { getAuth } from 'firebase/auth';
import { getFirebaseClientApp } from './firebase-client';
import { editorialRequest } from './editorial-ui';

const tokens = value => value.split(',').map(item => item.trim()).filter(Boolean);
const element = (tag, text, attrs = {}) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};

export async function initializeCollectionsUI({ role, tagsInput, slugInput }) {
  const managing = ['/manage/collections', '/manage/threads'].includes(window.location.pathname) || ['collections', 'threads'].includes(new URLSearchParams(window.location.search).get('view'));
  if (managing && role !== 'administrator') {
    window.location.replace('/my-articles');
    return;
  }
  const field = element('fieldset');
  field.dataset.collectionAssignments = '';
  field.append(element('legend', 'Collection'), element('small', 'Choose one collection for this article. Changes appear publicly only after publication.'));
  const choices = element('div');
  const status = element('p', 'Loading collections…', { role: 'status', 'aria-live': 'polite' });
  field.append(choices, status);
  tagsInput.closest('label').after(field);
  const visibleTags = element('input', '', { type: 'text', 'aria-label': 'Tags' });
  tagsInput.type = 'hidden';
  tagsInput.after(visibleTags);
  visibleTags.disabled = tagsInput.disabled;
  visibleTags.addEventListener('input', () => {
    tagsInput.value = [...tokens(visibleTags.value).filter(tag => !tag.startsWith('collection:')), ...tokens(tagsInput.value).filter(tag => tag.startsWith('collection:'))].join(', ');
    tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  let data = { collections: [], revision: 0, approvedImages: [] };
  const request = async (body, file) => {
    const upload = file ? new FormData() : null;
    if (upload) { upload.append('file', file); upload.append('collection', JSON.stringify(body)); }
    const response = await fetch('/api/content/collections', body ? {
      method: 'POST', headers: { ...(upload ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${await getAuth(getFirebaseClientApp()).currentUser.getIdToken()}` }, body: upload || JSON.stringify(body),
    } : {});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Collections are temporarily unavailable.');
    return payload;
  };
  const renderChoices = () => {
    const assigned = tokens(tagsInput.value).filter(tag => tag.startsWith('collection:'));
    const selected = assigned.length ? assigned.map(tag => tag.slice(11)) : [];
    visibleTags.value = tokens(tagsInput.value).filter(tag => !tag.startsWith('collection:')).join(', ');
    choices.replaceChildren();
    for (const row of data.collections) {
      if (row.archived && !selected.includes(row.id)) continue;
      const label = element('label');
      const input = element('input', '', { type: 'radio', name: 'article-thread', value: row.id, 'data-collection-choice': row.id });
      input.checked = selected.includes(row.id);
      input.disabled = tagsInput.disabled;
      input.addEventListener('change', () => {
        const ids = [...choices.querySelectorAll('input:checked')].map(item => `collection:${item.value}`);
        tagsInput.value = [...tokens(tagsInput.value).filter(tag => !tag.startsWith('collection:')), ...(ids.length ? ids : ['collection:none'])].join(', ');
        tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      label.append(input, document.createTextNode(row.title + (row.archived ? ' · Archived — choose an active collection before submission' : ''))); choices.append(label);
    }
    status.textContent = data.collections.length ? '' : 'No collections yet. An Administrator can create one.';
    document.dispatchEvent(new CustomEvent('editorial-collections-loaded', { detail: data.collections }));
  };
  const reload = async () => { data = await request(); renderChoices(); };
  const retry = element('button', 'Retry collections', { type: 'button' });
  retry.hidden = true; field.append(retry);
  retry.addEventListener('click', () => reload().then(() => { retry.hidden = true; }).catch(error => { status.textContent = error.message; }));
  try { await reload(); } catch (error) { status.textContent = error.message; retry.hidden = false; }
  tagsInput.addEventListener('input', renderChoices);
  if (role !== 'administrator') return;
  const workspace = document.querySelector('[data-collection-manager]');
  if (!workspace) return;
  const listView = workspace.querySelector('[data-collections-list-view]');
  const editorView = workspace.querySelector('[data-collection-editor]');
  const editorHeading = workspace.querySelector('[data-collection-editor-title]');
  const list = workspace.querySelector('[data-collection-management-list]');
  const metrics = workspace.querySelector('[data-thread-metrics]');
  const search = workspace.querySelector('[data-collection-search]');
  const typeFilter = workspace.querySelector('[data-collection-type-filter]');
  const sort = workspace.querySelector('[data-collection-sort]');
  const form = workspace.querySelector('[data-collection-form]');
  const result = workspace.querySelector('[data-collection-status]');
  const save = workspace.querySelector('[data-save-collection]');
  const newButton = workspace.querySelector('[data-new-collection]');
  const closeEditor = workspace.querySelector('[data-close-collection-editor]');
  const cancel = workspace.querySelector('[data-cancel-collection]');
  const imagePreview = workspace.querySelector('[data-collection-image-preview]');
  const uploadInput = workspace.querySelector('[data-collection-image-upload]');
  const uploadStatus = workspace.querySelector('[data-collection-upload-status]');
  const clearUpload = workspace.querySelector('[data-clear-collection-upload]');
  let selectedFile = null;
  let localImageUrl = '';
  const urlPreview = workspace.querySelector('[data-collection-url-preview]');
  const fields = Object.fromEntries([...form.elements].filter(input => input.name).map(input => [input.name, input]));
  const image = fields.image;
  const typeLabels = { text: 'Text', philosophy: 'Philosophy', tradition: 'Tradition', practice: 'Practice', theme: 'Theme' };
  let counts = {};
  let editing = false;
  let initialForm = '';
  const formValues = () => JSON.stringify(Object.values(fields).map(input => input.type === 'checkbox' ? input.checked : input.value));
  const hasUnsavedChanges = () => !editorView.hidden && (selectedFile !== null || formValues() !== initialForm);
  const leaveEditor = () => {
    if (hasUnsavedChanges() && !window.confirm('Discard your unsaved collection changes?')) return;
    showList();
  };
  window.addEventListener('beforeunload', event => {
    if (hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; }
  });
  const filterOptions = workspace.querySelector('[data-collection-filter-options]');
  const narrow = window.matchMedia('(max-width: 760px)');
  const adaptFilters = () => { filterOptions.open = !narrow.matches; };
  adaptFilters(); narrow.addEventListener('change', adaptFilters);

  const metricNumber = (collection, key) => Number(collection[key] ?? collection[`${key}Count`] ?? 0);
  const refreshImagePreview = () => {
    const src = localImageUrl || image.value;
    fields.imageAlt.required = Boolean(src);
    imagePreview.hidden = !src;
    if (!src) return;
    const img = imagePreview.querySelector('img');
    img.src = src;
    img.alt = fields.imageAlt.value.trim();
    imagePreview.querySelector('span').textContent = fields.imageAlt.value.trim() || 'Add a description before publishing.';
  };
  const refreshUrlPreview = () => {
    urlPreview.textContent = `${window.location.origin}/topics/${fields.id.value.trim() || 'your-collection'}`;
  };
  const loadMetrics = async () => {
    metrics.textContent = 'Loading collection totals…';
    try {
      const result = await editorialRequest('metrics');
      const rows = result.metrics || result.collections || result.threads || [];
      counts = Array.isArray(rows) ? Object.fromEntries(rows.map(row => [row.id, row])) : rows;
      const totals = data.collections.reduce((summary, collection) => {
        const count = counts[collection.id] || {};
        summary.live += metricNumber(count, 'published');
        summary.drafts += metricNumber(count, 'draft') + metricNumber(count, 'returned') + metricNumber(count, 'unpublished') + metricNumber(count, 'pendingRevisions');
        summary.review += metricNumber(count, 'submitted');
        return summary;
      }, { live: 0, drafts: 0, review: 0 });
      metrics.replaceChildren(
        stat(String(data.collections.filter(row => !row.archived).length), 'Active collections'),
        stat(String(totals.live), 'Live articles'),
        stat(String(totals.drafts), 'Draft work'),
        stat(String(totals.review), 'Awaiting review'),
      );
      renderManager();
    } catch (error) { metrics.textContent = error.message; }
  };
  const stat = (value, label) => {
    const item = element('div', '', { class: 'studio-collection-stat' });
    item.append(element('strong', value), element('span', label));
    return item;
  };
  const reset = () => {
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    localImageUrl = ''; selectedFile = null; uploadStatus.hidden = true; clearUpload.hidden = true;
    form.reset(); fields.type.value = 'theme'; fields.id.disabled = false; fields.order.value = '50'; editing = false;
    save.textContent = 'Publish collection'; editorHeading.textContent = 'New collection'; refreshUrlPreview(); refreshImagePreview();
  };
  const showList = ({ focusId, message = '' } = {}) => {
    editorView.hidden = true; listView.hidden = false; result.textContent = message; renderManager();
    const target = focusId ? list.querySelector(`[data-collection-row="${CSS.escape(focusId)}"]`) : workspace.querySelector('#collection-manager-title');
    target?.focus();
  };
  const showEditor = row => {
    reset();
    if (row) {
      if (row.art?.src && ![...image.options].some(option => option.value === row.art.src)) {
        image.append(element('option', 'Current collection image', { value: row.art.src }));
      }
      for (const key of ['id', 'title', 'subtitle', 'description', 'family', 'order']) fields[key].value = row[key];
      fields.id.disabled = true; fields.image.value = row.art?.src || ''; fields.imageAlt.value = row.art?.alt || ''; fields.featured.checked = row.featured;
      fields.type.value = row.type || 'theme'; editing = true; save.textContent = 'Save and publish changes'; editorHeading.textContent = `Edit ${row.title}`;
    }
    listView.hidden = true; editorView.hidden = false; result.textContent = ''; refreshUrlPreview(); refreshImagePreview(); initialForm = formValues(); editorHeading.focus();
  };
  const actionMenu = row => {
    const details = element('details', '', { class: 'studio-row-menu' });
    const summary = element('summary', '•••', { 'aria-label': `More actions for ${row.title}` });
    const items = element('div', '', { class: 'studio-row-menu-items' });
    const archive = element('button', row.archived ? 'Restore collection' : 'Archive collection', { type: 'button' });
    archive.addEventListener('click', async () => {
      details.open = false; archive.disabled = true; result.textContent = row.archived ? 'Restoring collection…' : 'Archiving collection…';
      try {
        data = await request({ action: row.archived ? 'restore' : 'archive', id: row.id, expectedRevision: data.revision });
        renderManager(); renderChoices(); await loadMetrics(); result.textContent = row.archived ? 'Collection restored and published.' : 'Collection archived. Its existing live articles remain available.';
      } catch (error) { result.textContent = error.message; archive.disabled = false; }
    });
    const remove = element('button', 'Delete collection', { type: 'button', class: 'is-danger' });
    const count = counts[row.id] || {};
    const nonempty = ['draft', 'submitted', 'returned', 'published', 'unpublished', 'pendingRevisions'].some(key => metricNumber(count, key) > 0);
    if (nonempty) { remove.disabled = true; remove.title = 'Reassign every article and draft before deleting this collection.'; }
    remove.addEventListener('click', async () => {
      details.open = false;
      if (!window.confirm(`Delete the empty collection “${row.title}”? This cannot be undone.`)) return;
      remove.disabled = true;
      try { data = await request({ action: 'delete', id: row.id, expectedRevision: data.revision }); renderChoices(); await loadMetrics(); showList({ message: 'Collection deleted.' }); }
      catch (error) { result.textContent = error.message; remove.disabled = false; }
    });
    items.append(archive, remove); details.append(summary, items); return details;
  };
  const renderManager = () => {
    list.replaceChildren();
    image.replaceChildren(element('option', 'No image', { value: '' }), ...data.approvedImages.map(src => element('option', src.split('/').pop(), { value: src })));
    const query = search.value.trim().toLocaleLowerCase();
    const rows = data.collections.filter(row => `${row.title} ${row.id}`.toLocaleLowerCase().includes(query) && (!typeFilter.value || (row.type || 'theme') === typeFilter.value)).sort((a, b) => sort.value === 'title' ? a.title.localeCompare(b.title) : sort.value === 'type' ? (a.type || 'theme').localeCompare(b.type || 'theme') || a.title.localeCompare(b.title) : a.order - b.order || a.title.localeCompare(b.title));
    if (!rows.length) {
      const empty = element('div', '', { class: 'studio-library-empty' }); empty.append(element('h2', 'No matching collections'), element('p', 'Change the search or type filter, or create a new collection.')); list.append(empty); return;
    }
    const columns = element('div', '', { class: 'studio-collection-columns', 'aria-hidden': 'true' });
    for (const label of ['Collection', 'Type', 'Visibility', 'Article work', 'Actions']) columns.append(element('span', label));
    list.append(columns);
    for (const row of rows) {
      const item = element('div', '', { class: 'studio-collection-row', 'data-collection-row': row.id, tabindex: '-1' });
      const identity = element('div', '', { class: 'studio-collection-identity' }); identity.append(element('strong', row.title), element('small', `/topics/${row.id} · Order ${row.order}`));
      const kind = element('span', typeLabels[row.type] || typeLabels.theme, { class: 'studio-collection-kind' });
      const visibility = element('span', row.archived ? 'Archived' : 'Published', { class: `studio-collection-visibility${row.archived ? '' : ' is-live'}` });
      const count = counts[row.id] || {};
      const countCell = element('div', '', { class: 'studio-collection-counts' });
      for (const [key, label] of [['published', 'Live'], ['draft', 'Draft work'], ['submitted', 'Review']]) {
        const total = key === 'draft' ? ['draft', 'returned', 'unpublished', 'pendingRevisions'].reduce((sum, state) => sum + metricNumber(count, state), 0) : metricNumber(count, key);
        const value = element('span'); value.append(element('strong', String(total)), document.createTextNode(label)); countCell.append(value);
      }
      countCell.title = `Drafts: ${metricNumber(count, 'draft')}; Returned: ${metricNumber(count, 'returned')}; Unpublished: ${metricNumber(count, 'unpublished')}; Pending revisions: ${metricNumber(count, 'pendingRevisions')}`;
      const actions = element('div', '', { class: 'studio-collection-row-actions' });
      const edit = element('button', 'Edit', { type: 'button', class: 'studio-collection-edit', 'aria-label': `Edit ${row.title}` }); edit.addEventListener('click', () => showEditor(row));
      actions.append(edit, actionMenu(row)); item.append(identity, kind, visibility, countCell, actions); list.append(item);
    }
  };
  search.addEventListener('input', renderManager);
  typeFilter.addEventListener('change', renderManager);
  sort.addEventListener('change', renderManager);
  image.addEventListener('change', refreshImagePreview);
  const resetUpload = () => {
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    localImageUrl = ''; selectedFile = null; uploadInput.value = ''; clearUpload.hidden = true; uploadStatus.hidden = true;
    refreshImagePreview();
  };
  clearUpload.addEventListener('click', resetUpload);
  image.addEventListener('change', resetUpload);
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    resetUpload();
    uploadStatus.hidden = false;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
      uploadStatus.textContent = 'Choose a PNG, JPEG or WebP image up to 5 MB.';
      return;
    }
    selectedFile = file; localImageUrl = URL.createObjectURL(file); clearUpload.hidden = false;
    uploadStatus.textContent = `${file.name} · Ready to upload when you save.`;
    refreshImagePreview();
  });
  fields.imageAlt.addEventListener('input', refreshImagePreview);
  fields.id.addEventListener('input', refreshUrlPreview);
  newButton.addEventListener('click', () => showEditor());
  closeEditor.addEventListener('click', leaveEditor);
  cancel.addEventListener('click', leaveEditor);
  form.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true; result.textContent = selectedFile ? 'Uploading image and saving collection…' : 'Saving collection…';
    for (const input of [uploadInput, image, clearUpload, cancel, closeEditor]) input.disabled = true;
    fields.family.value = typeLabels[fields.type.value];
    const collection = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, key === 'featured' ? input.checked : key === 'order' ? Number(input.value) : input.value]));
    try {
      data = await request({ action: editing ? 'update' : 'create', collection, expectedRevision: data.revision }, selectedFile);
      const savedId = collection.id; renderChoices(); reset(); await loadMetrics(); showList({ focusId: savedId, message: 'Collection saved and published.' });
    } catch (error) { result.textContent = error.message; }
    finally { save.disabled = false; for (const input of [uploadInput, image, clearUpload, cancel, closeEditor]) input.disabled = false; }
  });
  if (managing) {
    document.querySelector('[data-editor-workspace]').hidden = true;
    document.querySelector('[data-content-library]').hidden = true;
    document.querySelector('[data-editor-actions]').hidden = true;
    workspace.hidden = false;
    document.querySelectorAll('[data-filter]').forEach(button => { button.hidden = true; button.classList.remove('is-active'); });
    document.querySelector('[data-topbar-kicker]').textContent = 'Collections';
    document.querySelector('[data-save-state]').textContent = 'Administrator workspace';
    document.title = 'Collections';
    document.querySelectorAll('.studio-nav a, .studio-mobile-nav a').forEach(link => {
      if (link.getAttribute('href') === '/manage/collections') link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    result.textContent = 'Loading collections…';
    try { await reload(); reset(); renderManager(); await loadMetrics(); result.textContent = ''; document.querySelector('#collection-manager-title')?.focus(); }
    catch (error) { result.textContent = error.message; }
  }
}
