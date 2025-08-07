import { BackButton } from './BackButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import Sidebar from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  return (
    <div className="min-h-screen w-full">
      {/* 移动端头部 */}
      <MobileHeader showBackButton={['/play'].includes(activePath)} />

      {/* 主要布局容器 */}
      <div className="md:min-h-auto flex min-h-screen w-full md:grid md:grid-cols-[auto_1fr]">
        {/* 侧边栏 - 桌面端显示，移动端隐藏 */}
        <div className="hidden md:block">
          <Sidebar activePath={activePath} />
        </div>

        {/* 主内容区域 */}
        <div className="relative min-w-0 flex-1 transition-all duration-300">
          {/* 桌面端左上角返回按钮 */}
          {['/play'].includes(activePath) && (
            <div className="absolute left-1 top-3 z-20 hidden md:flex">
              <BackButton />
            </div>
          )}

          {/* 桌面端顶部按钮 */}
          <div className="absolute right-4 top-2 z-20 hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <UserMenu />
          </div>

          {/* 主内容 */}
          <main
            className="mb-14 flex-1 md:mb-0 md:min-h-0"
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className="md:hidden">
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
