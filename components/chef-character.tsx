'use client'

interface ChefCharacterProps {
  position: 'left' | 'right'
  message: string
  size?: 'md' | 'lg'
  cookbookMode?: boolean
}

export function ChefCharacter({ position, message, size = 'md', cookbookMode = false }: ChefCharacterProps) {
  const sizeClass = size === 'lg' ? 'text-7xl' : 'text-5xl'
  const bubbleBg = cookbookMode ? 'bg-white border-amber-200' : 'bg-gray-800 border-gray-700'
  const textColor = cookbookMode ? 'text-stone-700' : 'text-gray-200'
  const tailLeft = cookbookMode
    ? 'left-[-8px] border-r-[8px] border-r-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent'
    : 'left-[-8px] border-r-[8px] border-r-gray-800 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent'
  const tailRight = cookbookMode
    ? 'right-[-8px] border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent'
    : 'right-[-8px] border-l-[8px] border-l-gray-800 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent'

  return (
    <div className={`flex items-end gap-3 ${position === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className={`${sizeClass} select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]`}>👨‍🍳</div>
      <div className={`${bubbleBg} rounded-2xl px-4 py-2.5 shadow-xl border max-w-[180px] relative`}>
        <p className={`text-sm ${textColor} font-medium`}>{message}</p>
        <div className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 ${position === 'right' ? tailRight : tailLeft}`} />
      </div>
    </div>
  )
}
