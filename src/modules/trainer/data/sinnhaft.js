// SINNHAFT-Schema nach Gräff, Ehlers & Schacher (2023)
// Notfall + Rettungsmedizin 27(1), 19–24
// https://doi.org/10.1007/s10049-023-01167-4

export const SINNHAFT = [
  {
    key: 'start',
    letter: 'S',
    label: 'Start',
    hint: 'Ruhe herstellen, Face-to-Face, "Start" aussprechen.',
    type: 'checklist',
    items: [
      'Manipulationen am Patienten gestoppt',
      'Face-to-Face Position zum aufnehmenden Team',
      '"Start" laut ausgesprochen',
    ],
  },
  {
    key: 'identifikation',
    letter: 'I',
    label: 'Identifikation',
    hint: 'Geschlecht · Name · Alter (kein Geburtsdatum).',
    type: 'text',
    rows: 2,
  },
  {
    key: 'notfallereignis',
    letter: 'N',
    label: 'Notfallereignis',
    hint: 'Was? (Leitsymptom / V.a.) — Wie? (Ursache) — Wann? (Zeitpunkt).',
    type: 'text',
    rows: 3,
  },
  {
    key: 'notfallprioritaet',
    letter: 'N',
    label: 'Notfallpriorität',
    hint: 'ABCDE strukturiert: Befunde + relevante Vitalparameter.',
    type: 'text',
    rows: 4,
  },
  {
    key: 'handlung',
    letter: 'H',
    label: 'Handlung',
    hint: 'Maßnahmen mit Dosis, Wirkung und ggf. bewusst unterlassene.',
    type: 'text',
    rows: 3,
  },
  {
    key: 'anamnese',
    letter: 'A',
    label: 'Anamnese',
    hint: 'SAMPLER + soziale Aspekte, Infektionen, Patientenverfügung, Besonderheiten.',
    type: 'text',
    rows: 3,
  },
  {
    key: 'fazit',
    letter: 'F',
    label: 'Fazit',
    hint: 'Closed-Loop durch das aufnehmende Team.',
    type: 'simulated',
    who: 'Aufnehmendes Team',
  },
  {
    key: 'teamfragen',
    letter: 'T',
    label: 'Teamfragen',
    hint: 'Rückfragen aus dem aufnehmenden Team.',
    type: 'simulated',
    who: 'Aufnehmendes Team',
  },
];

export const TEXT_FIELDS = SINNHAFT.filter((f) => f.type === 'text');
