interface BadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'
  tooltip?: string
}

const VARIANT_CLASSES: Record<BadgeProps['variant'], string> = {
  success: 'bg-[rgba(90,196,126,0.15)] text-[#5AC47E] border border-[rgba(90,196,126,0.3)]',
  warning: 'bg-[rgba(232,145,58,0.15)] text-[#E8913A] border border-[rgba(232,145,58,0.3)]',
  danger:  'bg-[rgba(232,90,90,0.15)] text-[#E85A5A] border border-[rgba(232,90,90,0.3)]',
  info:    'bg-[rgba(90,157,232,0.15)] text-[#5A9DE8] border border-[rgba(90,157,232,0.3)]',
  purple:  'bg-[rgba(156,122,232,0.15)] text-[#9C7AE8] border border-[rgba(156,122,232,0.3)]',
  default: 'bg-[rgba(255,255,255,0.05)] text-[#8B8A85] border border-[rgba(255,255,255,0.1)]',
}

export default function Badge({ label, variant, tooltip }: BadgeProps) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]}`}
      title={tooltip}
    >
      {label}
    </span>
  )
}
