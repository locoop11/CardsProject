/** Client-side LawCard visuals until Phase 4 wires the Python deck. */

export type LawColor = 'red' | 'black'

export type LawCardModel = {
  id: number
  color: LawColor
  number: number
}

let nextLawId = 1

/** Draw n mock LawCards (approx 11 black / 6 red deck bias). */
export function drawLawCards(n: number): LawCardModel[] {
  return Array.from({ length: n }, () => {
    const color: LawColor = Math.random() < 11 / 17 ? 'black' : 'red'
    const number =
      color === 'black'
        ? Math.floor(Math.random() * 11) + 1
        : Math.floor(Math.random() * 6) + 1
    const id = nextLawId
    nextLawId += 1
    return { id, color, number }
  })
}
