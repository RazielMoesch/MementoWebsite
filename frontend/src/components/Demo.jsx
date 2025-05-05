import { useNavigate } from "react-router-dom";
import Webcam from 'react-webcam';
import "./Demo.css";
import { useState, useEffect, useRef } from "react";

const Demo = ({ isLoggedIn, username }) => {
    const [knownFaces, setKnownFaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState();
    const [newImgName, setNewImgName] = useState("");
    const [foundPerson, setFoundPerson] = useState([]);
    const camRef = useRef(null);

    const apilink = "http://localhost:5001/";
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            getSavedFaces();
        }
    }, [isLoggedIn]);

    const getSavedFaces = async () => {
        setLoading(true);
        try {
            const request = await fetch(`${apilink}getsavedfaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                }),
            });

            const data = await request.json();

            if (data.worked) {
                setKnownFaces(data.names);
            }
        } catch (error) {
            console.error("Error fetching saved faces:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFace = async (name) => {
        try {
            const request = await fetch(`${apilink}removeface`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    img_name: name,
                }),
            });

            const data = await request.json();

            if (data.worked) {
                setKnownFaces(knownFaces.filter(face => face !== name));
            }
        } catch (error) {
            console.error("Error removing face:", error);
        }
    };

    const handleAddFace = async () => {
        const capturedImage = camRef.current.getScreenshot();
        if (!capturedImage) {
            alert("Failed to capture image, please try again.");
            return;
        }

        setScreenshot(capturedImage);
        const thisname = prompt("Give this image a name", "Steven");

        if (!thisname || thisname.length < 1 || /[^a-zA-Z0-9 ]/.test(thisname)) {
            alert("Name must be at least 1 character long and contain only alphanumeric characters.");
            return;
        }

        setNewImgName(thisname);
        try {
            const request = await fetch(`${apilink}addface`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    b64_str: capturedImage,
                    img_name: thisname,
                }),
            });

            const data = await request.json();
            if (data.worked) {
                alert("Face successfully saved");
                getSavedFaces();
            } else {
                alert("Error while saving face. Try again.");
            }
        } catch (error) {
            alert("Error while saving face. Try again.");
            console.error(error);
        }
    };

    const recognize = async (capturedImage) => {
        // Add the correct image type prefix if it's not already present
        if (!capturedImage.startsWith('data:image/png;base64,')) {
            capturedImage = 'data:image/png;base64,' + capturedImage;
        }
    
        try {
            const request = await fetch(`${apilink}recognize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    b64_str: capturedImage,  // Correct Base64 string
                }),
            });
    
            const data = await request.json();
    
            if (data.worked) {
                console.log("Recognized people:", data.names);  // Log for debugging
                setFoundPerson(Array.isArray(data.names) ? data.names : []);  // Ensure it's an array
            } else {
                setFoundPerson([]);  // Clear if no faces are found
            }
        } catch (error) {
            console.error("Error recognizing face:", error);
            setFoundPerson([]);  // Clear on error
        }
    };

    useEffect(() => {
        if (foundPerson.length > 0) {
            console.log("Recognized people:", foundPerson);
        }
    }, [foundPerson]);

    useEffect(() => {
        const interval = setInterval(() => {
            const capturedImage = camRef.current.getScreenshot();
            if (capturedImage) {
                recognize(capturedImage);
            }
        }, 3000); // Adjust interval as needed

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {!isLoggedIn ? (
                <div className="login-prompt">
                    <h1>Must Log in before you can access the demo.</h1>
                    <button onClick={() => navigate("/login")}>Start Login</button>
                </div>
            ) : (
                <div className="demo-container">
                    <div className="webcam-container">
                        <Webcam className="webcam-view" ref={camRef} />
                        <button onClick={() => handleAddFace()}>Capture and Add Face</button>
                    </div>

                    <div className="face-manager">
                        {loading ? (
                            <p>Loading saved faces...</p>
                        ) : (
                            knownFaces.map((name, idx) => (
                                <div className="known-face" key={idx}>
                                    <p>{name}</p>
                                    <button onClick={() => handleRemoveFace(name)}>Remove</button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="recognized-faces">
                        {foundPerson.length > 0 ? (
                            <div>
                                <h3>Recognized Faces:</h3>
                                <ul>
                                    {foundPerson.map((person, idx) => (
                                        <li key={idx}>{person}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p>No faces recognized yet.</p>  // Fallback if no faces are found
                        )}
                    </div>

                    {/* Render the name of the recognized person on the webcam feed */}
                    {foundPerson.length > 0 && (
                        <div className="recognized-person-overlay">
                            <h2>{foundPerson.join(', ')}</h2>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default Demo;
