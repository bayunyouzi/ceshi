"use client";

import React, { useEffect, useMemo, useState } from "react";

type Stats = {
  totalUsers: number;
  totalPromptCount: number;
  totalImageCount: number;
  totalPromptLogs: number;
  totalImageLogs: number;
};

type UserItem = {
  id: string;
  email: string;
  promptCount: number;
  imageCount: number;
  dailyImageCount: number;
  lastImageGeneratedAt: string | null;
  createdAt: string;
};

type LogItem = {
  id: string;
  type: "PROMPT" | "IMAGE" | "VIDEO";
  userEmail: string;
  model: string | null;
  requestPrompt: string | null;
  imageUrl: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
};

type GalleryItem = {
  id: string;
  userEmail: string;
  model: string | null;
  requestPrompt: string | null;
  imageUrl: string | null;
  createdAt: string;
};

type AdminTab = "gallery" | "overview" | "users" | "logs" | "failures" | "settings";

const normalizeImageRef = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const unwrapped = raw.replace(/[`"'“”‘’]/g, "").trim();
  return unwrapped;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const cardClass = "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]";
const inputClass = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/40";
const pillButtonClass = "rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.1]";

function StatCard({ label, value, accent = "text-white" }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function SidebarButton({
  active,
  label,
  description,
  badge,
  onClick
}: {
  active: boolean;
  label: string;
  description: string;
  badge?: string | number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{label}</div>
        {badge !== undefined && (
          <span className={`rounded-full px-2 py-1 text-xs ${active ? "bg-cyan-400/20 text-cyan-100" : "bg-white/10 text-zinc-400"}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{description}</div>
    </button>
  );
}

function MediaThumb({
  id,
  src,
  alt,
  className,
  brokenSet,
  markBroken
}: {
  id: string;
  src?: string | null;
  alt: string;
  className: string;
  brokenSet: Set<string>;
  markBroken: (id: string) => void;
}) {
  const normalized = normalizeImageRef(src);
  if (!normalized || brokenSet.has(id)) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 text-center text-xs text-zinc-500">
        图片链接已失效或格式异常
      </div>
    );
  }
  return <img src={normalized} alt={alt} className={className} onError={() => markBroken(id)} />;
}

// ============================================================
// 配置编辑面板组件
// ============================================================
type ConfigField = {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  description?: string;
};

