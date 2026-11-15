/**
 * Link that opens a channel from another app (Free My TV, adb):
 *
 *   tvaovivo://canal?nome=SporTV      → channel found by name (accents, case and quality ignored)
 *   tvaovivo://canal?id=12345         → channel by its stream_id
 *
 * Test from Termux:
 *   adb shell am start -a android.intent.action.VIEW -d "tvaovivo://canal?nome=sportv"
 */

import type { IptvStream } from '../types/iptv';

export interface LaunchRequest {
  id?: number;
  name?: string;
}

const LINK = /^tvaovivo:\/\/canal\/?\?(.*)$/i;

/** Reads a tvaovivo://canal link, or null if it isn't one */
export function parseLaunchLink(url: string): LaunchRequest | null {
  const match = LINK.exec(url.trim());
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const request: LaunchRequest = {};
  const id = Number(params.get('id'));
  if (Number.isFinite(id) && id > 0) request.id = id;
  const name = (params.get('nome') ?? params.get('name') ?? '').trim();
  if (name) request.name = name.slice(0, 200);
  return request.id !== undefined || request.name !== undefined ? request : null;
}

/** Lowercase, without accents, words separated by single spaces */
function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

const QUALITY = new Set(['fhd', 'hd', 'sd', 'uhd', '4k', 'fullhd', 'h265', 'h264', 'hevc', 'alt']);

/** Name without quality words: "SporTV FHD [H265]" → "sportv" */
function baseName(text: string): string {
  return plain(text)
    .split(' ')
    .filter((word) => word && !QUALITY.has(word))
    .join(' ');
}

/** Picture quality from the name: FHD/4K first, then HD, then the rest, SD last */
function qualityRank(name: string): number {
  const words = plain(name).split(' ');
  if (words.some((w) => w === 'fhd' || w === 'fullhd' || w === '4k' || w === 'uhd')) return 0;
  if (words.includes('hd')) return 1;
  if (words.includes('sd')) return 3;
  return 2;
}

/** Among channels with the same name: best quality, H.265 versions after, then the shortest name */
function best(candidates: IptvStream[]): IptvStream | undefined {
  return [...candidates].sort((a, b) => {
    const hevcA = /h265|hevc/i.test(a.name) ? 1 : 0;
    const hevcB = /h265|hevc/i.test(b.name) ? 1 : 0;
    return qualityRank(a.name) - qualityRank(b.name) || hevcA - hevcB || a.name.length - b.name.length;
  })[0];
}

/** Channel asked for by the link, or undefined if the list has none that matches */
export function findLaunchChannel(streams: IptvStream[], request: LaunchRequest): IptvStream | undefined {
  if (request.id !== undefined) {
    const byId = streams.find((s) => Number(s.stream_id) === request.id);
    if (byId) return byId;
  }
  if (!request.name) return undefined;
  const wanted = plain(request.name);
  const wantedBase = baseName(request.name);
  if (!wanted) return undefined;

  // 1. Same name (quality included: "Globo FHD" asks for that version)
  const exact = streams.filter((s) => plain(s.name) === wanted);
  if (exact.length) return best(exact);
  if (!wantedBase) return undefined;
  // 2. Same name without quality ("sportv" → "SporTV FHD")
  const sameBase = streams.filter((s) => baseName(s.name) === wantedBase);
  if (sameBase.length) return best(sameBase);
  // 3. Name starting with what was asked ("premiere" → "Premiere Clubes")
  const starts = streams.filter((s) => baseName(s.name).startsWith(`${wantedBase} `));
  if (starts.length) return best(starts);
  return undefined;
}
