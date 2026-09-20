export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""

  const allActs = [
    "THE INDIAN CONTRACT ACT, 1872",
    "THE INDIAN PENAL CODE, 1860",
    "THE INDIAN SUCCESSION ACT, 1925",
    "THE SALE OF GOODS ACT, 1930",
    "THE NEGOTIABLE INSTRUMENTS ACT, 1881",
    "THE INFORMATION TECHNOLOGY ACT, 2000",
    "THE COMPANIES ACT, 2013",
    "THE CONSUMER PROTECTION ACT, 2019",
    "THE PATENTS ACT, 1970",
    "THE INDIAN EVIDENCE ACT, 1872",
  ]

  const filtered = allActs.filter((act) => act.toLowerCase().includes(query.toLowerCase()))

  return Response.json({
    results: filtered.slice(0, 10), // Limit to 10 results
    total: filtered.length,
  })
}
