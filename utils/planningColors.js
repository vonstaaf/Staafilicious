/**
 * Stabil vänsterkantsfärg per användar-id (samma logik som webben).
 * @param {string} uid
 * @returns {string} hsl(...)
 */
export function assigneeBorderColor(uid) {
  const s = String(uid || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 58%, 42%)`;
}
