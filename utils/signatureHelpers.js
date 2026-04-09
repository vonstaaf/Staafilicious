import * as ImageManipulator from "expo-image-manipulator";

/**
 * Roterar en signatur som ritats i liggande läge (landscape) till porträtt (rättvänd för PDF/visning).
 * Tar data URI (base64) och returnerar data URI roterad -90°.
 * Om rotation misslyckas (t.ex. nytt API eller data URI stöds inte) returneras original.
 * @param {string} dataUri - "data:image/png;base64,..." eller bara base64-sträng
 * @returns {Promise<string>} - Data URI för den roterade bilden (eller original)
 */
export async function rotateSignatureForPortrait(dataUri) {
  const uri = dataUri.startsWith("data:") ? dataUri : `data:image/png;base64,${dataUri}`;
  if (typeof ImageManipulator.manipulateAsync !== "function") {
    return uri;
  }
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: -90 }], {
      base64: true,
      format: ImageManipulator.SaveFormat.PNG,
    });
    return result.base64 ? `data:image/png;base64,${result.base64}` : uri;
  } catch (err) {
    console.error("[signatureHelpers] rotateSignatureForPortrait:", err?.message || err);
    return uri;
  }
}
