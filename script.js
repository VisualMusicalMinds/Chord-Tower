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
const mixolydianKeyNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const locrianKeyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let currentKeyIndex = 0;
let currentScale = 'Major'; // New state for the scale

const baseFrequencies = {
    // Octave 3
    'C3': 130.81, 'B#2': 130.81, 'Dbb3': 130.81,
    'C#3': 138.59, 'Db3': 138.59,
    'D3': 146.83, 'C##3': 146.83, 'Ebb3': 146.83,
    'D#3': 155.56, 'Eb3': 155.56, 'Fb3': 155.56,
    'E3': 164.81, 'Fbb3': 164.81, 'D##3': 164.81,
    'F3': 174.61, 'E#3': 174.61,
    'F#3': 185.00, 'Gb3': 185.00,
    'G3': 196.00, 'F##3': 196.00, 'Abb3': 196.00,
    'G#3': 207.65, 'Ab3': 207.65,
    'A3': 220.00, 'G##3': 220.00, 'Bbb3': 220.00,
    'A#3': 233.08, 'Bb3': 233.08, 'Cb4': 233.08,
    'B3': 246.94, 'Cb4': 246.94, 'A##3': 246.94,
    // Octave 4
    'C4': 261.63, 'B#3': 261.63, 'Dbb4': 261.63,
    'C#4': 277.18, 'Db4': 277.18,
    'D4': 293.66, 'C##4': 293.66, 'Ebb4': 293.66,
    'D#4': 311.13, 'Eb4': 311.13, 'Fb4': 311.13,
    'E4': 329.63, 'Fbb4': 329.63, 'D##4': 329.63,
    'F4': 349.23, 'E#4': 349.23,
    'F#4': 369.99, 'Gb4': 369.99,
    'G4': 392.00, 'F##4': 392.00, 'Abb4': 392.00,
    'G#4': 415.30, 'Ab4': 415.30,
    'A4': 440.00, 'G##4': 440.00, 'Bbb4': 440.00,
    'A#4': 466.16, 'Bb4': 466.16, 'Cb5': 466.16,
    'B4': 493.88, 'Cb5': 493.88, 'A##4': 493.88,
    // Octave 5
    'C5': 523.25, 'B#4': 523.25, 'Dbb5': 523.25,
    'C#5': 554.37, 'Db5': 554.37,
    'D5': 587.33, 'C##5': 587.33, 'Ebb5': 587.33,
    'D#5': 622.25, 'Eb5': 622.25, 'Fb5': 622.25,
    'E5': 659.25, 'Fbb5': 659.25, 'D##5': 659.25,
    'F5': 698.46, 'E#5': 698.46,
    'F#5': 739.99, 'Gb5': 739.99,
    'G5': 783.99, 'F##5': 783.99, 'Abb5': 783.99,
    'G#5': 830.61, 'Ab5': 830.61,
    'A5': 880.00, 'G##5': 880.00, 'Bbb5': 880.00,
    'A#5': 932.33, 'Bb5': 932.33, 'Cb6': 932.33,
    'B5': 987.77, 'Cb6': 987.77, 'A##5': 987.77,
     // Octave 6
    'C6': 1046.50, 'B#5': 1046.50,
    'C#6': 1108.73, 'Db6': 1108.73,
    'D6': 1174.66,
    'D#6': 1244.51, 'Eb6': 1244.51
};
let noteFrequencies = { ...baseFrequencies };

