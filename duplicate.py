from database import get_db_connection


def find_possible_duplicate(category, location):

    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, tracking_id, description, status
        FROM complaints
        WHERE category = ?
        AND location = ?
        AND status != 'RESOLVED'
        ORDER BY created_at DESC
        LIMIT 1
    """, (category, location))

    result = cursor.fetchone()

    connection.close()

    if result:
        return dict(result)

    return None