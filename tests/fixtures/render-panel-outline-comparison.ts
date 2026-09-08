import gerberToSvg from "gerber-to-svg"

/** Render actual Edge_Cuts from the 60 x 30 mm panel fixture at a shared scale. */
export const renderPanelOutlineComparison = async (
  views: {
    gerber: string
    title: string
    caption: string
  }[],
) => {
  const cards = await Promise.all(
    views.map(async ({ gerber, title, caption }, index) => {
      const svg = await new Promise<string>((resolve, reject) => {
        gerberToSvg(gerber, { id: `panel-outline-${index}` }, (error, svg) => {
          if (error) reject(error)
          else resolve(svg)
        })
      })
      // Preserve the Gerber renderer's paths and Y transform. Only increase
      // display stroke width, add contrast, and leave space around the edges.
      const content = svg
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>$/, "")
        .replace(/currentColor/g, "#f8fafc")
        .replace(/stroke-width="50"/g, 'stroke-width="240"')
      const x = 20 + index * 630
      return `
        <rect x="${x}" y="20" width="610" height="420" rx="12" fill="#172033" stroke="#475569"/>
        <text x="${x + 20}" y="58" font-size="24" font-weight="bold">${title}</text>
        <text x="${x + 20}" y="88" font-size="17" fill="#cbd5e1">${caption}</text>
        <svg x="${x + 10}" y="105" width="590" height="320" viewBox="-33000 -18000 66000 36000"
          fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-width="0">
          ${content}
        </svg>`
    }),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="1280" height="490" viewBox="0 0 1280 490">
    <rect width="1280" height="490" fill="#0b1220"/>
    <g font-family="sans-serif" fill="#f8fafc">
      ${cards.join("\n")}
      <text x="30" y="472" font-size="16" fill="#cbd5e1">Actual Edge_Cuts output · same scale · strokes enlarged for visibility</text>
    </g>
  </svg>`
}
