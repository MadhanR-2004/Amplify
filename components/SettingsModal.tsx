'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IconX,
  IconPalette,
  IconSettings,
  IconUser,
  IconVolume,
  IconDevices,
  IconMoon,
  IconSun,
  IconCheck
} from '@tabler/icons-react';
import { backgroundThemes, saveTheme, loadTheme } from '@/lib/themes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('appearance');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [volume, setVolume] = useState(80);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedTheme = loadTheme();
    const savedVolume = localStorage.getItem('defaultVolume') || '80';
    const savedDarkMode = localStorage.getItem('darkMode') !== 'false';
    const savedAutoPlay = localStorage.getItem('autoPlay') !== 'false';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';

    setSelectedTheme(savedTheme);
    setVolume(parseInt(savedVolume));
    setIsDarkMode(savedDarkMode);
    setAutoPlay(savedAutoPlay);
    setShowNotifications(savedNotifications);
  }, []);

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    saveTheme(themeId);
    
    // Dispatch custom event to update background
    const theme = backgroundThemes.find(t => t.id === themeId);
    if (theme) {
      window.dispatchEvent(new CustomEvent('backgroundThemeChange', {
        detail: { theme: theme.config }
      }));
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('defaultVolume', newVolume.toString());
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: IconPalette },
    { id: 'audio', label: 'Audio', icon: IconVolume },
    { id: 'general', label: 'General', icon: IconSettings },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <IconX size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-800/50 border-b md:border-b-0 md:border-r border-white/10 p-4 flex-shrink-0">
              <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-left transition-colors text-sm md:text-base whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} className="md:w-5 md:h-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Background Theme</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {backgroundThemes.map((theme) => (
                        <motion.div
                          key={theme.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedTheme === theme.id
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => handleThemeChange(theme.id)}
                        >
                          <div
                            className="w-full h-16 md:h-24 rounded-lg mb-2 md:mb-3"
                            style={{ background: theme.preview }}
                          />
                          <h4 className="text-white font-medium text-sm md:text-base">{theme.name}</h4>
                          <div className="flex gap-1 md:gap-2 mt-2">
                            {theme.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-white/20"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          {selectedTheme === theme.id && (
                            <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                              <IconCheck size={12} className="md:w-4 md:h-4 text-white" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Display</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium text-sm md:text-base">Dark Mode</h4>
                          <p className="text-gray-400 text-xs md:text-sm">Use dark interface colors</p>
                        </div>
                        <button
                          onClick={handleDarkModeToggle}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            isDarkMode ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              isDarkMode ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Audio Settings</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium text-sm md:text-base">Default Volume</h4>
                          <span className="text-gray-400 text-sm md:text-base">{volume}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm md:text-base">Auto-play next song</h4>
                          <p className="text-gray-400 text-xs md:text-sm">Automatically play the next song when current ends</p>
                        </div>
                        <button
                          onClick={() => {
                            setAutoPlay(!autoPlay);
                            localStorage.setItem('autoPlay', (!autoPlay).toString());
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            autoPlay ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              autoPlay ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4">General Settings</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm md:text-base">Show Notifications</h4>
                          <p className="text-gray-400 text-xs md:text-sm">Display notifications for new songs and updates</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowNotifications(!showNotifications);
                            localStorage.setItem('notifications', (!showNotifications).toString());
                          }}
                          className={`flex-shrink-0 relative w-12 h-6 rounded-full transition-colors ${
                            showNotifications ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              showNotifications ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h4 className="text-white font-medium mb-2 text-sm md:text-base">About</h4>
                        <p className="text-gray-400 text-xs md:text-sm">Music Streaming App v1.0.0</p>
                        <p className="text-gray-400 text-xs md:text-sm">Built with Next.js and MongoDB</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
