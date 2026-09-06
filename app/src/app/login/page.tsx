import { loginUser, getSocieties } from '@/app/actions/auth';
import Link from 'next/link';
import Image from 'next/image';

export default async function LoginPage() {
  const societies = await getSocieties();

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4 relative overflow-hidden">
      <Image src="/background.png" alt="Background" fill className="object-cover opacity-30 pointer-events-none" />
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-on-primary font-bold text-2xl shadow-md mb-4 hover:scale-105 transition-transform overflow-hidden relative border border-border-low">
            <Image src="/logo.jpg" alt="SocioHub Logo" fill className="object-cover" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface text-center">SocioHub</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">Sign in to your account</p>
        </div>

        <form action={loginUser} className="space-y-6">
          <div>
            <label htmlFor="societyId" className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              Select Your Society
            </label>
            <div className="relative">
              <select 
                id="societyId"
                name="societyId"
                required
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="" disabled selected>Select a society...</option>
                {societies.map(society => (
                  <option key={society.id} value={society.id}>{society.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="identifier" className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              Phone Number or Resident ID
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              placeholder="e.g. +15551234567 or john@402"
              className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-primary text-on-primary font-headline-md text-headline-md rounded-lg shadow-sm hover:bg-primary-fixed-variant transition-colors active:scale-[0.98] flex items-center justify-center"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-body-sm text-on-surface-variant">
            Don't have a society yet?{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
