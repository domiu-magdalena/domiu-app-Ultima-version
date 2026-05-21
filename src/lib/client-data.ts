export async function fetchData(table: string, options?: {
  select?: string;
  filters?: { method: string; column: string; value: any }[];
  order?: { column: string; ascending?: boolean }[];
  single?: boolean;
}) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, ...options }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error fetching data");
  }
  return res.json();
}
