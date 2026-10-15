import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "rice_stress_yield.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cols = [c[1] for c in cur.execute("PRAGMA table_info(farms)").fetchall()]
print("Current columns in farms table:", cols)

if "field_survey_number" not in cols:
    cur.execute("ALTER TABLE farms ADD COLUMN field_survey_number TEXT")
    print("Added column field_survey_number")

if "boundary_points" not in cols:
    cur.execute("ALTER TABLE farms ADD COLUMN boundary_points TEXT")
    print("Added column boundary_points")

conn.commit()
new_cols = [c[1] for c in cur.execute("PRAGMA table_info(farms)").fetchall()]
print("New columns in farms table:", new_cols)
conn.close()
