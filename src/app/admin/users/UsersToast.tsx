'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type UsersToastProps = {
  tone: 'success' | 'error';
  message: string;
};

export default function UsersToast({ tone, message }: UsersToastProps) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const className = useMemo(
    () =>
      tone === 'error'
        ? 'border-red-300 bg-red-50 text-red-800'
        : 'border-emerald-300 bg-emerald-50 text-emerald-800',
    [tone],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('toast');
      next.delete('details');
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed right-6 top-20 z-20 max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {tone === 'error' ? 'Sync failed' : 'Success'}
          </p>
          <p className="mt-1">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide opacity-70 transition hover:opacity-100"
          aria-label="Dismiss toast"
        >
          Close
        </button>
      </div>
    </div>
  );
}
