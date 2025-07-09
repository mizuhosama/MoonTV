'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';

import { useSite } from './SiteProvider';

interface Props {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { siteName } = useSite();
  const authenticate = useCallback(async () => {
    // 登录页
    if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
      setIsAuthenticated(true);
      return;
    }

    // 从localStorage获取密码和用户名
    const password = localStorage.getItem('password');
    const username = localStorage.getItem('username');
    const fullPath =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : pathname;

    // 尝试认证
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, username }),
      });

      if (!res.ok) throw new Error('认证失败');

      setIsAuthenticated(true);
    } catch (error) {
      // 认证失败，清理并跳转登录
      setIsAuthenticated(false);
      localStorage.removeItem('password');
      localStorage.removeItem('username');
      router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    authenticate();
  }, [pathname, authenticate]);

  // 认证状态未知时显示加载状态
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-md px-6 text-center">
          {/* 动画认证图标 */}
          <div className="relative mb-8">
            <div className="relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl transition-transform duration-300 hover:scale-105">
              <div className="text-4xl text-white">🔐</div>
              {/* 旋转光环 */}
              <div className="absolute -inset-2 animate-spin rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 opacity-20"></div>
            </div>

            {/* 浮动粒子效果 */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
              <div className="absolute left-2 top-2 h-2 w-2 animate-bounce rounded-full bg-green-400"></div>
              <div
                className="absolute right-4 top-4 h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                style={{ animationDelay: '0.5s' }}
              ></div>
              <div
                className="absolute bottom-3 left-6 h-1 w-1 animate-bounce rounded-full bg-lime-400"
                style={{ animationDelay: '1s' }}
              ></div>
            </div>
          </div>

          {/* 品牌标题 */}
          <h1 className="mb-8 bg-clip-text text-center text-3xl font-extrabold tracking-tight text-green-600 drop-shadow-sm">
            {siteName}
          </h1>

          {/* 加载消息 */}
          <div className="space-y-2">
            <p className="animate-pulse text-xl font-semibold text-gray-800 dark:text-gray-200">
              正在验证您的身份...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              请稍候，马上就好
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    return <>{children}</>;
  }
}
