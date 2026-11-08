'use strict';
// An image "set" is an original plus every upscaled version made from it. These actions finish a set:
//
//   keepBest(keepOriginal = true):  the chosen version -> <folder>\Upscaled Images\
//                                   the original       -> <folder>\Upscaled Images - Originals\
//                                   other versions     -> Recycle Bin
//   keepBest(keepOriginal = false): the same, but the original goes to the Recycle Bin too
//   deleteFile:                     one file (original or version) -> Recycle Bin
//
// Files already gone are skipped. Once nothing of a set is left in the folder, the set is marked
// resolved in the store: it leaves the list and isn't added again when the folder is scanned.
// Nothing is ever deleted permanently: `trash` is Electron's shell.trashItem.
const fs = require('fs');
const path = require('path');
const { KEPT_DIR, ORIGINALS_DIR, moveInto } = require('./fsutil');

const exists = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
};

// True when the original and every recorded version are gone from where they were.
function setFinished(store, source) {
  return !exists(source) && !store.forSource(source).some((v) => exists(v.output));
}

async function keepBest({ store, source, variantId, keepOriginal, trash }) {
  const v = store.byId(variantId);
  if (!v || v.source !== source) throw new Error('That version is no longer in the list.');
  if (!exists(v.output)) throw new Error(`The version file is missing: ${v.output}`);
  const dir = path.dirname(source);
  const done = { kept: null, original: null, trashed: [], skipped: [] };

  done.kept = moveInto(v.output, path.join(dir, KEPT_DIR));

  if (exists(source)) {
    if (keepOriginal) done.original = moveInto(source, path.join(dir, ORIGINALS_DIR));
    else {
      await trash(source);
      done.trashed.push(source);
    }
  } else done.skipped.push(source);

  for (const other of store.forSource(source)) {
    if (other.id === v.id) continue;
    if (exists(other.output)) {
      await trash(other.output);
      done.trashed.push(other.output);
    } else done.skipped.push(other.output);
  }

  store.removeSource(source);
  store.markResolved(source, { kept: done.kept, original: done.original, keptOriginal: !!keepOriginal });
  return { ...done, resolved: true };
}

// which: 'orig' for the original, or a version id.
async function deleteFile({ store, source, which, trash }) {
  let file;
  if (which === 'orig') file = source;
  else {
    const v = store.byId(which);
    if (!v || v.source !== source) throw new Error('That version is no longer in the list.');
    file = v.output;
  }
  if (exists(file)) await trash(file);
  if (which !== 'orig') store.remove(which);
  const resolved = setFinished(store, source);
  if (resolved) {
    store.removeSource(source);
    store.markResolved(source, { deletedAll: true });
  }
  return { trashed: file, resolved };
}

module.exports = { keepBest, deleteFile, setFinished };
