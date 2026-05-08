'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AdminMenuItem = {
  href: string;
  label: string;
  matchPrefix?: string;
};

type AdminSubNavProps = {
  items: readonly AdminMenuItem[];
};

function isItemActive(pathname: string, item: AdminMenuItem) {
  const matchPrefix = item.matchPrefix ?? item.href;
  return pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`);
}

export default function AdminSubNav({ items }: AdminSubNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sub navigation" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = isItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'border-sky-600 bg-sky-100 text-sky-900 dark:border-sky-400 dark:bg-sky-900/50 dark:text-sky-100'
                : 'border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
