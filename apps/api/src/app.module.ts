import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RegistersModule } from './modules/registers/registers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { IndustryModule } from './modules/industry/industry.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BusinessesModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    RegistersModule,
    SalesModule,
    ReturnsModule,
    PurchasingModule,
    CustomersModule,
    ExpensesModule,
    ReportsModule,
    AuditModule,
    IndustryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
