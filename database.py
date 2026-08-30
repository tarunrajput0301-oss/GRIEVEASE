import sqlite3
from config import DATABASE_PATH


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)

    # Allows us to access columns by name
    connection.row_factory = sqlite3.Row

    return connection


def init_database():

    connection = get_db_connection()

    cursor = connection.cursor()

    # -----------------------------
    # COMPLAINTS TABLE
    # -----------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            tracking_id TEXT UNIQUE NOT NULL,

            citizen_name TEXT NOT NULL,
            citizen_contact TEXT NOT NULL,

            description TEXT NOT NULL,
            location TEXT NOT NULL,

            category TEXT,
            severity TEXT,
            confidence REAL,

            department TEXT,
            officer_id INTEGER,

            priority TEXT DEFAULT 'MEDIUM',
            priority_score INTEGER DEFAULT 0,

            status TEXT DEFAULT 'REGISTERED',

            evidence_path TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # -----------------------------
    # STATUS HISTORY
    # -----------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            complaint_id INTEGER NOT NULL,

            status TEXT NOT NULL,
            remarks TEXT,

            timestamp TEXT NOT NULL,

            FOREIGN KEY (complaint_id)
            REFERENCES complaints(id)
        )
    """)

    # -----------------------------
    # OFFICERS
    # -----------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS officers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,
            department TEXT NOT NULL,
            email TEXT
        )
    """)

    # -----------------------------
    # DEPARTMENTS
    # -----------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT UNIQUE NOT NULL
        )
    """)

    connection.commit()

    connection.close()


if __name__ == "__main__":
    init_database()
    print("Database initialized successfully.")