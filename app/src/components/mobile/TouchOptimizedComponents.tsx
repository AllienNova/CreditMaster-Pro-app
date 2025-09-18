import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  MoreVertical,
  Check,
  X,
  Plus,
  Minus
} from 'lucide-react';

// ============================================================================
// TOUCH-OPTIMIZED ACCORDION
// ============================================================================

interface TouchAccordionProps {
  items: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
    badge?: string;
  }>;
  className?: string;
}

export const TouchAccordion: React.FC<TouchAccordionProps> = ({ items, className = '' }) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <Card key={item.id} className="overflow-hidden">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors mobile-touch-target"
            >
              <div className="flex items-center space-x-3 flex-1">
                <span className="font-medium text-gray-900">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3">
                  {item.content}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ============================================================================
// SWIPEABLE CARD
// ============================================================================

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setDragOffset(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (dragOffset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setDragOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Actions */}
      {leftAction && (
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-green-500 flex items-center justify-center">
          <div className="text-white text-center">
            {leftAction.icon}
            <div className="text-xs mt-1">{leftAction.label}</div>
          </div>
        </div>
      )}
      {rightAction && (
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
          <div className="text-white text-center">
            {rightAction.icon}
            <div className="text-xs mt-1">{rightAction.label}</div>
          </div>
        </div>
      )}
      
      {/* Main Card */}
      <div
        ref={cardRef}
        className={`bg-white transition-transform duration-200 ${className}`}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// TOUCH-FRIENDLY STEPPER
// ============================================================================

interface TouchStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export const TouchStepper: React.FC<TouchStepperProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  className = ''
}) => {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {label && (
        <span className="text-sm font-medium text-gray-700 min-w-0 flex-1">
          {label}
        </span>
      )}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 p-0 mobile-touch-target"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div className="w-12 text-center">
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 p-0 mobile-touch-target"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE ACTION SHEET
// ============================================================================

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    color?: 'default' | 'destructive' | 'primary';
    onClick: () => void;
  }>;
}

export const MobileActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  actions
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 mobile-safe-area">
        {title && (
          <div className="text-center pb-4 border-b border-gray-200 mb-4">
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`
                w-full flex items-center space-x-3 p-4 rounded-lg transition-colors mobile-touch-target
                ${action.color === 'destructive' 
                  ? 'text-red-600 hover:bg-red-50' 
                  : action.color === 'primary'
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {action.icon && (
                <div className="w-5 h-5">
                  {action.icon}
                </div>
              )}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full mobile-touch-target"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PULL-TO-REFRESH
// ============================================================================

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = ''
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || containerRef.current?.scrollTop !== 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
        style={{
          transform: `translateY(${pullDistance - 60}px)`,
          height: '60px'
        }}
      >
        {isRefreshing ? (
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : pullDistance > 60 ? (
          <div className="text-blue-600 text-sm font-medium">Release to refresh</div>
        ) : pullDistance > 0 ? (
          <div className="text-gray-500 text-sm">Pull to refresh</div>
        ) : null}
      </div>
      
      {/* Content */}
      <div
        style={{
          transform: `translateY(${Math.min(pullDistance, 60)}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE TABS
// ============================================================================

interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    badge?: string;
    content: React.ReactNode;
  }>;
  defaultTab?: string;
  className?: string;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  tabs,
  defaultTab,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap mobile-touch-target
              ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <Badge variant="secondary" className="text-xs">
                {tab.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="mt-4">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  label,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
        flex items-center justify-center hover:bg-blue-700 transition-colors
        mobile-touch-target z-40 ${className}
      `}
      aria-label={label}
    >
      {icon}
    </button>
  );
};

export default {
  TouchAccordion,
  SwipeableCard,
  TouchStepper,
  MobileActionSheet,
  PullToRefresh,
  MobileTabs,
  FloatingActionButton
};

