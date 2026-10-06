const v = (s?: string) => (s && s.trim() ? s.trim() : '');

/** Shob contact/payment tothyo ekhane. Value .env theke ashe; khali thakle UI-te oi line dekhay na. */
export const CONTACT = {
  email: v(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  phone: v(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  facebook: v(process.env.NEXT_PUBLIC_FACEBOOK_URL),
  address: v(process.env.NEXT_PUBLIC_ADDRESS),
  payNumber: v(process.env.NEXT_PUBLIC_PAY_NUMBER), // bKash/Nagad personal number
};

export const LEGAL_UPDATED = '৬ অক্টোবর ২০২৬';