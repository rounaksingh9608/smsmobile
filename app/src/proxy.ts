import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed roles
export const validRoles = [
  'super-admin',
  'secretary',
  'guard',
  'resident',
];

export default function proxy(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;

  const isLoginPage = request.nextUrl.pathname === '/login';
  
  if (!authToken || !userRole || !validRoles.includes(userRole)) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoginPage && authToken && validRoles.includes(userRole)) {
    return NextResponse.redirect(new URL(`/${userRole}`, request.url));
  }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(`/${userRole}`, request.url));
  }
  
  // Protect specific dashboard routes against incorrect roles
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/') && pathname !== `/${userRole}`) {
      // If they try to access a different dashboard route, force them to their own
      const firstSegment = pathname.split('/')[1];
      if (validRoles.includes(firstSegment) && firstSegment !== userRole) {
          return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
