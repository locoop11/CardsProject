import { useId } from 'react'
import type { LawColor } from '../api/types'

/** Map law number (1-based) to a standard deck rank label. */
export function rankLabel(number: number): string {
  if (number === 1) return 'A'
  if (number === 11) return 'J'
  if (number === 12) return 'Q'
  if (number === 13) return 'K'
  return String(number)
}

type Props = {
  color: LawColor
  number: number
  faceDown?: boolean
  className?: string
}

/**
 * Standard French-suited playing card face.
 * Red laws → hearts, black laws → spades.
 */
export function PlayingCardFace({
  color,
  number,
  faceDown = false,
  className = '',
}: Props) {
  const patternId = useId().replace(/:/g, '')

  if (faceDown) {
    return (
      <svg
        className={`playing-card-svg ${className}`.trim()}
        viewBox="0 0 70 100"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1.1" fill="#2a6bb5" />
          </pattern>
        </defs>
        <rect
          x="1"
          y="1"
          width="68"
          height="98"
          rx="5"
          fill="#f7f3ea"
          stroke="#1a1f26"
          strokeWidth="1.5"
        />
        <rect x="5" y="5" width="60" height="90" rx="3" fill="#1e4d8c" />
        <rect
          x="8"
          y="8"
          width="54"
          height="84"
          rx="2"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.2"
        />
        <rect
          x="11"
          y="11"
          width="48"
          height="78"
          rx="1.5"
          fill={`url(#${patternId})`}
        />
        <rect
          x="22"
          y="38"
          width="26"
          height="24"
          rx="2"
          fill="#163a6b"
          stroke="#c9a227"
          strokeWidth="0.8"
        />
        <text
          x="35"
          y="54"
          textAnchor="middle"
          fill="#c9a227"
          fontSize="10"
          fontFamily="Georgia, serif"
          fontWeight="700"
        >
          ◆
        </text>
      </svg>
    )
  }

  const isRed = color === 'red'
  const suit = isRed ? '♥' : '♠'
  const ink = isRed ? '#c4293d' : '#1a1f26'
  const rank = rankLabel(number)
  const pips = pipPositions(number)

  return (
    <svg
      className={`playing-card-svg ${className}`.trim()}
      viewBox="0 0 70 100"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="68"
        height="98"
        rx="5"
        fill="#fffef8"
        stroke="#1a1f26"
        strokeWidth="1.5"
      />
      {/* Corner rank + suit */}
      <text
        x="8"
        y="16"
        fill={ink}
        fontSize="11"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
      >
        {rank}
      </text>
      <text x="8" y="27" fill={ink} fontSize="10" fontFamily="Georgia, serif">
        {suit}
      </text>
      <g transform="rotate(180 35 50)">
        <text
          x="8"
          y="16"
          fill={ink}
          fontSize="11"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
        >
          {rank}
        </text>
        <text x="8" y="27" fill={ink} fontSize="10" fontFamily="Georgia, serif">
          {suit}
        </text>
      </g>
      {/* Center pips or court letter */}
      {number >= 11 || number === 1 ? (
        <text
          x="35"
          y={number === 1 ? 58 : 56}
          textAnchor="middle"
          fill={ink}
          fontSize={number === 1 ? 36 : 28}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
        >
          {number === 1 ? suit : rank}
        </text>
      ) : (
        pips.map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fill={ink}
            fontSize="14"
            fontFamily="Georgia, serif"
          >
            {suit}
          </text>
        ))
      )}
    </svg>
  )
}

/** Classic pip layouts for 2–10 (viewBox 70×100). */
function pipPositions(n: number): Array<[number, number]> {
  const L = 22
  const R = 48
  const C = 35
  const T = 26
  const M = 50
  const B = 74
  const T2 = 34
  const B2 = 66

  switch (n) {
    case 2:
      return [
        [C, T],
        [C, B],
      ]
    case 3:
      return [
        [C, T],
        [C, M],
        [C, B],
      ]
    case 4:
      return [
        [L, T],
        [R, T],
        [L, B],
        [R, B],
      ]
    case 5:
      return [
        [L, T],
        [R, T],
        [C, M],
        [L, B],
        [R, B],
      ]
    case 6:
      return [
        [L, T],
        [R, T],
        [L, M],
        [R, M],
        [L, B],
        [R, B],
      ]
    case 7:
      return [
        [L, T],
        [R, T],
        [C, T2],
        [L, M],
        [R, M],
        [L, B],
        [R, B],
      ]
    case 8:
      return [
        [L, T],
        [R, T],
        [C, T2],
        [L, M],
        [R, M],
        [C, B2],
        [L, B],
        [R, B],
      ]
    case 9:
      return [
        [L, T],
        [R, T],
        [L, T2 + 4],
        [R, T2 + 4],
        [C, M],
        [L, B2 - 4],
        [R, B2 - 4],
        [L, B],
        [R, B],
      ]
    case 10:
      return [
        [L, T],
        [R, T],
        [C, T + 6],
        [L, T2 + 4],
        [R, T2 + 4],
        [L, B2 - 4],
        [R, B2 - 4],
        [C, B - 6],
        [L, B],
        [R, B],
      ]
    default:
      return [[C, M]]
  }
}
