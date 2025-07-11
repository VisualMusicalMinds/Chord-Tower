// --- AUDIO & STATE ---
const context = new (window.AudioContext || window.webkitAudioContext)();

// Add compressor to prevent pops and clicks
const compressor = context.createDynamicsCompressor();
compressor.threshold.value = -24;
compressor.knee.value = 30;
compressor.ratio.value = 12;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;
compressor.connect(context.destination);

const waveforms = ['sine', 'triangle', 'square', 'sawtooth', 'voice'];
let currentWaveformIndex = 1;
let currentWaveform = waveforms[currentWaveformIndex];
let globalVolume = 0.4;

// Add touch tolerance variable
let touchLeaveTimeout = null;

const keyNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const minorKeyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']; // For display only
let currentKeyIndex = 0;
let currentScale = 'Major'; // New state for the scale

const baseFrequencies = {
  'C3': 130.81, 'G3': 196.00, 'E3': 164.81, 'A3': 220.00, 'B3': 246.94, 'D3': 146.83, 'F3': 174.61, 'G#3': 207.65, 'Eb3': 155.56, 'Eb4': 311.13, 'Ab3': 207.65, 'Ab4': 415.30, 'Bb4': 466.16, 'A#': 233.08, 'D#': 155.56, 'E#': 164.81,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'Bb3': 233.08, 'G#4': 415.30, 'F#4': 369.99
};
let noteFrequencies = { ...baseFrequencies };

