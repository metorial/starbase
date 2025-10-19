'use client';

import type { NavSection } from '@/components/Sidebar';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface NavigationContextType {
  selectedSection: NavSection;
  setSelectedSection: (section: NavSection) => void;
  selectedChatId: string | null;
  setSelectedChatId: (chatId: string | null) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

let NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export let NavigationProvider = ({ children }: { children: ReactNode }) => {
  let [selectedSection, setSelectedSection] = useState<NavSection>('home');
  let [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  let [refreshTrigger, setRefreshTrigger] = useState(0);

  let triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <NavigationContext.Provider
      value={{
        selectedSection,
        setSelectedSection,
        selectedChatId,
        setSelectedChatId,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export let useNavigation = () => {
  let context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
