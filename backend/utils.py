from passlib.context import CryptContext
import sqlite3
import json

class Profile:

    def __init__(self):
        self.db_path = "profiles.db"
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self._init_db()

    def _init_db(self):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                uuid TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                known_faces TEXT,
                role TEXT DEFAULT 'user'
            );
        """)
        conn.commit()
        conn.close()

    def hash_password(self, password):
        return self.pwd_context.hash(password)

    def verify_password(self, unhashed, hashed):
        return self.pwd_context.verify(unhashed, hashed)

    def get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def signup(self, UUID, username, password, email, role="user", known_faces=None):
        if known_faces is None:
            known_faces = []

        hashed = self.hash_password(password)
        conn = self.get_db()
        cursor = conn.cursor()

        try:
            # Check if username already exists
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", (username,))
            if cursor.fetchone()[0] > 0:
                return False  # Username already taken

            # Check if email already exists
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (email,))
            if cursor.fetchone()[0] > 0:
                return False  # Email already in use

            cursor.execute(
                "INSERT INTO users (uuid, username, email, hashed_password, known_faces, role) VALUES (?, ?, ?, ?, ?, ?)",
                (UUID, username, email, hashed, json.dumps(known_faces), role)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError as e:
            print(f"IntegrityError: {e}")
            return False
        finally:
            conn.close()



    def login(self, username, password):
        conn = self.get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT hashed_password FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            print(f"[LOGIN] No user found with username: {username}")
            return False

        match = self.verify_password(password, row["hashed_password"])
        print(f"[LOGIN] Password match for {username}: {match}")
        return match

    def get_user_info(self, username):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT uuid, email, known_faces, role FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()

        if row:
            data = dict(row)
            data["known_faces"] = json.loads(data["known_faces"]) if data["known_faces"] else []
            return data
        return None
