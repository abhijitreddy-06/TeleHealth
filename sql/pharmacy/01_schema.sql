-- ============================================================
-- PHARMACY MARKETPLACE SCHEMA  (INTEGER PK edition)
-- Compatible with existing TeleHealth users table
-- Run in Supabase SQL Editor: 01 → 02 → 03
-- ============================================================
-- Assumes: users (id SERIAL PRIMARY KEY, phone, password, role, created_at)

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS pharmacy_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    image_url   TEXT,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharm_cat_slug   ON pharmacy_categories(slug);
CREATE INDEX idx_pharm_cat_active ON pharmacy_categories(is_active) WHERE is_active = TRUE;

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS pharmacy_products (
    id                    SERIAL PRIMARY KEY,
    category_id           INT NOT NULL REFERENCES pharmacy_categories(id) ON DELETE CASCADE,
    name                  VARCHAR(255) NOT NULL,
    slug                  VARCHAR(280) NOT NULL UNIQUE,
    description           TEXT,
    short_description     VARCHAR(500),
    price                 NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price      NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
    sku                   VARCHAR(50) NOT NULL UNIQUE,
    image_url             TEXT,
    manufacturer          VARCHAR(200),
    dosage_form           VARCHAR(100),
    strength              VARCHAR(100),
    pack_size             VARCHAR(100),
    prescription_required BOOLEAN DEFAULT FALSE,
    is_active             BOOLEAN DEFAULT TRUE,
    avg_rating            NUMERIC(2,1) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count          INT DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharm_prod_category     ON pharmacy_products(category_id);
CREATE INDEX idx_pharm_prod_slug         ON pharmacy_products(slug);
CREATE INDEX idx_pharm_prod_sku          ON pharmacy_products(sku);
CREATE INDEX idx_pharm_prod_active       ON pharmacy_products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pharm_prod_price        ON pharmacy_products(price);
CREATE INDEX idx_pharm_prod_prescription ON pharmacy_products(prescription_required);
CREATE INDEX idx_pharm_prod_rating       ON pharmacy_products(avg_rating DESC);
CREATE INDEX idx_pharm_prod_search       ON pharmacy_products
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 3. INVENTORY (1-to-1 with product)
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id                  SERIAL PRIMARY KEY,
    product_id          INT NOT NULL UNIQUE REFERENCES pharmacy_products(id) ON DELETE CASCADE,
    stock_quantity      INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INT DEFAULT 10,
    reorder_quantity    INT DEFAULT 50,
    last_restocked      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharm_inv_product   ON pharmacy_inventory(product_id);
CREATE INDEX idx_pharm_inv_low_stock ON pharmacy_inventory(stock_quantity) WHERE stock_quantity <= 10;

-- 4. CART (one active cart per user)
CREATE TABLE IF NOT EXISTS pharmacy_carts (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_pharm_cart_user_active ON pharmacy_carts(user_id) WHERE status = 'active';
CREATE INDEX idx_pharm_cart_user ON pharmacy_carts(user_id);

-- 5. CART ITEMS
CREATE TABLE IF NOT EXISTS pharmacy_cart_items (
    id         SERIAL PRIMARY KEY,
    cart_id    INT NOT NULL REFERENCES pharmacy_carts(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
    quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cart_id, product_id)
);

CREATE INDEX idx_pharm_ci_cart    ON pharmacy_cart_items(cart_id);
CREATE INDEX idx_pharm_ci_product ON pharmacy_cart_items(product_id);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id                    SERIAL PRIMARY KEY,
    order_number          VARCHAR(20) NOT NULL UNIQUE,
    user_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status                VARCHAR(30) DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','returned')),
    subtotal              NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount       NUMERIC(10,2) DEFAULT 0   CHECK (discount_amount >= 0),
    shipping_fee          NUMERIC(10,2) DEFAULT 0   CHECK (shipping_fee >= 0),
    tax_amount            NUMERIC(10,2) DEFAULT 0   CHECK (tax_amount >= 0),
    total_amount          NUMERIC(10,2) NOT NULL     CHECK (total_amount >= 0),
    shipping_name         VARCHAR(200),
    shipping_phone        VARCHAR(20),
    shipping_address      TEXT,
    shipping_city         VARCHAR(100),
    shipping_state        VARCHAR(100),
    shipping_pincode      VARCHAR(10),
    notes                 TEXT,
    prescription_verified BOOLEAN DEFAULT FALSE,
    cancelled_reason      TEXT,
    delivered_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharm_ord_user    ON pharmacy_orders(user_id);
CREATE INDEX idx_pharm_ord_status  ON pharmacy_orders(status);
CREATE INDEX idx_pharm_ord_number  ON pharmacy_orders(order_number);
CREATE INDEX idx_pharm_ord_created ON pharmacy_orders(created_at DESC);

-- 7. ORDER ITEMS (snapshot of product at purchase time)
CREATE TABLE IF NOT EXISTS pharmacy_order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES pharmacy_orders(id)  ON DELETE CASCADE,
    product_id    INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE RESTRICT,
    product_name  VARCHAR(255) NOT NULL,
    product_image TEXT,
    quantity      INT NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price   NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharm_oi_order   ON pharmacy_order_items(order_id);
CREATE INDEX idx_pharm_oi_product ON pharmacy_order_items(product_id);

-- 8. REVIEWS
CREATE TABLE IF NOT EXISTS pharmacy_reviews (
    id          SERIAL PRIMARY KEY,
    product_id  INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id    INT REFERENCES pharmacy_orders(id) ON DELETE SET NULL,
    rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title       VARCHAR(200),
    comment     TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_visible  BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, user_id)
);

CREATE INDEX idx_pharm_rev_product ON pharmacy_reviews(product_id);
CREATE INDEX idx_pharm_rev_user    ON pharmacy_reviews(user_id);
CREATE INDEX idx_pharm_rev_rating  ON pharmacy_reviews(rating);
CREATE INDEX idx_pharm_rev_visible ON pharmacy_reviews(is_visible) WHERE is_visible = TRUE;

-- 9. WISHLIST
CREATE TABLE IF NOT EXISTS pharmacy_wishlist (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_pharm_wish_user    ON pharmacy_wishlist(user_id);
CREATE INDEX idx_pharm_wish_product ON pharmacy_wishlist(product_id);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-generate order number: PH-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_pharmacy_order_number()
RETURNS TRIGGER AS $$
DECLARE seq_num INT;
BEGIN
    SELECT COUNT(*) + 1 INTO seq_num
    FROM pharmacy_orders WHERE created_at::DATE = CURRENT_DATE;
    NEW.order_number := 'PH-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharmacy_order_number
    BEFORE INSERT ON pharmacy_orders
    FOR EACH ROW WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_pharmacy_order_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION pharmacy_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharm_cat_ts    BEFORE UPDATE ON pharmacy_categories FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_prod_ts   BEFORE UPDATE ON pharmacy_products   FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_inv_ts    BEFORE UPDATE ON pharmacy_inventory  FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_cart_ts   BEFORE UPDATE ON pharmacy_carts      FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_ci_ts     BEFORE UPDATE ON pharmacy_cart_items FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_ord_ts    BEFORE UPDATE ON pharmacy_orders     FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();
CREATE TRIGGER trg_pharm_rev_ts    BEFORE UPDATE ON pharmacy_reviews    FOR EACH ROW EXECUTE FUNCTION pharmacy_set_updated_at();

-- Auto-update product avg_rating & review_count
CREATE OR REPLACE FUNCTION pharmacy_update_product_rating()
RETURNS TRIGGER AS $$
DECLARE target_id INT;
BEGIN
    target_id := COALESCE(NEW.product_id, OLD.product_id);
    UPDATE pharmacy_products SET
        avg_rating = COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM pharmacy_reviews WHERE product_id = target_id AND is_visible = TRUE), 0),
        review_count = (SELECT COUNT(*) FROM pharmacy_reviews WHERE product_id = target_id AND is_visible = TRUE)
    WHERE id = target_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharm_review_rating
    AFTER INSERT OR UPDATE OR DELETE ON pharmacy_reviews
    FOR EACH ROW EXECUTE FUNCTION pharmacy_update_product_rating();

-- Decrement stock: pending → confirmed
CREATE OR REPLACE FUNCTION pharmacy_decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        UPDATE pharmacy_inventory inv SET stock_quantity = inv.stock_quantity - oi.quantity, updated_at = now()
        FROM pharmacy_order_items oi WHERE oi.order_id = NEW.id AND inv.product_id = oi.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharm_decrement_stock
    AFTER UPDATE ON pharmacy_orders FOR EACH ROW EXECUTE FUNCTION pharmacy_decrement_stock();

-- Restore stock: cancelled
CREATE OR REPLACE FUNCTION pharmacy_restore_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'processing') THEN
        UPDATE pharmacy_inventory inv SET stock_quantity = inv.stock_quantity + oi.quantity, updated_at = now()
        FROM pharmacy_order_items oi WHERE oi.order_id = NEW.id AND inv.product_id = oi.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharm_restore_stock
    AFTER UPDATE ON pharmacy_orders FOR EACH ROW EXECUTE FUNCTION pharmacy_restore_stock();
