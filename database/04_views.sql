USE accesseats;

-- Report 1: Revenue per category (cancelled orders excluded)
CREATE OR REPLACE VIEW view_revenue_per_category AS
SELECT
    c.category_id,
    c.name AS category_name,
    COALESCE(SUM(CASE WHEN o.status <> 'Cancelled'
                      THEN oi.quantity * oi.unit_price
                      ELSE 0 END), 0.00) AS total_revenue
FROM CATEGORY c
LEFT JOIN PRODUCT p     ON c.category_id = p.category_id
LEFT JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
LEFT JOIN ORDERS o      ON oi.order_id = o.order_id
GROUP BY c.category_id, c.name;

-- Report 2: Deliveries with no rider assigned yet (delivered ones excluded)
CREATE OR REPLACE VIEW view_pending_deliveries AS
SELECT
    m.manifest_id,
    m.order_id,
    m.instructions,
    m.status AS manifest_status,
    o.order_date,
    u.name AS customer_name,
    u.phone AS customer_phone,
    CONCAT(a.street, ', ', a.city, ' - ', a.pincode) AS delivery_address
FROM DELIVERY_MANIFEST m
JOIN ORDERS o  ON m.order_id = o.order_id
JOIN USERS u   ON o.user_id = u.user_id
JOIN ADDRESS a ON o.address_id = a.address_id
WHERE m.rider_id IS NULL
  AND m.status <> 'Delivered';