import React from 'react'

interface LightweightLoadingProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
  color?: string
}

const LightweightLoading: React.FC<LightweightLoadingProps> = ({ 
  message = '加载中...', 
  size = 'medium',
  color = 'text-green-400'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`${sizeClasses[size]} ${color} animate-spin`}>
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
            strokeDasharray="31.416"
            strokeDashoffset="31.416"
            className="animate-pulse"
          />
          <path 
            d="M12 2a10 10 0 0 1 10 10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${color} animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  )
}

export default LightweightLoading