// Resend wrapper. Returns null when RESEND_API_KEY is absent so callers
// fall through to a logged no-op instead of throwing — keeps the rest of
// the app healthy during incidents on the email provider.

import { Resend } from 'resend';

let _resend: Resend | null = null;
let _checked = false;

function getResend(): Resend | null {
  if (_checked) return _resend;
  _checked = true;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM ?? 'Compute Terminal <noreply@computeterminal.io>';

interface SendArgs {
  to: string | string[];
  subject: string;
  /** Plain text body. */
  text?: string;
  /** HTML body. */
  html?: string;
  replyTo?: string;
}

/** Returns the provider message id on success, null on no-op (no key),
 *  throws on real send errors so callers can decide whether to retry. */
export async function sendEmail(args: SendArgs): Promise<string | null> {
  const resend = getResend();
  if (!resend) {
    console.info(JSON.stringify({ level: 'info', msg: 'email_no_op', to: args.to, subject: args.subject }));
    return null;
  }
  if (!args.text && !args.html) throw new Error('sendEmail requires either text or html');
  // Resend's API options are a discriminated union (html | text | react |
  // template). We always go through the html-or-text branch; cast through
  // unknown to dodge the union narrowing without `any`.
  const payload = {
    from: FROM,
    to: args.to,
    subject: args.subject,
    ...(args.html ? { html: args.html } : {}),
    ...(args.text ? { text: args.text } : {}),
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  } as unknown as Parameters<typeof resend.emails.send>[0];
  const result = await resend.emails.send(payload);
  if (result.error) throw new Error(result.error.message);
  return result.data?.id ?? null;
}

/** Renders the methodology-change notice — the contractual 30-day public
 *  notice required by the Index Committee charter. Caller passes the new
 *  version + diff summary; subject lines follow a standard pattern so
 *  subscribers can filter. */
export interface ChangeNoticeInput {
  newVersion: string;
  effectiveDate: string; // ISO date
  summary: string;
  diffUrl: string;
  proposalUrl: string;
}

export function renderChangeNotice(input: ChangeNoticeInput): { subject: string; text: string; html: string } {
  const subject = `[CTI Methodology Notice] ${input.newVersion} — effective ${input.effectiveDate} (30-day public notice)`;
  const lines = [
    'The Index Committee has approved a methodology change.',
    '',
    `Version:        ${input.newVersion}`,
    `Effective date: ${input.effectiveDate}`,
    `Diff:           ${input.diffUrl}`,
    `Proposal:       ${input.proposalUrl}`,
    '',
    'Summary',
    '-------',
    input.summary,
    '',
    'This notice opens the 30-day public comment period mandated by the',
    'Committee charter. Reply to this email or post comments at the proposal URL.',
    '',
    'On the effective date, the methodology_version field of new',
    'index_values_daily rows will transition from the previous version to',
    `${input.newVersion}. Historical values remain reproducible from their own`,
    'version stamps.',
    '',
    '-- Compute Index Terminal',
    'committee@cti · https://compute-terminal.vercel.app/methodology',
  ];
  const text = lines.join('\n');
  const html = `<pre style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;line-height:1.6;color:#14130f">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</pre>`;
  return { subject, text, html };
}
