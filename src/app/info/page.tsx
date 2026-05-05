import { Suspense } from 'react';
import Image from 'next/image';
import RefreshCocktailButton from './RefreshCocktailButton';
import pool from '@/lib/db';

type CocktailDrink = {
  idDrink: string;
  strDrink: string;
  strCategory: string | null;
  strAlcoholic: string | null;
  strGlass: string | null;
  strInstructions: string | null;
  strDrinkThumb: string | null;
  [key: string]: string | null;
};

type CocktailResponse = {
  drinks: CocktailDrink[] | null;
};

async function getRandomCocktail(): Promise<CocktailDrink | null> {
  const response = await fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Cocktail API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CocktailResponse;
  return data.drinks?.[0] ?? null;
}

async function getRandomCocktailResult() {
  try {
    const drink = await getRandomCocktail();
    return { drink, hasError: false };
  } catch {
    return { drink: null, hasError: true };
  }
}

function getIngredients(drink: CocktailDrink) {
  const rows: string[] = [];

  for (let index = 1; index <= 15; index += 1) {
    const ingredient = drink[`strIngredient${index}`]?.trim();
    const measure = drink[`strMeasure${index}`]?.trim();

    if (!ingredient) {
      continue;
    }

    rows.push(measure ? `${measure} ${ingredient}`.trim() : ingredient);
  }

  return rows;
}

async function CocktailCard() {
  const { drink, hasError } = await getRandomCocktailResult();

  if (hasError) {
    return <p>Unable to load cocktail data right now.</p>;
  }

  if (!drink) {
    return <p>No cocktail data was returned.</p>;
  }

  const ingredients = getIngredients(drink);

  return (
    <article>
      <h2>{drink.strDrink}</h2>
      {drink.strDrinkThumb ? (
        <Image
          src={drink.strDrinkThumb}
          alt={drink.strDrink}
          width={320}
          height={320}
          unoptimized
        />
      ) : null}
      <p><strong>ID:</strong> {drink.idDrink}</p>
      <p><strong>Category:</strong> {drink.strCategory ?? 'Unknown'}</p>
      <p><strong>Alcoholic:</strong> {drink.strAlcoholic ?? 'Unknown'}</p>
      <p><strong>Glass:</strong> {drink.strGlass ?? 'Unknown'}</p>
      <p><strong>Instructions:</strong> {drink.strInstructions ?? 'No instructions available.'}</p>

      {ingredients.length > 0 ? (
        <>
          <h3>Ingredients</h3>
          <ul>
            {ingredients.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}

type User = {
  id: number;
  name: string;
  email: string;
  created_at: Date;
};

async function getUsers(): Promise<{ users: User[]; error: string | null }> {
  try {
    const result = await pool.query<User>('SELECT * FROM users ORDER BY id');
    return { users: result.rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { users: [], error: message };
  }
}

async function UsersList() {
  const { users, error } = await getUsers();
  if (error) {
    return <p><strong>DB error:</strong> {error}</p>;
  }
  return (
    <section className="my-8">
      <h3 className='text-xl'>List of Users from the Users table - seeded simply</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name} — {user.email}</li>
        ))}
      </ul>
      <hr className="mt-4"/>
    </section >
  );
}

export default async function Info() {
  return (
    <>
      <Suspense fallback={<p>Loading users...</p>}>
        <UsersList />
      </Suspense>
      <h1>A Random Cocktail</h1>
      <p>This is a random cocktail generator. Click the button to get a new cocktail.</p>
      <RefreshCocktailButton />
      <Suspense fallback={<p>Loading random cocktail...</p>}>
        <CocktailCard />
      </Suspense>
    </>
  );
}