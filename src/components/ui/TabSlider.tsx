"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LiveBadge } from "./StatusBadge";

export interface TabItem {
  id: string;
  label: string;
  isLive?: boolean;
  count?: number;
  disabled?: boolean;
}

interface TabSliderProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export function TabSlider({
  tabs,
  activeTab,
  onTabChange,
  className,
  fullWidth = false,
}: TabSliderProps) {
  const tabsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
  });

  const updateIndicator = useCallback(() => {
    const activeButton = tabsRef.current.get(activeTab);
    const container = containerRef.current;
    
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const setTabRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      tabsRef.current.set(id, el);
    } else {
      tabsRef.current.delete(id);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex border-b border-border",
        fullWidth && "w-full",
        className
      )}
      role="tablist"
    >
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          transitionDuration: "var(--transition-slow)",
        }}
        aria-hidden="true"
      />

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <button
            key={tab.id}
            ref={(el) => setTabRef(tab.id, el)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium",
              "transition-colors duration-[var(--transition-normal)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              fullWidth && "flex-1 justify-center",
              isActive
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span>{tab.label}</span>
            
            {tab.isLive && <LiveBadge className="scale-90" />}
            
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  "min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center",
                  "text-xs font-semibold rounded-full",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ScrollableTabSlider(props: TabSliderProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <TabSlider {...props} className={cn("min-w-max", props.className)} />
    </div>
  );
}
