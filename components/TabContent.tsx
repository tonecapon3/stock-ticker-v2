"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TabContentProps {
  ticker: React.ReactNode;
  controls: React.ReactNode;
}

export function TabContent({ ticker, controls }: TabContentProps) {
  const [activeTab, setActiveTab] = useState<'ticker' | 'controls'>('ticker');
  const router = useRouter();

  // Function to switch tabs
  const handleTabChange = (tab: 'ticker' | 'controls') => {
    setActiveTab(tab);
    // This helps force a re-render of any components inside the tab
    router.refresh();
  };

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="flex justify-between border-b border-gray-700 mb-6">
        <button
          onClick={() => handleTabChange('ticker')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
            activeTab === 'ticker'
              ? 'bg-black text-white border-t border-l border-r border-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          aria-selected={activeTab === 'ticker'}
          role="tab"
        >
          Stock Prices
        </button>
        <button
          onClick={() => handleTabChange('controls')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
            activeTab === 'controls'
              ? 'bg-black text-white border-t border-l border-r border-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          aria-selected={activeTab === 'controls'}
          role="tab"
        >
          CP
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-black rounded-lg shadow-md p-6 border border-gray-700">
        {activeTab === 'ticker' ? (
          <div className="w-full">
            {ticker}
          </div>
        ) : (
          <div className="w-full">
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}

