import { notFound } from 'next/navigation';

// Routes unknown paths to the localized not-found page.
export default function CatchAll() {
  notFound();
}
