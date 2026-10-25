USE accesseats;

DROP PROCEDURE IF EXISTS place_order;

DELIMITER //

CREATE PROCEDURE place_order(
    IN p_user_id INT,
    IN p_address_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    OUT p_order_id INT
)
BEGIN
    DECLARE v_stock INT DEFAULT NULL;
    DECLARE v_unit_price DECIMAL(10, 2) DEFAULT NULL;
    DECLARE v_total DECIMAL(10, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
    END IF;

    START TRANSACTION;

    -- Lock the product row so concurrent orders can't oversell
    SELECT stock, price INTO v_stock, v_unit_price
    FROM PRODUCT
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF v_stock IS NULL OR v_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock or product does not exist.';
    END IF;

    SET v_total = v_unit_price * p_quantity;

    INSERT INTO ORDERS (user_id, address_id, status, total_amount)
    VALUES (p_user_id, p_address_id, 'Pending', v_total);

    SET p_order_id = LAST_INSERT_ID();

    INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price)
    VALUES (p_order_id, p_product_id, p_quantity, v_unit_price);

    UPDATE PRODUCT
    SET stock = stock - p_quantity
    WHERE product_id = p_product_id;

    COMMIT;
END //

DELIMITER ;