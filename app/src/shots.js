// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title, `mode` and `grade` the look.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  const mode = query.get('mode') ?? 'loading';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(
    `samples/${query.get('photo') ?? 'pier'}.jpg`,
    query.get('caption') ?? 'Sunset Heist',
    mode,
    grade,
    size,
  );
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
