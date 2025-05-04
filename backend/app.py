from fastapi import FastAPI, HTTPException, Depends
import uvicorn
from pydantic import BaseModel
from utils import Profile
import uuid
from fastapi.middleware.cors import CORSMiddleware

profile = Profile()
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


# Run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
