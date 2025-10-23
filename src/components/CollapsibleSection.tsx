import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  className = '',
  titleClassName = '',
  contentClassName = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`collapsible-section ${className}`}>
      <div 
        className={`flex items-center cursor-pointer hover:bg-green-900/20 p-2 rounded transition-colors ${titleClassName}`}
        onClick={toggleExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
        )}
        <h3 className="text-lg font-semibold text-green-400 font-mono flex-1">
          {title}
        </h3>
      </div>
      
      {isExpanded && (
        <div className={`collapsible-content mt-2 ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;