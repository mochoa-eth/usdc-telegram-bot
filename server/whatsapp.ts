/**
 * WhatsApp Cloud API client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import axios from 'axios'

const WA_BASE = 'https://graph.facebook.com/v20.0'

function getToken(): string {
  const t = process.env.WHATSAPP_TOKEN
  if (!t) throw new Error('WHATSAPP_TOKEN is not set')
  return t
}

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!id) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set')
  return id
}

/** Send a plain-text WhatsApp message to a phone number (E.164 without the +). */
export async function sendMessage(to: string, text: string): Promise<void> {
  const toClean = to.startsWith('+') ? to.slice(1) : to
  await axios.post(
    `${WA_BASE}/${getPhoneNumberId()}/messages`,
    {
      messaging_product: 'whatsapp',
      to: toClean,
      type: 'text',
      text: { body: text, preview_url: false },
    },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

/** Extract all inbound text messages from a WhatsApp Cloud API webhook payload. */
export interface InboundMessage {
  from: string   // E.164 with + prefix
  text: string
  messageId: string
  timestamp: number
}

export function extractMessages(body: unknown): InboundMessage[] {
  const messages: InboundMessage[] = []
  try {
    const payload = body as Record<string, unknown>
    const entry = (payload.entry as unknown[]) ?? []
    for (const e of entry) {
      const changes = ((e as Record<string, unknown>).changes as unknown[]) ?? []
      for (const c of changes) {
        const value = (c as Record<string, unknown>).value as Record<string, unknown>
        const msgs = (value?.messages as unknown[]) ?? []
        for (const m of msgs) {
          const msg = m as Record<string, unknown>
          if (msg.type === 'text') {
            const textObj = msg.text as Record<string, unknown>
            messages.push({
              from: `+${msg.from as string}`,
              text: (textObj?.body as string) ?? '',
              messageId: msg.id as string,
              timestamp: parseInt(msg.timestamp as string, 10),
            })
          }
        }
      }
    }
  } catch {
    // malformed payload — return empty
  }
  return messages
}

/** Mark a message as read (shows double blue ticks). */
export async function markRead(messageId: string): Promise<void> {
  try {
    await axios.post(
      `${WA_BASE}/${getPhoneNumberId()}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }
    )
  } catch {
    // non-critical — swallow
  }
}
