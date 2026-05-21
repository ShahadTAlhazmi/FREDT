import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_NAME = 'users.db'


# =====================================================
# CONNECTION
# =====================================================
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


# =====================================================
# MIGRATION HELPERS
# =====================================================
def _migrate_add_column(conn, table, column, col_def):
    c = conn.cursor()
    c.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in c.fetchall()]
    if column not in columns:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        conn.commit()
        print(f"[DB MIGRATION] Added column '{column}' to '{table}'")


# =====================================================
# INIT DB
# =====================================================
def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    # ---------------- supervisors ----------------
    c.execute('''
        CREATE TABLE IF NOT EXISTS supervisors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT NOT NULL,
            joined_date TEXT NOT NULL,
            last_active TEXT NOT NULL,
            phone TEXT DEFAULT '',
            corridor TEXT DEFAULT 'None'
        )
    ''')

    # ---------------- reports ----------------
    c.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            shop_name TEXT NOT NULL,
            exit_name TEXT,
            corridors TEXT,
            fire_corridor TEXT DEFAULT 'None',
            total_people INTEGER DEFAULT 0,
            shop_people INTEGER DEFAULT 0
        )
    ''')

    # migrations (safe upgrades)
    _migrate_add_column(conn, 'reports', 'total_people', 'INTEGER DEFAULT 0')
    _migrate_add_column(conn, 'reports', 'shop_people', 'INTEGER DEFAULT 0')
    _migrate_add_column(conn, 'reports', 'fire_corridor', 'TEXT DEFAULT "None"')

    # ---------------- daily sms ----------------
    c.execute('''
        CREATE TABLE IF NOT EXISTS daily_sms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            count INTEGER DEFAULT 1,
            UNIQUE(user_id, date)
        )
    ''')

    _migrate_add_column(conn, 'daily_sms', 'count', 'INTEGER DEFAULT 1')


    # ---------------- report sms ----------------
    # Incident reports logic
    c.execute('''
        CREATE TABLE IF NOT EXISTS report_sms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            sent_at TEXT NOT NULL,
            sms_count INTEGER DEFAULT 1,
            UNIQUE(report_id, user_id)
        )
    ''')

    # ---------------- default admin ----------------
    c.execute("""
        SELECT * FROM supervisors 
        WHERE role='Super Admin' AND email='admin'
    """)
    if c.fetchone() is None:
        hashed = generate_password_hash('admin123')
        c.execute('''
            INSERT INTO supervisors
            (full_name, email, password_hash, role, status,
             joined_date, last_active, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'Super Admin',
            'admin',
            hashed,
            'Super Admin',
            'Active',
            'Just now',
            'Just now',
            '05XXXXXXXX'
        ))
        print("[OK] Default Super Admin created (admin / admin123)")

    conn.commit()
    conn.close()


# =====================================================
# AUTH
# =====================================================
def authenticate_user(email, password):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, password_hash FROM supervisors WHERE email=?', (email,))
    user = c.fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        return user['id']
    return None


# =====================================================
# SUPERVISORS
# =====================================================
def get_all_supervisors():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM supervisors ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_supervisor_stats():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM supervisors")
    total = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM supervisors WHERE status='Active'")
    active = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM supervisors WHERE status='Pending'")
    pending = c.fetchone()[0]

    conn.close()
    return total, active, pending


def add_supervisor(data):
    conn = get_db_connection()
    c = conn.cursor()

    try:
        hashed = generate_password_hash(data['password'])

        c.execute('''
            INSERT INTO supervisors
            (full_name, email, password_hash, role, status,
             joined_date, last_active, phone, corridor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['full_name'],
            data['email'],
            hashed,
            data['role'],
            data['status'],
            data.get('joined_date', datetime.now().strftime("%Y-%m-%d")),
            data.get('last_active', 'Just now'),
            data.get('phone', ''),
            data.get('corridor', 'None')
        ))

        conn.commit()
        return True, "Success"

    except sqlite3.IntegrityError:
        return False, "Email already exists!"
    finally:
        conn.close()


def update_supervisor(sup_id, data):
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute('''
            UPDATE supervisors
            SET full_name=?, email=?, role=?, status=?, phone=?, corridor=?
            WHERE id=?
        ''', (
            data['full_name'],
            data['email'],
            data['role'],
            data['status'],
            data.get('phone', ''),
            data.get('corridor', 'None'),
            sup_id
        ))

        conn.commit()
        return True, "Success"

    except sqlite3.IntegrityError:
        return False, "Email already exists!"
    finally:
        conn.close()


def delete_supervisor(sup_id):
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT role, email FROM supervisors WHERE id=?", (sup_id,))
    sup = c.fetchone()

    if sup and sup['role'] == 'Super Admin' and sup['email'] == 'admin':
        conn.close()
        return False, "Cannot delete default Super Admin"

    c.execute("DELETE FROM supervisors WHERE id=?", (sup_id,))
    conn.commit()
    conn.close()

    return True, "Success"


# =====================================================
# REPORTS
# =====================================================
def add_report(shop_name, exit_name, corridors,
               total_people=0, shop_people=0,
               fire_corridor='None'):

    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H:%M:%S")

    c.execute('''
        INSERT INTO reports
        (date, time, shop_name, exit_name, corridors,
         fire_corridor, total_people, shop_people)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        date, time, shop_name, exit_name, corridors,
        fire_corridor, total_people, shop_people
    ))

    conn.commit()
    report_id = c.lastrowid
    conn.close()
    return report_id


