// Uploaded files, read into engine pieces and kept in memory by fileId until a turn uses them.
// POST /api/upload fills this (block 3); POST /api/turn {type:'file', fileId} reads it.

import { randomUUID } from 'node:crypto'
import type { Finding, FileKind, Profile } from 'shared'
import type { Sample } from './personas.ts'

export type Piece =
  | { fileKind: 'credit_report'; report: Sample }
  | { fileKind: 'bank'; bank: NonNullable<Profile['bank']>; findings: Finding[] }
  | { fileKind: 'letter'; decline: NonNullable<Profile['decline']>; findings: Finding[] }

const store = new Map<string, Piece>()

export function putUpload(piece: Piece): string {
  const id = `up-${piece.fileKind}-${randomUUID().slice(0, 8)}`
  store.set(id, piece)
  return id
}

export function getUpload(fileId: string, fileKind: FileKind): Piece | null {
  const p = store.get(fileId)
  return p && p.fileKind === fileKind ? structuredClone(p) : null
}
