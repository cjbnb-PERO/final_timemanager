import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Clock, CheckCircle2, AlertTriangle, Download, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { apiInsights } from '../../lib/api';
import type { WeeklyInsight } from '@shared/types/api';
import { toast } from 'sonner';

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

interface Props {
  refreshKey: number;
}

export default function InsightsView({ refreshKey }: Props) {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiInsights.getWeekly().then(res => {
      if (!cancelled && res.success) setInsight(res.data);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleExportPDF = () => {
    toast.success('周报导出中', { description: '正在生成报告…' });
    setTimeout(() => {
      const lines = [
        'TimeTask Pro 周报',
        '',
        `时间范围: 本周`,
        `总追踪时间: ${formatSeconds(insight?.totalTrackedSeconds ?? 0)}`,
        `完成任务: ${insight?.totalTasksCompleted ?? 0} 项`,
        `任务完成率: ${insight?.completionRate ?? 0}%`,
        `递期任务: ${insight?.totalTasksOverdue ?? 0} 项`,
        '',
        '项目时间分布:',
        ...(insight?.timeByProject ?? []).map(p => `  ${p.projectName}: ${formatSeconds(p.seconds)}`),
        '',
        '智能洞察:',
        insight?.aiInsight ?? '',
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TimeTask-周报-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('周报已导出');
    }, 800);
  };

  const timeByDay = insight?.timeByDay ?? [];
  const maxDaySeconds = Math.max(...timeByDay.map(d => d.seconds), 1);
  const maxProjectSeconds = Math.max(...(insight?.timeByProject ?? []).map(p => p.seconds), 1);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);

  const totalTracked = insight?.totalTrackedSeconds ?? 0;
  const completionRate = insight?.completionRate ?? 0;
  const completedCount = insight?.totalTasksCompleted ?? 0;
  const overdueCount = insight?.totalTasksOverdue ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>数据洞察</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {weekStart.toLocaleDateString('zh-CN')} — {now.toLocaleDateString('zh-CN')}
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)' }}
        >
          <Download size={14} />导出周报
        </button>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Clock size={20} />,
            color: '#14B8A6',
            bg: 'rgba(20,184,166,0.1)',
            value: loading ? '—' : formatSeconds(totalTracked),
            label: '总追踪时间',
            trend: null,
          },
          {
            icon: <CheckCircle2 size={20} />,
            color: '#10B981',
            bg: 'rgba(16,185,129,0.1)',
            value: loading ? '—' : completedCount,
            label: '完成任务',
            trend: null,
          },
          {
            icon: <TrendingUp size={20} />,
            color: '#0EA5E9',
            bg: 'rgba(14,165,233,0.1)',
            value: loading ? '—' : `${completionRate}%`,
            label: '完成率',
            trend: completionRate >= 70 ? 'up' : completionRate >= 40 ? null : 'down',
          },
          {
            icon: <AlertTriangle size={20} />,
            color: '#F43F5E',
            bg: 'rgba(244,63,94,0.1)',
            value: loading ? '—' : overdueCount,
            label: '递期任务',
            trend: overdueCount > 0 ? 'down' : null,
          },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                {stat.icon}
              </div>
              {stat.trend && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: stat.trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                    color: stat.trend === 'up' ? '#10B981' : '#F43F5E',
                  }}
                >
                  {stat.trend === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {stat.trend === 'up' ? '良好' : '注意'}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold" style={{ color: '#F1F5F9' }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bar Chart */}
        <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <h3 className="text-sm font-semibold mb-6" style={{ color: '#F1F5F9' }}>每日时间分布</h3>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl" style={{ background: '#1E293B' }} />
          ) : timeByDay.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#64748B' }}>暂无数据</p>
            </div>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {timeByDay.map((day, i) => {
                const pct = maxDaySeconds > 0 ? (day.seconds / maxDaySeconds) * 100 : 0;
                const d = new Date(day.date);
                const isToday = d.toDateString() === now.toDateString();
                const barHeight = Math.max(pct * 1.4, day.seconds > 0 ? 8 : 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    {day.seconds > 0 && (
                      <span className="text-xs font-mono" style={{ color: isToday ? '#0EA5E9' : '#64748B', fontSize: 10 }}>
                        {formatSeconds(day.seconds)}
                      </span>
                    )}
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg transition-all duration-500"
                        style={{
                          height: `${barHeight}px`,
                          background: isToday
                            ? 'linear-gradient(180deg, #0EA5E9, #14B8A6)'
                            : day.seconds > 0 ? '#1E293B' : '#0F172A',
                          minHeight: 4,
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: isToday ? '#0EA5E9' : '#64748B' }}>
                      {DAY_LABELS[d.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Time Distribution */}
        <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#F1F5F9' }}>项目时间占比</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg" style={{ background: '#1E293B' }} />
              ))}
            </div>
          ) : (insight?.timeByProject ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <BarChart2 size={32} style={{ color: '#1E293B' }} className="mb-2" />
              <p className="text-sm" style={{ color: '#64748B' }}>暂无项目时间数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(insight?.timeByProject ?? []).map((p, i) => {
                const pct = totalTracked > 0 ? Math.round((p.seconds / totalTracked) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.projectColor }} />
                        <span className="text-sm truncate" style={{ color: '#F1F5F9' }}>{p.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs" style={{ color: '#64748B' }}>{pct}%</span>
                        <span className="text-sm font-mono" style={{ color: '#F1F5F9' }}>{formatSeconds(p.seconds)}</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: '#1E293B' }}>
                      <div className="h-2 rounded-full transition-all duration-500" style={{
                        width: `${(p.seconds / maxProjectSeconds) * 100}%`,
                        background: p.projectColor,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      {insight?.aiInsight && (
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)' }}>
              <Zap size={18} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6366F1' }}>智能洞察</p>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{insight.aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            emoji: '🎯',
            title: '任务完成率',
            value: `${completionRate}%`,
            desc: completionRate >= 70 ? '表现优秀，继续保持！' : completionRate >= 40 ? '还有提升空间' : '建议检查任务分配',
            color: completionRate >= 70 ? '#10B981' : completionRate >= 40 ? '#F59E0B' : '#F43F5E',
          },
          {
            emoji: '⏱️',
            title: '日均追踪时间',
            value: formatSeconds(Math.floor(totalTracked / 7)),
            desc: totalTracked > 0 ? '每日工作时间平均分布' : '开始记录时间',
            color: '#14B8A6',
          },
          {
            emoji: '📊',
            title: '递期任务',
            value: `${overdueCount} 项`,
            desc: overdueCount === 0 ? '太棒了！没有递期任务' : '建议优先处理递期任务',
            color: overdueCount === 0 ? '#10B981' : '#F43F5E',
          },
        ].map((tip, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{tip.emoji}</span>
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>{tip.title}</span>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: tip.color }}>{tip.value}</p>
            <p className="text-xs" style={{ color: '#64748B' }}>{tip.desc}</p>
          </div>
        ))}
      </div>

      {/* Report Export Banner */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #111827, #0A0F1E)', border: '1px solid #1E293B' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)' }}>
            <BarChart2 size={22} color="white" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>本周效率报告已生成</h3>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {weekStart.toLocaleDateString('zh-CN')} — {now.toLocaleDateString('zh-CN')} ·
              共追踪 {formatSeconds(totalTracked)} ·
              完成 {completedCount} 项任务
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="text-sm px-4 py-2.5 rounded-xl transition-all"
            style={{ border: '1px solid #1E293B', color: '#64748B' }}
            onClick={() => toast.info('报告预览', { description: '请使用导出功能下载报告' })}
          >
            预览报告
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)' }}
          >
            <Download size={14} />导出 PDF
          </button>
        </div>
      </div>
    </div>
  );
}
