/**
 * أيقونات خطية بسيطة (SVG مضمّنة) — بدون مكتبة خارجية، تبقى الحزمة خفيفة
 * ومتحكَّماً في لونها عبر currentColor.
 */
const common = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconSell(props) {
  return (
    <svg {...common} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

export function IconStock(props) {
  return (
    <svg {...common} {...props}>
      <path d="M3.5 7.5 12 3l8.5 4.5L12 12 3.5 7.5Z" />
      <path d="M3.5 7.5V16.5L12 21l8.5-4.5V7.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

export function IconHistory(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M8 2h8" />
    </svg>
  )
}

export function IconDashboard(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 20V11" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
    </svg>
  )
}

export function IconPlus(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconBarcode(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 5v14M8 5v14M12 5v10M16 5v14M20 5v14" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconStore(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2l1 5a2.5 2.5 0 0 1-4 2 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4-2Z" />
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M9 20v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
    </svg>
  )
}

export function IconWarning(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
