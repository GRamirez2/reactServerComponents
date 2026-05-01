'use client';

import Link from "next/link";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Checking login status...</p>;
  }

  if (!user) {
    return <h1>Login to see the good stuff.</h1>;
  }

  return (
    <>
      <Link href="/people">Parse xlsx documents</Link>
      <Link href="/info">Random Cocktail</Link>
    </>
  );
}
