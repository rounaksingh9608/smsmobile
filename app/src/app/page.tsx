import { redirect } from 'next/navigation';

export default function RootPage() {
  // If the proxy (middleware) didn't catch this, fallback to redirect
  redirect('/login');
}
