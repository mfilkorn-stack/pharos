#!/usr/bin/env node
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
const URL = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/deu.traineddata";
const OUT = "public/tesseract/deu.traineddata";
if (existsSync(OUT)) { console.log("Modell vorhanden, übersprungen."); process.exit(0); }
mkdirSync("public/tesseract", { recursive: true });
const res = await fetch(URL);
if (!res.ok) throw new Error("Download failed: " + res.status);
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes)`);
