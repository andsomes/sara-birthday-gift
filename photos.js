// Loads the images directly from photos.zip in the repository.
// This means you can keep the 39 photos together in one ZIP file.
window.SARA_PHOTOS = [];

(async function loadPhotosFromZip() {
  const zipUrl = "https://raw.githubusercontent.com/andsomes/sara-birthday-gift/main/photos.zip";

  try {
    const response = await fetch(zipUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load photos.zip (${response.status})`);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // Find the ZIP End of Central Directory record.
    let eocd = -1;
    const start = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= start; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("Invalid ZIP file");

    const entryCount = view.getUint16(eocd + 10, true);
    const centralSize = view.getUint32(eocd + 12, true);
    const centralOffset = view.getUint32(eocd + 16, true);

    const imageExtensions = /\.(jpe?g|png|webp|gif)$/i;
    const urls = [];
    let p = centralOffset;

    for (let n = 0; n < entryCount; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) throw new Error("Invalid ZIP directory");

      const compression = view.getUint16(p + 10, true);
      const compressedSize = view.getUint32(p + 20, true);
      const fileNameLength = view.getUint16(p + 28, true);
      const extraLength = view.getUint16(p + 30, true);
      const commentLength = view.getUint16(p + 32, true);
      const localHeaderOffset = view.getUint32(p + 42, true);

      const nameBytes = bytes.slice(p + 46, p + 46 + fileNameLength);
      const name = new TextDecoder().decode(nameBytes);
      p += 46 + fileNameLength + extraLength + commentLength;

      if (!imageExtensions.test(name)) continue;

      if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        throw new Error("Invalid ZIP local header");
      }

      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);

      let imageBytes;
      if (compression === 0) {
        imageBytes = compressed;
      } else if (compression === 8) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        imageBytes = new Uint8Array(await new Response(stream).arrayBuffer());
      } else {
        console.warn("Skipping unsupported ZIP compression:", name, compression);
        continue;
      }

      let type = "image/jpeg";
      if (/\.png$/i.test(name)) type = "image/png";
      else if (/\.webp$/i.test(name)) type = "image/webp";
      else if (/\.gif$/i.test(name)) type = "image/gif";

      urls.push(URL.createObjectURL(new Blob([imageBytes], { type })));
    }

    window.SARA_PHOTOS = urls;
    if (typeof buildGallery === "function" && !document.getElementById("birthdayWebsite").classList.contains("hidden")) {
      document.getElementById("photoGrid").innerHTML = "";
      galleryIndex = 0;
      buildGallery();
    }
  } catch (error) {
    console.error("Photo gallery error:", error);
    const count = document.getElementById("photoCount");
    if (count) count.textContent = "The photos couldn't be loaded — please refresh the page. 💕";
  }
})();
