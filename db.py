import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "calendar.db")


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            start_date  TEXT NOT NULL,
            end_date    TEXT,
            start_time  TEXT,
            end_time    TEXT,
            color       TEXT DEFAULT '#3788d8',
            description TEXT DEFAULT '',
            all_day     INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()
    conn.close()


def add_event(title, start_date, end_date=None, start_time=None, end_time=None,
              color="#3788d8", description="", all_day=True):
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO events (title, start_date, end_date, start_time, end_time,
                               color, description, all_day)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, start_date, end_date, start_time, end_time,
         color, description, int(all_day))
    )
    event_id = cur.lastrowid
    conn.commit()
    conn.close()
    return event_id


def get_all_events():
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM events ORDER BY start_date").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_event(event_id):
    conn = _get_conn()
    row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_event(event_id, **kwargs):
    if not kwargs:
        return
    allowed = {"title", "start_date", "end_date", "start_time", "end_time",
               "color", "description", "all_day"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values())
    values.append(event_id)
    conn = _get_conn()
    conn.execute(
        f"UPDATE events SET {set_clause}, updated_at = datetime('now', 'localtime') WHERE id = ?",
        values
    )
    conn.commit()
    conn.close()


def delete_event(event_id):
    conn = _get_conn()
    conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()


def _row_to_fullcalendar(row):
    event = {
        "id": str(row["id"]),
        "title": row["title"],
        "backgroundColor": row["color"],
        "borderColor": row["color"],
        "extendedProps": {"description": row["description"]},
    }
    if row["all_day"]:
        event["start"] = row["start_date"]
        event["allDay"] = True
        if row["end_date"]:
            event["end"] = row["end_date"]
    else:
        event["start"] = f"{row['start_date']}T{row['start_time'] or '00:00'}"
        event["allDay"] = False
        if row["end_date"] and row["end_time"]:
            event["end"] = f"{row['end_date']}T{row['end_time']}"
        elif row["end_time"]:
            event["end"] = f"{row['start_date']}T{row['end_time']}"
    return event


def get_events_for_calendar():
    rows = get_all_events()
    return [_row_to_fullcalendar(r) for r in rows]
