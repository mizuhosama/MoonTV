/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SearchResult } from '@/lib/types';

interface EpisodeSelectorProps {
  /** 总集数 */
  totalEpisodes: number;
  /** 每页显示多少集，默认 50 */
  episodesPerPage?: number;
  /** 当前选中的集数（1 开始） */
  value?: number;
  /** 用户点击选集后的回调 */
  onChange?: (episodeNumber: number) => void;
  /** 换源相关 */
  onSourceChange?: (source: string, id: string, title: string) => void;
  currentSource?: string;
  currentId?: string;
  videoTitle?: string;
  videoYear?: string;
  availableSources?: SearchResult[];
  onSearchSources?: (query: string) => void;
  sourceSearchLoading?: boolean;
  sourceSearchError?: string | null;
}

/**
 * 选集组件，支持分页、自动滚动聚焦当前分页标签，以及换源功能。
 */
const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  totalEpisodes,
  episodesPerPage = 50,
  value = 1,
  onChange,
  onSourceChange,
  currentSource,
  currentId,
  videoTitle,
  availableSources = [],
  onSearchSources,
  sourceSearchLoading = false,
  sourceSearchError = null,
}) => {
  const router = useRouter();
  const pageCount = Math.ceil(totalEpisodes / episodesPerPage);

  // 主要的 tab 状态：'episodes' 或 'sources'
  // 当只有一集时默认展示 "换源"，并隐藏 "选集" 标签
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>(
    totalEpisodes > 1 ? 'episodes' : 'sources'
  );

  // 当前分页索引（0 开始）
  const initialPage = Math.floor((value - 1) / episodesPerPage);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // 是否倒序显示
  const [descending, setDescending] = useState<boolean>(false);

  // 升序分页标签
  const categoriesAsc = useMemo(() => {
    return Array.from({ length: pageCount }, (_, i) => {
      const start = i * episodesPerPage + 1;
      const end = Math.min(start + episodesPerPage - 1, totalEpisodes);
      return `${start}-${end}`;
    });
  }, [pageCount, episodesPerPage, totalEpisodes]);

  // 分页标签始终保持升序
  const categories = categoriesAsc;

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 当分页切换时，将激活的分页标签滚动到视口中间
  useEffect(() => {
    const btn = buttonRefs.current[currentPage];
    if (btn) {
      btn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentPage, pageCount]);

  // 处理换源tab点击，只在点击时才搜索
  const handleSourceTabClick = () => {
    setActiveTab('sources');
    // 只在点击时搜索，且只搜索一次
    if (availableSources.length === 0 && videoTitle && onSearchSources) {
      onSearchSources(videoTitle);
    }
  };

  const handleCategoryClick = useCallback((index: number) => {
    setCurrentPage(index);
  }, []);

  const handleEpisodeClick = useCallback(
    (episodeNumber: number) => {
      onChange?.(episodeNumber);
    },
    [onChange]
  );

  const handleSourceClick = useCallback(
    (source: SearchResult) => {
      onSourceChange?.(source.source, source.id, source.title);
    },
    [onSourceChange]
  );

  // 如果组件初始即显示 "换源"，自动触发搜索一次
  useEffect(() => {
    if (
      activeTab === 'sources' &&
      availableSources.length === 0 &&
      videoTitle &&
      onSearchSources
    ) {
      onSearchSources(videoTitle);
    }
    // 只在依赖变化时尝试，availableSources 长度变化可阻止重复搜索
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, availableSources.length, videoTitle]);

  const currentStart = currentPage * episodesPerPage + 1;
  const currentEnd = Math.min(
    currentStart + episodesPerPage - 1,
    totalEpisodes
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/0 bg-black/10 px-4 py-0 dark:border-white/30 dark:bg-white/5 md:ml-2">
      {/* 主要的 Tab 切换 - 无缝融入设计 */}
      <div className="-mx-6 mb-1 flex flex-shrink-0">
        {totalEpisodes > 1 && (
          <div
            onClick={() => setActiveTab('episodes')}
            className={`flex-1 cursor-pointer px-6 py-3 text-center font-medium transition-all duration-200
              ${
                activeTab === 'episodes'
                  ? 'text-green-600 dark:text-green-400'
                  : 'hover:bg-black/3 dark:hover:bg-white/3 bg-black/5 text-gray-700 hover:text-green-600 dark:bg-white/5 dark:text-gray-300 dark:hover:text-green-400'
              }
            `.trim()}
          >
            选集
          </div>
        )}
        <div
          onClick={handleSourceTabClick}
          className={`flex-1 cursor-pointer px-6 py-3 text-center font-medium transition-all duration-200
            ${
              activeTab === 'sources'
                ? 'text-green-600 dark:text-green-400'
                : 'hover:bg-black/3 dark:hover:bg-white/3 bg-black/5 text-gray-700 hover:text-green-600 dark:bg-white/5 dark:text-gray-300 dark:hover:text-green-400'
            }
          `.trim()}
        >
          换源
        </div>
      </div>

      {/* 选集 Tab 内容 */}
      {activeTab === 'episodes' && (
        <>
          {/* 分类标签 */}
          <div className="-mx-6 mb-4 flex flex-shrink-0 items-center gap-4 border-b border-gray-300 px-6 dark:border-gray-700">
            <div className="flex-1 overflow-x-auto" ref={categoryContainerRef}>
              <div className="flex min-w-max gap-2">
                {categories.map((label, idx) => {
                  const isActive = idx === currentPage;
                  return (
                    <button
                      key={label}
                      ref={(el) => {
                        buttonRefs.current[idx] = el;
                      }}
                      onClick={() => handleCategoryClick(idx)}
                      className={`relative w-20 flex-shrink-0 whitespace-nowrap py-2 text-center text-sm font-medium transition-colors 
                        ${
                          isActive
                            ? 'text-green-500 dark:text-green-400'
                            : 'text-gray-700 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400'
                        }
                      `.trim()}
                    >
                      {label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 dark:bg-green-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 向上/向下按钮 */}
            <button
              className="flex h-8 w-8 flex-shrink-0 translate-y-[-4px] transform items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-green-400"
              onClick={() => {
                // 切换集数排序（正序/倒序）
                setDescending((prev) => !prev);
              }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </div>

          {/* 集数网格 */}
          <div className="grid h-full auto-rows-[40px] grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-x-3 gap-y-3 overflow-y-auto pb-4">
            {(() => {
              const len = currentEnd - currentStart + 1;
              const episodes = Array.from({ length: len }, (_, i) =>
                descending ? currentEnd - i : currentStart + i
              );
              return episodes;
            })().map((episodeNumber) => {
              const isActive = episodeNumber === value;
              return (
                <button
                  key={episodeNumber}
                  onClick={() => handleEpisodeClick(episodeNumber - 1)}
                  className={`flex h-10 items-center justify-center rounded-md text-sm font-medium transition-all duration-200 
                    ${
                      isActive
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 dark:bg-green-600'
                        : 'bg-gray-200 text-gray-700 hover:scale-105 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                    }`.trim()}
                >
                  {episodeNumber}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 换源 Tab 内容 */}
      {activeTab === 'sources' && (
        <div className="mt-4 flex h-full flex-col">
          {sourceSearchLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-500"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                搜索中...
              </span>
            </div>
          )}

          {sourceSearchError && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mb-2 text-2xl text-red-500">⚠️</div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {sourceSearchError}
                </p>
              </div>
            </div>
          )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="mb-2 text-2xl text-gray-400">📺</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    暂无可用的换源
                  </p>
                </div>
              </div>
            )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length > 0 && (
              <div className="flex-1 space-y-2 overflow-y-auto pb-20">
                {availableSources
                  .sort((a, b) => {
                    const aIsCurrent =
                      a.source?.toString() === currentSource?.toString() &&
                      a.id?.toString() === currentId?.toString();
                    const bIsCurrent =
                      b.source?.toString() === currentSource?.toString() &&
                      b.id?.toString() === currentId?.toString();
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    return 0;
                  })
                  .map((source) => {
                    const isCurrentSource =
                      source.source?.toString() === currentSource?.toString() &&
                      source.id?.toString() === currentId?.toString();
                    return (
                      <div
                        key={`${source.source}-${source.id}`}
                        onClick={() =>
                          !isCurrentSource && handleSourceClick(source)
                        }
                        className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all duration-200 
                      ${
                        isCurrentSource
                          ? 'border border-green-500/30 bg-green-500/10 dark:bg-green-500/20'
                          : 'hover:scale-[1.02] hover:bg-gray-200/50 dark:hover:bg-white/10'
                      }`.trim()}
                      >
                        {/* 封面 */}
                        <div className="h-20 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-300 dark:bg-gray-600">
                          {source.episodes && source.episodes.length > 0 && (
                            <img
                              src={source.poster}
                              alt={source.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>

                        {/* 信息区域 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-base font-medium text-gray-900 dark:text-gray-100">
                                {source.title}
                              </h3>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="rounded border border-gray-500/60 px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                                  {source.source_name}
                                </span>
                              </div>
                              {source.episodes.length > 1 && (
                                <span className="mt-1 pl-[2px] text-xs text-gray-500 dark:text-gray-400">
                                  共 {source.episodes.length} 集
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div className="mt-auto flex-shrink-0 border-t border-gray-400 pt-2 dark:border-gray-700">
                  <button
                    onClick={() => {
                      if (videoTitle) {
                        router.push(
                          `/search?q=${encodeURIComponent(videoTitle)}`
                        );
                      }
                    }}
                    className="w-full py-2 text-center text-xs text-gray-500 transition-colors hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400"
                  >
                    影片匹配有误？点击去搜索
                  </button>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EpisodeSelector;