const semitoneShiftMap = {'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11};
function transposeFrequency(freq, semitoneShift) {
  return freq * Math.pow(2, semitoneShift / 12);
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
  "j": "i", "i": "V", "u": "VI", "o": "iv", "k": "VII", "l": "III", "8": "IV", "9": "v", "n": "ii°7"
};
const chordNamesNaturalMinor = {
  "j": "i", "i": "v", "u": "iv", "o": "bVI", "k": "bVII", "l": "bIII", "8": "bII", "9": "ii°7", "n": "V"
};
const chordNamesHarmonicMinor = {
  "j": "i", "i": "V", "u": "iv", "o": "bVI", "k": "vii°", "l": "bIII+", "8": "bII", "9": "bIII", "n": "IV"
};
const chordNamesMelodicMinor = {
  "j": "i", "i": "V", "u": "IV", "o": "vi°", "k": "ii", "l": "bIII+", "8": "bVI", "9": "bVII", "n": "vii°"
};
const chordNamesDorian = {
  "j": "i", "i": "IV", "u": "bIII", "o": "v", "k": "bVII", "l": "ii", "8": "bVI", "9": "vi°7", "n": "V"
};
const chordNamesPhrygian = {
  "j": "i", "i": "bII", "u": "bIII", "o": "iv", "k": "VI", "l": "bvii", "8": "bV", "9": "v°", "n": "bVII"
};
const chordNamesLydian = {
  "j": "I", "i": "V", "u": "II", "o": "iii", "k": "vi", "l": "vii", "8": "IV", "9": "#iv°", "n": "ii°"
};
const chordNamesMixolydian = {
  "j": "I", "i": "bVII", "u": "IV", "o": "v", "k": "ii", "l": "vi", "8": "bVI", "9": "bIII", "n": "iii°"
};
const chordNamesLocrian = {
    "j": "i°", "i": "iv", "u": "biii", "o": "bvii", "k": "bII", "l": "bVI", "8": "IV", "9": "bVI+", "n": "bV"
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
    "C":  ["F", "Gm", "Ab", "G",  "Fm", "Eb", "Bb", "Cm", "D°7"],
    "Db": ["F#", "G#m","A",  "G#", "F#m","E",  "B",  "C#m","D#°7"],
    "D":  ["G",  "Am", "Bb", "A",  "Gm", "F",  "C",  "Dm", "E°7"],
    "Eb": ["G#", "A#m","B",  "A#", "G#m","F#", "C#", "D#m","E#°7"],
    "E":  ["A",  "Bm", "C",  "B",  "Am", "G",  "D",  "Em", "F#°7"],
    "F":  ["Bb", "Cm", "Db", "C",  "Bbm","Ab", "Eb", "Fm", "G°7"],
    "Gb": ["B",  "C#m","D",  "C#", "Bm", "A",  "E",  "F#m","G#°7"],
    "G":  ["C",  "Dm", "Eb", "D",  "Cm", "Bb", "F",  "Gm", "A°7"],
    "Ab": ["C#", "D#m","E",  "D#", "C#m","B",  "F#", "G#m","A#°7"],
    "A":  ["D",  "Em", "F",  "E",  "Dm", "C",  "G",  "Am", "B°7"],
    "Bb": ["Eb", "Fm", "Gb", "F",  "Ebm","Db", "Ab", "Bbm","C°7"],
    "B":  ["E",  "F#m","G",  "F#", "Em", "D",  "A",  "Bm", "C#°7"]
};

const chordNamesAltByNaturalMinorKey = {
    "C":  ["Db", "D°7",  "Fm", "Gm", "Ab", "Eb", "Bb", "Cm", "G"],
    "Db": ["D",  "D#°7", "F#m","G#m","A",  "E",  "B",  "C#m","G#"],
    "D":  ["Eb", "E°7",  "Gm", "Am", "Bb", "F",  "C",  "Dm", "A"],
    "Eb": ["E",  "E#°",  "G#m","A#m","B",  "F#", "C#", "D#m","A#"],
    "E":  ["F",  "F#°7", "Am", "Bm", "C",  "G",  "D",  "Em", "B"],
    "F":  ["Gb", "G°7",  "Bbm","Cm", "Db", "Ab", "Eb", "Fm", "C"],
    "Gb": ["G",  "G#°7", "Bm", "C#m","D",  "A",  "E",  "F#m","C#"],
    "G":  ["Ab", "A°7",  "Cm", "Dm", "Eb", "Bb", "F",  "Gm", "D"],
    "Ab": ["A",  "A#°7", "C#m","D#m","E",  "B",  "F#", "G#m","D#"],
    "A":  ["Bb", "B°7",  "Dm", "Em", "F",  "C",  "G",  "Am", "E"],
    "Bb": ["Cb", "C°7",  "Ebm","Fm", "Gb", "Db", "Ab", "Bbm","F"],
    "B":  ["C",  "C#°7", "Em", "F#m","G",  "D",  "A",  "Bm", "F#"]
};

const chordNamesAltByHarmonicMinorKey = {
    "C":  ["Db", "Eb",   "Fm", "G",  "Ab", "Eb+", "B°", "Cm", "F"],
    "Db": ["D",  "E",    "F#m","G#", "A",  "E+",  "B#°","C#m","F#"],
    "D":  ["Eb", "F",    "Gm", "A",  "Bb", "F+",  "C#°","Dm", "G"],
    "Eb": ["E",  "F#",   "G#m","A#", "B",  "F#+", "C𝄪°","D#m","G#"],
    "E":  ["F",  "G",    "Am", "B",  "C",  "G+",  "D#°","Em", "A"],
    "F":  ["Gb", "Ab",   "Bbm","C",  "Db", "Ab+", "E°", "Fm", "Bb"],
    "Gb": ["G",  "A",    "Bm", "C#", "D",  "A+",  "E#°","F#m","B"],
    "G":  ["Ab", "Bb",   "Cm", "D",  "Eb", "Bb+", "F#°","Gm", "C"],
    "Ab": ["A", "B",    "C#m","D#", "E",  "B+", "F𝄪°","G#m","C#"],
    "A":  ["Bb", "C",    "Dm", "E",  "F",  "C+",  "G#°","Am", "D"],
    "Bb": ["Cb", "Db",   "Ebm","F",  "Gb", "Db+", "A°", "Bbm","Eb"],
    "B":  ["C",  "D",    "Em", "F#", "G",  "D+",  "A#°","Bm", "E"]
};

const chordNamesAltByMelodicMinorKey = {
    "C":  ["Ab", "Bb", "F", "G", "A°",  "Eb+", "Dm",  "Cm", "B°"],
    "Db": ["A",  "B",  "F#","G#","A#°", "E+",  "D#m", "C#m","B#°"],
    "D":  ["Bb", "C",  "G", "A", "B°",  "F+",  "Em",  "Dm", "C#°"],
    "Eb": ["B",  "C#", "G#","A#","B#°", "F#+", "E#m", "D#m","C𝄪°"],
    "E":  ["C",  "D",  "A", "B", "C#°", "G+",  "F#m", "Em", "D#°"],
    "F":  ["Db", "Eb", "Bb","C", "D°",  "Ab+", "Gm",  "Fm", "E°"],
    "Gb": ["D",  "E",  "B", "C#","D#°", "A+",  "G#m", "F#m","E#°"],
    "G":  ["Eb", "F",  "C", "D", "E°",  "Bb+", "Am",  "Gm", "F#°"],
    "Ab": ["E",  "F#", "C#","D#","E#°", "B+",  "A#m", "G#m","F𝄪°"],
    "A":  ["F",  "G",  "D", "E", "F#°", "C+",  "Bm",  "Am", "G#°"],
    "Bb": ["Gb", "Ab", "Eb","F", "G°",  "Db+", "Cm",  "Bbm","A°"],
    "B":  ["G",  "A",  "E", "F#","G#°", "D+",  "C#m", "Bm", "A#°"]
};

const chordNamesAltByDorianKey = {
    "C":  ["Ab", "A°7", "Eb", "F",  "Gm", "Dm", "Bb", "Cm", "G"],
    "Db": ["A",  "A#°7","E",  "F#", "G#m","D#m","B",  "C#m","G#"],
    "D":  ["Bb", "B°7", "F",  "G",  "Am", "Em", "C",  "Dm", "A"],
    "Eb": ["Cb", "C°7", "Gb", "Ab", "Bbm","Fm", "Db", "Ebm","Bb"],
    "E":  ["C",  "C#°7","G",  "A",  "Bm", "F#m","D",  "Em", "B"],
    "F":  ["Db", "D°7", "Ab", "Bb", "Cm", "Gm", "Eb", "Fm", "C"],
    "Gb": ["D",  "D#°7","A",  "B",  "C#m","G#m","E",  "F#m","C#"],
    "G":  ["Eb", "E°7", "Bb", "C",  "Dm", "Am", "F",  "Gm", "D"],
    "Ab": ["Fb", "F°7", "Cb", "Db", "Ebm","Bbm","Gb", "Abm","Eb"],
    "A":  ["F",  "F#°7","C",  "D",  "Em", "Bm", "G",  "Am", "E"],
    "Bb": ["Gb", "G°7", "Db", "Eb", "Fm", "Cm", "Ab", "Bbm","F"],
    "B":  ["G",  "G#°7","D",  "E",  "F#m","C#m","A",  "Bm", "F#"]
};

const chordNamesAltByPhrygianKey = {
    "C":  ["Gb", "G°", "Eb", "Db", "Fm", "Bbm", "Ab", "Cm", "Bb"],
    "Db": ["G",  "G#°","E",  "D",  "F#m","Bm", "A",  "C#m","B"],
    "D":  ["Ab", "A°", "F",  "Eb", "Gm", "Cm", "Bb", "Dm", "C"],
    "Eb": ["A",  "A#°","F#", "E",  "G#m","C#m","B",  "D#m","C#"],
    "E":  ["Bb", "B°", "G",  "F",  "Am", "Dm", "C",  "Em", "D"],
    "F":  ["Cb", "C°", "Ab", "Gb", "Bbm","Ebm","Db", "Fm", "Eb"],
    "Gb": ["C",  "C#°","A",  "G",  "Bm", "Em", "D",  "F#m","E"],
    "G":  ["Db", "D°", "Bb", "Ab", "Cm", "Fm", "Eb", "Gm", "F"],
    "Ab": ["D",  "D#°","B",  "A",  "C#m","F#m","E",  "G#m","F#"],
    "A":  ["Eb", "E°", "C",  "Bb", "Dm", "Gm", "F",  "Am", "G"],
    "Bb": ["Fb", "F°", "Db", "Cb", "Ebm","Abm","Gb", "Bbm","Ab"],
    "B":  ["F",  "F#°","D",  "C",  "Em", "Am", "G",  "Bm", "A"]
};

const chordNamesAltByLydianKey = {
    "C":  ["F", "F#°", "D", "G", "Em", "Bm", "Am", "C", "D°"],
    "Db": ["Gb", "G°",  "Eb", "Ab", "Fm", "Cm", "Bbm", "Db", "Eb°"],
    "D":  ["G", "G#°", "E", "A", "F#m", "C#m", "Bm", "D", "E°"],
    "Eb": ["Ab", "A°",  "F", "Bb", "Gm", "Dm", "Cm", "Eb", "F°"],
    "E":  ["A", "A#°", "F#", "B", "G#m", "D#m", "C#m", "E", "F#°"],
    "F":  ["Bb", "B°",  "G", "C", "Am", "Em", "Dm", "F", "G°"],
    "Gb": ["Cb", "C°",  "Ab", "Db", "Bbm", "Fm", "Ebm", "Gb", "Ab°"],
    "G":  ["C", "C#°", "A", "D", "Bm", "F#m", "Em", "G", "A°"],
    "Ab": ["Db", "D°",  "Bb", "Eb", "Cm", "Gm", "Fm", "Ab", "Bb°"],
    "A":  ["D", "D#°", "B", "E", "C#m", "G#m", "F#m", "A", "B°"],
    "Bb": ["Eb", "E°",  "C", "F", "Dm", "Am", "Gm", "Bb", "C°"],
    "B":  ["E", "E#°", "C#", "F#", "D#m", "A#m", "G#m", "B", "C#°"]
};

const chordNamesAltByMixolydianKey = {
    "C":  ["Ab", "Eb", "F", "Bb", "Gm", "Am", "Dm", "C", "E°"],
    "Db": ["A",  "E",  "F#","B",  "G#m","A#m","D#m","C#","E#°"],
    "D":  ["Bb", "F",  "G", "C",  "Am", "Bm", "Em", "D", "F#°"],
    "Eb": ["Cb", "Gb", "Ab","Db", "Bbm","Cm", "Fm", "Eb","G°"],
    "E":  ["C",  "G",  "A", "D",  "Bm", "C#m","F#m","E", "G#°"],
    "F":  ["Db", "Ab", "Bb","Eb", "Cm", "Dm", "Gm", "F", "A°"],
    "Gb": ["D",  "A",  "B", "E",  "C#m","D#m","G#m","F#","A#°"],
    "G":  ["Eb", "Bb", "C", "F",  "Dm", "Em", "Am", "G", "B°"],
    "Ab": ["Fb", "Cb", "Db","Gb", "Ebm","Fm", "Bbm","Ab","C°"],
    "A":  ["F",  "C",  "D", "G",  "Em", "F#m","Bm", "A", "C#°"],
    "Bb": ["Gb", "Db", "Eb","Ab", "Fm", "Gm", "Cm", "Bb","D°"],
    "B":  ["G",  "D",  "E", "A",  "F#m","G#m","C#m","B", "D#°"]
};

const chordNamesAltByLocrianKey = {
    "C":  ["F", "Ab+", "Ebm", "Fm", "Bbm", "Ab", "Db", "C°", "Gb"],
    "Db": ["F#", "A+",  "Em",  "F#m","Bm",  "A",  "D",  "C#°","G"],
    "D":  ["G", "Bb+", "Fm",  "Gm", "Cm",  "Bb", "Eb", "D°", "Ab"],
    "Eb": ["G#", "B+",  "F#m", "G#m","C#m", "B",  "E",  "D#°","A"],
    "E":  ["A", "C+",  "Gm",  "Am", "Dm",  "C",  "F",  "E°", "Bb"],
    "F":  ["Bb", "Db+", "Abm", "Bbm","Ebm", "Db", "Gb", "F°", "Cb"],
    "Gb": ["B", "D+",  "Am",  "Bm", "Em",  "D",  "G",  "F#°","C"],
    "G":  ["C", "Eb+", "Bbm", "Cm", "Fm",  "Eb", "Ab", "G°", "Db"],
    "Ab": ["C#", "E+",  "Bm",  "C#m","F#m", "E",  "A",  "G#°","D"],
    "A":  ["D", "F+",  "Cm",  "Dm", "Gm",  "F",  "Bb", "A°", "Eb"],
    "Bb": ["D#", "F#+", "C#m", "D#m","G#m", "F#", "B",  "A#°","E"],
    "B":  ["E", "G+",  "Dm",  "Em", "Am",  "G",  "C",  "B°", "F"]
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
  let chords;
  if (currentScale === 'Major') chords = majorChords;
  else if (currentScale === 'Minor') chords = minorChords;
  else if (currentScale === 'Natural Minor') chords = naturalMinorChords;
  else if (currentScale === 'Harmonic Minor') chords = harmonicMinorChords;
  else if (currentScale === 'Melodic Minor') chords = melodicMinorChords;
  else if (currentScale === 'Dorian') chords = dorianChords;
  else if (currentScale === 'Phrygian') chords = phrygianChords;
  else if (currentScale === 'Lydian') chords = lydianChords;
  else if (currentScale === 'Mixolydian') chords = mixolydianChords;
  else if (currentScale === 'Locrian') chords = locrianChords;

  const btn = chords.find(b => b.key === key);
  if (!btn) return;
  heldNoteKeys.add(key);
  
  const keyName = keyNames[currentKeyIndex];
  let keyShift = semitoneShiftMap[keyName];
  const accidentalShift = getAccidentalShift();
  
  // Octave adjustment logic
  if (currentKeyIndex >= 8) { // Ab, A, Bb, B
      keyShift -= 12; // Transpose down one octave
  }
  
  const totalShift = keyShift + accidentalShift;
  const oscKey = `${key}_${accidentalShift}`;
  
  const baseNotes = btn.notes['C'];

  if (!baseNotes) {
      console.error(`Base notes not found for chord ${btn.name}.`);
      return;
  }
  
  let freqOrFreqs = baseNotes.map(noteName => {
      const baseFreq = noteFrequencies[noteName];
      if (!baseFreq) {
          console.error(`Frequency not found for base note: ${noteName}`);
          return 0;
      }
      return transposeFrequency(baseFreq, totalShift);
  });
  
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
  '10a':[9,0],'10b':[9,1],'10c':[9,2],'10d':[9,3],'3a':[2,0],'4a':[3,0],'3b':[2,1],'4b':[3,1],'3c':[2,2],'4c':[3,2],'5a':[4,0],'6a':[5,0],'5b':[4,1],'6b':[5,1],'7b':[6,1],'5c':[4,2],'6c':[5,2],'7c':[6,2],'8a':[7,0],'8b':[7,1],'8c':[7,2],'8d':[7,3],'2a':[1,0],'2b':[1,1],'2c':[1,2],'2d':[1,3],'3d':[2,3],'4d':[3,3],'5d':[4,3],'6d':[5,3],'7d':[6,3],'9a':[8,0],'9b':[8,1],'9c':[8,2],'9d':[8,3]
};

const majorChords = [
  { name: 'I', key: 'j', notes: {'C':['C3','G3','E4','C5']}, cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'V', key: 'i', notes: {'C':['G3','B4','D5','G4']}, cells: ['3b','4b','3c','4c'] },
  { name: 'IV', key: 'u', notes: {'C':['F3','C4','A4','F4']}, cells: ['3a','4a'] },
  { name: 'vi', key: 'o', notes: {'C':['A3','E4','C5','A4']}, cells: ['4d','3d'] },
  { name: 'ii', key: 'k', notes: {'C':['D3','A3','F4','D4']}, cells: ['6a'] },
  { name: 'iii', key: 'l', notes: {'C':['E3','B3','G4','E4']}, cells: ['5a'] },
  { name: 'V/V', key: '8', notes: {'C':['D4','F#4','A4','D5']}, cells: ['2a', '2b'] },
  { name: 'V/vi', key: '9', notes: {'C':['E4','G#4','B4','E5']}, cells: ['2c','2d'] },
  { name: 'IV/IV', key: 'n', notes: {'C':['Bb3','D4','F4','Bb4']}, cells: ['8b','8c'] },
];

const minorChords = [
  { name: 'i',    key: 'j', notes: {'C':['C3','G3','Eb4','C5']},      cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'V',    key: 'i', notes: {'C':['G3','G4','B4','D5']},      cells: ['3b','4b','3c','4c'] },
  { name: 'VI',   key: 'u', notes: {'C':['Ab3','Eb4','Ab4','C5']},    cells: ['3a','4a'] },
  { name: 'iv',   key: 'o', notes: {'C':['F3','C4','F4','Ab4']},     cells: ['4d','3d'] },
  { name: 'VII',  key: 'k', notes: {'C':['Bb3','D4','F4','Bb4']},     cells: ['6a'] },
  { name: 'III',  key: 'l', notes: {'C':['Eb3','Bb3','Eb4','G4']},    cells: ['5a'] },
  { name: 'IV',   key: '8', notes: {'C':['F3','C4','F4','A4']},        cells: ['2a', '2b'] },
  { name: 'v',    key: '9', notes: {'C':['G3','G4','Bb4','D5']},      cells: ['2c','2d'] },
  { name: 'ii°7', key: 'n', notes: {'C':['D3','Ab3','F4','B4']},      cells: ['8b','8c'] }
];

const naturalMinorChords = [
    { name: 'i',    key: 'j', notes: {'C':['C3', 'G3', 'Eb4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'v',    key: 'i', notes: {'C':['G3', 'G4', 'Bb4', 'D5']},    cells: ['3b','4b','3c','4c'] },
    { name: 'iv',   key: 'u', notes: {'C':['F3', 'C4', 'F4', 'Ab4']},   cells: ['3a','4a'] },
    { name: 'bVI',  key: 'o', notes: {'C':['Ab3', 'Eb4', 'Ab4', 'C5']},  cells: ['4d','3d'] },
    { name: 'bVII', key: 'k', notes: {'C':['Bb3', 'D4', 'F4', 'Bb4']},   cells: ['6a'] },
    { name: 'bIII', key: 'l', notes: {'C':['Eb3', 'Bb3', 'Eb4', 'G4']},  cells: ['5a'] },
    { name: 'bII',  key: '8', notes: {'C':['Db3', 'Db4', 'F4', 'Ab4']},   cells: ['2a', '2b'] },
    { name: 'ii°7', key: '9', notes: {'C':['D3', 'Ab3', 'F4', 'B4']},    cells: ['2c','2d'] },
    { name: 'V',    key: 'n', notes: {'C':['G3', 'G4', 'B4', 'D5']},    cells: ['8b','8c'] }
];

const harmonicMinorChords = [
    { name: 'i',     key: 'j', notes: {'C':['C3', 'G3', 'Eb4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'V',     key: 'i', notes: {'C':['G3', 'G4', 'B4', 'D5']},    cells: ['3b','4b','3c','4c'] },
    { name: 'iv',    key: 'u', notes: {'C':['F3', 'C4', 'F4', 'Ab4']},   cells: ['3a','4a'] },
    { name: 'bVI',   key: 'o', notes: {'C':['Ab3', 'Eb4', 'Ab4', 'C5']},  cells: ['4d','3d'] },
    { name: 'vii°',  key: 'k', notes: {'C':['B3', 'D4', 'F4', 'B4']},    cells: ['6a'] },
    { name: 'bIII+', key: 'l', notes: {'C':['Eb3', 'B3', 'Eb4', 'G4']},  cells: ['5a'] },
    { name: 'bII',   key: '8', notes: {'C':['Db3', 'Db4', 'F4', 'Ab4']},   cells: ['2a', '2b'] },
    { name: 'bIII',  key: '9', notes: {'C':['Eb3', 'Bb3', 'Eb4', 'G4']},  cells: ['2c','2d'] },
    { name: 'IV',    key: 'n', notes: {'C':['F3', 'C4', 'F4', 'A4']},    cells: ['8b','8c'] }
];

const melodicMinorChords = [
    { name: 'i',     key: 'j', notes: {'C':['C3', 'G3', 'Eb4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'V',     key: 'i', notes: {'C':['G3', 'G4', 'B4', 'D5']},    cells: ['3b','4b','3c','4c'] },
    { name: 'IV',    key: 'u', notes: {'C':['F3', 'C4', 'F4', 'A4']},    cells: ['3a','4a'] },
    { name: 'vi°',   key: 'o', notes: {'C':['A3', 'Eb4', 'A4', 'C5']},   cells: ['4d','3d'] },
    { name: 'ii',    key: 'k', notes: {'C':['D3', 'D4', 'F4', 'A4']},    cells: ['6a'] },
    { name: 'bIII+', key: 'l', notes: {'C':['Eb3', 'B3', 'Eb4', 'G4']},  cells: ['5a'] },
    { name: 'bVI',   key: '8', notes: {'C':['Ab3', 'Eb4', 'Ab4', 'C5']},  cells: ['2a', '2b'] },
    { name: 'bVII',  key: '9', notes: {'C':['Bb3', 'D4', 'F4', 'Bb4']},   cells: ['2c','2d'] },
    { name: 'vii°',  key: 'n', notes: {'C':['B3', 'D4', 'F4', 'B4']},    cells: ['8b','8c'] }
];

const dorianChords = [
    { name: 'i',     key: 'j', notes: {'C':['C3','G3','Eb4','C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'IV',    key: 'i', notes: {'C':['F3','C4','A4','F4']},      cells: ['3b','4b','3c','4c'] },
    { name: 'bIII',  key: 'u', notes: {'C':['Eb3','Bb3','G4','Eb4']},    cells: ['3a','4a'] },
    { name: 'v',     key: 'o', notes: {'C':['G3','D4','Bb4','G4']},      cells: ['4d','3d'] },
    { name: 'bVII',  key: 'k', notes: {'C':['Bb3','F4','D5','Bb4']},     cells: ['6a'] },
    { name: 'ii',    key: 'l', notes: {'C':['D3','A3','F4','D4']},      cells: ['5a'] },
    { name: 'bVI',   key: '8', notes: {'C':['Ab3','Eb4','C5','Ab4']},    cells: ['2a', '2b'] },
    { name: 'vi°7',  key: '9', notes: {'C':['F#3','C4','Eb4','A4']},    cells: ['2c','2d'] },
    { name: 'V',     key: 'n', notes: {'C':['G3','B4','D5','G4']},      cells: ['8b','8c'] }
];

const phrygianChords = [
    { name: 'i',    key: 'j', notes: {'C':['C3', 'G3', 'Eb4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'bII',  key: 'i', notes: {'C':['Db3', 'Ab3', 'F4', 'Db4']},  cells: ['3b','4b','3c','4c'] },
    { name: 'bIII', key: 'u', notes: {'C':['Eb3', 'Bb3', 'G4', 'Eb4']},  cells: ['3a','4a'] },
    { name: 'iv',   key: 'o', notes: {'C':['F3', 'C4', 'Ab4', 'F4']},   cells: ['4d','3d'] },
    { name: 'VI',   key: 'k', notes: {'C':['Ab3', 'Eb4', 'C5', 'Ab4']},  cells: ['6a'] },
    { name: 'bvii', key: 'l', notes: {'C':['Bb3', 'F4', 'Db5', 'Bb4']},  cells: ['5a'] },
    { name: 'bV',   key: '8', notes: {'C':['Gb3', 'Db4', 'Bb4', 'Gb4']},  cells: ['2a', '2b'] },
    { name: 'v°',   key: '9', notes: {'C':['G3', 'Db4', 'Bb4', 'G4']},   cells: ['2c','2d'] },
    { name: 'bVII', key: 'n', notes: {'C':['Bb3', 'D5', 'F4', 'Bb4']},  cells: ['8b','8c'] }
];

const lydianChords = [
    { name: 'I',    key: 'j', notes: {'C': ['C3', 'G3', 'E4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'V',    key: 'i', notes: {'C': ['G3', 'G4', 'B4', 'D5']},    cells: ['3b','4b','3c','4c'] },
    { name: 'II',   key: 'u', notes: {'C': ['D3', 'A4', 'D4', 'F#4']},   cells: ['3a','4a'] },
    { name: 'iii',  key: 'o', notes: {'C': ['E3', 'E4', 'G4', 'B4']},    cells: ['4d','3d'] },
    { name: 'vi',   key: 'k', notes: {'C': ['A3', 'E4', 'A4', 'C5']},    cells: ['6a'] },
    { name: 'vii',  key: 'l', notes: {'C': ['B3', 'F#4', 'B4', 'D5']},   cells: ['5a'] },
    { name: 'IV',   key: '8', notes: {'C': ['F3', 'C4', 'F4', 'A4']},    cells: ['2a', '2b'] },
    { name: '#iv°', key: '9', notes: {'C': ['F#3', 'C4', 'F#4', 'A4']},  cells: ['2c','2d'] },
    { name: 'ii°',  key: 'n', notes: {'C': ['F3', 'D4', 'Ab4', 'D5']},   cells: ['8b','8c'] }
];

const mixolydianChords = [
    { name: 'I',    key: 'j', notes: {'C': ['C3', 'G3', 'E4', 'C5']},       cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'bVII', key: 'i', notes: {'C': ['Bb3', 'F4', 'Bb4', 'D5']},     cells: ['3b','4b','3c','4c'] },
    { name: 'IV',   key: 'u', notes: {'C': ['F3', 'C4', 'F4', 'A4']},       cells: ['3a','4a'] },
    { name: 'v',    key: 'o', notes: {'C': ['G3', 'G4', 'Bb4', 'D5']},     cells: ['4d','3d'] },
    { name: 'ii',   key: 'k', notes: {'C': ['D3', 'D4', 'F4', 'A4']},       cells: ['6a'] },
    { name: 'vi',   key: 'l', notes: {'C': ['A3', 'E4', 'A4', 'C5']},       cells: ['5a'] },
    { name: 'bVI',  key: '8', notes: {'C': ['Ab3', 'Eb4', 'Ab4', 'C5']},   cells: ['2a', '2b'] },
    { name: 'bIII', key: '9', notes: {'C': ['Eb3', 'Eb4', 'G4', 'Bb4']},    cells: ['2c','2d'] },
    { name: 'iii°', key: 'n', notes: {'C': ['E3', 'E4', 'G4', 'Bb4']},      cells: ['8b','8c'] }
];

const locrianChords = [
    { name: 'i°',   key: 'j', notes: {'C': ['C4', 'Gb4', 'Eb4', 'C5']},    cells: ['5b','6b','7b','5c','6c','7c'] },
    { name: 'iv',   key: 'i', notes: {'C': ['F3', 'F4', 'Ab4', 'C5']},     cells: ['3b','4b','3c','4c'] },
    { name: 'biii', key: 'u', notes: {'C': ['Eb3', 'Bb3', 'Eb4', 'Gb4']},  cells: ['3a','4a'] },
    { name: 'bvii', key: 'o', notes: {'C': ['Bb3', 'Db4', 'F4', 'Bb4']},  cells: ['4d','3d'] },
    { name: 'bII',  key: 'k', notes: {'C': ['Db3', 'Db4', 'F4', 'Ab4']},   cells: ['6a'] },
    { name: 'bVI',  key: 'l', notes: {'C': ['Ab3', 'Eb4', 'Ab4', 'C5']},   cells: ['5a'] },
    { name: 'IV',   key: '8', notes: {'C': ['F3', 'F4', 'A4', 'C5']},     cells: ['2a', '2b'] },
    { name: 'bVI+', key: '9', notes: {'C': ['Ab3', 'E4', 'Ab4', 'C5']},    cells: ['2c','2d'] },
    { name: 'bV',   key: 'n', notes: {'C': ['Gb3', 'Db4', 'Gb4', 'Bb4']},  cells: ['8b','8c'] }
];

const grid = document.getElementById('grid');
const keyToDiv = {};

function updateSolfegeColors() {
    let chords;
    if (currentScale === 'Major') chords = majorChords;
    else if (currentScale === 'Minor') chords = minorChords;
    else if (currentScale === 'Natural Minor') chords = naturalMinorChords;
    else if (currentScale === 'Harmonic Minor') chords = harmonicMinorChords;
    else if (currentScale === 'Melodic Minor') chords = melodicMinorChords;
    else if (currentScale === 'Dorian') chords = dorianChords;
    else if (currentScale === 'Phrygian') chords = phrygianChords;
    else if (currentScale === 'Lydian') chords = lydianChords;
    else if (currentScale === 'Mixolydian') chords = mixolydianChords;
    else if (currentScale === 'Locrian') chords = locrianChords;

    if (currentScale === 'Major') {
        const currentKey = keyNames[currentKeyIndex];
        const bgColors = noteColorsByKey[currentKey];
        chords.forEach(btn => {
            const div = keyToDiv[btn.key];
            if (div) {
                if (btn.name === "V/V") div.style.backgroundColor = bgColors['ii'] || "#FF9500";
                else if (btn.name === "V/vi") div.style.backgroundColor = bgColors['iii'] || "#FFCC00";
                else if (btn.name === "IV/IV") div.style.backgroundColor = bgColors['IV/IV'] || "#AF52DE";
                else div.style.backgroundColor = bgColors[btn.name] || '#ccc';
            }
        });
    } else { // Minor, Dorian, Phrygian, Lydian, Mixolydian and Locrian use root note coloring
        const currentKeyName = keyNames[currentKeyIndex];
        let nameList;
        if (currentScale === 'Minor') nameList = chordNamesAltByMinorKey[currentKeyName];
        else if (currentScale === 'Natural Minor') nameList = chordNamesAltByNaturalMinorKey[currentKeyName];
        else if (currentScale === 'Harmonic Minor') nameList = chordNamesAltByHarmonicMinorKey[currentKeyName];
        else if (currentScale === 'Melodic Minor') nameList = chordNamesAltByMelodicMinorKey[currentKeyName];
        else if (currentScale === 'Dorian') nameList = chordNamesAltByDorianKey[currentKeyName];
        else if (currentScale === 'Phrygian') nameList = chordNamesAltByPhrygianKey[currentKeyName];
        else if (currentScale === 'Lydian') nameList = chordNamesAltByLydianKey[currentKeyName];
        else if (currentScale === 'Mixolydian') nameList = chordNamesAltByMixolydianKey[currentKeyName];
        else if (currentScale === 'Locrian') nameList = chordNamesAltByLocrianKey[currentKeyName];
        
        if (!nameList) { console.error("Chord list not found for key:", currentKeyName); return; }

        buttonOrder.forEach((buttonKey, index) => {
            const chordName = nameList[index];
            let color = '#ccc';
            if (chordName) {
                // Special override for Bb Natural Minor's Cb chord
                if (currentScale === 'Natural Minor' && currentKeyName === 'Bb' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                } 
                // Special override for C# Harmonic Minor's B#° chord
                else if (currentScale === 'Harmonic Minor' && currentKeyName === 'Db' && chordName === 'B#°') {
                    color = rootNoteColors['B']; // Force purple color for B#°
                }
                // Special override for C# and D# Melodic Minor's B#° chord
                else if (currentScale === 'Melodic Minor' && (currentKeyName === 'Db' || currentKeyName === 'Eb') && chordName === 'B#°') {
                    color = rootNoteColors['B']; // Force purple color for B#°
                }
                // Special override for Eb Dorian's Cb chord
                else if (currentScale === 'Dorian' && currentKeyName === 'Eb' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                // Special override for Ab Dorian's Fb chord
                else if (currentScale === 'Dorian' && currentKeyName === 'Ab' && chordName === 'Fb') {
                    color = rootNoteColors['F']; // Force green color for Fb
                }
                // Special override for F Phrygian's Cb chord
                else if (currentScale === 'Phrygian' && currentKeyName === 'F' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                // Special override for Bb Phrygian's Fb chord
                else if (currentScale === 'Phrygian' && currentKeyName === 'Bb' && chordName === 'Fb') {
                    color = rootNoteColors['F']; // Force green color for Fb
                }
                // Special override for Gb Lydian's Cb chord
                else if (currentScale === 'Lydian' && currentKeyName === 'Gb' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                // Special override for Eb Mixolydian's Cb chord
                else if (currentScale === 'Mixolydian' && currentKeyName === 'Eb' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                // Special override for Ab Mixolydian's Fb chord
                else if (currentScale === 'Mixolydian' && currentKeyName === 'Ab' && chordName === 'Fb') {
                    color = rootNoteColors['F']; // Force green color for Fb
                }
                // Special override for Ab Mixolydian's Cb chord
                else if (currentScale === 'Mixolydian' && currentKeyName === 'Ab' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                // Special override for F Locrian's Cb chord
                else if (currentScale === 'Locrian' && currentKeyName === 'F' && chordName === 'Cb') {
                    color = rootNoteColors['C']; // Force red color for Cb
                }
                else {
                    const match = chordName.match(/^[A-G](b|#)?/);
                    const rootNote = match ? match[0] : null;
                    if (rootNote) {
                        color = rootNoteColors[rootNote] || '#ccc';
                    }
                }
            }
            const div = keyToDiv[buttonKey];
            if (div) {
                div.style.backgroundColor = color;
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
  const keyName = keyNames[currentKeyIndex];
  let nameList;
  let nameMap;

  if (currentScale === 'Major') {
    nameList = chordNamesAltByKey[keyName];
    nameMap = chordNamesDefault;
  } else if (currentScale === 'Minor') {
    nameList = chordNamesAltByMinorKey[keyName];
    nameMap = chordNamesMinor;
  } else if (currentScale === 'Natural Minor') {
    nameList = chordNamesAltByNaturalMinorKey[keyName];
    nameMap = chordNamesNaturalMinor;
  } else if (currentScale === 'Harmonic Minor') {
    nameList = chordNamesAltByHarmonicMinorKey[keyName];
    nameMap = chordNamesHarmonicMinor;
  } else if (currentScale === 'Melodic Minor') {
    nameList = chordNamesAltByMelodicMinorKey[keyName];
    nameMap = chordNamesMelodicMinor;
  } else if (currentScale === 'Dorian') {
    nameList = chordNamesAltByDorianKey[keyName];
    nameMap = chordNamesDorian;
  } else if (currentScale === 'Phrygian') {
    nameList = chordNamesAltByPhrygianKey[keyName];
    nameMap = chordNamesPhrygian;
  } else if (currentScale === 'Lydian') {
    nameList = chordNamesAltByLydianKey[keyName];
    nameMap = chordNamesLydian;
  } else if (currentScale === 'Mixolydian') {
    nameList = chordNamesAltByMixolydianKey[keyName];
    nameMap = chordNamesMixolydian;
  } else if (currentScale === 'Locrian') {
    nameList = chordNamesAltByLocrianKey[keyName];
    nameMap = chordNamesLocrian;
  }

  if (useAlt) {
    if (!nameList) { console.error("Name list not found for key:", keyName); return; }
    buttonOrder.forEach((key, idx) => {
      if (noteButtonRefs[key] && nameList[idx]) {
        noteButtonRefs[key].textContent = nameList[idx];
      }
    });
  } else {
    Object.entries(nameMap).forEach(([key, name]) => {
      if (noteButtonRefs[key]) {
        noteButtonRefs[key].textContent = name;
      }
    });
  }
}

function updateKeyDisplay() {
    const displayName = (currentScale === 'Major' || currentScale === 'Lydian') 
        ? keyNames[currentKeyIndex]
        : (currentScale === 'Mixolydian')
        ? mixolydianKeyNames[currentKeyIndex]
        : (currentScale === 'Locrian')
        ? locrianKeyNames[currentKeyIndex]
        : minorKeyNames[currentKeyIndex];
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

// Create the divs based on one of the chord layouts (they all share the same cell structure)
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
  div.addEventListener('touchend', () => { if (touchLeaveTimeout) clearTimeout(touchLeaveTimeout); touchLeaveTimeout = setTimeout(() => { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); }, 20); });
  div.addEventListener('touchcancel', () => { if (touchLeaveTimeout) clearTimeout(touchLeaveTimeout); touchLeaveTimeout = setTimeout(() => { isTouching = false; handleStopKey(btn.key); div.classList.remove('active'); }, 20); });
  grid.appendChild(div);
  keyToDiv[btn.key] = div;
  noteButtonRefs[btn.key] = div;
});

const keyMap = {
  // I Chord (i in minor/dorian) -> j
  "j": "j", "f": "j", "1": "j",
  // ii Chord -> k
  "k": "k", "d": "k", "2": "k",
  // iii Chord (l)
  "l": "l", "s": "l", "3": "l",
  // IV Chord (u)
  "u": "u", "w": "u", "4": "u",
  // V Chord (i)
  "i": "i", "e": "i", "5": "i",
  // vi Chord (o)
  "o": "o", "r": "o", "6": "o",
  // V/V, IV(min), bVI(dor) -> 8
  "y": "8", "q": "8", "7": "8",
  // V/vi, v(min), V(dor) -> 9
  "p": "9", "t": "9", "8": "9",
  // IV/IV, ii°7(min), #iv°7(dor) -> n
  "h": "n", "g": "n", "0": "n" 
};
const keyHeldDown = {};

window.addEventListener('keydown', function(e) {
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "SELECT" || document.activeElement.isContentEditable)) return;
  let key = e.key;
  if (keyMap[key] && !keyHeldDown[key]) {
    sharpTouchHeld = e.shiftKey;
    flatTouchHeld = e.altKey || e.ctrlKey;
    keyHeldDown[key] = true;
    const chordKey = keyMap[key];
    handlePlayKey(chordKey);
    if (keyToDiv[chordKey]) keyToDiv[chordKey].classList.add('active');
  }
  if (key === "#" || key === "ArrowUp") { accidentalHeld.sharp = true; sharpTouchHeld = true; reTriggerHeldKeysAccidentals(); }
  if (key === "b" || key === "ArrowDown") { accidentalHeld.flat = true; flatTouchHeld = true; reTriggerHeldKeysAccidentals(); }
  if (key === "c" || key === "C") { cButtonState = (cButtonState === 'C') ? 'I' : 'C'; renderToggleButton(); updateBoxNames(); }
});

window.addEventListener('keyup', function(e) {
  let key = e.key;
  if (keyMap[key]) {
    const chordKey = keyMap[key];
    handleStopKey(chordKey);
    keyHeldDown[key] = false;
    sharpTouchHeld = false;
    flatTouchHeld = false;
    if (keyToDiv[chordKey]) keyToDiv[chordKey].classList.remove('active');
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
scaleControl.innerHTML = `<select id="scale-select" class="scale-select" aria-label="Scale select"><option value="Major">Major</option><option value="Minor">Minor</option><option value="Natural Minor">Natural Minor</option><option value="Harmonic Minor">Harmonic Minor</option><option value="Melodic Minor">Melodic Minor</option><option value="Dorian">Dorian</option><option value="Phrygian">Phrygian</option><option value="Lydian">Lydian</option><option value="Mixolydian">Mixolydian</option><option value="Locrian">Locrian</option></select>`;

const waveButton = document.createElement('div');
waveButton.className = 'control-area';
waveButton.tabIndex = 0;
waveButton.setAttribute('aria-label', 'Waveform control');
waveButton.innerHTML = '<div class="arrow" id="left-arrow">&#9664;</div><div id="waveform-name">triangle</div><div class="arrow" id="right-arrow">&#9654;</div>';

controlsBar.appendChild(keyButton);
controlsBar.appendChild(scaleControl);
controlsBar.appendChild(waveButton);

document.getElementById("key-left").onclick = () => {
  currentKeyIndex = (currentKeyIndex - 1 + keyNames.length) % keyNames.length;
  updateKeyDisplay();
  updateSolfegeColors();
  updateBoxNames();
};
document.getElementById("key-right").onclick = () => {
  currentKeyIndex = (currentKeyIndex + 1) % keyNames.length;
  updateKeyDisplay();
  updateSolfegeColors();
  updateBoxNames();
};

document.getElementById("scale-select").addEventListener('change', (e) => {
  currentScale = e.target.value;
  updateKeyDisplay();
  updateSolfegeColors();
  updateBoxNames();
  document.body.focus();
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
updateSolfegeColors();
updateBoxNames();
