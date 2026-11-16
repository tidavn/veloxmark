// Driver for the veloxmark entry: renders every case in cases.json alone
// with parse() and writes html.json with the results in the cases' order.
// Exactly one output file is written. The input and output directories come
// from MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR, defaulting to /input and
// /output (the harness's mounts).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

type Case = { id: string; markdown: string };

function inputDir(): string {
  return process.env.MAKEFUN_INPUT_DIR ?? '/input';
}

function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

function loadCases(): Case[] {
  const raw = readFileSync(join(inputDir(), 'cases.json'), 'utf8');
  return JSON.parse(raw) as Case[];
}

function renderAll(cases: Case[]): string[] {
  return cases.map((c) => parse(c.markdown));
}

function main(): void {
  const html = renderAll(loadCases());
  mkdirSync(outputDir(), { recursive: true });
  writeFileSync(join(outputDir(), 'html.json'), JSON.stringify(html));
}

main();
