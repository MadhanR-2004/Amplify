'use client';

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { 
  IconMusic, 
  IconDisc, 
  IconMicrophone,
  IconPlaylist,
  IconHeart,
  IconSearch,
  IconSettings,
  IconMenu2,
  IconX
} from "@tabler/icons-react";

interface DockItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  count?: number;
  onClick?: () => void;
}

interface FloatingDockProps {
  items: DockItem[];
  className?: string;
}

export const FloatingDock = ({ items, className }: FloatingDockProps) => {
  const mouseX = useMotionValue(Infinity);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Version - Original floating dock */}
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className={cn(
          // Hidden on mobile, visible on larger screens
          "hidden lg:flex",
          // Default bottom positioning - can be overridden by className
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
          "h-16 items-end gap-4 rounded-2xl px-4 pb-3",
          "bg-white/10 backdrop-blur-xl border border-white/20",
          "shadow-2xl shadow-black/25",
          "before:absolute before:inset-0 before:rounded-2xl",
          "before:bg-gradient-to-r before:from-blue-500/10 before:to-purple-500/10",
          "before:blur-xl before:-z-10",
          className
        )}
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            mouseX={mouseX}
            item={item}
          />
        ))}
      </motion.div>

      {/* Mobile Version - Hamburger menu */}
      <div className="lg:hidden">
        {/* Mobile Menu Button */}
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "fixed top-4 right-4 z-50",
            "p-3 rounded-2xl",
            "bg-white/10 backdrop-blur-xl border border-white/20",
            "shadow-2xl shadow-black/25",
            "text-white hover:bg-white/20 transition-colors"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </motion.button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Menu Panel */}
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl"
              >
                <div className="p-6 h-full overflow-y-auto">
                  <div className="mb-8 pt-12">
                    <h2 className="text-2xl font-bold text-white mb-2">Navigation</h2>
                    <p className="text-gray-400 text-sm">Choose a section to explore</p>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item) => (
                      <MobileDockItem
                        key={item.id}
                        item={item}
                        onClose={() => setIsMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

interface DockItemProps {
  mouseX: any;
  item: DockItem;
}

const DockItem = ({ mouseX, item }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const heightSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const height = useSpring(heightSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      {/* Tooltip */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-black/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg border border-white/20">
            {item.title}
            {item.count !== undefined && (
              <span className="ml-1 text-blue-400">({item.count})</span>
            )}
          </div>
        </motion.div>
      )}

      {/* Dock Item */}
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={item.onClick}
        className={cn(
          "relative flex aspect-square cursor-pointer items-center justify-center rounded-xl",
          "bg-white/20 backdrop-blur-sm border border-white/30",
          "hover:bg-white/30 transition-colors duration-200",
          "shadow-lg hover:shadow-xl",
          "group overflow-hidden"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        {/* Icon */}
        <motion.div
          className="relative z-10 text-white"
          style={{
            scale: useTransform(distance, [-150, 0, 150], [0.8, 1.2, 0.8])
          }}
        >
          {item.icon}
        </motion.div>

        {/* Count badge - Hidden on desktop, only shown in mobile */}
        {/* Desktop version doesn't show count badges */}
      </motion.div>
    </div>
  );
};

// Predefined dock configurations
export const musicDockItems: DockItem[] = [
  {
    id: 'songs',
    title: 'Songs',
    icon: <IconMusic size={24} />,
    count: 0,
  },
  {
    id: 'albums',
    title: 'Albums',
    icon: <IconDisc size={24} />,
    count: 0,
  },
  {
    id: 'artists',
    title: 'Artists',
    icon: <IconMicrophone size={24} />,
    count: 0,
  },
  {
    id: 'playlists',
    title: 'Playlists',
    icon: <IconPlaylist size={24} />,
    count: 0,
  },
  {
    id: 'favorites',
    title: 'Favorites',
    icon: <IconHeart size={24} />,
    count: 0,
  },
  {
    id: 'search',
    title: 'Search',
    icon: <IconSearch size={24} />,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <IconSettings size={24} />,
  },
];

// Mobile dock item component
interface MobileDockItemProps {
  item: DockItem;
  onClose: () => void;
}

const MobileDockItem = ({ item, onClose }: MobileDockItemProps) => {
  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  };

  return (
    <motion.button
      onClick={handleClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-white/10">
        {item.icon}
      </div>
      <div className="flex-1">
        <div className="text-white font-medium">{item.title}</div>
        {item.count !== undefined && (
          <div className="text-xs text-gray-400">
            {item.count} items
          </div>
        )}
      </div>
      {/* {item.count !== undefined && item.count > 0 && (
        <div className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
          {item.count > 99 ? '99+' : item.count}
        </div>
      )} */}
    </motion.button>
  );
};

export default FloatingDock;
