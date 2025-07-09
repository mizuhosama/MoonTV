/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

function SearchPageClient() {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 视图模式：聚合(agg) 或 全部(all)，默认值由环境变量 NEXT_PUBLIC_AGGREGATE_SEARCH_RESULT 决定
  const defaultAggregate =
    typeof window !== 'undefined' &&
    Boolean((window as any).RUNTIME_CONFIG?.AGGREGATE_SEARCH_RESULT);

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(
    defaultAggregate ? 'agg' : 'all'
  );

  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    searchResults.forEach((item) => {
      // 使用 title + year + type 作为键，若 year 不存在则使用 'unknown'
      const key = `${item.title}-${item.year || 'unknown'}-${
        item.episodes.length === 1 ? 'movie' : 'tv'
      }`;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // 优先排序：标题与搜索词完全一致的排在前面
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 如果都匹配或都不匹配，则按原来的逻辑排序
      return a[1][0].year === b[1][0].year
        ? a[0].localeCompare(b[0])
        : a[1][0].year > b[1][0].year
        ? -1
        : 1;
    });
  }, [searchResults]);

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();
    getSearchHistory().then(setSearchHistory);
  }, []);

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      fetchSearchResults(query);

      // 保存到搜索历史
      addSearchHistory(query).then(async () => {
        const history = await getSearchHistory();
        setSearchHistory(history);
      });
    } else {
      setShowResults(false);
    }
  }, [searchParams]);

  const fetchSearchResults = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();
      setSearchResults(
        data.results.sort((a: SearchResult, b: SearchResult) => {
          // 优先排序：标题与搜索词完全一致的排在前面
          const aExactMatch = a.title === query.trim();
          const bExactMatch = b.title === query.trim();

          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          // 如果都匹配或都不匹配，则按原来的逻辑排序
          return a.year === b.year
            ? a.title.localeCompare(b.title)
            : a.year > b.year
            ? -1
            : 1;
        })
      );
      setShowResults(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回显搜索框
    setSearchQuery(trimmed);
    setIsLoading(true);
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    // 直接发请求
    fetchSearchResults(trimmed);

    // 保存到搜索历史
    addSearchHistory(trimmed).then(async () => {
      const history = await getSearchHistory();
      setSearchHistory(history);
    });
  };

  return (
    <PageLayout activePath="/search">
      <div className="mb-10 overflow-visible px-4 py-4 sm:px-10 sm:py-8">
        {/* 搜索框 */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                id="searchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索电影、电视剧..."
                className="h-12 w-full rounded-lg border border-gray-200/50 bg-gray-50/80 py-3 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-700"
              />
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className="mx-auto mt-12 max-w-[95%] overflow-visible">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-500"></div>
            </div>
          ) : showResults ? (
            <section className="mb-12">
              {/* 标题 + 聚合开关 */}
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  搜索结果
                </h2>
                {/* 聚合开关 */}
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    聚合
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={viewMode === 'agg'}
                      onChange={() =>
                        setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                      }
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 dark:bg-gray-600"></div>
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
                  </div>
                </label>
              </div>
              <div
                key={`search-results-${viewMode}`}
                className="grid grid-cols-3 justify-start gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2"
              >
                {viewMode === 'agg'
                  ? aggregatedResults.map(([mapKey, group]) => {
                      return (
                        <div key={`agg-${mapKey}`} className="w-full">
                          <VideoCard
                            id={group[0].id}
                            source={group[0].source}
                            title={group[0].title}
                            poster={group[0].poster}
                            source_name={group[0].source_name}
                            year={group[0].year}
                            items={group}
                          />
                        </div>
                      );
                    })
                  : searchResults.map((item) => (
                      <div
                        key={`all-${item.source}-${item.id}`}
                        className="w-full"
                      >
                        <VideoCard
                          id={item.id}
                          title={item.title}
                          poster={item.poster}
                          episodes={item.episodes.length}
                          source={item.source}
                          source_name={item.source_name}
                          douban_id={item.douban_id}
                          from="search"
                        />
                      </div>
                    ))}
                {searchResults.length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                    未找到相关结果
                  </div>
                )}
              </div>
            </section>
          ) : searchHistory.length > 0 ? (
            // 搜索历史
            <section className="mb-12">
              <h2 className="mb-4 text-left text-xl font-bold text-gray-800 dark:text-gray-200">
                搜索历史
                {searchHistory.length > 0 && (
                  <button
                    onClick={async () => {
                      await clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="ml-3 text-sm text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500"
                  >
                    清空
                  </button>
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <div key={item} className="group relative">
                    <button
                      onClick={() => {
                        setSearchQuery(item);
                        router.push(
                          `/search?q=${encodeURIComponent(item.trim())}`
                        );
                      }}
                      className="rounded-full bg-gray-500/10 px-4 py-2 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      {item}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      aria-label="删除搜索历史"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await deleteSearchHistory(item);
                        const history = await getSearchHistory();
                        setSearchHistory(history);
                      }}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] text-white opacity-0 transition-colors hover:bg-red-500 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
