import Link from 'next/link';
import { readCatalogue } from '@/server/catalogue/source';
import { pageParams, parseQuery, CatalogueError } from '@/server/catalogue/query';
import CafeCard from './cafe-card';
import BrewFinder from './brew-finder';
import { customerAccess } from './access';
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function Page({ searchParams }: Props) {
  const access = await customerAccess(); if (access) return access;
  const params = pageParams(await searchParams);
  let query, result;
  try {
    query = parseQuery(params, 'browse');
    result = await readCatalogue(query);
  } catch (error) {
    return <p role="alert">{error instanceof CatalogueError && error.code === 'INVALID_REQUEST' ? 'Invalid filters. Reset filters to try again.' : 'Cafés are temporarily unavailable. Try again.'} <Link href="/customer/cafes">Reset filters</Link></p>;
  }
  const url = (page: number) => { const next = new URLSearchParams(params); next.set('page', String(page)); return `/customer/cafes?${next}`; };
  const content = <BrewFinder key={params.toString()} query={query}>{result.items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.items.map(cafe => <CafeCard key={cafe.cafeId} cafe={cafe} />)}</div> : <p role="status">No cafés match these filters.</p>}<nav aria-label="Catalogue pages" className="mt-6 flex gap-5">{result.page > 1 && <Link href={url(result.page-1)}>Previous page</Link>}{result.hasNextPage && <Link href={url(result.page+1)}>Next page</Link>}</nav></BrewFinder>;
  return <section><h1 className="text-2xl font-semibold">Browse cafés</h1><p className="mt-2">Find your next pickup from a home café.</p>{content}</section>;
}
