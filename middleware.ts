import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PermissionManager } from '@/lib/auth/permissions';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    const pathname = request.nextUrl.pathname;

    if (!session) {
      if (PermissionManager.isProtectedRoute(pathname)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return supabaseResponse;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const userRole = profileData?.role;

    if (!userRole) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const permission = PermissionManager.canAccessRoute(userRole, pathname);

    if (!permission.isAllowed) {
      const dashboard = PermissionManager.getDashboardRoute(userRole);
      return NextResponse.redirect(new URL(dashboard, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-email', session.user.email || '');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    console.error('Middleware error:', error);
    return supabaseResponse;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
