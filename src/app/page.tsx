import { redirect } from 'next/navigation';

export default function RootPage() {
  // For now, redirect to sign-in page. Later this can be a landing page.
  redirect('/sign-in');
}
