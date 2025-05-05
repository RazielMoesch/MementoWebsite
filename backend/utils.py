from passlib.context import CryptContext
import face_recognition
import base64
import sqlite3
import json
import numpy as np
from PIL import Image
from io import BytesIO
import os

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




class ImageProcessing:
    def b64_to_np(self, base64_str):
        try:
            # Check if the base64 string contains a URI prefix (e.g., 'data:image/png;base64,')
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            
            # Decode the Base64 string into bytes
            image_bytes = base64.b64decode(base64_str)
            
            # Use PIL to open the image from the byte data and convert it to RGB
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            
            # Convert the PIL image to a NumPy array
            image_np = np.array(image)
            
            return image_np
        except Exception as e:
            print(f"Error in b64_to_np: {e}")
            return None

    def add_face(self, username, face_name, base64_img):
        try:
            np_img = self.b64_to_np(base64_img)
            if np_img is None:
                print(f"[ADD_FACE] Invalid image data for {username}")
                return False
            
            user_dir = os.path.join("UserImages", username, "userimages")
            print(f"[ADD_FACE] User directory: {user_dir}")
            
            # Ensure the directory structure exists
            os.makedirs(user_dir, exist_ok=True)

            save_path = os.path.join(user_dir, f"{face_name}.jpg")
            print(f"[ADD_FACE] Saving image to: {save_path}")

            # Save the image
            Image.fromarray(np_img).save(save_path)
            print(f"[ADD_FACE] Face saved successfully for {username} as {face_name}.jpg")
            return True
        except Exception as e:
            print(f"Error adding face for {username}: {e}")
            return False


    def remove_face(self, username, face_name):
        try:
            file_path = os.path.join("UserImages", username, "userimages", f"{face_name}.jpg")
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            else:
                print(f"File {file_path} not found")
                return False
        except Exception as e:
            print(f"Error removing face for {username}: {e}")
            return False

    def get_saved_faces(self, username):
        try:
            user_dir = os.path.join("UserImages", username, "userimages")
            if os.path.exists(user_dir):
                # Filter out non-image files and empty directories
                return [f.split('.')[0] for f in os.listdir(user_dir) if f.endswith('.jpg')]
            else:
                print(f"User directory for {username} does not exist")
                return []
        except Exception as e:
            print(f"Error getting saved faces for {username}: {e}")
            return []

    def recognize(self, username, b64_str):
        try:
            saved_faces = self.get_saved_faces(username)
            if not saved_faces:
                return "unknown"

            np_img = self.b64_to_np(b64_str)
            if np_img is None:
                return "unknown"

            pil_img = Image.fromarray(np_img)
            face_locations = face_recognition.face_locations(np.array(pil_img))
            if len(face_locations) == 0:
                return "unknown"

            encodings = face_recognition.face_encodings(np.array(pil_img), face_locations)
            user_dir = os.path.join("UserImages", username, "userimages")
            
            for saved_face in saved_faces:
                saved_face_path = os.path.join(user_dir, f"{saved_face}.jpg")
                saved_image = face_recognition.load_image_file(saved_face_path)
                saved_face_encoding = face_recognition.face_encodings(saved_image)

                if saved_face_encoding:
                    matches = face_recognition.compare_faces(saved_face_encoding, encodings[0])
                    if True in matches:
                        return saved_face

            return "unknown"
        except Exception:
            print("error during recognition")
            return "unknown"