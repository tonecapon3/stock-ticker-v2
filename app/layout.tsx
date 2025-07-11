"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { TickerProvider } from "@/lib/context";
import { TabContent } from "@/components/TabContent";
import AccessControl from "@/components/AccessControl";
import React from "react";

// Initialize the Inter font
const inter = Inter({ subsets: ["latin"] });

// Metadata is imported from metadata.ts instead of being defined here

// Client wrapper component for handling parallel routes
function ParallelRouteWrapper({
  ticker,
  controls,
}: {
  ticker: React.ReactNode;
  controls: React.ReactNode;
}) {
  return (
    <TabContent 
      ticker={ticker}
      controls={controls}
    />
  );
}

// Define the layout props type with parallel routes
interface RootLayoutProps {
  children: React.ReactNode;
  ticker: React.ReactNode; // @ticker parallel route
  controls: React.ReactNode; // @controls parallel route
}

export default function RootLayout({
  children,
  ticker,
  controls,
}: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AccessControl>
          <TickerProvider>
            <div className="min-h-screen bg-gray-900">
              {/* Header section */}
              <header className="bg-blue-800 text-white shadow-md">
                <div className="container mx-auto py-4 px-6">
                  <h1 className="text-2xl font-bold">Stock Ticker</h1>
                </div>
              </header>
              
              {/* Main content */}
              <main className="container mx-auto p-6">
                {/* Tabbed layout for ticker and controls */}
                <ParallelRouteWrapper 
                  ticker={ticker} 
                  controls={controls} 
                />
                
                {/* Default slot for any additional content */}
                {children}
              </main>
              
              {/* Footer section */}
              <footer className="bg-gray-800 border-t border-gray-700 mt-12">
                <div className="container mx-auto py-4 px-6 text-center text-gray-400">
                  <p>© {new Date().getFullYear()} Stock Ticker</p>
                </div>
              </footer>
            </div>
          </TickerProvider>
        </AccessControl>
      </body>
    </html>
  );
}
