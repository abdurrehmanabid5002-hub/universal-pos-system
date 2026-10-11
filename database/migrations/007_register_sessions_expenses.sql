-- Migration 007: Register Sessions and Expenses
CREATE TABLE IF NOT EXISTS register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  register_id UUID NOT NULL,
  opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_cash NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  closed_at TIMESTAMPTZ,
  closing_cash NUMERIC(19,4),
  expected_cash NUMERIC(19,4),
  variance NUMERIC(19,4),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, register_id) REFERENCES registers(business_id, id) ON DELETE RESTRICT,
  CHECK ((closed_at IS NULL AND closed_by IS NULL) OR (closed_at IS NOT NULL AND closed_by IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_register_session ON register_sessions(register_id)
  WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS register_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  session_id UUID NOT NULL,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('opening_float', 'cash_sale', 'cash_refund', 'pay_in', 'pay_out', 'cash_drop')),
  amount NUMERIC(19,4) NOT NULL,
  reference_type VARCHAR(40),
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, session_id) REFERENCES register_sessions(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  expense_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('pending', 'recorded', 'voided')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses(business_id, expense_date DESC);
