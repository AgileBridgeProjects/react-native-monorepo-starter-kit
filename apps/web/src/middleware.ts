import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (
    process.env.MAINTENANCE_MODE === 'true' &&
    !request.nextUrl.pathname.startsWith('/maintenance')
  ) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.\\w+$).*)'],
};
