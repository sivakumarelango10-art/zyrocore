import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const apiKey = process.env.GEMINI_API_KEY?.trim() || ''

    // Fetch live statistics from PostgreSQL database
    const [
      [summary],
      ordersByStatus,
      topProducts,
      lowStockProducts,
      recentOrders
    ] = await Promise.all([
      sql`
        SELECT
          COALESCE((SELECT SUM(total) FROM orders WHERE status != 'cancelled'), 0) AS total_revenue,
          COALESCE((SELECT SUM(total) FROM orders WHERE status = 'delivered'), 0) AS delivered_revenue,
          (SELECT COUNT(*) FROM orders) AS total_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS delivered_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') AS cancelled_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'pending' OR status = 'confirmed') AS active_orders,
          (SELECT COUNT(*) FROM users WHERE role = 'user') AS total_customers,
          (SELECT COUNT(*) FROM products) AS total_products,
          (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled') AS total_units_sold
      `,
      sql`SELECT status, COUNT(*) as count FROM orders GROUP BY status`,
      sql`
        SELECT p.id, p.name, SUM(oi.quantity) as units_sold, SUM(oi.price * oi.quantity) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY p.id, p.name
        ORDER BY units_sold DESC
        LIMIT 5
      `,
      sql`SELECT id, name, stock, size_stock FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 5`,
      sql`
        SELECT o.id, o.status, o.total, o.created_at, u.name as customer_name
        FROM orders o LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC LIMIT 5
      `
    ])

    const totalRevenue = parseFloat(summary.total_revenue)
    const totalOrders = parseInt(summary.total_orders)
    const totalUnitsSold = parseInt(summary.total_units_sold)
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0'

    const metricsPayload = {
      total_revenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
      total_orders: totalOrders,
      active_orders: parseInt(summary.active_orders),
      delivered_orders: parseInt(summary.delivered_orders),
      cancelled_orders: parseInt(summary.cancelled_orders),
      avg_order_value: `₹${avgOrderValue}`,
      total_units_sold: totalUnitsSold,
      total_customers: parseInt(summary.total_customers),
      orders_by_status: ordersByStatus,
      top_performing_products: topProducts.map(p => ({
        name: p.name,
        units_sold: parseInt(p.units_sold),
        revenue: `₹${parseFloat(p.total_revenue).toLocaleString('en-IN')}`
      })),
      low_stock_alerts: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock
      }))
    }

    const systemInstruction = `You are Gemini AI Senior Retail & Financial Analyst for ZYRØCORE — an ambitious minimalist e-commerce fashion brand.
Analyze the live sales metrics and inventory data provided. Generate a high-level strategic sales intelligence report in clean JSON format.

Return ONLY a valid JSON object matching this exact schema without markdown wrappers or conversational filler:
{
  "health_score": 88,
  "health_status": "Strong Growth / Excellent Momentum",
  "executive_summary": "Concise 2-3 sentence overview analyzing store revenue velocity, order completion rates, and average cart size.",
  "key_insights": [
    "Insight 1 regarding sales trend or order volume",
    "Insight 2 regarding customer retention or ticket size",
    "Insight 3 regarding inventory velocity"
  ],
  "top_performers_analysis": "Brief analysis of the top moving items and customer preferences.",
  "inventory_risk_warnings": [
    "Alert regarding any low stock items needing immediate reorder"
  ],
  "actionable_recommendations": [
    "Action item 1 (e.g., restock strategy, marketing push, bundle offer)",
    "Action item 2 (e.g., checkout conversion optimization)",
    "Action item 3 (e.g., high-margin campaign strategy)"
  ]
}`

    const userPrompt = `Here is the current real-time sales and inventory dataset for ZYRØCORE:
${JSON.stringify(metricsPayload, null, 2)}`

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro']
    let aiResponseText = ''

    if (apiKey) {
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json',
              },
            }),
          })

          if (res.ok) {
            const json = await res.json()
            const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text
            if (candidateText) {
              aiResponseText = candidateText
              break
            }
          }
        } catch (e) {
          console.warn(`[Gemini AI Sales Analysis] Model ${model} failed, trying next...`, e)
        }
      }
    }

    if (!aiResponseText) {
      // Dynamic fallback based on live metrics
      const healthScore = totalOrders > 0 ? (totalRevenue > 50000 ? 92 : 82) : 75
      return NextResponse.json({
        health_score: healthScore,
        health_status: totalOrders > 0 ? 'Healthy Sales Velocity & Strong Order Flow' : 'Awaiting Initial Sales Traction',
        executive_summary: `ZYRØCORE has generated ₹${totalRevenue.toLocaleString('en-IN')} across ${totalOrders} total orders with an Average Order Value of ₹${avgOrderValue}. Customer acquisition stands at ${summary.total_customers} registered users with ${summary.active_orders} active orders currently processing.`,
        key_insights: [
          `Order volume reached ${totalOrders} orders with ${totalUnitsSold} total units sold.`,
          `Average Order Value is solid at ₹${avgOrderValue}.`,
          lowStockProducts.length > 0
            ? `${lowStockProducts.length} product(s) are currently flagged with low stock levels.`
            : 'All product inventory stock levels are currently healthy.'
        ],
        top_performers_analysis: topProducts.length > 0
          ? `Top selling product is "${topProducts[0].name}" with ${topProducts[0].units_sold} units sold.`
          : 'Catalog is primed for new product listings.',
        inventory_risk_warnings: lowStockProducts.map(p => `Product #${p.id} (${p.name}) has only ${p.stock} unit(s) remaining in stock.`),
        actionable_recommendations: [
          'Restock low-inventory items immediately to prevent out-of-stock bounce rates.',
          'Launch a targeted marketing campaign for top-performing oversized collections.',
          'Consider introducing free shipping thresholds to increase Average Order Value.'
        ],
        metrics: metricsPayload
      })
    }

    let cleanJsonStr = aiResponseText.trim()
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/```$/, '').trim()
    }

    try {
      const parsed = JSON.parse(cleanJsonStr)
      return NextResponse.json({ ...parsed, metrics: metricsPayload })
    } catch {
      return NextResponse.json({
        health_score: 85,
        health_status: 'Active Sales Operations',
        executive_summary: aiResponseText,
        key_insights: ['Sales performance tracking active'],
        top_performers_analysis: 'Performance data logged',
        inventory_risk_warnings: [],
        actionable_recommendations: ['Monitor daily checkout volume'],
        metrics: metricsPayload
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
    }
    console.error('[sales-analysis] Error:', error)
    return NextResponse.json({ error: 'Failed to generate AI Sales Analysis' }, { status: 500 })
  }
}
