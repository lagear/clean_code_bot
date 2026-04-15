# Dirty Python example — violates multiple SOLID principles

import json, smtplib, sqlite3

DB = "app.db"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587

class UserManager:
    def __init__(self):
        self.conn = sqlite3.connect(DB)

    def create_user(self, name, email, password, role):
        if not name or not email or "@" not in email:
            print("bad input")
            return False
        cur = self.conn.cursor()
        cur.execute("INSERT INTO users VALUES (?,?,?,?)", (name, email, password, role))
        self.conn.commit()
        # send welcome email
        try:
            s = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            s.starttls()
            s.login("admin@example.com", "secret123")
            s.sendmail("admin@example.com", email, f"Subject: Welcome\n\nHi {name}!")
            s.quit()
        except:
            pass
        # log to file
        with open("log.txt", "a") as f:
            f.write(f"user created: {name}\n")
        return True

    def get_user(self, user_id):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM users WHERE id=?", (user_id,))
        return cur.fetchone()

    def generate_report(self, fmt):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM users")
        rows = cur.fetchall()
        if fmt == "json":
            return json.dumps([{"name": r[0], "email": r[1]} for r in rows])
        elif fmt == "csv":
            lines = ["name,email"]
            for r in rows:
                lines.append(f"{r[0]},{r[1]}")
            return "\n".join(lines)
        else:
            return str(rows)

    def delete_user(self, user_id, requester_role):
        if requester_role != "admin":
            print("not allowed")
            return
        cur = self.conn.cursor()
        cur.execute("DELETE FROM users WHERE id=?", (user_id,))
        self.conn.commit()
        with open("log.txt", "a") as f:
            f.write(f"user deleted: {user_id}\n")
