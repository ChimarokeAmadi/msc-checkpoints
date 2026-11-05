// How a message reaches a customer. Each channel has send(customer, message).
// A new channel (push notification, WhatsApp...) is a new class plus one line in the map.

export class EmailChannel {
  constructor(output) {
    this.output = output;
  }

  send(customer, message) {
    this.output.log(`[EMAIL to ${customer.email}] ${message}`);
  }
}

export class SmsChannel {
  constructor(output) {
    this.output = output;
  }

  send(customer, message) {
    this.output.log(`[SMS to ${customer.phone}] ${message}`);
  }
}

const CHANNELS = { email: EmailChannel, sms: SmsChannel };

export function createChannel(name, output) {
  const Channel = CHANNELS[name];
  if (!Channel) throw new Error(`Unknown notification channel "${name}"`);
  return new Channel(output);
}
