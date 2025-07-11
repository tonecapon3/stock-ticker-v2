"use client";

import React, { useEffect, useState } from 'react';
import { useTickerContext } from '@/lib/context';
import { StockInfo, SECURITY_CONSTRAINTS, ValidationResult } from '@/lib/types';

interface StockModifierProps {
  oldSymbol: string;
  newSymbol: string;
  newName: string;
  onComplete?: () => void;
}

/**
 * Component to modify/replace stocks in the stock list
 * It removes an existing stock and creates a new one with the same price data
 */
const StockModifier: React.FC<StockModifierProps> = ({ 
  oldSymbol, 
  newSymbol, 
  newName,
  onComplete 
}) => {
  const { tickerState, removeStock, addStock } = useTickerContext();
  const { stocks } = tickerState;
  
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>(`Modifying stock ${oldSymbol} to ${newSymbol}...`);

  useEffect(() => {
    // Validate new stock symbol using the pattern from SECURITY_CONSTRAINTS
    if (!SECURITY_CONSTRAINTS.STOCK_SYMBOL_PATTERN.test(newSymbol)) {
      setStatus('error');
      setError(`Invalid stock symbol: ${newSymbol}. Symbol must be 1-5 uppercase letters.`);
      return;
    }

    // Validate new stock name
    if (!newName || 
        newName.length > SECURITY_CONSTRAINTS.STOCK_NAME_MAX_LENGTH || 
        !SECURITY_CONSTRAINTS.STOCK_NAME_PATTERN.test(newName)) {
      setStatus('error');
      setError(`Invalid stock name: ${newName}. Name must contain only alphanumeric characters, spaces, &, hyphens, dots, and commas.`);
      return;
    }

    // Find the old stock
    const oldStock = stocks.find(stock => stock.symbol === oldSymbol);
    if (!oldStock) {
      setStatus('error');
      setError(`Stock ${oldSymbol} not found in the current stock list.`);
      return;
    }

    // Save its current price
    const currentPrice = oldStock.currentPrice;

    // Remove the old stock
    const removeResult: ValidationResult = removeStock(oldSymbol);
    if (!removeResult.isValid) {
      setStatus('error');
      setError(removeResult.errorMessage || `Failed to remove ${oldSymbol}.`);
      return;
    }

    // Add the new stock with the same price
    const addResult: ValidationResult = addStock(newSymbol, newName, currentPrice);
    if (!addResult.isValid) {
      setStatus('error');
      setError(addResult.errorMessage || `Failed to add ${newSymbol}.`);
      // Try to restore the old stock if possible
      addStock(oldSymbol, oldStock.name, currentPrice);
      return;
    }

    // Success! Update status and message
    setStatus('success');
    setMessage(`Successfully changed ${oldSymbol} to ${newSymbol}`);
    
    // Call onComplete callback after a short delay
    if (onComplete) {
      setTimeout(onComplete, 2000);
    }
  }, [oldSymbol, newSymbol, newName, stocks, removeStock, addStock, onComplete]);

  // Render different UI based on status
  const renderStatusContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="bg-blue-900 text-white p-3 rounded-md" role="status" aria-live="polite">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>{message}</p>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="bg-red-900 text-white p-3 rounded-md border border-red-700" role="alert" aria-live="assertive">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>Error: {error}</p>
            </div>
          </div>
        );
      
      case 'success':
        return (
          <div className="bg-green-900 text-white p-3 rounded-md border border-green-700" role="status" aria-live="polite">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>{message}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mb-4">
      {renderStatusContent()}
    </div>
  );
};

export default StockModifier;
