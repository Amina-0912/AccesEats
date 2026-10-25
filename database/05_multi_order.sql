USE accesseats;

DROP PROCEDURE IF EXISTS place_order_multi;

DELIMITER //

CREATE PROCEDURE place_order_multi(
    IN p_user_id INT,
    IN p_address_id INT,
    IN p_items JSON,
    OUT p_order_id INT
)
BEGIN
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_qty INT;
    DECLARE v_stock INT;
    DECLARE v_price DECIMAL(10, 2);
    DECLARE v_total DECIMAL(10, 2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_items IS NULL OR JSON_TYPE(p_items) <> 'ARRAY' OR JSON_LENGTH(p_items) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cart is empty or not a valid list.';
    END IF;

    START TRANSACTION;

    -- Create the order first (the trigger creates the delivery manifest)
    INSERT INTO ORDERS (user_id, address_id, status, total_amount)
    VALUES (p_user_id, p_address_id, 'Pending', 0.00);

    SET p_order_id = LAST_INSERT_ID();
    SET v_count = JSON_LENGTH(p_items);

    -- Process each cart item
    WHILE v_i < v_count DO
        SET v_product_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].product_id'))) AS UNSIGNED);
        SET v_qty        = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].quantity'))) AS UNSIGNED);
        SET v_stock = NULL;
        SET v_price = NULL;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Each item needs a quantity greater than zero.';
        END IF;

        -- Lock the product row so concurrent orders can't oversell
        SELECT stock, price INTO v_stock, v_price
        FROM PRODUCT
        WHERE product_id = v_product_id
        FOR UPDATE;

        IF v_stock IS NULL OR v_stock < v_qty THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient stock or product does not exist.';
        END IF;

        INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_product_id, v_qty, v_price);

        UPDATE PRODUCT
        SET stock = stock - v_qty
        WHERE product_id = v_product_id;

        SET v_total = v_total + (v_price * v_qty);
        SET v_i = v_i + 1;
    END WHILE;

    UPDATE ORDERS SET total_amount = v_total WHERE order_id = p_order_id;

    COMMIT;
END //

DELIMITER ;