type ConfigSection = {
  key: string;
  label: string;
  icon: string;
  fields: ConfigField[];
};

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    key: 'grok-prompt',
    label: 'Grok 提示词',
    icon: '💬',
    fields: [
      { key: 'GROK_PROMPT_API_KEY', label: 'API Key', type: 'password' },
      { key: 'GROK_PROMPT_API_ENDPOINT', label: 'API 端点', type: 'text' },
      { key: 'GROK_PROMPT_MODEL', label: '模型名称', type: 'text' },
    ],
  },
  {
    key: 'grok-image',
    label: 'Grok 生图',
    icon: '🎨',
    fields: [
      { key: 'GROK_IMAGE_API_KEY', label: 'API Key', type: 'password' },
      { key: 'GROK_IMAGE_API_ENDPOINT', label: 'API 端点', type: 'text' },
      { key: 'GROK_IMAGE_MODEL', label: '文生图模型', type: 'text' },
      { key: 'GROK_IMG2IMG_MODEL', label: '图生图模型', type: 'text' },
    ],
  },
  {
    key: 'gpt-image2',
    label: 'GPT-Image-2',
    icon: '🖼️',
    fields: [
      { key: 'GPT_IMAGE2_API_KEY', label: 'API Key', type: 'password' },
      { key: 'GPT_IMAGE2_API_ENDPOINT', label: 'API 端点', type: 'text' },
      { key: 'GPT_IMAGE2_MODEL', label: '模型名称', type: 'text' },
    ],
  },
  {
    key: 'vision',
    label: 'Vision 反推',
    icon: '👁️',
    fields: [
      { key: 'VISION_API_KEY', label: 'API Key', type: 'password' },
      { key: 'VISION_API_ENDPOINT', label: 'API 端点', type: 'text' },
      { key: 'VISION_MODEL', label: '模型名称', type: 'text' },
    ],
  },
  {
    key: 'video',
    label: '视频生成',
    icon: '🎬',
    fields: [
      { key: 'VIDEO_API_KEY', label: 'API Key', type: 'password' },
      { key: 'VIDEO_API_ENDPOINT', label: 'API 端点', type: 'text' },
      { key: 'VIDEO_MODEL', label: '模型名称', type: 'text' },
    ],
  },
  {
    key: 'rate-limits',
    label: '速率限制',
    icon: '⏱️',
    fields: [
      { key: 'FREE_IMG_DAILY_LIMIT', label: '每日免费生图上限', type: 'number', description: '每天免费用户可生成的图片数量' },
      { key: 'COOLDOWN_SECONDS', label: '生图冷却时间(秒)', type: 'number', description: '两次生图之间的最小间隔' },
      { key: 'VIDEO_DAILY_LIMIT', label: '每日视频生成上限', type: 'number', description: '每天用户可生成的视频数量' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    icon: '⚙️',
    fields: [
      { key: 'ADMIN_EMAILS', label: '管理员邮箱', type: 'text', description: '多个邮箱用逗号分隔' },
      { key: 'VIDEO_LIMIT_EXEMPT_EMAIL', label: '视频限制豁免邮箱', type: 'text', description: '不受视频每日限制的邮箱' },
    ],
  },
  {
    key: 'img2img-prompts',
    label: '图生图提示词',
    icon: '✨',
    fields: [
      { key: 'IMG2IMG_PROMPTS', label: '图生图效果提示词 (JSON)', type: 'textarea', description: 'JSON 格式，key 为效果ID，value 为提示词文本' },
    ],
  },
];

function SettingsPanel({
  configs,
  configDefaults,
  configLoading,
  configSaving,
  configMessage,
  configSection,
  setConfigSection,
  updateConfig,
  resetConfig,
  saveConfigs,
  fetchConfigs,
}: {
  configs: Record<string, string>;
  configDefaults: Record<string, string>;
  configLoading: boolean;
  configSaving: boolean;
  configMessage: { type: 'success' | 'error'; text: string } | null;
  configSection: string;
  setConfigSection: (s: string) => void;
  updateConfig: (key: string, value: string) => void;
  resetConfig: (key: string) => void;
  saveConfigs: () => void;
  fetchConfigs: () => void;
}) {
  const activeSection = CONFIG_SECTIONS.find(s => s.key === configSection) || CONFIG_SECTIONS[0];

  const isFieldChanged = (key: string) => {
    return configs[key] !== configDefaults[key];
  };

  if (configLoading && Object.keys(configs).length === 0) {
    return (
      <section className={`${cardClass} p-5`}>
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          加载配置中...
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className={`${cardClass} p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">系统配置</h2>
            <p className="mt-1 text-sm text-zinc-500">管理所有 API 密钥、端点、模型名称和系统参数，保存后30秒内自动生效。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchConfigs}
              disabled={configLoading}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.1] disabled:opacity-60"
            >
              {configLoading ? "加载中..." : "重新加载"}
            </button>
            <button
              onClick={saveConfigs}
              disabled={configSaving}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-60"
            >
              {configSaving ? "保存中..." : "保存所有配置"}
            </button>
          </div>
        </div>

        {configMessage && (
          <div className={`mt-4 rounded-2xl border p-4 text-sm ${
            configMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}>
            {configMessage.text}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Sidebar navigation */}
        <aside className="xl:w-56 shrink-0">
          <div className="flex flex-wrap gap-2 xl:flex-col xl:gap-2">
            {CONFIG_SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setConfigSection(section.key)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  configSection === section.key
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Config fields */}
        <section className={`${cardClass} min-w-0 flex-1 p-5`}>
          <div className="mb-6">
            <h3 className="text-xl font-bold">
              {activeSection.icon} {activeSection.label}
            </h3>
          </div>

          <div className="space-y-5">
            {activeSection.fields.map((field) => (
              <div key={field.key} className="group">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-sm font-medium text-zinc-300">{field.label}</label>
                  {isFieldChanged(field.key) && (
                    <button
                      onClick={() => resetConfig(field.key)}
                      className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 transition hover:bg-amber-500/20"
                    >
                      还原默认
                    </button>
                  )}
                </div>

                {field.type === 'textarea' ? (
                  <textarea
                    value={configs[field.key] || ""}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    placeholder={field.placeholder || `默认: ${configDefaults[field.key]?.substring(0, 80)}...`}
                    rows={16}
                    className={`${inputClass} font-mono text-xs leading-relaxed resize-y`}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={configs[field.key] || ""}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    placeholder={field.placeholder || configDefaults[field.key]}
                    className={`${inputClass} ${isFieldChanged(field.key) ? 'border-amber-500/30' : ''}`}
                  />
                )}

                {field.description && (
                  <p className="mt-1.5 text-xs text-zinc-500">{field.description}</p>
                )}

                {isFieldChanged(field.key) && (
                  <p className="mt-1 text-xs text-amber-400/70">
                    已修改 (默认: {configDefaults[field.key]?.substring(0, 60)}{configDefaults[field.key]?.length > 60 ? '...' : ''})
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 底部保存按钮 */}
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-zinc-500">
              修改后点击保存，配置将在30秒内自动生效，无需重启服务。
            </div>
            <button
              onClick={saveConfigs}
              disabled={configSaving}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-60"
            >
              {configSaving ? "保存中..." : "保存配置"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [imageGallery, setImageGallery] = useState<GalleryItem[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("gallery");
  const [userQuery, setUserQuery] = useState("");
  const [galleryQuery, setGalleryQuery] = useState("");
  const [logQuery, setLogQuery] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState<"ALL" | "PROMPT" | "IMAGE" | "VIDEO">("ALL");
  const [logStatusFilter, setLogStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [configDefaults, setConfigDefaults] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configSection, setConfigSection] = useState<string>('grok-prompt');

  const markBroken = (id: string) => {
    setBrokenImageIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const brokenSet = useMemo(() => new Set(brokenImageIds), [brokenImageIds]);

  const loadOverview = async (showSkeleton = false) => {
    try {
      if (showSkeleton) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError("");
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("请先登录管理员账号");
        return;
      }
      const res = await fetch("/api/admin/overview", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "加载失败");
      }
      setMe(data.me || null);
      setStats(data.stats);
      setUsers(data.users || []);
      setLogs(data.logs || []);
      setImageGallery(data.imageGallery || []);
      setBrokenImageIds([]);
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview(true);
  }, []);

  const fetchConfigs = async () => {
    try {
      setConfigLoading(true);
      setConfigMessage(null);
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "加载配置失败");
      setConfigs(data.configs || {});
      setConfigDefaults(data.defaults || {});
    } catch (e: any) {
      setConfigMessage({ type: 'error', text: e.message || "加载配置失败" });
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfigs = async () => {
    try {
      setConfigSaving(true);
      setConfigMessage(null);
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "保存失败");
      setConfigMessage({ type: 'success', text: data.message || "配置已保存" });
      setTimeout(() => setConfigMessage(null), 5000);
    } catch (e: any) {
      setConfigMessage({ type: 'error', text: e.message || "保存失败" });
    } finally {
      setConfigSaving(false);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  const resetConfig = (key: string) => {
    setConfigs(prev => ({ ...prev, [key]: configDefaults[key] || "" }));
  };

  useEffect(() => {
    if (activeTab === "settings" && Object.keys(configs).length === 0) {
      fetchConfigs();
    }
  }, [activeTab]);

  const filteredUsers = useMemo(() => {
    const keyword = userQuery.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => user.email.toLowerCase().includes(keyword));
  }, [users, userQuery]);

  const filteredGallery = useMemo(() => {
    const keyword = galleryQuery.trim().toLowerCase();
    if (!keyword) return imageGallery;
    return imageGallery.filter((item) =>
      `${item.userEmail} ${item.model || ""} ${item.requestPrompt || ""}`.toLowerCase().includes(keyword)
    );
  }, [imageGallery, galleryQuery]);

  const filteredLogs = useMemo(() => {
    const keyword = logQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const matchType = logTypeFilter === "ALL" || log.type === logTypeFilter;
      const matchStatus =
        logStatusFilter === "ALL" ||
        (logStatusFilter === "SUCCESS" && log.success) ||
        (logStatusFilter === "FAILED" && !log.success);
      const matchQuery =
        !keyword ||
        `${log.userEmail} ${log.model || ""} ${log.requestPrompt || ""} ${log.errorMessage || ""}`
          .toLowerCase()
          .includes(keyword);
      return matchType && matchStatus && matchQuery;
    });
  }, [logs, logQuery, logStatusFilter, logTypeFilter]);

  const recentPromptLogs = logs.filter((x) => x.type === "PROMPT").length;
  const recentImageLogs = logs.filter((x) => x.type === "IMAGE").length;
  const recentVideoLogs = logs.filter((x) => x.type === "VIDEO").length;
  const recentFailedLogs = logs.filter((x) => !x.success);
  const recentSuccessCount = logs.filter((x) => x.success).length;
  const successRate = logs.length ? Math.round((recentSuccessCount / logs.length) * 100) : 0;
  const activeUserCount = new Set(logs.map((x) => x.userEmail)).size;
  const topUsers = [...users]
    .sort((a, b) => (b.imageCount + b.promptCount) - (a.imageCount + a.promptCount))
    .slice(0, 6);

  const copyPrompt = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_e) {}
  };

  const sidebarItems = [
    { key: "gallery" as const, label: "生图图库", description: "优先查看别人生成的图片", badge: filteredGallery.length },
    { key: "overview" as const, label: "数据概览", description: "看总体走势和失败概况", badge: `${successRate}%` },
    { key: "users" as const, label: "用户列表", description: "查账号与用量", badge: filteredUsers.length },
    { key: "logs" as const, label: "日志中心", description: "筛选提示词/生图/视频日志", badge: filteredLogs.length },
    { key: "failures" as const, label: "失败记录", description: "优先排查异常请求", badge: recentFailedLogs.length },
    { key: "settings" as const, label: "系统配置", description: "管理API密钥、端点和参数", badge: "NEW" }
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_30%),radial-gradient(circle_at_right,_rgba(59,130,246,0.12),_transparent_25%),#050505] text-zinc-100 p-4 md:p-8">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <aside className={`${cardClass} hidden w-80 shrink-0 self-start p-5 xl:block xl:sticky xl:top-6`}>
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs tracking-[0.2em] text-cyan-300">
            ADMIN CONSOLE
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">管理后台</h1>
          <p className="mt-2 text-sm text-zinc-500">左侧导航切换模块，默认直接进入生图图库。</p>

          {me && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              当前管理员：{me.email}
            </div>
          )}

          <button
            onClick={() => loadOverview(false)}
            disabled={refreshing || loading}
            className="mt-4 w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-60"
          >
            {refreshing ? "刷新中..." : "刷新数据"}
          </button>

          <div className="mt-6 space-y-3">
            {sidebarItems.map((item) => (
              <SidebarButton
                key={item.key}
                active={activeTab === item.key}
                label={item.label}
                description={item.description}
                badge={item.badge}
                onClick={() => setActiveTab(item.key)}
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <section className={`${cardClass} p-4 xl:hidden`}>
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl font-black">管理后台</h1>
                <p className="mt-1 text-sm text-zinc-500">移动端使用 Tab 快速切换，不用翻到底。</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sidebarItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`rounded-2xl border px-3 py-3 text-left ${
                      activeTab === item.key
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-black/20 text-zinc-300"
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-1 text-xs text-zinc-500">{item.badge}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {loading && <div className="text-zinc-400">加载中...</div>}
          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>
          )}

          {!loading && !error && stats && (
            <>
              {activeTab === "gallery" && (
                <section className={`${cardClass} p-5`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">最近生图图库</h2>
                      <p className="mt-1 text-sm text-zinc-500">默认首页。支持按用户、模型、提示词搜索，点击可放大查看。</p>
                    </div>
                    <input
                      value={galleryQuery}
                      onChange={(e) => setGalleryQuery(e.target.value)}
                      placeholder="搜索用户 / 模型 / 提示词"
                      className={`${inputClass} md:max-w-sm`}
                    />
                  </div>
                  {filteredGallery.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-zinc-500">暂无可展示图片</div>
                  ) : (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredGallery.map((item) => (
                        <div key={item.id} className="rounded-3xl border border-white/10 bg-black/20 p-3">
                          <button className="block w-full" onClick={() => setSelectedImage(item)}>
                            <MediaThumb
                              id={item.id}
                              src={normalizeImageRef(item.imageUrl)}
                              alt="generated"
                              className="h-80 w-full rounded-2xl border border-white/10 object-cover"
                              brokenSet={brokenSet}
                              markBroken={markBroken}
                            />
                          </button>
                          <div className="mt-3 text-xs text-zinc-400">{formatDateTime(item.createdAt)} · {item.userEmail}</div>
                          <div className="mt-1 text-xs text-zinc-500">{item.model || "-"}</div>
                          {item.requestPrompt && (
                            <div className="mt-2 line-clamp-4 whitespace-pre-wrap break-all text-sm text-zinc-200">
                              {item.requestPrompt}
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                            <button className={pillButtonClass} onClick={() => setSelectedImage(item)}>放大查看</button>
                            <button className={pillButtonClass} onClick={() => copyPrompt(item.requestPrompt)}>复制提示词</button>
                            {normalizeImageRef(item.imageUrl) && (
                              <a className={pillButtonClass} href={normalizeImageRef(item.imageUrl)} target="_blank" rel="noreferrer">
                                打开原图
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "overview" && (
                <div className="space-y-6">
                  <section className={`${cardClass} p-5`}>
                    <h2 className="text-2xl font-bold">数据概览</h2>
                    <p className="mt-1 text-sm text-zinc-500">快速了解近期活跃度、成功率和核心指标。</p>
                    <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-6">
                      <StatCard label="总用户数" value={stats.totalUsers} />
                      <StatCard label="提示词总次数" value={stats.totalPromptCount} />
                      <StatCard label="生图总次数" value={stats.totalImageCount} />
                      <StatCard label="近 200 条成功率" value={`${successRate}%`} accent="text-emerald-300" />
                      <StatCard label="活跃用户数" value={activeUserCount} />
                      <StatCard label="失败数" value={recentFailedLogs.length} accent="text-rose-300" />
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className={`${cardClass} p-5`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">近期活动分布</h3>
                        <span className="text-xs text-zinc-500">近 200 条</span>
                      </div>
                      <div className="mt-4 space-y-4">
                        {[
                          { label: "提示词", value: recentPromptLogs, color: "bg-violet-400" },
                          { label: "生图", value: recentImageLogs, color: "bg-cyan-400" },
                          { label: "视频", value: recentVideoLogs, color: "bg-amber-400" }
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="mb-2 flex justify-between text-sm text-zinc-400">
                              <span>{item.label}</span>
                              <span>{item.value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/5">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${logs.length ? (item.value / logs.length) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`${cardClass} p-5`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">高频用户</h3>
                        <span className="text-xs text-zinc-500">Top 6</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {topUsers.map((user, index) => (
                          <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{index + 1}. {user.email}</div>
                                <div className="mt-1 text-xs text-zinc-500">提示词 {user.promptCount} · 生图 {user.imageCount}</div>
                              </div>
                              <div className="text-right text-xs text-zinc-400">今日 {user.dailyImageCount}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`${cardClass} p-5`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">最近失败</h3>
                        <span className="text-xs text-zinc-500">优先排查</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {recentFailedLogs.slice(0, 6).map((log) => (
                          <div key={log.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                            <div className="text-xs text-rose-300">{log.type} · {log.userEmail}</div>
                            <div className="mt-1 text-xs text-zinc-500">{formatDateTime(log.createdAt)}</div>
                            <div className="mt-2 line-clamp-3 text-sm text-zinc-200">{log.errorMessage || log.requestPrompt || "失败记录"}</div>
                          </div>
                        ))}
                        {recentFailedLogs.length === 0 && (
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                            最近没有失败记录
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "users" && (
                <section className={`${cardClass} overflow-hidden p-5`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">用户列表</h2>
                      <p className="mt-1 text-sm text-zinc-500">按邮箱搜索，快速定位账号与用量。</p>
                    </div>
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="搜索账号邮箱"
                      className={`${inputClass} md:max-w-xs`}
                    />
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-400">
                          <th className="py-3 pr-4 text-left">账号</th>
                          <th className="py-3 pr-4 text-left">提示词次数</th>
                          <th className="py-3 pr-4 text-left">生图次数</th>
                          <th className="py-3 pr-4 text-left">今日生图</th>
                          <th className="py-3 pr-4 text-left">上次生图</th>
                          <th className="py-3 pr-4 text-left">注册时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-white/5 text-zinc-200">
                            <td className="py-3 pr-4">{u.email}</td>
                            <td className="py-3 pr-4">{u.promptCount}</td>
                            <td className="py-3 pr-4">{u.imageCount}</td>
                            <td className="py-3 pr-4">{u.dailyImageCount}</td>
                            <td className="py-3 pr-4">{formatDateTime(u.lastImageGeneratedAt)}</td>
                            <td className="py-3 pr-4 text-zinc-500">{formatDate(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div className="py-6 text-center text-sm text-zinc-500">没有匹配到账号</div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "logs" && (
                <section className={`${cardClass} p-5`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">日志中心</h2>
                        <p className="mt-1 text-sm text-zinc-500">按类型、状态和关键词筛选最近 200 条记录。</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <select value={logTypeFilter} onChange={(e) => setLogTypeFilter(e.target.value as any)} className={inputClass}>
                          <option value="ALL">全部类型</option>
                          <option value="PROMPT">提示词</option>
                          <option value="IMAGE">生图</option>
                          <option value="VIDEO">视频</option>
                        </select>
                        <select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value as any)} className={inputClass}>
                          <option value="ALL">全部状态</option>
                          <option value="SUCCESS">仅成功</option>
                          <option value="FAILED">仅失败</option>
                        </select>
                        <input
                          value={logQuery}
                          onChange={(e) => setLogQuery(e.target.value)}
                          placeholder="搜索用户 / 模型 / 提示词 / 错误"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                      <span className="rounded-full border border-white/10 px-3 py-1">提示词 {recentPromptLogs}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1">生图 {recentImageLogs}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1">视频 {recentVideoLogs}</span>
                      <span className="rounded-full border border-rose-500/20 px-3 py-1 text-rose-300">失败 {recentFailedLogs.length}</span>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 max-h-[72vh] overflow-auto pr-1">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span>{formatDateTime(log.createdAt)}</span>
                          <span>·</span>
                          <span className={log.type === "VIDEO" ? "text-amber-300" : log.type === "IMAGE" ? "text-cyan-300" : "text-violet-300"}>
                            {log.type}
                          </span>
                          <span>·</span>
                          <span>{log.userEmail}</span>
                          <span>·</span>
                          <span>{log.model || "-"}</span>
                          <span className={`ml-auto rounded-full px-2 py-1 ${log.success ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                            {log.success ? "成功" : "失败"}
                          </span>
                        </div>
                        {log.requestPrompt && (
                          <div className="mt-3 whitespace-pre-wrap break-all text-sm text-zinc-200">{log.requestPrompt}</div>
                        )}
                        {normalizeImageRef(log.imageUrl) && (
                          <div className="mt-3 max-w-sm">
                            <MediaThumb
                              id={`log-${log.id}`}
                              src={normalizeImageRef(log.imageUrl)}
                              alt="generated"
                              className="max-h-60 rounded-2xl border border-white/10"
                              brokenSet={brokenSet}
                              markBroken={markBroken}
                            />
                          </div>
                        )}
                        {!log.success && (
                          <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">
                            {log.errorMessage || "失败"}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button className={pillButtonClass} onClick={() => copyPrompt(log.requestPrompt)}>复制提示词</button>
                          {normalizeImageRef(log.imageUrl) && (
                            <a className={pillButtonClass} href={normalizeImageRef(log.imageUrl)} target="_blank" rel="noreferrer">
                              打开图片
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-500">
                        当前筛选条件下没有记录
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "failures" && (
                <section className={`${cardClass} p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">失败记录</h2>
                      <p className="mt-1 text-sm text-zinc-500">集中查看失败请求，不和成功日志混在一起。</p>
                    </div>
                    <div className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
                      共 {recentFailedLogs.length} 条
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {recentFailedLogs.map((log) => (
                      <div key={log.id} className="rounded-3xl border border-rose-500/15 bg-rose-500/5 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span>{formatDateTime(log.createdAt)}</span>
                          <span>·</span>
                          <span>{log.type}</span>
                          <span>·</span>
                          <span>{log.userEmail}</span>
                          <span>·</span>
                          <span>{log.model || "-"}</span>
                        </div>
                        {log.requestPrompt && (
                          <div className="mt-3 whitespace-pre-wrap break-all text-sm text-zinc-200">{log.requestPrompt}</div>
                        )}
                        <div className="mt-3 rounded-2xl border border-rose-500/20 bg-black/20 p-3 text-sm text-rose-200">
                          {log.errorMessage || "失败"}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className={pillButtonClass} onClick={() => copyPrompt(log.requestPrompt)}>复制提示词</button>
                        </div>
                      </div>
                    ))}
                    {recentFailedLogs.length === 0 && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center text-sm text-emerald-300">
                        最近没有失败记录
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "settings" && (
                <SettingsPanel
                  configs={configs}
                  configDefaults={configDefaults}
                  configLoading={configLoading}
                  configSaving={configSaving}
                  configMessage={configMessage}
                  configSection={configSection}
                  setConfigSection={setConfigSection}
                  updateConfig={updateConfig}
                  resetConfig={resetConfig}
                  saveConfigs={saveConfigs}
                  fetchConfigs={fetchConfigs}
                />
              )}
            </>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/85 p-4 backdrop-blur-sm md:p-8" onClick={() => setSelectedImage(null)}>
          <div className="mx-auto flex h-full max-w-6xl items-center justify-center">
            <div
              className="w-full max-h-full overflow-auto rounded-3xl border border-white/10 bg-zinc-950/95 p-4 md:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-zinc-300">{selectedImage.userEmail}</div>
                  <div className="mt-1 text-xs text-zinc-500">{formatDateTime(selectedImage.createdAt)} · {selectedImage.model || "-"}</div>
                </div>
                <div className="flex gap-2">
                  <button className={pillButtonClass} onClick={() => copyPrompt(selectedImage.requestPrompt)}>复制提示词</button>
                  {normalizeImageRef(selectedImage.imageUrl) && (
                    <a className={pillButtonClass} href={normalizeImageRef(selectedImage.imageUrl)} target="_blank" rel="noreferrer">
                      打开原图
                    </a>
                  )}
                  <button className={pillButtonClass} onClick={() => setSelectedImage(null)}>关闭</button>
                </div>
              </div>
              <MediaThumb
                id={`modal-${selectedImage.id}`}
                src={normalizeImageRef(selectedImage.imageUrl)}
                alt="preview"
                className="max-h-[72vh] w-full rounded-2xl bg-black object-contain"
                brokenSet={brokenSet}
                markBroken={markBroken}
              />
              {selectedImage.requestPrompt && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200 whitespace-pre-wrap break-all">
                  {selectedImage.requestPrompt}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
