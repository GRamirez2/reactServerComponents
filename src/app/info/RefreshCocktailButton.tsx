'use client';

import { useRouter } from 'next/navigation';

export default function RefreshCocktailButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex w-fit items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
    >
      Get another cocktail
    </button>
  );
}
