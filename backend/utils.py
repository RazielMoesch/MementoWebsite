import cv2
import numpy as np
import torch
from PIL import Image
from model import MomentoModel
import torchvision.transforms as T
import os
import pickle
from passlib.context import CryptContext
import sqlite3
import json
import base64
from io import BytesIO

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
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", (username,))
            if cursor.fetchone()[0] > 0:
                return False
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (email,))
            if cursor.fetchone()[0] > 0:
                return False
            cursor.execute(
                "INSERT INTO users (uuid, username, email, hashed_password, known_faces, role) VALUES (?, ?, ?, ?, ?, ?)",
                (UUID, username, email, hashed, json.dumps(known_faces), role)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

    def login(self, username, password):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT hashed_password FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        return self.verify_password(password, row["hashed_password"]) if row else False

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
    def __init__(self, model_path=r"backend/MomentoRecognition1.pth"):
        self.recognition_threshold = 0.2
        self.min_confidence = 0.99
        self.transform = T.Compose([
            T.ToTensor(),
            T.Resize((256, 256)),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load your custom model
        self.model = self._load_model(model_path)
        self.model.eval()
        
        # Face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    def _load_model(self, model_path):
        """Load the trained face recognition model"""
        model = MomentoModel(return_embedding=True)
        checkpoint = torch.load(model_path, map_location='cpu')
        
        if 'model_state' in checkpoint:
            model.load_state_dict(checkpoint['model_state'])
        else:
            model.load_state_dict(checkpoint)
        
        return model

    def b64_to_np(self, base64_str):
        try:
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            image_bytes = base64.b64decode(base64_str)
            image = Image.open(BytesIO(image_bytes))
            return np.array(image.convert("RGB"))
        except:
            return None

    def _detect_faces(self, np_img):
        """Detect faces using OpenCV's Haar cascade"""
        gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        results = []
        for (x, y, w, h) in faces:
            # Add padding to the face region
            padding = int(0.2 * min(w, h))
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(np_img.shape[1] - x, w + 2*padding)
            h = min(np_img.shape[0] - y, h + 2*padding)
            
            face_img = np_img[y:y+h, x:x+w]
            results.append({
                'face': face_img,
                'facial_area': {
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h
                }
            })
        return results

    def _get_embedding(self, face_img):
        """Convert face image to embedding vector using your model"""
        with torch.no_grad():
            face_tensor = self.transform(Image.fromarray(face_img)).unsqueeze(0)
            embedding = self.model(face_tensor)
            return embedding.squeeze().numpy()

    def add_face(self, username, face_name, base64_img):
        try:
            np_img = self.b64_to_np(base64_img)
            if np_img is None:
                return False
                
            faces = self._detect_faces(np_img)
            if len(faces) != 1:
                return False
                
            face = faces[0]['face']
            embedding = self._get_embedding(face)
            
            user_dir = os.path.join("UserImages", username, "userimages")
            os.makedirs(user_dir, exist_ok=True)
            
            # Save both image and embedding
            Image.fromarray(face).save(os.path.join(user_dir, f"{face_name}.jpg"))
            np.save(os.path.join(user_dir, f"{face_name}.npy"), embedding)
            return True
        except Exception as e:
            print(f"Error in add_face: {e}")
            return False

    def remove_face(self, username, face_name):
        try:
            base_path = os.path.join("UserImages", username, "userimages", face_name)
            removed = False
            if os.path.exists(f"{base_path}.jpg"):
                os.remove(f"{base_path}.jpg")
                removed = True
            if os.path.exists(f"{base_path}.npy"):
                os.remove(f"{base_path}.npy")
                removed = True
            return removed
        except:
            return False

    def get_saved_faces(self, username):
        try:
            user_dir = os.path.join("UserImages", username, "userimages")
            return [f.split('.')[0] for f in os.listdir(user_dir) if f.endswith('.npy')] if os.path.exists(user_dir) else []
        except:
            return []

    def recognize(self, username, b64_str):
        try:
            saved_faces = self.get_saved_faces(username)
            if not saved_faces:
                return []
                
            np_img = self.b64_to_np(b64_str)
            if np_img is None:
                return []
                
            user_dir = os.path.join("UserImages", username, "userimages")
            saved_embeddings = []
            saved_names = []
            for face_name in saved_faces:
                embed_path = os.path.join(user_dir, f"{face_name}.npy")
                if os.path.exists(embed_path):
                    saved_embeddings.append(np.load(embed_path))
                    saved_names.append(face_name)
            
            input_faces = self._detect_faces(np_img)
            recognition_results = []
            
            for face_info in input_faces:
                input_embedding = self._get_embedding(face_info['face'])
                facial_area = face_info['facial_area']
                
                best_match = None
                best_score = 0.0
                
                for saved_embedding, saved_name in zip(saved_embeddings, saved_names):
                    score = np.dot(input_embedding, saved_embedding) / (
                        np.linalg.norm(input_embedding) * np.linalg.norm(saved_embedding))
                    
                    if score > best_score:
                        best_score = score
                        best_match = saved_name
                
                # Convert numpy types to native Python types
                recognition_results.append({
                    "name": best_match if best_score > self.recognition_threshold else "unknown",
                    "location": (
                        int(facial_area['y']),  # Convert numpy.int32 to int
                        int(facial_area['x'] + facial_area['w']),
                        int(facial_area['y'] + facial_area['h']),
                        int(facial_area['x'])
                    ),
                    "confidence": float(best_score)  # Convert numpy.float32 to float
                })
            
            return recognition_results
        except Exception as e:
            print(f"Error in recognize: {e}")
            return []