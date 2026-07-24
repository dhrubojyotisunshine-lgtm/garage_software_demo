// Tolerate both API shapes so the client keeps working even if the deployed
// server is a different version:
//   - new (paginated): { items, total, pages, limit }
//   - old (bare array): [ ... ]
export function listItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items || [];
}

export function listTotal(data) {
  if (Array.isArray(data)) return data.length;
  return data?.total ?? (data?.items?.length || 0);
}

export function listPages(data) {
  if (Array.isArray(data)) return 1;
  return data?.pages || 1;
}