const semitoneShiftMap = {'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11};
function transposeFrequency(freq, semitoneShift) {
  return freq * Math.pow(2, semitoneShift / 12);
}
function updateTransposedFrequencies() {
  const keyName = keyNames[currentKeyIndex];
  const shift = semitoneShiftMap[keyName];
  noteFrequencies = {};
  for (const [note, freq] of Object.entries(baseFrequencies)) {
    noteFrequencies[note] = transposeFrequency(freq, shift);
  }
}

// --- COLOR DATA ---
const noteColorsByKey = {
  'C':   { 'I': '#FF3B30',    'ii': '#FF9500', 'iii': '#FFCC00', 'IV': '#34C759', 'V': '#5af5fa', 'vi': '#007AFF', 'IV/IV': '#AF52DE' },
  'Db':  { 'I': '#FF9500',    'ii': '#FFCC00', 'iii': '#34C759', 'IV': '#5af5fa', 'V': '#007AFF', 'vi': '#AF52DE', 'IV/IV': '#FF3B30' },
  'D':   { 'I': '#FF9500',    'ii': '#FFCC00', 'iii': '#34C759', 'IV': '#5af5fa', 'V': '#007AFF', 'vi': '#AF52DE', 'IV/IV': '#FF3B30' },
  'Eb':  { 'I': '#FFCC00',    'ii': '#34C759', 'iii': '#5af5fa', 'IV': '#007AFF', 'V': '#AF52DE', 'vi': '#FF3B30', 'IV/IV': '#FF9500' },
  'E':   { 'I': '#FFCC00',    'ii': '#34C759', 'iii': '#5af5fa', 'IV': '#007AFF', 'V': '#AF52DE', 'vi': '#FF3B30', 'IV/IV': '#FF9500' },
  'F':   { 'I': '#34C759',    'ii': '#5af5fa', 'iii': '#007AFF', 'IV': '#AF52DE', 'V': '#FF3B30', 'vi': '#FF9500', 'IV/IV': '#FFCC00' },
  'Gb':  { 'I': '#5af5fa',    'ii': '#007AFF', 'iii': '#AF52DE', 'IV': '#FF3B30', 'V': '#FF9500', 'vi': '#FFCC00', 'IV/IV': '#34C759' },
  'G':   { 'I': '#5af5fa',    'ii': '#007AFF', 'iii': '#AF52DE', 'IV': '#FF3B30', 'V': '#FF9500', 'vi': '#FFCC00', 'IV/IV': '#34C759' },
  'Ab':  { 'I': '#007AFF',    'ii': '#AF52DE', 'iii': '#FF3B30', 'IV': '#FF9500', 'V': '#FFCC00', 'vi': '#34C759', 'IV/IV': '#5af5fa' },
  'A':   { 'I': '#007AFF',    'ii': '#AF52DE', 'iii': '#FF3B30', 'IV': '#FF9500', 'V': '#FFCC00', 'vi': '#34C759', 'IV/IV': '#5af5fa' },
  'Bb':  { 'I': '#AF52DE',    'ii': '#FF3B30', 'iii': '#FF9500', 'IV': '#FFCC00', 'V': '#34C759', 'vi': '#5af5fa', 'IV/IV': '#007AFF' },
  'B':   { 'I': '#AF52DE',    'ii': '#FF3B30', 'iii': '#FF9500', 'IV': '#FFCC00', 'V': '#34C759', 'vi': '#5af5fa', 'IV/IV': '#007AFF' }
};

const rootNoteColors = {
    'C': '#FF3B30', 'B#': '#FF3B30', 'C#': '#FF3B30', 'Db': '#FF9500',
    'D': '#FF9500', 'D#': '#FF9500', 'Eb': '#FFCC00', 'E': '#FFCC00',
    'Fb': '#FFCC00', 'E#': '#FFCC00', 'F': '#34C759', 'F#': '#34C759',
    'Gb': '#5af5fa', 'G': '#5af5fa', 'G#': '#5af5fa', 'Ab': '#007AFF',
    'A': '#007AFF', 'A#': '#007AFF', 'Bb': '#AF52DE', 'B': '#AF52DE', 'Cb': '#AF52DE',
};

// --- Chord/Alt names for all keys ---
const chordNamesDefault = {
  "8": "V/V", "9": "V/vi", "u": "IV", "i": "V", "o": "vi", "l": "iii", "k": "ii", "j": "I", "n": "IV/IV"
};
const chordNamesMinor = {
  "j": "i", "i": "V", "u": "iv", "o": "VI", "k": "VII", "l": "III", "8": "IV", "9": "v", "n": "ii°7"
};

const buttonOrder = ["8", "9", "u", "i", "o", "l", "k", "j", "n"];

const chordNamesAltByKey = {
  "C":  ["D",   "E",   "F",  "G",  "Am",  "Em",  "Dm",  "C",  "Bb"],
  "Db": ["Eb",  "F",   "Gb", "Ab", "Bbm", "Fm",  "Ebm", "Db", "Cb"],
  "D":  ["E",   "F#",  "G",  "A",  "Bm",  "F#m", "Em",  "D",  "C"],
  "Eb": ["F",   "G",   "Ab", "Bb", "Cm",  "Gm",  "Fm",  "Eb", "Db"],
  "E":  ["F#",  "G#",  "A",  "B",  "C#m", "G#m", "F#m", "E",  "D"],
  "F":  ["G",   "A",   "Bb", "C",  "Dm",  "Am",  "Gm",  "F",  "Eb"],
  "Gb": ["Ab",  "Bb",  "Cb", "Db", "Ebm", "Bbm", "Abm", "Gb", "Fb"],
  "G":  ["A",   "B",   "C",  "D",  "Em",  "Bm",  "Am",  "G",  "F"],
  "Ab": ["Bb",  "C",   "Db", "Eb", "Fm",  "Cm",  "Bbm", "Ab", "Gb"],
  "A":  ["B",   "C#",  "D",  "E",  "F#m", "C#m", "Bm",  "A",  "G"],
  "Bb": ["C",   "D",   "Eb", "F",  "Gm",  "Dm",  "Cm",  "Bb", "Ab"],
  "B":  ["C#",  "D#",  "E",  "F#", "G#m", "D#m", "C#m", "B",  "A"]
};

const chordNamesAltByMinorKey = {
    "C":  ["F", "Gm", "Fm", "G", "Ab", "Eb", "Bb", "Cm", "D°7"],
    "Db": ["F#", "G#m", "F#m", "G#", "A", "E", "B", "C#m", "D#°7"],
    "D":  ["G", "Am", "Gm", "A", "Bb", "F", "C", "Dm", "E°7"],
    "Eb": ["G#", "A#m", "G#m", "A#", "B", "F#", "C#", "D#m", "E#°7"], // FIXED: D# minor - corrected flat to sharp names
    "E":  ["A", "Bm", "Am", "B", "C", "G", "D", "Em", "F#°7"],
    "F":  ["Bb", "Cm", "Bbm", "C", "Db", "Ab", "Eb", "Fm", "G°7"],
    "Gb": ["B", "C#m", "Bm", "C#", "D", "A", "E", "F#m", "G#°7"],
    "G":  ["C", "Dm", "Cm", "D", "Eb", "Bb", "F", "Gm", "A°7"],
    "Ab": ["C#", "D#m", "C#m", "D#", "E", "B", "F#", "G#m", "A#°7"], // FIXED: G# minor - corrected flat to sharp names  
    "A":  ["D", "Em", "Dm", "E", "F", "C", "G", "Am", "B°7"],
    "Bb": ["Eb", "Fm", "Ebm", "F", "Gb", "Db", "Ab", "Bbm", "C°7"],
    "B":  ["E", "F#m", "Em", "F#", "G", "D", "A", "Bm", "C#°7"]
};

const minorKeyColorOverrides = {
    'Db': null, // Let it use automatic color mapping
    'Eb': null, // Let it use automatic color mapping  
    'E':  null, // Let it use automatic color mapping
    'Gb': null, // Let it use automatic color mapping
    'Ab': null, // Let it use automatic color mapping
    'B':  null  // Let it use automatic color mapping
};

const harmonics = 20;
const real = new Float32Array(harmonics);
const imag = new Float32Array(harmonics);
real[1] = 1; real[2] = 0.15; real[3] = 0.1; real[4] = 0.05;
for (let i = 5; i < harmonics; i++) real[i] = 0;
const customVoiceWave = context.createPeriodicWave(real, imag);

const activeOscillators = {};
const heldKeys = new Set();
const accidentalHeld = { sharp: false, flat: false };
const heldNoteKeys = new Set();
let sharpTouchHeld = false;
let flatTouchHeld = false;

function getAccidentalShift() {
  if (sharpTouchHeld && flatTouchHeld) return 0;
  if (sharpTouchHeld) return 1;
  if (flatTouchHeld) return -1;
  if (accidentalHeld.sharp && accidentalHeld.flat) return 0;
  if (accidentalHeld.sharp) return 1;
  if (accidentalHeld.flat) return -1;
  return 0;
}

function startNote(key, freqOrFreqs) {
  stopNote(key);
  let oscList = [], gainList = [], lfoList = [], lfoGainList = [], filterList = [];
  let freqs = Array.isArray(freqOrFreqs) ? freqOrFreqs : [freqOrFreqs];
  const now = context.currentTime;
  
  freqs.forEach((freq, i) => {
    if (!freq) {
      console.error(`Invalid frequency for key ${key}. Notes: ${freqOrFreqs}`);
      return;
    }
    let osc, gain, lfo, lfoGain, filter;
    gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    
    if (currentWaveform === "voice") {
      osc = context.createOscillator();
      osc.setPeriodicWave(customVoiceWave);
      osc.frequency.value = freq;
      lfo = context.createOscillator();
      lfoGain = context.createGain();
      lfo.frequency.setValueAtTime(1.5, now);
      lfo.frequency.linearRampToValueAtTime(5, now + 1);
      lfoGain.gain.setValueAtTime(2.0, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.value = 1;
      osc.connect(filter);
      filter.connect(gain);
      const attackTime = 0.08, decayTime = 0.18, sustainLevel = globalVolume * 0.5, maxLevel = globalVolume * 0.85;
      gain.gain.linearRampToValueAtTime(maxLevel, now + attackTime);
      gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
      gain.connect(compressor);
      osc.start();
      oscList.push(osc); gainList.push(gain); lfoList.push(lfo); lfoGainList.push(lfoGain); filterList.push(filter);
    } else {
      osc = context.createOscillator();
      osc.type = currentWaveform;
      osc.frequency.value = freq;
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.value = 1;
      osc.connect(filter);
      filter.connect(gain);
      const attackTime = 0.015, targetVolume = globalVolume / freqs.length;
      gain.gain.linearRampToValueAtTime(targetVolume, now + attackTime);
      gain.connect(compressor);
      osc.start();
      oscList.push(osc); gainList.push(gain); filterList.push(filter);
    }
  });
  activeOscillators[key] = { oscList, gainList, lfoList, lfoGainList, filterList };
}

function stopNote(key) {
  const active = activeOscillators[key];
  if (!active) return;
  const now = context.currentTime;
  if (active.oscList) {
    active.oscList.forEach((osc, i) => {
      const gain = active.gainList[i];
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      if (currentWaveform === "voice") {
        const releaseTime = 0.6, stopBuffer = 0.1;
        gain.gain.linearRampToValueAtTime(0.0001, now + releaseTime);
        osc.stop(now + releaseTime + stopBuffer);
        if (active.lfoList[i]) active.lfoList[i].stop(now + releaseTime + stopBuffer);
      } else {
        const releaseTime = 1.2, stopBuffer = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
        osc.stop(now + releaseTime + stopBuffer);
      }
    });
  }
  delete activeOscillators[key];
}

function handlePlayKey(key) {
  const chords = (currentScale === 'Major') ? majorChords : minorChords;
  const btn = chords.find(b => b.key === key);
  if (!btn) return;
  heldNoteKeys.add(key);
  const accidental = getAccidentalShift();
  const oscKey = `${key}_${accidental}`;
  let freqOrFreqs;
  if (btn.notes) {
    freqOrFreqs = btn.notes.map(n => noteFrequencies[n] * Math.pow(2, accidental / 12) || 0);
  } else {
    freqOrFreqs = noteFrequencies[btn.note] * Math.pow(2, accidental / 12);
  }
  startNote(oscKey, freqOrFreqs);
}

function handleStopKey(key) {
  heldNoteKeys.delete(key);
  stopNote(`${key}_0`);
  stopNote(`${key}_1`);
  stopNote(`${key}_-1`);
}

function reTriggerHeldKeysAccidentals() {
  for (const key of heldNoteKeys) {
    handlePlayKey(key);
  }
}

const positions = {
  '10a':[9,0],'10b':[9,1],'10c':[9,2],'10d':[9,3],'3a':[2,0],'4a':[3,0],'3b':[2,1],'4b':[3,1],'3c':[2,2],'4c':[3,2],'5a':[4,0],'6a':[5,0],'5b':[4,1],'6b':[5,1],'7b':[6,1],'5c':[4,2],'6c':[5,2],'7c':[6,2],'8b':[7,1],'8c':[7,2],'9b':[8,1],'9c':[8,2],'4d':[3,3],'3d':[2,3],'2a':[1,0],'2b':[1,1],'2c':[1,2],'2d':[1,3],'5d':[4,3],'6d':[5,3],'7d':[6,3]
};

const majorChords = [
  { name: 'I', key: 'j', notes: ['C3','G3','E4','C5'], cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'V', key: 'i', notes: ['G3','G4','B4','D5'], cells: ['3b','4b','3c','4c'] },
  { name: 'IV', key: 'u', notes: ['F3','C4','F4','A4'], cells: ['3a','4a'] },
  { name: 'vi', key: 'o', notes: ['A3','E4','A4','C5'], cells: ['4d','3d'] },
  { name: 'ii', key: 'k', notes: ['D3','A3','D4','F4'], cells: ['6a'] },
  { name: 'iii', key: 'l', notes: ['E3','B3','E4','G4'], cells: ['5a'] },
  { name: 'V/V', key: '8', notes: ['D4', 'F#4', 'A4', 'D5'], cells: ['2a', '2b'] },
  { name: 'V/vi', key: '9', notes: ['G#3', 'E4', 'B4', 'E5'], cells: ['2c','2d'] },
  { name: 'IV/IV', key: 'n', notes: ['F3','Bb3','D4','F4'], cells: ['8b','8c'] },
];

// **FIXED**: Updated chord names and notes to match proper minor key functions
const minorChords = [
  { name: 'i', key: 'j', notes: ['C3', 'G3', 'Eb4', 'C5'], cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'V', key: 'i', notes: ['G3', 'G4', 'B4', 'D5'], cells: ['3b','4b','3c','4c'] },
  { name: 'iv', key: 'u', notes: ['F3', 'C4', 'F4', 'Ab4'], cells: ['3a','4a'] },
  { name: 'VI', key: 'o', notes: ['Ab3', 'Eb4', 'Ab4', 'C5'], cells: ['4d','3d'] },
  { name: 'VII', key: 'k', notes: ['Bb3', 'D4', 'F4', 'Bb4'], cells: ['6a'] },   // VII chord
  { name: 'III', key: 'l', notes: ['Eb3', 'Bb3', 'Eb4', 'G4'], cells: ['5a'] },    // III chord
  { name: 'IV', key: '8', notes: ['F3', 'C4', 'F4', 'A4'], cells: ['2a', '2b'] }, // IV chord
  { name: 'v', key: '9', notes: ['G3', 'G4', 'Bb4', 'D5'], cells: ['2c','2d'] },  // v chord
  { name: 'ii°7', key: 'n', notes: ['D3', 'Ab3', 'F4', 'B4'], cells: ['8b','8c'] }
];

const grid = document.getElementById('grid');
const keyToDiv = {};

function updateSolfegeColors() {
    if (currentScale === 'Major') {
        const currentKey = keyNames[currentKeyIndex];
        const bgColors = noteColorsByKey[currentKey];
        majorChords.forEach(btn => {
            const div = keyToDiv[btn.key];
            if (div) {
                if (btn.name === "V/V") div.style.backgroundColor = bgColors['ii'] || "#FF9500";
                else if (btn.name === "V/vi") div.style.backgroundColor = bgColors['iii'] || "#FFCC00";
                else if (btn.name === "IV/IV") div.style.backgroundColor = bgColors['IV/IV'] || "#AF52DE";
                else div.style.backgroundColor = bgColors[btn.name] || '#ccc';
            }
        });
    } else {
        const currentKeyName = keyNames[currentKeyIndex];
        const chordNameList = chordNamesAltByMinorKey[currentKeyName];
        const colorOverrides = minorKeyColorOverrides[currentKeyName];

        if (!chordNameList) { console.error("Chord list not found for minor key:", currentKeyName); return; }

        buttonOrder.forEach((buttonKey, index) => {
            let color = null;
            if (colorOverrides && colorOverrides[index]) {
                color = colorOverrides[index];
            } else {
                const chordName = chordNameList[index];
                if (chordName) {
                    const match = chordName.match(/^[A-G](b|#)?/);
                    const rootNote = match ? match[0] : null;
                    if (rootNote) {
                        color = rootNoteColors[rootNote] || '#ccc';
                    }
                }
            }

            const div = keyToDiv[buttonKey];
            if (div) {
                div.style.backgroundColor = color || '#ccc';
            }
        });
    }
}

const cellRefs = {};
for (let r = 1; r < 11; r++) {
  for (let c = 0; c < 4; c++) {
    const div = document.createElement('div');
    div.className = 'cell';
    const rowNum = r + 1;
    const colLetter = String.fromCharCode(97 + c);
    div.style.top = (r * (100 / 11)) + '%';
    div.style.left = (c * (100 / 4)) + '%';
    div.style.width = (100 / 4 - 0.5) + '%';
    div.style.height = (100 / 11 - 0.5) + '%';
    cellRefs[`${rowNum}${colLetter}`] = div;
    grid.appendChild(div);
  }
}

cellRefs['5d'].classList.add('toggle-cell-border');
cellRefs['6d'].classList.remove('toggle-cell-border');

let cButtonState = 'C';
const noteButtonRefs = {};

function updateBoxNames() {
  const useAlt = (cButtonState === 'I');
  
  if (useAlt) {
    const keyName = keyNames[currentKeyIndex];
    const nameList = (currentScale === 'Major') 
      ? chordNamesAltByKey[keyName] 
      : chordNamesAltByMinorKey[keyName];
      
    if (!nameList) { console.error("Name list not found for key:", keyName); return; }

    buttonOrder.forEach((key, idx) => {
      if (noteButtonRefs[key] && nameList[idx]) {
        noteButtonRefs[key].textContent = nameList[idx];
      }
    });

  } else {
    const nameMap = (currentScale === 'Major') ? chordNamesDefault : chordNamesMinor;
    Object.entries(nameMap).forEach(([key, name]) => {
      if (noteButtonRefs[key]) {
        noteButtonRefs[key].textContent = name;
      }
    });
  }
}

function updateKeyDisplay() {
    const displayName = (currentScale === 'Major') ? keyNames[currentKeyIndex] : minorKeyNames[currentKeyIndex];
    document.getElementById("key-name").textContent = displayName;
}

function renderToggleButton() {
  const el = document.createElement('button');
  el.className = 'chord-toggle-btn';
  el.setAttribute('type', 'button');
  el.setAttribute('aria-pressed', cButtonState === 'I');
  el.innerText = cButtonState === 'C' ? 'C' : 'I';
  el.addEventListener('click', () => {
    cButtonState = (cButtonState === 'C') ? 'I' : 'C';
    renderToggleButton();
    updateBoxNames();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      cButtonState = (cButtonState === 'C') ? 'I' : 'C';
      renderToggleButton();
      updateBoxNames();
    }
  });
  cellRefs['5d'].innerHTML = '';
  cellRefs['5d'].appendChild(el);
}
renderToggleButton();

cellRefs['6d'].innerHTML = '';
cellRefs['7d'].innerHTML = '';

majorChords.forEach(btn => {
  const div = document.createElement('div');
  div.className = 'note-button';
  div.textContent = chordNamesDefault[btn.key];
  div.style.outline = 'none';
  const rows = [...new Set(btn.cells.map(c => positions[c][0]))];
  const cols = [...new Set(btn.cells.map(c => positions[c][1]))];
  const top = Math.min(...rows) * (100 / 11);
  const left = Math.min(...cols) * (100 / 4);
  const height = rows.length * (100 / 11) - 0.5;
  const width = cols.length * (100 / 4) - 0.5;
  div.style.top = `${top}%`;
  div.style.left = `${left}%`;
  div.style.height = `${height}%`;
  div.style.width = `${width}%`;
  let isTouching = false;
  div.addEventListener('mousedown', (e) => { e.preventDefault(); isTouching = true; handlePlayKey(btn.key); div.classList.add('active'); window.focus(); });
  div.addEventListener('mouseup', () => { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); });
  div.addEventListener('mouseleave', () => { if(isTouching) { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); } });
  div.addEventListener('touchstart', (e) => { e.preventDefault(); isTouching = true; handlePlayKey(btn.key); div.classList.add('active'); window.focus(); });
  div.addEventListener('touchend', () => { if (touchLeaveTimeout) clearTimeout(touchLeaveTimeout); touchLeaveTimeout = setTimeout(() => { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); touchLeaveTimeout = null; }, 20); });
  div.addEventListener('touchcancel', () => { if (touchLeaveTimeout) clearTimeout(touchLeaveTimeout); touchLeaveTimeout = setTimeout(() => { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); touchLeaveTimeout = null; }, 20); });
  grid.appendChild(div);
  keyToDiv[btn.key] = div;
  noteButtonRefs[btn.key] = div;
});

