import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server';
    const role = formData.get("role") as string;
    
    const cookieStore = await cookies();
    
    // Set standard secure cookies (mocking a real JWT flow)
    cookieStore.set("auth-token", "mock-jwt-token-12345", { path: "/" });
    cookieStore.set("user-role", role, { path: "/" });

    redirect(`/${role}`);
  }

  async function handleSuperAdminLogin() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.set("auth-token", "mock-jwt-token-12345", { path: "/" });
    cookieStore.set("user-role", "super-admin", { path: "/" });
    redirect(`/super-admin`);
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low">
        
        {/* Hidden Super Admin login via Easter Egg on Logo Form */}
        <div className="flex flex-col items-center mb-8">
          <form action={handleSuperAdminLogin}>
            <button 
              type="submit"
              className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold text-2xl shadow-md mb-4 hover:scale-105 transition-transform"
              title="Double click for super admin..."
            >
              EP
            </button>
          </form>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface text-center">Estate Pillar</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">Sign in to your account</p>
        </div>

        <form action={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="role" className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              Select Your Role
            </label>
            <div className="relative">
              <select 
                id="role"
                name="role"
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="resident">Resident</option>
                <option value="guard">Security Guard</option>
                <option value="secretary">Secretary</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue="demo@estatepillar.com"
              required
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
              autoComplete="current-password"
              defaultValue="password123"
              required
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
      </div>
    </div>
  );
}
