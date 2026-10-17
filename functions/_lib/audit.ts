import type { Actor } from './env';

export type AuditEntry = {
  actor: string;
  action: string;
  target: string;
  result: string;
};

/** Every write is logged as one JSON line so Pages Functions logs and a future KV audit namespace share a shape. */
export function audit(actor: Actor, action: string, target: string, result: string): void {
  const entry: AuditEntry & { kind: 'audit'; at: string } = {
    kind: 'audit',
    at: new Date().toISOString(),
    actor: actor.email,
    action,
    target,
    result,
  };
  console.log(JSON.stringify(entry));
}
