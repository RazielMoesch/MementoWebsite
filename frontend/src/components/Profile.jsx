import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Profile.css"

const Profile = ({ loggedIn, username }) => {

  const [profileUUID, setProfileUUID] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileKnownFaces, setProfileKnownFaces] = useState([])
  const [profileRole, setProfileRole] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  // Function to load user info from the backend
  const loadUserInfo = async () => {
    try {
      // Ensure the backend URL is correct and matches the CORS settings
      const request = await fetch("http://localhost:5001/getuserinfo", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username, // Use the passed-in username prop
        }),
      })

      const data = await request.json()

      console.log("Backend response: ", data)  // Debugging log

      // Check if the response indicates success
      if (data.worked) {
        const info = data.info

        // Set the state variables with the fetched data
        setProfileUUID(info.uuid || "")
        setProfileEmail(info.email || "")
        setProfileKnownFaces(info.known_faces || [])  // Ensure it's always an array
        setProfileRole(info.role || "")
        setErrorMessage("")  // Clear any previous errors
      } else {
        setErrorMessage(data.message || "Failed to retrieve user info")
      }
    } catch (error) {
      console.error("Error fetching user info:", error)  // Debugging log
      setErrorMessage("Unknown Error Occurred")
    } finally {
      setLoading(false)  // Stop loading once the request is done
    }
  }

  // Redirect to login if the user is not logged in
  useEffect(() => {
    if (!loggedIn) {
      navigate("/login")
    }
  }, [loggedIn, navigate])

  // Load user info if logged in
  useEffect(() => {
    if (loggedIn) {
      loadUserInfo()
    }
  }, [loggedIn])  // Load user info when logged in

  // Render the profile page
  return (
    <>
      <h1>Profile</h1>

      {loading && <p>Loading...</p>} {/* Show loading indicator */}

      {errorMessage && <p>Error: {errorMessage}</p>} {/* Show error if any */}

      {/* Display user info once data is fetched */}
      {!loading && !errorMessage && (
        <>
          <div>
            <h2>{username}</h2>
          </div>
          <div>
            <h3>Unique User Identification Number: {profileUUID}</h3>
          </div>
          <div>
            <h3>Email: {profileEmail}</h3>
          </div>
          <div>
            <h3>Known Faces: {profileKnownFaces.length}</h3> {/* Show number of known faces */}
          </div>
          <div>
            <h3>Role: {profileRole}</h3>
          </div>
        </>
      )}
    </>
  )
}

export default Profile