const keyMap = { "8":"8", "9":"9", "u":"u", "i":"i", "o":"o", "l":"l", "k":"k", "j":"j", "n":"n" };
const keyHeldDown = {};

window.addEventListener('keydown', function(e) {
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "SELECT" || document.activeElement.isContentEditable)) { return; }
  let key = e.key;
  if (keyMap[key] && !keyHeldDown[key]) {
    sharpTouchHeld = e.shiftKey;
    flatTouchHeld = e.altKey || e.ctrlKey;
    keyHeldDown[key] = true;
    handlePlayKey(keyMap[key]);
    if (keyToDiv[key]) keyToDiv[key].classList.add('active');
  }
  if (key === "#" || key === "ArrowUp") { accidentalHeld.sharp = true; sharpTouchHeld = true; reTriggerHeldKeysAccidentals(); }
  if (key === "b" || key === "ArrowDown") { accidentalHeld.flat = true; flatTouchHeld = true; reTriggerHeldKeysAccidentals(); }
  if (key === "c" || key === "C") { cButtonState = (cButtonState === 'C') ? 'I' : 'C'; renderToggleButton(); updateBoxNames(); }
});

window.addEventListener('keyup', function(e) {
  let key = e.key;
  if (keyMap[key]) {
    handleStopKey(keyMap[key]);
    keyHeldDown[key] = false;
    sharpTouchHeld = false;
    flatTouchHeld = false;
    if (keyToDiv[key]) keyToDiv[key].classList.remove('active');
  }
  if (key === "#" || key === "ArrowUp") { accidentalHeld.sharp = false; sharpTouchHeld = false; reTriggerHeldKeysAccidentals(); }
  if (key === "b" || key === "ArrowDown") { accidentalHeld.flat = false; flatTouchHeld = false; reTriggerHeldKeysAccidentals(); }
});

