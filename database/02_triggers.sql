USE accesseats;

DROP TRIGGER IF EXISTS trg_after_order_insert;

DELIMITER //

CREATE TRIGGER trg_after_order_insert
AFTER INSERT ON ORDERS
FOR EACH ROW
BEGIN
    DECLARE user_note TEXT;

    SELECT delivery_assistance_note INTO user_note
    FROM USERS
    WHERE user_id = NEW.user_id;

    IF user_note IS NULL OR TRIM(user_note) = '' THEN
        SET user_note = 'No special assistance required';
    END IF;

    INSERT INTO DELIVERY_MANIFEST (order_id, rider_id, instructions, status)
    VALUES (NEW.order_id, NULL, user_note, 'Pending');
END //

DELIMITER ;