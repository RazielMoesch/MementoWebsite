from fastapi import FastAPI, HTTPException, Depends
import uvicorn
from pydantic import BaseModel
from utils import Profile, ImageProcessing
import uuid
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import time

profile = Profile()
processor = ImageProcessing()
app = FastAPI()

# Allow all origins (for development)
origins = [
    "http://localhost",  # React frontend
    "http://localhost:5173",  # React frontend (if running on port 3000)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows requests from localhost
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods like POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allow all headers
)


#signup input structure defintion
class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    notify: bool  # Change from str to bool

class LoginRequest(BaseModel):
    username: str
    password: str

class GetUserInfo(BaseModel):
    username:str

class AddFaceRequest(BaseModel):
    username: str
    b64_str: str
    img_name:str

class RemoveFaceRequest(BaseModel):
    username:str
    img_name:str

class GetSavedFacesRequest(BaseModel):
    username: str

class RecognitionRequest(BaseModel):
    username: str
    b64_str: Any


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "Running"}

# Signup endpoint
@app.post("/signup")
async def signup(data: SignupRequest):
    try:
        user_id = str(uuid.uuid4()) 
        print("Signing User Up")

        success = profile.signup(
            user_id,
            data.username,
            data.password,
            data.email
        )

        print(f"Signup worked: {success}")

        if success:
            return {"message": "Signup successful", "worked":success}
        else:
            return {"message": "Signup Failed", "worked":success}
    except Exception as e:
        print(f"Signup error: {e}")
        return {"message":"Server Error During Signup", "worked":False}


# Login endpoint
@app.post("/login")
async def login(data:LoginRequest):
    try:
        print("Logging User In")

        success = profile.login(data.username, data.password)

        if success:
            return {"message": "Login successful", "worked":success}
        else:
            return {"message": "Login Failed", "worked":success}
    except:
        return {"message":"Server Error During Login", "worked":False}

# Get user info endpoint
@app.post("/getuserinfo")
async def get_user_info(data:GetUserInfo):
    try:
        print("Getting user info")

        info = profile.get_user_info(data.username)

        if info:
            return {"worked": True, "message": "User Info Retrieved", "info": info}
        else:
            return {"worked": False, "message": "Failed to Retrieve User Info", "info": ""}
    except Exception as e:
        print(f"Error during user info retrieval: {e}") 
        return {"worked": False, "message": "Server Error During User Info Retrieval"}


@app.post("/recognize")
async def recognize(data:RecognitionRequest):

    try: 
        start_time = time.time()
        name = processor.recognize(username=data.username, b64_str=data.b64_str)
        end_time = time.time()

        total_time = (end_time-start_time) * 1000
        print(f"Time For Recognition: {total_time}") 
        print(data.username)

        print("mame:", name)

        return {"worked":True, "faces":name}
    except Exception as e:
        print("Error during rec: ", e)
        return {"worked":False}


@app.post("/addface")
async def addFace(data:AddFaceRequest):
    try:
       
        results = processor.add_face(data.username, data.img_name, data.b64_str)

        if results:
            return {"worked":True}
        
    except:
        return {"worked":False}
        
@app.post("/removeface")
async def removeFace(data:RemoveFaceRequest):
    try:
        worked = processor.remove_face(data.username, data.img_name)

        if worked:
            return {"worked":True}
        return {"worked":False}
    except:
        return {"worked": False}
    

@app.post("/getsavedfaces")
async def getSavedFaces(data:GetSavedFacesRequest):
    try:
        names = processor.get_saved_faces(data.username)
        return {"worked":True, "names":names}

    except:
        return {"worked":False}

# Run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
