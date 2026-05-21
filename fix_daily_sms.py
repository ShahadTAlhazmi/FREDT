import sqlite3

conn = sqlite3.connect("users.db")
c = conn.cursor()


def add_column_if_missing(table, column, ddl):
    c.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in c.fetchall()]

    if column not in cols:
        c.execute(ddl)
        print(f"Added {table}.{column}")
    else:
        print(f"Already exists {table}.{column}")


add_column_if_missing(
    "daily_sms",
    "count",
    "ALTER TABLE daily_sms ADD COLUMN count INTEGER DEFAULT 1"
)

add_column_if_missing(
    "report_sms",
    "sms_count",
    "ALTER TABLE report_sms ADD COLUMN sms_count INTEGER DEFAULT 1"
)

add_column_if_missing(
    "report_sms",
    "sent_at",
    "ALTER TABLE report_sms ADD COLUMN sent_at TEXT DEFAULT ''"
)

add_column_if_missing(
    "report_sms",
    "sms_status",
    "ALTER TABLE report_sms ADD COLUMN sms_status TEXT DEFAULT 'Sent'"
)

conn.commit()
conn.close()

print("Migration done")