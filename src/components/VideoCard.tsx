import { Heart, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { deletePlayRecord, isFavorited, toggleFavorite } from '@/lib/db.client';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

// 聚合卡需要的基本字段，与搜索接口保持一致
interface SearchResult {
  id: string;
  title: string;
  poster: string;
  source: string;
  source_name: string;
  douban_id?: number;
  episodes: string[];
}

interface VideoCardProps {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes?: number;
  source_name: string;
  progress?: number;
  year?: string;
  from?: string;
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;

  // 可选属性，根据存在与否决定卡片行为
  rate?: string; // 如果存在，按demo卡片处理
  items?: SearchResult[]; // 如果存在，按aggregate卡片处理
}

function CheckCircleCustom() {
  return (
    <span className="inline-flex items-center justify-center">
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" r="13" stroke="white" strokeWidth="2" />
        <path
          d="M11 16.5L15 20L21 13.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PlayCircleSolid({
  className = '',
  fillColor = 'none',
}: {
  className?: string;
  fillColor?: string;
}) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} relative block`}
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        stroke="white"
        strokeWidth="1.5"
        fill={fillColor}
      />
      <polygon points="19,15 19,29 29,22" fill="white" />
    </svg>
  );
}

export default function VideoCard({
  id,
  title,
  poster,
  episodes,
  source,
  source_name,
  progress,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
}: VideoCardProps) {
  const [playHover, setPlayHover] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // 判断卡片类型
  const isDemo = !!rate;
  const isAggregate = !!items && items.length > 0;
  const isStandard = !isDemo && !isAggregate;

  // 处理聚合卡片的逻辑
  const aggregateData = useMemo(() => {
    if (!isAggregate) {
      return null;
    }

    const first = items[0];

    // 统计出现次数最多的（非 0） douban_id
    const countMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
    });

    let mostFrequentDoubanId: number | undefined;
    let maxCount = 0;
    countMap.forEach((cnt, id) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        mostFrequentDoubanId = id;
      }
    });

    // 统计最频繁的集数
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    let mostFrequentEpisodes = 0;
    let maxEpisodeCount = 0;
    episodeCountMap.forEach((cnt, len) => {
      if (cnt > maxEpisodeCount) {
        maxEpisodeCount = cnt;
        mostFrequentEpisodes = len;
      }
    });

    return {
      first,
      mostFrequentDoubanId,
      mostFrequentEpisodes,
    };
  }, [isAggregate, items]);

  // 根据卡片类型决定实际使用的数据
  const actualTitle =
    isAggregate && aggregateData ? aggregateData.first.title : title;
  const actualPoster =
    isAggregate && aggregateData ? aggregateData.first.poster : poster;
  const actualSource =
    isAggregate && aggregateData ? aggregateData.first.source : source;
  const actualId = isAggregate && aggregateData ? aggregateData.first.id : id;
  const actualDoubanId =
    isAggregate && aggregateData
      ? aggregateData.mostFrequentDoubanId
      : douban_id;
  const actualEpisodes =
    isAggregate && aggregateData
      ? aggregateData.mostFrequentEpisodes
      : episodes;

  // 检查初始收藏状态（仅标准卡片）
  useEffect(() => {
    if (!isStandard) return;

    (async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch (err) {
        throw new Error('检查收藏状态失败');
      }
    })();
  }, [isStandard, actualSource, actualId]);

  // 切换收藏状态（仅标准卡片）
  const handleToggleFavorite = async (
    e: React.MouseEvent<HTMLSpanElement | SVGElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isStandard) return;

    try {
      const newState = await toggleFavorite(actualSource, actualId, {
        title: actualTitle,
        source_name,
        year: year || '',
        cover: actualPoster,
        total_episodes: actualEpisodes ?? 1,
        save_time: Date.now(),
      });
      setFavorited(newState);
    } catch (err) {
      // 如果删除失败且是收藏夹，恢复显示
      if (isDeleting) {
        setIsDeleting(false);
      }
      throw new Error('切换收藏状态失败');
    }
  };

  // 删除对应播放记录（仅标准卡片）
  const handleDeleteRecord = async (
    e: React.MouseEvent<HTMLSpanElement | SVGElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isStandard) return;

    try {
      await deletePlayRecord(actualSource, actualId);
      onDelete?.();
    } catch (err) {
      throw new Error('删除播放记录失败');
    }
  };

  // 点击处理逻辑
  const handleClick = () => {
    if (isDemo) {
      router.push(`/play?title=${encodeURIComponent(actualTitle.trim())}`);
    } else {
      router.push(
        `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle.trim()
        )}${year ? `&year=${year}` : ''}`
      );
    }
  };

  // 播放按钮点击处理
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleClick();
  };

  const hideCheckCircle =
    from === 'favorites' || from === 'search' || !isStandard;
  const alwaysShowHeart = from !== 'favorites' && isStandard;
  const showHoverLayer = isStandard
    ? alwaysShowHeart
      ? 'opacity-50 group-hover:opacity-100'
      : 'opacity-0 group-hover:opacity-100'
    : 'opacity-0 group-hover:opacity-100';

  return (
    <div
      className={`group relative flex w-full cursor-pointer flex-col rounded-lg bg-transparent transition-all duration-300 ease-in-out ${
        isDeleting ? 'scale-90 opacity-0' : ''
      } ${isDemo ? 'group-hover:scale-[1.02]' : ''}`}
      onClick={handleClick}
    >
      {/* 海报图片容器 */}
      <div className="duration-400 cubic-bezier(0.4,0,0.2,1) relative aspect-[2/3] w-full overflow-hidden rounded-lg transition-all">
        {/* 图片占位符 - 骨架屏效果 */}
        <ImagePlaceholder aspectRatio="aspect-[2/3]" />

        <Image
          src={actualPoster}
          alt={actualTitle}
          fill
          className={`cubic-bezier(0.4,0,0.2,1) object-cover transition-transform duration-500 group-hover:scale-110
                      ${
                        isLoaded
                          ? 'scale-100 opacity-100'
                          : 'scale-95 opacity-0'
                      }`}
          onLoadingComplete={() => setIsLoaded(true)}
          referrerPolicy="no-referrer"
          priority={false}
        />
        {/* Hover 效果层 */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent ${showHoverLayer} cubic-bezier(0.4,0,0.2,1) flex items-center justify-center overflow-hidden transition-all duration-300`}
        >
          {/* 播放按钮 */}
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
            <div
              className={`cubic-bezier(0.4,0,0.2,1) transition-all duration-300 ${
                playHover ? 'scale-100 opacity-100' : 'scale-90 opacity-70'
              } ${isDemo && playHover ? 'rotate-12 scale-110' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={handlePlayClick}
              onMouseEnter={() => setPlayHover(true)}
              onMouseLeave={() => setPlayHover(false)}
            >
              <PlayCircleSolid fillColor={playHover ? '#22c55e' : 'none'} />
            </div>
          </div>

          {/* 右侧操作按钮组（仅标准卡片） */}
          {isStandard && (
            <div className="cubic-bezier(0.4,0,0.2,1) absolute bottom-2 right-2 flex transform items-center gap-3 transition-all duration-300 group-hover:scale-110 sm:bottom-4 sm:right-4">
              {!hideCheckCircle && (
                <span
                  onClick={handleDeleteRecord}
                  title="标记已看"
                  className="inline-flex items-center justify-center opacity-70 transition-opacity duration-200 hover:opacity-100"
                >
                  <CheckCircleCustom />
                </span>
              )}

              <span
                onClick={handleToggleFavorite}
                title={favorited ? '移除收藏' : '加入收藏'}
                className={`inline-flex items-center justify-center ${
                  alwaysShowHeart ? 'opacity-100' : 'opacity-70'
                } transition-opacity duration-200 hover:opacity-100`}
              >
                <Heart
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    favorited ? 'scale-105 text-red-500' : 'text-white/90'
                  }`}
                  strokeWidth={2}
                  fill={favorited ? 'currentColor' : 'none'}
                />
              </span>
            </div>
          )}
        </div>
        {/* 评分徽章（如果有rate字段） */}
        {rate && (
          <div className="cubic-bezier(0.4, 0, 0.2, 1) absolute right-2 top-2 flex h-4 w-4 min-w-[1.25rem] transform items-center justify-center rounded-full bg-pink-500 px-1 shadow-md transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 dark:bg-pink-400 sm:h-7 sm:w-7 sm:min-w-[1.5rem]">
            <span className="text-[0.5rem] font-bold leading-none text-white sm:text-xs">
              {rate}
            </span>
          </div>
        )}

        {/* 继续观看 - 集数矩形展示框（标准卡片） */}
        {isStandard &&
          actualEpisodes &&
          actualEpisodes > 1 &&
          currentEpisode && (
            <div className="absolute right-2 top-2 flex h-5 min-w-[1.875rem] items-center justify-center rounded-md bg-green-500/90 px-2 text-[0.55rem] shadow-md dark:bg-green-600/90 sm:h-7 sm:min-w-[2.5rem] sm:text-xs">
              <span className="font-bold leading-none text-white">
                {currentEpisode}
                <span className="mx-1 text-white/80">/</span>
              </span>
              <span className="font-bold leading-none text-white">
                {actualEpisodes}
              </span>
            </div>
          )}

        {/* 搜索非聚合/聚合 - 集数圆形展示框 */}
        {(isStandard || isAggregate) &&
          actualEpisodes &&
          actualEpisodes > 1 &&
          !currentEpisode && (
            <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-500/90 text-[0.55rem] shadow-md dark:bg-green-600/90 sm:h-7 sm:w-7 sm:text-xs">
              <span className="font-bold leading-none text-white">
                {actualEpisodes}
              </span>
            </div>
          )}

        {/* 豆瓣链接按钮 */}
        {actualDoubanId &&
          (isDemo || (isStandard && from === 'search') || isAggregate) && (
            <a
              href={`https://movie.douban.com/subject/${actualDoubanId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="cubic-bezier(0.4,0,0.2,1) absolute left-2 top-2 scale-90 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
            >
              <div
                className={`h-4 w-4 rounded-full bg-[#22c55e] sm:h-7 sm:w-7 ${
                  isDemo ? 'dark:bg-[#16a34a]' : ''
                } flex items-center justify-center opacity-70 shadow-md transition-all duration-200 ease-in-out hover:scale-110 hover:bg-[#16a34a] hover:opacity-100 ${
                  isDemo ? 'dark:hover:bg-[#15803d]' : ''
                }`}
              >
                <LinkIcon className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
            </a>
          )}
      </div>

      {/* 播放进度条（仅标准卡片） */}
      {isStandard && progress !== undefined && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-[#22c55e] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 信息层 */}
      <span className="duration-400 cubic-bezier(0.4,0,0.2,1) mt-2 block w-full translate-y-1 truncate px-1 text-center text-xs font-semibold text-gray-900 opacity-80 transition-all group-hover:translate-y-[-2px] group-hover:text-green-600 group-hover:opacity-100 dark:text-gray-200 dark:group-hover:text-green-400 sm:text-sm">
        {actualTitle}
      </span>

      {/* 来源信息（仅标准卡片） */}
      {isStandard && actualSource && (
        <span className="duration-400 cubic-bezier(0.4,0,0.2,1) mt-1 block w-full translate-y-1 px-1 text-center text-[0.5rem] text-gray-500 opacity-80 transition-all group-hover:translate-y-[-2px] group-hover:opacity-100 dark:text-gray-400 sm:text-xs">
          <span className="inline-block rounded border border-gray-500/60 px-2 py-[1px] dark:border-gray-400/60">
            {source_name}
          </span>
        </span>
      )}
    </div>
  );
}
