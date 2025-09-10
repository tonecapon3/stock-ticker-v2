/**
 * User Profile Component
 * 
 * Displays user information and provides access to Clerk's UserProfile component
 */

import React, { useState } from 'react';
import { UserProfile, UserButton } from '@clerk/clerk-react';
import { useAuth } from '../../hooks/useAuth';

interface UserProfilePageProps {
  embedded?: boolean;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ embedded = false }) => {
  const { userInfo } = useAuth();

  if (embedded) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <UserProfile 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-gray-800 shadow-xl border border-gray-700",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-300",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              formFieldInput: "bg-gray-700 border-gray-600 text-white placeholder-gray-400",
              formFieldLabel: "text-gray-300",
            },
            variables: {
              colorPrimary: "#3B82F6",
              colorBackground: "#1F2937",
              colorInputBackground: "#374151",
              colorInputText: "#F9FAFB",
              colorText: "#F9FAFB",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="text-4xl">👤</div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Profile</h1>
              <p className="text-gray-400">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
              <div className="text-white">{userInfo.fullName || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="text-white">{userInfo.email || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <div className="text-white">{userInfo.username || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <div className="text-white">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  userInfo.role === 'admin' 
                    ? 'bg-red-900/20 text-red-400 border border-red-500' 
                    : 'bg-blue-900/20 text-blue-400 border border-blue-500'
                }`}>
                  {userInfo.role || 'user'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clerk User Profile */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
            <p className="text-gray-400 text-sm mt-1">Update your personal information and security settings</p>
          </div>
          <div className="p-6">
            <UserProfile 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none border-0",
                  headerTitle: "text-white",
                  headerSubtitle: "text-gray-300",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                  formFieldInput: "bg-gray-700 border-gray-600 text-white placeholder-gray-400",
                  formFieldLabel: "text-gray-300",
                  identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
                  profileSectionTitleText: "text-white",
                  profileSectionContent: "text-gray-300",
                  accordionTriggerButton: "text-white hover:bg-gray-700",
                  breadcrumbsItem: "text-gray-400",
                  breadcrumbsItemDivider: "text-gray-600",
                },
                variables: {
                  colorPrimary: "#3B82F6",
                  colorBackground: "transparent",
                  colorInputBackground: "#374151",
                  colorInputText: "#F9FAFB",
                  colorText: "#F9FAFB",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact User Button Component
 * Shows user avatar with dropdown menu
 */
export const CompactUserButton: React.FC = () => {
  return (
    <div className="relative">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-10 h-10",
            userButtonPopoverCard: "bg-gray-800 border border-gray-700",
            userButtonPopoverActionButton: "text-gray-300 hover:bg-gray-700",
            userButtonPopoverActionButtonText: "text-gray-300",
            userButtonPopoverFooter: "border-t border-gray-700",
          },
        }}
        showName={false}
        afterSignOutUrl="/sign-in"
      />
    </div>
  );
};

/**
 * User Info Display Component
 * Shows basic user information in a compact format
 */
export const UserInfoDisplay: React.FC = () => {
  const { userInfo, isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  return (
    <div className="flex items-center space-x-3">
      {userInfo.imageUrl && (
        <img
          src={userInfo.imageUrl}
          alt={userInfo.fullName || 'User'}
          className="w-8 h-8 rounded-full border border-gray-600"
        />
      )}
      <div>
        <div className="text-white text-sm font-medium">
          {userInfo.fullName || userInfo.username || 'User'}
        </div>
        {userInfo.role && (
          <div className="text-xs text-gray-400">
            {userInfo.role}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
