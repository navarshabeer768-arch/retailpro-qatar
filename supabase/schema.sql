-- ============================================================
-- RetailPro Qatar - Supabase Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL DEFAULT 'RetailPro Store',
  store_name_ar TEXT,
  currency TEXT NOT NULL DEFAULT 'QAR',
  monthly_target NUMERIC(12,2) DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  timezone TEXT DEFAULT 'Asia/Qatar',
  language TEXT DEFAULT 'en',
  dark_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO settings (store_name, currency) VALUES ('RetailPro Store', 'QAR') ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMISSION RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'tiered')),
  fixed_rate NUMERIC(5,2),
  tiers JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default commission rule
INSERT INTO commission_rules (name, type, tiers) VALUES (
  'Default Tiered Commission',
  'tiered',
  '[{"min_sales":0,"max_sales":10000,"rate":1},{"min_sales":10001,"max_sales":20000,"rate":2},{"min_sales":20001,"rate":3}]'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- STAFF TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position TEXT NOT NULL DEFAULT 'Sales Staff',
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAILY SALES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) GENERATED ALWAYS AS (cash_sales + card_sales + credit_sales) STORED,
  customers_served INT DEFAULT 0,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, sale_date)
);

-- ============================================================
-- OPENING STOCK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS opening_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INT NOT NULL DEFAULT 0,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, stock_date)
);

-- ============================================================
-- CLOSING STOCK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS closing_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_quantity INT NOT NULL DEFAULT 0,
  closing_quantity INT NOT NULL DEFAULT 0,
  sold_quantity INT GENERATED ALWAYS AS (opening_quantity - closing_quantity) STORED,
  variance INT NOT NULL DEFAULT 0,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, stock_date)
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('rent','electricity','water','internet','transportation','miscellaneous')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

-- ============================================================
-- SALARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  total_salary NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + commission_earned + bonus - deductions) STORED,
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('sales_submitted','low_stock','target_achieved')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER ROLES TABLE (maps auth.users to roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get staff_id for current user
CREATE OR REPLACE FUNCTION get_user_staff_id(uid UUID)
RETURNS UUID AS $$
  SELECT staff_id FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- SETTINGS policies
CREATE POLICY "Owner can manage settings" ON settings
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can read settings" ON settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- STAFF policies
CREATE POLICY "Owner can manage staff" ON staff
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can read own record" ON staff
  FOR SELECT USING (id = get_user_staff_id(auth.uid()));

-- PRODUCTS policies
CREATE POLICY "Owner can manage products" ON products
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can read products" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- DAILY SALES policies
CREATE POLICY "Owner can view all sales" ON daily_sales
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can manage own sales" ON daily_sales
  FOR ALL USING (staff_id = get_user_staff_id(auth.uid()));

-- OPENING STOCK policies
CREATE POLICY "Owner can manage opening stock" ON opening_stock
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can read opening stock" ON opening_stock
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- CLOSING STOCK policies
CREATE POLICY "Owner can view all closing stock" ON closing_stock
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Auth users can insert closing stock" ON closing_stock
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- EXPENSES policies
CREATE POLICY "Owner can manage expenses" ON expenses
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- COMMISSION RULES policies
CREATE POLICY "Owner can manage commission rules" ON commission_rules
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can read commission rules" ON commission_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- COMMISSIONS policies
CREATE POLICY "Owner can view all commissions" ON commissions
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can view own commissions" ON commissions
  FOR SELECT USING (staff_id = get_user_staff_id(auth.uid()));

-- SALARIES policies
CREATE POLICY "Owner can manage salaries" ON salaries
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "Staff can view own salary" ON salaries
  FOR SELECT USING (staff_id = get_user_staff_id(auth.uid()));

-- NOTIFICATIONS policies
CREATE POLICY "Owner can manage notifications" ON notifications
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- AUDIT LOGS policies
CREATE POLICY "Owner can view audit logs" ON audit_logs
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');

-- USER ROLES policies
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can manage roles" ON user_roles
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update product current_stock when closing stock is recorded
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET current_stock = NEW.closing_quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER closing_stock_update_product AFTER INSERT OR UPDATE ON closing_stock
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ============================================================
-- SEED DATA (sample products)
-- ============================================================
INSERT INTO products (name, sku, category, unit, cost_price, sell_price, current_stock, low_stock_threshold) VALUES
  ('Product A', 'SKU-001', 'Category 1', 'pcs', 50, 100, 150, 20),
  ('Product B', 'SKU-002', 'Category 1', 'pcs', 80, 150, 80, 15),
  ('Product C', 'SKU-003', 'Category 2', 'pcs', 30, 60, 5, 10),
  ('Product D', 'SKU-004', 'Category 2', 'box', 200, 350, 200, 30)
ON CONFLICT DO NOTHING;
