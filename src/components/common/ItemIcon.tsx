import { useState } from 'react'

interface ItemIconProps {
  thumbnail: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SLOT_COLORS: Record<string, string> = {
  images_items_010: '#E8913A',  // weapons (01302xxx etc start with 01)
  default: '#5C5B57',
}

function slotColorFromPath(thumbnail: string): string {
  // Map thumbnail path prefix to a color by item category (based on ID ranges)
  const match = thumbnail.match(/(\d{8})/)
  if (!match) return SLOT_COLORS.default
  const id = match[1]
  const prefix = id.slice(0, 3)
  const colors: Record<string, string> = {
    '010': '#8B7355',  // hats / caps
    '011': '#6B8E6B',  // tops
    '012': '#6B7A8E',  // bottoms
    '013': '#E8913A',  // weapons
    '014': '#8E6B6B',  // shoes
    '015': '#6B8E8E',  // gloves/capes
    '103': '#9C7AE8',  // earrings / accessories
  }
  return colors[prefix] ?? SLOT_COLORS.default
}

const SIZE_CLASSES = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' }
const FONT_SIZES   = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }

export default function ItemIcon({ thumbnail, name, size = 'md', className: cls }: ItemIconProps) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = SIZE_CLASSES[size]
  const fontClass = FONT_SIZES[size]

  // Image paths are like "images/items/01302000.png" — served from /MOGple/images/items/...
  const src = `${import.meta.env.BASE_URL}${thumbnail}`

  if (!imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} object-contain pixelated flex-shrink-0 ${cls ?? ''}`}
        style={{ imageRendering: 'pixelated' }}
      />
    )
  }

  // Fallback: colored square with abbreviated name
  const color = slotColorFromPath(thumbnail)
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div
      className={`${sizeClass} rounded flex items-center justify-center flex-shrink-0 ${cls ?? ''}`}
      style={{ backgroundColor: color + '33', border: `1px solid ${color}44` }}
    >
      <span className={`${fontClass} font-bold`} style={{ color }}>{initials}</span>
    </div>
  )
}