def update_report(report_id, exit_name, corridors, fire_corridor=None):
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('SELECT exit_name, corridors, fire_corridor FROM reports WHERE id=?', (report_id,))
    row = c.fetchone()

    if row:
        old_exit = row['exit_name'] or ''
        old_corr = row['corridors'] or ''
        old_fire = row['fire_corridor'] or 'None'

        # avoid duplicate noise updates
        last_exit = old_exit.split(' | ')[-1] if old_exit else ''
        last_corr = old_corr.split(' | ')[-1] if old_corr else ''

        if last_exit != exit_name or last_corr != corridors:
            new_exit = f"{old_exit} | {exit_name}" if old_exit else exit_name
            new_corr = f"{old_corr} | {corridors}" if old_corr else corridors

            new_fire = fire_corridor if fire_corridor else old_fire

            c.execute('''
                UPDATE reports
                SET exit_name=?, corridors=?, fire_corridor=?
                WHERE id=?
            ''', (new_exit, new_corr, new_fire, report_id))

    conn.commit()
    conn.close()


def get_all_reports():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT * FROM reports ORDER BY id DESC
    ''')

    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_reports_by_date(date):
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT * FROM reports
        WHERE date=?
        ORDER BY id DESC
    ''', (date,))

    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def clear_reports():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("DELETE FROM reports")
    c.execute("DELETE FROM daily_sms")
    c.execute("DELETE FROM report_sms")

    conn.commit()
    conn.close()


# =====================================================
# SMS LOGGING
# =====================================================
def log_sms_sent(user_id):
    """يحفظ عدّاد SMS اليومي بدون الاعتماد على ON CONFLICT.

    بعض قواعد البيانات القديمة عندك قد تحتوي على جدول daily_sms
    بدون UNIQUE(user_id, date)، لذلك نستخدم SELECT ثم UPDATE/INSERT
    بدل ON CONFLICT حتى لا يظهر خطأ SQLite.
    """
    if not user_id:
        return

    conn = get_db_connection()
    c = conn.cursor()

    today = datetime.now().strftime("%Y-%m-%d")

    # Implementation note
    c.execute("PRAGMA table_info(daily_sms)")
    cols = [row[1] for row in c.fetchall()]
    if "count" not in cols:
        c.execute("ALTER TABLE daily_sms ADD COLUMN count INTEGER DEFAULT 1")
        conn.commit()
        print("[DB MIGRATION] Added column 'count' to 'daily_sms'")

    # User account section
    c.execute(
        "SELECT id, count FROM daily_sms WHERE user_id=? AND date=? LIMIT 1",
        (user_id, today)
    )
    row = c.fetchone()

    if row:
        current_count = row["count"] if row["count"] is not None else 0
        c.execute(
            "UPDATE daily_sms SET count=? WHERE id=?",
            (current_count + 1, row["id"])
        )
    else:
        c.execute(
            "INSERT INTO daily_sms (user_id, date, count) VALUES (?, ?, ?)",
            (user_id, today, 1)
        )

    conn.commit()
    conn.close()


def log_report_sms_sent(report_id, user_id):
    """
    يحفظ SMS مرتبطاً بتقرير / Incident محدد.
    هذا هو الجزء الذي يجعل أسماء المشرفين ثابتة داخل تفاصيل كل Incident.
    """
    if not report_id or not user_id:
        return

    conn = get_db_connection()
    c = conn.cursor()

    today = datetime.now().strftime("%Y-%m-%d")
    sent_at = datetime.now().strftime("%H:%M:%S")

    c.execute('''
        INSERT INTO report_sms (report_id, user_id, date, sent_at, sms_count)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(report_id, user_id)
        DO UPDATE SET
            sms_count = sms_count + 1,
            sent_at = excluded.sent_at
    ''', (report_id, user_id, today, sent_at))

    conn.commit()
    conn.close()


def get_notified_users_by_date(date):
    """
    يرجع IDs للمشرفين الذين تم إشعارهم في تاريخ معين.
    يجمع بين الجدول القديم daily_sms والجدول الجديد report_sms.
    """
    conn = get_db_connection()
    c = conn.cursor()

    ids = set()

    c.execute("SELECT user_id FROM daily_sms WHERE date=?", (date,))
    ids.update([r['user_id'] for r in c.fetchall()])

    c.execute("SELECT user_id FROM report_sms WHERE date=?", (date,))
    ids.update([r['user_id'] for r in c.fetchall()])

    conn.close()
    return list(ids)


def get_notified_supervisors_by_date(date):
    """يرجع بيانات المشرفين الذين لديهم SMS في تاريخ معين."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT DISTINCT s.*
        FROM supervisors s
        WHERE s.id IN (
            SELECT user_id FROM daily_sms WHERE date=?
            UNION
            SELECT user_id FROM report_sms WHERE date=?
        )
        ORDER BY s.full_name ASC
    ''', (date, date))

    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_report_sms_by_reports(report_ids):
    """
    يرجع قاموساً بالشكل: {report_id: [supervisor dict, ...]}
    لاستخدامه داخل report_details.html لكل Incident.
    """
    if not report_ids:
        return {}

    clean_ids = []
    for rid in report_ids:
        try:
            clean_ids.append(int(rid))
        except Exception:
            pass

    if not clean_ids:
        return {}

    placeholders = ','.join(['?'] * len(clean_ids))
    conn = get_db_connection()
    c = conn.cursor()

    c.execute(f'''
        SELECT
            rs.report_id,
            rs.sms_count,
            rs.sent_at,
            s.id,
            s.full_name,
            s.email,
            s.role,
            s.phone,
            s.corridor
        FROM report_sms rs
        JOIN supervisors s ON s.id = rs.user_id
        WHERE rs.report_id IN ({placeholders})
        ORDER BY rs.report_id DESC, s.full_name ASC
    ''', clean_ids)

    grouped = {}
    for row in c.fetchall():
        d = dict(row)
        rid = d.pop('report_id')
        grouped.setdefault(rid, []).append(d)

    conn.close()
    return grouped
