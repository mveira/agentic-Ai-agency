'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          if (typeof document === 'undefined') return null;
          const match = document.cookie.match(
            new RegExp('(^| )' + key + '=([^;]+)')
          );
          return match ? decodeURIComponent(match[2]!) : null;
        },
        set(key: string, value: string, options: CookieOptions) {
          if (typeof document === 'undefined') return;
          let cookie = `${key}=${encodeURIComponent(value)}`;
          if (options?.path) cookie += `; path=${options.path}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          if (options?.secure) cookie += '; secure';
          document.cookie = cookie;
        },
        remove(key: string, options: CookieOptions) {
          if (typeof document === 'undefined') return;
          let cookie = `${key}=; max-age=0`;
          if (options?.path) cookie += `; path=${options.path}`;
          document.cookie = cookie;
        },
      },
    }
  );
}
