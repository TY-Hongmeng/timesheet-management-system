import React from 'react';

interface SkeletonLoaderProps {
  type?: 'page' | 'card' | 'list' | 'table' | 'form';
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'page', className = '' }) => {
  const baseClasses = 'animate-pulse';
  
  const renderPageSkeleton = () => (
    <div className={`${baseClasses} ${className} min-h-screen bg-black p-6`}>
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-800/60 rounded-lg w-1/3 mb-4 shadow-sm"></div>
        <div className="h-4 bg-gray-800/40 rounded w-2/3"></div>
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
              <div className="h-6 bg-gray-700/50 rounded-lg w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-700/40 rounded w-full"></div>
                <div className="h-4 bg-gray-700/40 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700/40 rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Table skeleton */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
          <div className="p-4 border-b border-gray-700/30">
            <div className="h-6 bg-gray-700/50 rounded-lg w-1/4"></div>
          </div>
          <div className="divide-y divide-gray-700/30">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex space-x-4">
                <div className="h-4 bg-gray-700/40 rounded flex-1"></div>
                <div className="h-4 bg-gray-700/40 rounded flex-1"></div>
                <div className="h-4 bg-gray-700/40 rounded flex-1"></div>
                <div className="h-4 bg-gray-700/40 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCardSkeleton = () => (
    <div className={`${baseClasses} ${className} bg-gray-800/30 rounded-xl p-6 border border-gray-700/30`}>
      <div className="h-6 bg-gray-700/50 rounded-lg w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700/40 rounded w-full"></div>
        <div className="h-4 bg-gray-700/40 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700/40 rounded w-4/6"></div>
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className={`${baseClasses} ${className} space-y-4`}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="w-12 h-12 bg-gray-700/50 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700/40 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={`${baseClasses} ${className} bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden`}>
      <div className="p-4 border-b border-gray-700/30">
        <div className="h-6 bg-gray-700/50 rounded-lg w-1/4"></div>
      </div>
      <div className="divide-y divide-gray-700/30">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 grid grid-cols-4 gap-4">
            <div className="h-4 bg-gray-700/40 rounded"></div>
            <div className="h-4 bg-gray-700/40 rounded"></div>
            <div className="h-4 bg-gray-700/40 rounded"></div>
            <div className="h-4 bg-gray-700/40 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFormSkeleton = () => (
    <div className={`${baseClasses} ${className} bg-gray-800/30 rounded-xl p-6 border border-gray-700/30`}>
      <div className="h-8 bg-gray-700/50 rounded-lg w-1/3 mb-6"></div>
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-700/40 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700/30 rounded-lg"></div>
          </div>
        ))}
        <div className="flex space-x-4 pt-4">
          <div className="h-10 bg-green-600/30 rounded-lg w-24"></div>
          <div className="h-10 bg-gray-700/30 rounded-lg w-24"></div>
        </div>
      </div>
    </div>
  );

  switch (type) {
    case 'card':
      return renderCardSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'form':
      return renderFormSkeleton();
    default:
      return renderPageSkeleton();
  }
};

export default SkeletonLoader;