const controlsBar = document.getElementById('controls-bar');
const keyButton = document.createElement('div');
keyButton.className = 'control-area';
keyButton.tabIndex = 0;
keyButton.setAttribute('aria-label', 'Key control');
keyButton.innerHTML = `<div class="arrow" id="key-left">&#9664;</div><div id="key-name">C</div><div class="arrow" id="key-right">&#9654;</div>`;

const scaleControl = document.createElement('div');
scaleControl.className = 'control-area';
scaleControl.innerHTML = `<select id="scale-select" class="scale-select" aria-label="Scale select"><option value="Major">Major</option><option value="Minor">Minor</option></select>`;

const waveButton = document.createElement('div');
waveButton.className = 'control-area';
waveButton.tabIndex = 0;
waveButton.setAttribute('aria-label', 'Waveform control');
waveButton.innerHTML = '<div class="arrow" id="left-arrow">&#9664;</div><div id="waveform-name">triangle</div><div class="arrow" id="right-arrow">&#9654;</div>';

const volumeControl = document.createElement('div');
volumeControl.className = 'volume-control';
volumeControl.innerHTML = `<span class="volume-label" id="volume-label" for="volume-slider">Volume</span><input type="range" min="0" max="1" step="0.01" value="0.4" id="volume-slider" class="volume-slider" aria-label="Volume slider"><span class="volume-value" id="volume-value">40%</span>`;
volumeControl.tabIndex = 0;
volumeControl.setAttribute('aria-label', 'Volume control');

