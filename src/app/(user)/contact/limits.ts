// Shared between the public contact form (contact-form.tsx) and its Server
// Action (actions.ts) so the client-side maxLength/counter and the
// server-side Zod schema never drift apart.
export const MAX_CONTACT_NAME_LENGTH = 150;
export const MAX_CONTACT_PHONE_LENGTH = 20;
export const MIN_CONTACT_QUESTION_LENGTH = 50;
export const MAX_CONTACT_QUESTION_LENGTH = 1000;
