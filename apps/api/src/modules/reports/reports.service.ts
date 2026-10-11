import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getSalesReport(
    businessId: string,
    query: { branchId?: string; fromDate?: string; toDate?: string } = {}
  ) {
    const conditions = [`s.business_id = $1`, `s.status = 'completed'`];
    const params: any[] = [businessId];

    if (query.branchId) {
      params.push(query.branchId);
      conditions.push(`s.branch_id = $${params.length}`);
    }
    if (query.fromDate) {
      params.push(query.fromDate);
      conditions.push(`s.created_at >= $${params.length}::timestamptz`);
    }
    if (query.toDate) {
      params.push(query.toDate);
      conditions.push(`s.created_at <= $${params.length}::timestamptz`);
    }

    const whereClause = conditions.join(' AND ');

    // Aggregates
    const aggRes = await this.db.query(
      `SELECT
         COUNT(id) as total_sales_count,
         COALESCE(SUM(subtotal), 0) as total_subtotal,
         COALESCE(SUM(discount_total), 0) as total_discounts,
         COALESCE(SUM(tax_total), 0) as total_taxes,
         COALESCE(SUM(grand_total), 0) as total_revenue
       FROM sales s
       WHERE ${whereClause}`,
      params
    );
    const agg = aggRes.rows[0];

    // Payment methods breakdown
    const payRes = await this.db.query(
      `SELECT p.payment_method, COALESCE(SUM(p.amount), 0) as total_amount, COUNT(p.id) as payment_count
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       WHERE ${whereClause} AND p.status = 'succeeded'
       GROUP BY p.payment_method`,
      params
    );

    // Top selling items
    const topRes = await this.db.query(
      `SELECT si.product_name_snapshot, si.sku_snapshot,
              COALESCE(SUM(si.quantity), 0) as quantity_sold,
              COALESCE(SUM(si.line_total), 0) as total_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE ${whereClause}
       GROUP BY si.product_name_snapshot, si.sku_snapshot
       ORDER BY quantity_sold DESC
       LIMIT 10`,
      params
    );

    return {
      totalSalesCount: parseInt(agg.total_sales_count, 10),
      totalSubtotal: DecimalMath.roundTo(agg.total_subtotal, 2),
      totalDiscounts: DecimalMath.roundTo(agg.total_discounts, 2),
      totalTaxes: DecimalMath.roundTo(agg.total_taxes, 2),
      totalRevenue: DecimalMath.roundTo(agg.total_revenue, 2),
      paymentBreakdown: payRes.rows,
      topSellingItems: topRes.rows,
    };
  }

  async getInventoryReport(businessId: string, branchId?: string) {
    const params: any[] = [businessId];
    let branchFilter = '';
    if (branchId) {
      params.push(branchId);
      branchFilter = ` AND l.branch_id = $2`;
    }

    const res = await this.db.query(
      `SELECT
         COUNT(DISTINCT p.id) as total_products,
         COALESCE(SUM(b.quantity_on_hand), 0) as total_units,
         COALESCE(SUM(b.quantity_on_hand * p.cost_price), 0) as valuation_cost,
         COALESCE(SUM(b.quantity_on_hand * p.selling_price), 0) as valuation_retail
       FROM inventory_balances b
       JOIN products p ON p.id = b.product_id
       JOIN inventory_locations l ON l.id = b.location_id
       WHERE b.business_id = $1 ${branchFilter}`,
      params
    );
    const row = res.rows[0];

    // Low stock items (< 10 units)
    const lowRes = await this.db.query(
      `SELECT p.id, p.name, p.sku, COALESCE(SUM(b.quantity_on_hand), 0) as quantity_on_hand
       FROM products p
       LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.business_id = p.business_id
       LEFT JOIN inventory_locations l ON l.id = b.location_id
       WHERE p.business_id = $1 AND p.tracks_inventory = true ${branchFilter}
       GROUP BY p.id, p.name, p.sku
       HAVING COALESCE(SUM(b.quantity_on_hand), 0) <= 10
       ORDER BY quantity_on_hand ASC
       LIMIT 20`,
      params
    );

    return {
      totalProducts: parseInt(row.total_products, 10),
      totalUnits: DecimalMath.roundTo(row.total_units, 2),
      valuationCost: DecimalMath.roundTo(row.valuation_cost, 2),
      valuationRetail: DecimalMath.roundTo(row.valuation_retail, 2),
      lowStockItems: lowRes.rows,
    };
  }

  async getProfitReport(
    businessId: string,
    query: { branchId?: string; fromDate?: string; toDate?: string } = {}
  ) {
    const conditions = [`s.business_id = $1`, `s.status = 'completed'`];
    const params: any[] = [businessId];

    if (query.branchId) {
      params.push(query.branchId);
      conditions.push(`s.branch_id = $${params.length}`);
    }
    if (query.fromDate) {
      params.push(query.fromDate);
      conditions.push(`s.created_at >= $${params.length}::timestamptz`);
    }
    if (query.toDate) {
      params.push(query.toDate);
      conditions.push(`s.created_at <= $${params.length}::timestamptz`);
    }

    const whereClause = conditions.join(' AND ');

    // Revenue and COGS
    const profitRes = await this.db.query(
      `SELECT
         COALESCE(SUM(si.line_total), 0) as total_revenue,
         COALESCE(SUM(si.quantity * si.unit_cost_snapshot), 0) as total_cogs
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE ${whereClause}`,
      params
    );
    const { total_revenue, total_cogs } = profitRes.rows[0];

    const grossProfit = DecimalMath.subtract(total_revenue, total_cogs);
    let grossMarginPct = '0.00';
    if (!DecimalMath.isZero(total_revenue)) {
      grossMarginPct = DecimalMath.roundTo(
        DecimalMath.multiply(
          DecimalMath.divide(grossProfit, total_revenue),
          '100.0000'
        ),
        2
      );
    }

    // Expenses
    const expParams: any[] = [businessId];
    let expWhere = `business_id = $1 AND status = 'recorded'`;
    if (query.branchId) {
      expParams.push(query.branchId);
      expWhere += ` AND branch_id = $2`;
    }
    if (query.fromDate) {
      expParams.push(query.fromDate);
      expWhere += ` AND expense_date >= $${expParams.length}::date`;
    }
    if (query.toDate) {
      expParams.push(query.toDate);
      expWhere += ` AND expense_date <= $${expParams.length}::date`;
    }

    const expRes = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE ${expWhere}`,
      expParams
    );
    const totalExpenses = expRes.rows[0].total_expenses;
    const netProfit = DecimalMath.subtract(grossProfit, totalExpenses);

    return {
      revenue: DecimalMath.roundTo(total_revenue, 2),
      cogs: DecimalMath.roundTo(total_cogs, 2),
      grossProfit: DecimalMath.roundTo(grossProfit, 2),
      grossMarginPercentage: grossMarginPct,
      operatingExpenses: DecimalMath.roundTo(totalExpenses, 2),
      netProfit: DecimalMath.roundTo(netProfit, 2),
    };
  }
}