controlsBar.appendChild(keyButton);
controlsBar.appendChild(scaleControl);
controlsBar.appendChild(waveButton);
controlsBar.appendChild(volumeControl);

document.getElementById("key-left").onclick = () => {
  currentKeyIndex = (currentKeyIndex - 1 + keyNames.length) % keyNames.length;
  updateKeyDisplay();
  updateTransposedFrequencies();
  updateSolfegeColors();
  updateBoxNames();
};
document.getElementById("key-right").onclick = () => {
  currentKeyIndex = (currentKeyIndex + 1) % keyNames.length;
  updateKeyDisplay();
  updateTransposedFrequencies();
  updateSolfegeColors();
  updateBoxNames();
};

document.getElementById("scale-select").addEventListener('change', (e) => {
  currentScale = e.target.value;
  updateKeyDisplay();
  updateSolfegeColors();
  updateBoxNames();
});

document.getElementById("left-arrow").onclick = () => {
  currentWaveformIndex = (currentWaveformIndex - 1 + waveforms.length) % waveforms.length;
  currentWaveform = waveforms[currentWaveformIndex];
  document.getElementById("waveform-name").textContent = currentWaveform;
};
document.getElementById("right-arrow").onclick = () => {
  currentWaveformIndex = (currentWaveformIndex + 1) % waveforms.length;
  currentWaveform = waveforms[currentWaveformIndex];
  document.getElementById("waveform-name").textContent = currentWaveform;
};

