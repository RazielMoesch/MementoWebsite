from fastapi import FastAPI, HTTPException, Depends
import uvicorn
from pydantic import BaseModel
from utils import Profile

profile = Profile()
app = FastAPI()



#signup input structure defintion
class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    notify: str

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
    print("Signing User Up")
    return {"message": "Signup successful"}

# Login endpoint
@app.post("/login")
async def login(data:LoginRequest):
    print("Logging User In")
    return {"message": "Login successful"}

# Get user info endpoint
@app.post("/getuserinfo")
async def get_user_info(data:GetUserInfo):
    print("Getting user info")
    return {"message": "User info retrieved"}

# Run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
