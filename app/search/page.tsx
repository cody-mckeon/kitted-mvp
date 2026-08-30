import { SearchExperience } from "@/components/search-experience";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; catalogError?: string }> }) {
  const { q = "", catalogError } = await searchParams;
  return <SearchExperience initialQuery={q} simulateError={catalogError === "1"} />;
}
