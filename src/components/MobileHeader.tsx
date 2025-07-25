'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { SettingsButton } from './SettingsButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className="relative w-full border-b border-gray-200/50 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70 md:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        {/* 左侧：返回按钮和设置按钮 */}
        <div className="flex items-center gap-2">
          {showBackButton && <BackButton />}
          <SettingsButton />
        </div>

        {/* 右侧按钮 */}
        <div className="flex items-center gap-2">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-green-600 transition-opacity hover:opacity-80"
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
