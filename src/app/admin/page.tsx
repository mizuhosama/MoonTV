/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, Settings, Users, Video } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';

import PageLayout from '@/components/PageLayout';

// 统一弹窗方法（必须在首次使用前定义）
const showError = (message: string) =>
  Swal.fire({ icon: 'error', title: '错误', text: message });

const showSuccess = (message: string) =>
  Swal.fire({
    icon: 'success',
    title: '成功',
    text: message,
    timer: 2000,
    showConfirmButton: false,
  });

// 新增站点配置类型
interface SiteConfig {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  SearchResultDefaultAggregate: boolean;
}

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 可折叠标签组件
interface CollapsibleTabProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleTab = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleTabProps) => {
  return (
    <div className="mb-4 overflow-hidden rounded-xl bg-white/80 shadow-sm backdrop-blur-md dark:bg-gray-800/50 dark:ring-1 dark:ring-gray-700">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-gray-50/70 px-6 py-4 transition-colors hover:bg-gray-100/80 dark:bg-gray-800/60 dark:hover:bg-gray-700/60"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && <div className="px-6 py-4">{children}</div>}
    </div>
  );
};

// 用户配置组件
interface UserConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
}

const UserConfig = ({ config, role, refreshConfig }: UserConfigProps) => {
  const [userSettings, setUserSettings] = useState({
    enableRegistration: false,
  });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
  });

  // 当前登录用户名
  const currentUsername =
    typeof window !== 'undefined' ? localStorage.getItem('username') : null;

  useEffect(() => {
    if (config?.UserConfig) {
      setUserSettings({
        enableRegistration: config.UserConfig.AllowRegister,
      });
    }
  }, [config]);

  // 切换允许注册设置
  const toggleAllowRegister = async (value: boolean) => {
    const username =
      typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    const password =
      typeof window !== 'undefined' ? localStorage.getItem('password') : null;
    if (!username || !password) {
      showError('无法获取当前用户信息，请重新登录');
      return;
    }

    try {
      // 先更新本地 UI
      setUserSettings((prev) => ({ ...prev, enableRegistration: value }));

      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          action: 'setAllowRegister',
          allowRegister: value,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
      // revert toggle UI
      setUserSettings((prev) => ({ ...prev, enableRegistration: !value }));
    }
  };

  const handleBanUser = async (uname: string) => {
    await handleUserAction('ban', uname);
  };

  const handleUnbanUser = async (uname: string) => {
    await handleUserAction('unban', uname);
  };

  const handleSetAdmin = async (uname: string) => {
    await handleUserAction('setAdmin', uname);
  };

  const handleRemoveAdmin = async (uname: string) => {
    await handleUserAction('cancelAdmin', uname);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await handleUserAction('add', newUser.username, newUser.password);
    setNewUser({ username: '', password: '' });
    setShowAddUserForm(false);
  };

  // 通用请求函数
  const handleUserAction = async (
    action: 'add' | 'ban' | 'unban' | 'setAdmin' | 'cancelAdmin',
    targetUsername: string,
    targetPassword?: string
  ) => {
    const username =
      typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    const password =
      typeof window !== 'undefined' ? localStorage.getItem('password') : null;

    if (!username || !password) {
      showError('无法获取当前用户信息，请重新登录');
      return;
    }

    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          targetUsername,
          ...(targetPassword ? { targetPassword } : {}),
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      // 成功后刷新配置（无需整页刷新）
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
    }
  };

  if (!config) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 用户统计 */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          用户统计
        </h4>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="text-2xl font-bold text-green-800 dark:text-green-300">
            {config.UserConfig.Users.length}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            总用户数
          </div>
        </div>
      </div>

      {/* 注册设置 */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          注册设置
        </h4>
        <div className="flex items-center justify-between">
          <label className="text-gray-700 dark:text-gray-300">
            允许新用户注册
          </label>
          <button
            onClick={() =>
              toggleAllowRegister(!userSettings.enableRegistration)
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              userSettings.enableRegistration
                ? 'bg-green-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                userSettings.enableRegistration
                  ? 'translate-x-6'
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            用户列表
          </h4>
          <button
            onClick={() => setShowAddUserForm(!showAddUserForm)}
            className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
          >
            {showAddUserForm ? '取消' : '添加用户'}
          </button>
        </div>

        {/* 添加用户表单 */}
        {showAddUserForm && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
              <input
                type="text"
                placeholder="用户名"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, username: e.target.value }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                type="password"
                placeholder="密码"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, password: e.target.value }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                onClick={handleAddUser}
                disabled={!newUser.username || !newUser.password}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:bg-gray-400 sm:w-auto"
              >
                添加
              </button>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  用户名
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  角色
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  状态
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  操作
                </th>
              </tr>
            </thead>
            {/* 按规则排序用户：自己 -> 站长(若非自己) -> 管理员 -> 其他 */}
            {(() => {
              const sortedUsers = [...config.UserConfig.Users].sort((a, b) => {
                type UserInfo = (typeof config.UserConfig.Users)[number];
                const priority = (u: UserInfo) => {
                  if (u.username === currentUsername) return 0;
                  if (u.role === 'owner') return 1;
                  if (u.role === 'admin') return 2;
                  return 3;
                };
                return priority(a) - priority(b);
              });
              return (
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedUsers.map((user) => {
                    const canOperate =
                      user.username !== currentUsername &&
                      (role === 'owner' ||
                        (role === 'admin' && user.role === 'user'));
                    return (
                      <tr
                        key={user.username}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.username}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              user.role === 'owner'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                : user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {user.role === 'owner'
                              ? '站长'
                              : user.role === 'admin'
                              ? '管理员'
                              : '普通用户'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              !user.banned
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            }`}
                          >
                            {!user.banned ? '正常' : '已封禁'}
                          </span>
                        </td>
                        <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          {canOperate && (
                            <>
                              {user.role === 'user' && (
                                <button
                                  onClick={() => handleSetAdmin(user.username)}
                                  className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:hover:bg-purple-900/60"
                                >
                                  设为管理
                                </button>
                              )}
                              {user.role === 'admin' && (
                                <button
                                  onClick={() =>
                                    handleRemoveAdmin(user.username)
                                  }
                                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700/40 dark:text-gray-200 dark:hover:bg-gray-700/60"
                                >
                                  取消管理
                                </button>
                              )}
                              {user.role !== 'owner' &&
                                (!user.banned ? (
                                  <button
                                    onClick={() => handleBanUser(user.username)}
                                    className="inline-flex items-center rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                                  >
                                    封禁
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleUnbanUser(user.username)
                                    }
                                    className="inline-flex items-center rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 transition-colors hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
                                  >
                                    解封
                                  </button>
                                ))}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })()}
          </table>
        </div>
      </div>
    </div>
  );
};

// 视频源配置组件
const VideoSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    detail: '',
    disabled: false,
    from: 'config',
  });

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 轻微位移即可触发
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 长按 150ms 后触发，避免与滚动冲突
        tolerance: 5,
      },
    })
  );

  // 初始化
  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
      // 进入时重置 orderChanged
      setOrderChanged(false);
    }
  }, [config]);

  // 通用 API 请求
  const callSourceApi = async (body: Record<string, any>) => {
    const username =
      typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    const password =
      typeof window !== 'undefined' ? localStorage.getItem('password') : null;

    if (!username || !password) {
      showError('无法获取当前用户信息，请重新登录');
      throw new Error('no-credential');
    }

    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      // 成功后刷新配置
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
      throw err; // 向上抛出方便调用处判断
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    callSourceApi({ action, key }).catch(() => {
      console.error('操作失败', action, key);
    });
  };

  const handleDelete = (key: string) => {
    callSourceApi({ action: 'delete', key }).catch(() => {
      console.error('操作失败', 'delete', key);
    });
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.key || !newSource.api) return;
    callSourceApi({
      action: 'add',
      key: newSource.key,
      name: newSource.name,
      api: newSource.api,
      detail: newSource.detail,
    })
      .then(() => {
        setNewSource({
          name: '',
          key: '',
          api: '',
          detail: '',
          disabled: false,
          from: 'custom',
        });
        setShowAddForm(false);
      })
      .catch(() => {
        console.error('操作失败', 'add', newSource);
      });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex((s) => s.key === active.id);
    const newIndex = sources.findIndex((s) => s.key === over.id);
    setSources((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = sources.map((s) => s.key);
    callSourceApi({ action: 'sort', order })
      .then(() => {
        setOrderChanged(false);
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
      });
  };

  // 可拖拽行封装 (dnd-kit)
  const DraggableRow = ({ source }: { source: DataSource }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: source.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="select-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <td
          className="cursor-grab px-2 py-4 text-gray-400"
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          {source.name}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          {source.key}
        </td>
        <td
          className="max-w-[12rem] truncate whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
          title={source.api}
        >
          {source.api}
        </td>
        <td
          className="max-w-[8rem] truncate whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
          title={source.detail || '-'}
        >
          {source.detail || '-'}
        </td>
        <td className="max-w-[1rem] whitespace-nowrap px-6 py-4">
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              !source.disabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {!source.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
          <button
            onClick={() => handleToggleEnable(source.key)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${
              !source.disabled
                ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60'
                : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
            } transition-colors`}
          >
            {!source.disabled ? '禁用' : '启用'}
          </button>
          {source.from !== 'config' && (
            <button
              onClick={() => handleDelete(source.key)}
              className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700/40 dark:text-gray-200 dark:hover:bg-gray-700/60"
            >
              删除
            </button>
          )}
        </td>
      </tr>
    );
  };

  if (!config) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 添加视频源表单 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          视频源列表
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
        >
          {showAddForm ? '取消' : '添加视频源'}
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="名称"
              value={newSource.name}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, name: e.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Key"
              value={newSource.key}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, key: e.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="API 地址"
              value={newSource.api}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, api: e.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Detail 地址（选填）"
              value={newSource.detail}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, detail: e.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddSource}
              disabled={!newSource.name || !newSource.key || !newSource.api}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:bg-gray-400 sm:w-auto"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* 视频源表格 */}
      <div className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="w-8" />
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                API 地址
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Detail 地址
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                操作
              </th>
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={sources.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sources.map((source) => (
                  <DraggableRow key={source.key} source={source} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* 保存排序按钮 */}
      {orderChanged && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveOrder}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
          >
            保存排序
          </button>
        </div>
      )}
    </div>
  );
};

// 新增站点配置组件
const SiteConfigComponent = ({ config }: { config: AdminConfig | null }) => {
  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    SearchResultDefaultAggregate: false,
  });
  // 保存状态
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings(config.SiteConfig);
    }
  }, [config]);

  // 保存站点配置
  const handleSave = async () => {
    const username =
      typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    if (!username) {
      showError('无法获取用户名，请重新登录');
      return;
    }

    const password =
      typeof window !== 'undefined' ? localStorage.getItem('password') : null;
    if (!password) {
      showError('无法获取密码，请重新登录');
      return;
    }

    try {
      setSaving(true);
      const resp = await fetch('/api/admin/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ...siteSettings }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `保存失败: ${resp.status}`);
      }

      showSuccess('保存成功, 请刷新页面');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 站点名称 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          站点名称
        </label>
        <input
          type="text"
          value={siteSettings.SiteName}
          onChange={(e) =>
            setSiteSettings((prev) => ({ ...prev, SiteName: e.target.value }))
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* 站点公告 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          站点公告
        </label>
        <textarea
          value={siteSettings.Announcement}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              Announcement: e.target.value,
            }))
          }
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* 搜索接口可拉取最大页数 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          搜索接口可拉取最大页数
        </label>
        <input
          type="number"
          min={1}
          value={siteSettings.SearchDownstreamMaxPage}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchDownstreamMaxPage: Number(e.target.value),
            }))
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* 站点接口缓存时间 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          站点接口缓存时间（秒）
        </label>
        <input
          type="number"
          min={1}
          value={siteSettings.SiteInterfaceCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SiteInterfaceCacheTime: Number(e.target.value),
            }))
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* 默认按标题和年份聚合 */}
      <div className="flex items-center justify-between">
        <label className="text-gray-700 dark:text-gray-300">
          搜索结果默认按标题和年份聚合
        </label>
        <button
          onClick={() =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchResultDefaultAggregate: !prev.SearchResultDefaultAggregate,
            }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            siteSettings.SearchResultDefaultAggregate
              ? 'bg-green-600'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              siteSettings.SearchResultDefaultAggregate
                ? 'translate-x-6'
                : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 ${
            saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
          } rounded-lg text-white transition-colors`}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<{ [key: string]: boolean }>({
    userConfig: false,
    videoSource: false,
    siteConfig: false,
  });

  // 获取管理员配置
  // showLoading 用于控制是否在请求期间显示整体加载骨架。
  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const username = localStorage.getItem('username');
      const response = await fetch(
        `/api/admin/config${
          username ? `?username=${encodeURIComponent(username)}` : ''
        }`
      );

      if (!response.ok) {
        const data = (await response.json()) as any;
        throw new Error(`获取配置失败: ${data.error}`);
      }

      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
      setRole(data.Role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      showError(msg);
      setError(msg);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 首次加载时显示骨架
    fetchConfig(true);
  }, [fetchConfig]);

  // 切换标签展开状态
  const toggleTab = (tabKey: string) => {
    setExpandedTabs((prev) => ({
      ...prev,
      [tabKey]: !prev[tabKey],
    }));
  };

  // 新增: 重置配置处理函数
  const handleResetConfig = async () => {
    const username = localStorage.getItem('username');
    if (!username) {
      showError('无法获取用户名，请重新登录');
      return;
    }
    const { isConfirmed } = await Swal.fire({
      title: '确认重置配置',
      text: '此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    });
    if (!isConfirmed) return;

    const password = localStorage.getItem('password');
    if (!password) {
      showError('无法获取密码，请重新登录');
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/reset${
          username
            ? `?username=${encodeURIComponent(
                username
              )}&password=${encodeURIComponent(password)}`
            : ''
        }`
      );
      if (!response.ok) {
        throw new Error(`重置失败: ${response.status}`);
      }
      showSuccess('重置成功，请刷新页面！');
    } catch (err) {
      showError(err instanceof Error ? err.message : '重置失败');
    }
  };

  if (loading) {
    return (
      <PageLayout activePath="/admin">
        <div className="px-2 py-4 sm:px-10 sm:py-8">
          <div className="mx-auto max-w-[95%]">
            <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
              管理员设置
            </h1>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
                />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    // 错误已通过 SweetAlert2 展示，此处直接返回空
    return null;
  }

  return (
    <PageLayout activePath="/admin">
      <div className="px-2 py-4 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-[95%]">
          {/* 标题 + 重置配置按钮 */}
          <div className="mb-8 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              管理员设置
            </h1>
            {config && role === 'owner' && (
              <button
                onClick={handleResetConfig}
                className="rounded-md bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
              >
                重置配置
              </button>
            )}
          </div>

          {/* 站点配置标签 */}
          <CollapsibleTab
            title="站点配置"
            icon={
              <Settings
                size={20}
                className="text-gray-600 dark:text-gray-400"
              />
            }
            isExpanded={expandedTabs.siteConfig}
            onToggle={() => toggleTab('siteConfig')}
          >
            <SiteConfigComponent config={config} />
          </CollapsibleTab>

          <div className="space-y-4">
            {/* 用户配置标签 */}
            <CollapsibleTab
              title="用户配置"
              icon={
                <Users size={20} className="text-gray-600 dark:text-gray-400" />
              }
              isExpanded={expandedTabs.userConfig}
              onToggle={() => toggleTab('userConfig')}
            >
              <UserConfig
                config={config}
                role={role}
                refreshConfig={fetchConfig}
              />
            </CollapsibleTab>

            {/* 视频源配置标签 */}
            <CollapsibleTab
              title="视频源配置"
              icon={
                <Video size={20} className="text-gray-600 dark:text-gray-400" />
              }
              isExpanded={expandedTabs.videoSource}
              onToggle={() => toggleTab('videoSource')}
            >
              <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
