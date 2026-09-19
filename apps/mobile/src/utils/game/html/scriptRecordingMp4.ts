// Normalize only the verified Chromium MP4 track-duration unit defect.
// Injected into the WebView; no native dependency, transcoding, or media upload.
export const SCRIPT_RECORDING_MP4 = `

async function finalizeRecordedMp4(blob) {
  var report = { format: 'mp4', action: 'unchanged', tracks: [], reason: '' };
  var patches = [];
  var tracks = {};
  var defaults = {};
  var fragments = [];
  var movie = null;
  var hasMedia = false;
  function fail(message) { throw new Error('Cannot validate recorded MP4: ' + message); }
  function u64(view, offset) {
    var value = view.getUint32(offset) * 4294967296 + view.getUint32(offset + 4);
    if (!Number.isSafeInteger(value)) { fail('integer exceeds supported range'); }
    return value;
  }
  function children(view, start, end) {
    var result = [];
    while (start < end) {
      if (start + 8 > end) { fail('truncated box header'); }
      var size = view.getUint32(start), header = 8;
      var type = String.fromCharCode(view.getUint8(start + 4), view.getUint8(start + 5),
        view.getUint8(start + 6), view.getUint8(start + 7));
      if (size === 1) {
        if (start + 16 > end) { fail('truncated extended box'); }
        size = u64(view, start + 8); header = 16;
      } else if (size === 0) { size = end - start; }
      if (size < header || start + size > end) { fail('invalid ' + type + ' size'); }
      result.push({ type: type, start: start, p: start + header, end: start + size });
      start += size;
    }
    return result;
  }
  function one(view, parent, type) {
    return children(view, parent.p, parent.end).find(function(box) { return box.type === type; });
  }
  function requireBytes(box, offset, length) {
    if (!box || offset < box.p || offset + length > box.end) { fail('truncated timing box'); }
  }
  function timing(view, box) {
    if (!box) { fail('missing timing header'); }
    requireBytes(box, box.p, 4);
    var version = view.getUint8(box.p);
    if (version !== 0 && version !== 1) { fail('unsupported timing header version'); }
    var scaleOffset = box.p + (version === 1 ? 20 : 12);
    var durationOffset = scaleOffset + 4, width = version === 1 ? 8 : 4;
    requireBytes(box, scaleOffset, 4 + width);
    var scale = view.getUint32(scaleOffset);
    if (!scale) { fail('zero timescale'); }
    return { scale: scale, duration: width === 8 ? u64(view, durationOffset) : view.getUint32(durationOffset),
      offset: durationOffset, width: width };
  }
  // Read only box headers and timing tables. Encoded mdat payloads remain Blob
  // slices, avoiding a second full-video allocation or any packet rewriting.
  for (var offset = 0; offset < blob.size;) {
    var headerView = new DataView(await blob.slice(offset, Math.min(blob.size, offset + 16)).arrayBuffer());
    if (headerView.byteLength < 8) { fail('truncated file'); }
    var size = headerView.getUint32(0), header = 8;
    var type = String.fromCharCode(headerView.getUint8(4), headerView.getUint8(5),
      headerView.getUint8(6), headerView.getUint8(7));
    if (size === 1) {
      if (headerView.byteLength < 16) { fail('truncated extended header'); }
      size = u64(headerView, 8); header = 16;
    } else if (size === 0) { size = blob.size - offset; }
    if (size < header || offset + size > blob.size) { fail('incomplete ' + type + ' box'); }
    if (type === 'mdat') { hasMedia = size > header || hasMedia; }
    if (type === 'moov' || type === 'moof') {
      if (size > 16 * 1024 * 1024) { fail('timing table is too large'); }
      var view = new DataView(await blob.slice(offset, offset + size).arrayBuffer());
      var parent = { p: header, end: size };
      if (type === 'moov') {
        if (movie) { fail('multiple movie headers'); }
        movie = timing(view, one(view, parent, 'mvhd'));
        var trackBoxes = children(view, parent.p, parent.end).filter(function(box) { return box.type === 'trak'; });
        for (var ti = 0; ti < trackBoxes.length; ti++) {
          var trak = trackBoxes[ti], tkhd = one(view, trak, 'tkhd'), mdia = one(view, trak, 'mdia');
          if (!tkhd || !mdia) { fail('incomplete track'); }
          requireBytes(tkhd, tkhd.p, 4);
          var tv = view.getUint8(tkhd.p);
          if (tv !== 0 && tv !== 1) { fail('unsupported track header'); }
          var idOffset = tkhd.p + (tv === 1 ? 20 : 12);
          requireBytes(tkhd, idOffset, tv === 1 ? 16 : 12);
          var id = view.getUint32(idOffset);
          var trackDuration = tv === 1 ? u64(view, idOffset + 8) : view.getUint32(idOffset + 8);
          var media = timing(view, one(view, mdia, 'mdhd'));
          media.offset += offset;
          if (!id || tracks[id]) { fail('invalid track ID'); }
          // Edited timelines and composition offsets need a full remuxer.
          // Leave those files untouched rather than guessing their duration.
          tracks[id] = { id: id, media: media, movieDuration: trackDuration,
            supported: !one(view, trak, 'edts'), end: 0, samples: 0 };
        }
        var mvex = one(view, parent, 'mvex');
        if (mvex) {
          children(view, mvex.p, mvex.end).forEach(function(box) {
            if (box.type !== 'trex') { return; }
            requireBytes(box, box.p, 24);
            defaults[view.getUint32(box.p + 4)] = view.getUint32(box.p + 12);
          });
        }
      } else {
        fragments.push({ view: view, parent: parent });
      }
    }
    offset += size;
  }
  if (!movie || !hasMedia || !Object.keys(tracks).length) { fail('missing movie, tracks, or media'); }
  for (var fi = 0; fi < fragments.length; fi++) {
    var fragment = fragments[fi], fv = fragment.view;
    var trafs = children(fv, fragment.parent.p, fragment.parent.end).filter(function(box) { return box.type === 'traf'; });
    for (var tf = 0; tf < trafs.length; tf++) {
      var traf = trafs[tf], tfhd = one(fv, traf, 'tfhd'), tfdt = one(fv, traf, 'tfdt');
      if (!tfhd || !tfdt) { report.reason = 'unsupported fragment timing'; continue; }
      requireBytes(tfhd, tfhd.p, 8);
      var flags = fv.getUint32(tfhd.p) & 16777215, trackId = fv.getUint32(tfhd.p + 4);
      var track = tracks[trackId];
      if (!track) { fail('fragment has an unknown track'); }
      var cursor = tfhd.p + 8 + (flags & 1 ? 8 : 0) + (flags & 2 ? 4 : 0);
      var defaultDuration = defaults[trackId] || 0;
      if (flags & 8) { requireBytes(tfhd, cursor, 4); defaultDuration = fv.getUint32(cursor); }
      requireBytes(tfdt, tfdt.p, 4);
      var dv = fv.getUint8(tfdt.p);
      if (dv !== 0 && dv !== 1) { track.supported = false; continue; }
      requireBytes(tfdt, tfdt.p + 4, dv === 1 ? 8 : 4);
      var decodeTime = dv === 1 ? u64(fv, tfdt.p + 4) : fv.getUint32(tfdt.p + 4);
      var fragmentStart = decodeTime, fragmentSamples = 0;
      var runs = children(fv, traf.p, traf.end).filter(function(box) { return box.type === 'trun'; });
      for (var ri = 0; ri < runs.length; ri++) {
        var run = runs[ri];
        requireBytes(run, run.p, 8);
        var rf = fv.getUint32(run.p) & 16777215, count = fv.getUint32(run.p + 4);
        var rp = run.p + 8 + (rf & 1 ? 4 : 0) + (rf & 4 ? 4 : 0);
        var stride = (rf & 256 ? 4 : 0) + (rf & 512 ? 4 : 0) +
          (rf & 1024 ? 4 : 0) + (rf & 2048 ? 4 : 0);
        if (count > 1000000) { fail('sample count is too large'); }
        requireBytes(run, rp, count * stride);
        for (var si = 0; si < count; si++) {
          var duration = rf & 256 ? fv.getUint32(rp) : defaultDuration;
          if (!duration) { track.supported = false; }
          if (rf & 2048 && fv.getUint32(rp + stride - 4) !== 0) { track.supported = false; }
          decodeTime += duration;
          rp += stride;
        }
        track.samples += count;
        fragmentSamples += count;
      }
      if (!Number.isSafeInteger(decodeTime)) { fail('invalid decode duration'); }
      // Chromium emits empty trailing audio fragments with tfdt=0. They must
      // not erase the earlier audio timeline. Forward timestamp gaps are real
      // media timing and are preserved; overlapping fragments need a remuxer.
      if (fragmentSamples) {
        if (fragmentStart + 1 < track.end) { track.supported = false; }
        track.end = Math.max(track.end, decodeTime);
      }
    }
  }
  Object.keys(tracks).forEach(function(key) {
    var track = tracks[key], media = track.media;
    var seconds = track.end / media.scale, headerSeconds = media.duration / media.scale;
    report.tracks.push({ id: track.id, timescale: media.scale, headerSeconds: headerSeconds, sampleSeconds: seconds });
    if (!track.supported || !track.samples || report.reason) { report.action = 'unverified'; return; }
    if (Math.abs(headerSeconds - seconds) <= 0.002) { return; }
    // The known defect writes milliseconds in mdhd, while mvhd/tkhd already
    // use the movie timescale correctly. Repair only that exact signature.
    if (Math.abs(media.duration - track.movieDuration / movie.scale * 1000) > 1 ||
        Math.abs(track.movieDuration / movie.scale - seconds) > Math.max(0.05, seconds * 0.001) ||
        movie.duration / movie.scale + 0.02 < seconds ||
        (media.width === 4 && track.end >= 4294967295)) {
      report.action = 'unverified';
      return;
    }
    var bytes = new Uint8Array(media.width), patchView = new DataView(bytes.buffer);
    if (media.width === 8) {
      patchView.setUint32(0, Math.floor(track.end / 4294967296));
      patchView.setUint32(4, track.end % 4294967296);
    } else { patchView.setUint32(0, track.end); }
    patches.push({ offset: media.offset, bytes: bytes });
  });
  // Never partially normalize a file containing an unverified track.
  if (report.action === 'unverified') { return { blob: blob, report: report }; }
  if (!patches.length) { return { blob: blob, report: report }; }
  patches.sort(function(a, b) { return a.offset - b.offset; });
  var parts = [], previous = 0;
  patches.forEach(function(patch) {
    parts.push(blob.slice(previous, patch.offset), patch.bytes);
    previous = patch.offset + patch.bytes.length;
  });
  parts.push(blob.slice(previous));
  report.action = 'repaired';
  report.correctedHeaders = patches.length;
  return { blob: new Blob(parts, { type: blob.type }), report: report };
}

`;
