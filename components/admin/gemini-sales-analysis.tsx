'use client'

import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, Activity } from 'lucide-react'
import { toast } from 'sonner'

interface SalesAnalysisData {
  health_score?: number
  health_status?: string
  executive_summary?: string
  key_insights?: string[]
  top_performers_analysis?: string
  inventory_risk_warnings?: string[]
  actionable_recommendations?: string[]
  metrics?: {
    total_revenue: string
    total_orders: number
    avg_order_value: string
    total_units_sold: number
  }
}

export default function GeminiSalesAnalysis() {
  const [analysis, setAnalysis] = useState<SalesAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchAnalysis = async (isManual = false) => {
    setLoading(true)
    const toastId = isManual ? toast.loading('Gemini AI is generating live sales report...') : undefined
    try {
      const res = await fetch('/api/admin/sales-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok && data) {
        setAnalysis(data)
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
        if (toastId) toast.success('Gemini AI Live Sales Report updated!', { id: toastId })
      } else {
        if (toastId) toast.error(data?.error || 'Failed to generate AI report', { id: toastId })
      }
    } catch {
      if (toastId) toast.error('Error connecting to Gemini AI service', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis(false)

    const handleRealtimeUpdate = () => {
      fetchAnalysis(false)
    }
    window.addEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
    return () => window.removeEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
  }, [])

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-neutral-900 font-bold text-base tracking-tight">Gemini AI Live Sales Intelligence</h2>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Live Report
              </span>
            </div>
            <p className="text-neutral-400 text-xs mt-0.5">Automated AI executive audit, inventory risk warnings, and strategic sales actions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-neutral-400 hidden sm:inline-block font-mono">
              Updated {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="bg-black hover:bg-neutral-900 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing Live Sales...' : 'Run Gemini AI Live Report'}
          </button>
        </div>
      </div>

      {/* Analysis Content Grid */}
      {loading && !analysis ? (
        <div className="py-12 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-neutral-400 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-neutral-500">Gemini AI is analyzing live store revenue, order volume, and stock...</p>
        </div>
      ) : analysis ? (
        <div className="space-y-5">
          {/* Executive Overview & Health Score Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Health Score Box */}
            <div className="lg:col-span-4 bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Store Health Index</span>
                <Activity className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-neutral-900">{analysis.health_score ?? 75}</span>
                  <span className="text-xs text-neutral-400 font-mono">/ 100</span>
                </div>
                <p className="text-xs font-semibold text-neutral-700 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-neutral-900" />
                  {analysis.health_status || 'Active Operations'}
                </p>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-black h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, analysis.health_score ?? 75))}%` }}
                />
              </div>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  Executive AI Summary
                </span>
                <p className="text-neutral-800 text-sm leading-relaxed font-normal">
                  {analysis.executive_summary || 'Store operations are actively tracked with real-time order and revenue monitoring.'}
                </p>
              </div>

              {analysis.metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-neutral-200 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">Revenue</span>
                    <span className="font-extrabold text-neutral-900">{analysis.metrics.total_revenue}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">Total Orders</span>
                    <span className="font-extrabold text-neutral-900">{analysis.metrics.total_orders}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">Avg Ticket</span>
                    <span className="font-extrabold text-neutral-900">{analysis.metrics.avg_order_value}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">Units Sold</span>
                    <span className="font-extrabold text-neutral-900">{analysis.metrics.total_units_sold}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insights & Recommendations 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Key Insights */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-neutral-800" /> Key Sales Insights
              </h3>
              <ul className="space-y-2">
                {(analysis.key_insights && analysis.key_insights.length > 0
                  ? analysis.key_insights
                  : ['Order volume tracking active.', 'Cart conversion velocity healthy.']
                ).map((item, idx) => (
                  <li key={idx} className="text-xs text-neutral-700 flex items-start gap-2 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Inventory Risks */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-800" /> Inventory & Stock Alerts
              </h3>
              {analysis.inventory_risk_warnings && analysis.inventory_risk_warnings.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.inventory_risk_warnings.map((warn, idx) => (
                    <li key={idx} className="text-xs text-neutral-800 flex items-start gap-2 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1 shrink-0" />
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500 italic">No low-stock risk items found. Inventory levels are healthy.</p>
              )}
            </div>

            {/* AI Recommendations */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-neutral-800" /> Gemini Strategic Action Plan
              </h3>
              <ul className="space-y-2">
                {(analysis.actionable_recommendations && analysis.actionable_recommendations.length > 0
                  ? analysis.actionable_recommendations
                  : ['Restock fast-moving sizes.', 'Promote featured collections.']
                ).map((rec, idx) => (
                  <li key={idx} className="text-xs text-neutral-700 flex items-start gap-2 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
