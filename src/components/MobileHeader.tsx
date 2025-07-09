'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className="relative w-full border-b border-gray-200/50 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70 md:hidden">
      {/* 返回按钮 */}
      {showBackButton && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <BackButton />
        </div>
      )}

      {/* 站点名称 */}
      <div className="flex h-12 items-center justify-center">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-green-600 transition-opacity hover:opacity-80"
        >
          {siteName}
        </Link>
      </div>

      {/* 右侧按钮 */}
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
        <LogoutButton />
        <ThemeToggle />
      </div>
    </header>
  );
};

export default MobileHeader;
