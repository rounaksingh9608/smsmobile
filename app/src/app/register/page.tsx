import { registerSociety } from '@/app/actions/auth';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4 relative overflow-hidden">
      <Image src="/background.png" alt="Background" fill className="object-cover opacity-30 pointer-events-none" />
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-on-primary font-bold text-2xl shadow-md mb-4 overflow-hidden relative border border-border-low">
            <Image src="/logo.jpg" alt="SocioHub Logo" fill className="object-cover" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface text-center">SocioHub</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">Register your Society</p>
        </div>

        <form action={registerSociety} className="space-y-5">
          <div>
            <label htmlFor="name" className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
              Society Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Metropolis Towers"
              className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
              Secretary Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="admin@society.com"
              className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+1 (555) 123-4567"
              className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
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
            className="w-full py-4 bg-primary text-on-primary font-headline-md text-headline-md rounded-lg shadow-sm hover:bg-primary-fixed-variant transition-colors active:scale-[0.98] flex items-center justify-center mt-2"
          >
            Register
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-body-sm text-on-surface-variant">
            Already registered?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
