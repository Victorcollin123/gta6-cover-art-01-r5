// Leonida Nights — page wiring: photo pick, sliders, mode and grade picks,
// export, and the fixed ?shot= scenes the screenshots use.
import { drawCover, GRADES, MODES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const status = document.getElementById('status');

const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const state = {
  photo: null,
  photoX: 0,
  photoY: 0,
  photoZoom: 1,
  photoRotate: 0,
  title: 'Sunset Heist',
  tagline: 'Vice City never sleeps',
  mode: 'loading',
  grade: 'sunset',
  size: 'square',
};

function currentSize() {
  return SIZES[state.size] ?? SIZES.square;
}

function redraw() {
  const [w, h] = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

function bindSlider(id, key, format) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}-value`);
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    if (out) out.textContent = format(state[key]);
    redraw();
  });
}

bindSlider('photo-x', 'photoX', (v) => `${Math.round(v * 100)}%`);
bindSlider('photo-y', 'photoY', (v) => `${Math.round(v * 100)}%`);
bindSlider('photo-zoom', 'photoZoom', (v) => `${v.toFixed(2)}x`);
bindSlider('photo-rotate', 'photoRotate', (v) => `${v}°`);

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state.photo = await loadImage(URL.createObjectURL(file));
    status.textContent = `Loaded ${file.name}`;
  } catch {
    status.textContent = 'That photo could not be read.';
  }
  redraw();
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      state.photo = await loadImage(`samples/${button.dataset.sample}.jpg`);
      status.textContent = `Sample photo: ${button.dataset.sample}`;
    } catch {
      status.textContent = 'Sample photo missing.';
    }
    redraw();
  });
});

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
taglineInput.addEventListener('input', () => {
  state.tagline = taglineInput.value;
  redraw();
});

document.getElementById('grade').addEventListener('change', (e) => {
  state.grade = e.target.value;
  redraw();
});

document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = currentSize();
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${w}x${h}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = `Saved leonida-nights-${w}x${h}.png`;
  }, 'image/png');
});

// Grade and mode pickers are built from the same tables the renderer uses,
// so the page can never offer a combination the cover cannot draw.
const gradeSelect = document.getElementById('grade');
Object.entries(GRADES).forEach(([key, grade]) => {
  const option = document.createElement('option');
  option.value = key;
  option.textContent = grade.label;
  gradeSelect.append(option);
});
const modeField = document.getElementById('modes');
Object.entries(MODES).forEach(([key, label], i) => {
  const wrap = document.createElement('label');
  wrap.className = 'mode-pick';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'mode';
  radio.value = key;
  radio.checked = i === 0;
  radio.addEventListener('change', () => {
    if (radio.checked) {
      state.mode = key;
      redraw();
    }
  });
  wrap.append(radio, document.createTextNode(` ${label}`));
  modeField.append(wrap);
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (sample, text, mode, grade, size) => {
    state.photo = await loadImage(sample);
    state.title = text;
    if (mode) state.mode = mode;
    if (grade) state.grade = grade;
    if (size && SIZES[size]) state.size = size;
    titleInput.value = text;
    document.querySelector(`input[name="mode"][value="${state.mode}"]`).checked = true;
    gradeSelect.value = state.grade;
    document.getElementById('size').value = state.size;
    redraw();
  });
} else {
  // Start with a sample photo so the first paint already looks like a cover.
  loadImage('samples/pier.jpg')
    .then((img) => {
      state.photo = img;
      redraw();
    })
    .catch(() => redraw());
  redraw();
}