const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
volumeSlider.value = globalVolume;
volumeValue.textContent = `${Math.round(globalVolume * 100)}%`;
volumeSlider.addEventListener('input', () => {
  globalVolume = parseFloat(volumeSlider.value);
  volumeValue.textContent = `${Math.round(globalVolume * 100)}%`;
});

function resizeGrid() {
  const gridEl = document.getElementById('grid');
  const gridWrapper = document.querySelector('.proportional-grid-wrapper');
  const gwRect = gridWrapper.getBoundingClientRect();
  const availableWidth = gwRect.width;
  const availableHeight = gwRect.height;
  const aspectW = 4;
  const aspectH = 11;
  let gridWidth = availableHeight * (aspectW/aspectH);
  let gridHeight = availableHeight;
  if (gridWidth > availableWidth) {
    gridWidth = availableWidth;
    gridHeight = availableWidth * (aspectH/aspectW);
  }
  gridEl.style.width = gridWidth + 'px';
  gridEl.style.height = gridHeight + 'px';
  gridEl.style.marginLeft = "auto";
  gridEl.style.marginRight = "auto";
  gridEl.style.marginTop = "0";
  gridEl.style.marginBottom = "0";
  const fontSize = Math.min(gridHeight / 11, gridWidth / 4) * 0.5;
  gridEl.querySelectorAll('.note-button').forEach(div => {
    div.style.fontSize = fontSize + 'px';
  });
  gridEl.querySelectorAll('.cell').forEach(div => {
    div.style.fontSize = fontSize + 'px';
  });
  const toggleBtn = cellRefs['5d'].querySelector('.chord-toggle-btn');
  if (toggleBtn) toggleBtn.style.fontSize = Math.max(fontSize * 1.1, 20) + 'px';
}
window.addEventListener('resize', resizeGrid);
window.addEventListener('DOMContentLoaded', () => setTimeout(() => { resizeGrid(); updateSolfegeColors(); updateBoxNames(); }, 1));
setTimeout(() => { resizeGrid(); updateSolfegeColors(); updateBoxNames(); }, 200);
const mq = window.matchMedia("(max-width: 550px)");
mq.addEventListener("change", () => { resizeGrid(); updateSolfegeColors(); updateBoxNames(); });

// Initial Setup
updateKeyDisplay();
updateTransposedFrequencies();
updateSolfegeColors();
updateBoxNames();
