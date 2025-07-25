/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const SettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');
  const [imageProxyUrl, setImageProxyUrl] = useState('');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [enableImageProxy, setEnableImageProxy] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch'
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      }

      const savedEnableImageProxy = localStorage.getItem('enableImageProxy');
      const defaultImageProxy =
        (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';
      if (savedEnableImageProxy !== null) {
        setEnableImageProxy(JSON.parse(savedEnableImageProxy));
      } else if (defaultImageProxy) {
        // 如果有默认图片代理配置，则默认开启
        setEnableImageProxy(true);
      }

      const savedImageProxyUrl = localStorage.getItem('imageProxyUrl');
      if (savedImageProxyUrl !== null) {
        setImageProxyUrl(savedImageProxyUrl);
      } else if (defaultImageProxy) {
        setImageProxyUrl(defaultImageProxy);
      }

      const savedEnableOptimization =
        localStorage.getItem('enableOptimization');
      if (savedEnableOptimization !== null) {
        setEnableOptimization(JSON.parse(savedEnableOptimization));
      }
    }
  }, []);

  // 保存设置到 localStorage
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleImageProxyUrlChange = (value: string) => {
    setImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imageProxyUrl', value);
    }
  };

  const handleOptimizationToggle = (value: boolean) => {
    setEnableOptimization(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableOptimization', JSON.stringify(value));
    }
  };

  const handleImageProxyToggle = (value: boolean) => {
    setEnableImageProxy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableImageProxy', JSON.stringify(value));
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(!isOpen);
  };

  const handleClosePanel = () => {
    setIsOpen(false);
  };

  // 重置所有设置为默认值
  const handleResetSettings = () => {
    const defaultImageProxy = (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';

    // 重置所有状态
    setDefaultAggregateSearch(true);
    setEnableOptimization(true);
    setDoubanProxyUrl('');
    setEnableImageProxy(!!defaultImageProxy);
    setImageProxyUrl(defaultImageProxy);

    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('enableOptimization', JSON.stringify(true));
      localStorage.setItem('doubanProxyUrl', '');
      localStorage.setItem(
        'enableImageProxy',
        JSON.stringify(!!defaultImageProxy)
      );
      localStorage.setItem('imageProxyUrl', defaultImageProxy);
    }
  };

  // 设置面板内容
  const settingsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
        onClick={handleClosePanel}
      />

      {/* 设置面板 */}
      <div className="fixed left-1/2 top-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* 标题栏 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              本地设置
            </h3>
            <button
              onClick={handleResetSettings}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              title="重置为默认设置"
            >
              重置
            </button>
          </div>
          <button
            onClick={handleClosePanel}
            className="flex h-8 w-8 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-full w-full" />
          </button>
        </div>

        {/* 设置项 */}
        <div className="space-y-6">
          {/* 默认聚合搜索结果 */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                默认聚合搜索结果
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                搜索时默认按标题和年份聚合显示结果
              </p>
            </div>
            <label className="flex cursor-pointer items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={defaultAggregateSearch}
                  onChange={(e) => handleAggregateToggle(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 dark:bg-gray-600"></div>
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>

          {/* 优选和测速 */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                启用优选和测速
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                如出现播放器劫持问题可关闭
              </p>
            </div>
            <label className="flex cursor-pointer items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={enableOptimization}
                  onChange={(e) => handleOptimizationToggle(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 dark:bg-gray-600"></div>
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>

          {/* 豆瓣代理设置 */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                豆瓣数据代理
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                设置代理URL以绕过豆瓣访问限制，留空则使用服务端API
              </p>
            </div>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder="例如: https://proxy.example.com/fetch?url="
              value={doubanProxyUrl}
              onChange={(e) => handleDoubanProxyUrlChange(e.target.value)}
            />
          </div>

          {/* 图片代理开关 */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                启用图片代理
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                启用后，所有图片加载将通过代理服务器
              </p>
            </div>
            <label className="flex cursor-pointer items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={enableImageProxy}
                  onChange={(e) => handleImageProxyToggle(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 dark:bg-gray-600"></div>
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>

          {/* 图片代理地址设置 */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                图片代理地址
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                仅在启用图片代理时生效
              </p>
            </div>
            <input
              type="text"
              className={`w-full rounded-md border px-3 py-2 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                enableImageProxy
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500 dark:placeholder-gray-600'
              }`}
              placeholder="例如: https://imageproxy.example.com/?url="
              value={imageProxyUrl}
              onChange={(e) => handleImageProxyUrlChange(e.target.value)}
              disabled={!enableImageProxy}
            />
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            这些设置保存在本地浏览器中
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={handleSettingsClick}
        className="flex h-10 w-10 items-center justify-center rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50"
        aria-label="Settings"
      >
        <Settings className="h-full w-full" />
      </button>

      {/* 使用 Portal 将设置面板渲染到 document.body */}
      {isOpen && mounted && createPortal(settingsPanel, document.body)}
    </>
  );
};
