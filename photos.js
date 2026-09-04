// Load all birthday photos from photos.zip.
// Uses JSZip because it is more reliable across GitHub Pages browsers.
window.SARA_PHOTOS = [];

(async function loadPhotosFromZip() {
  const zipUrl = "https://raw.githubusercontent.com/andsomes/sara-birthday-gift/main/photos.zip";

  try {
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load ZIP library"));
        document.head.appendChild(script);
      });
    }

    const response = await fetch(zipUrl + "?v=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load photos.zip (HTTP " + response.status + ")");

    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const imageNames = Object.keys(zip.files)
      .filter(name => !zip.files[name].dir)
      .filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name))
      .filter(name => !name.startsWith("__MACOSX/") && !name.includes("/."));

    if (!imageNames.length) throw new Error("No images found inside photos.zip");

    const urls = [];
    for (const name of imageNames) {
      const blob = await zip.files[name].async("blob");
      urls.push(URL.createObjectURL(blob));
    }

    window.SARA_PHOTOS = urls;

    // If Sara has already passed the quiz while the ZIP was loading, refresh the gallery.
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
